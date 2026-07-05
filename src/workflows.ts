import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type { Env } from "./index";
import { indexLessonToAISearch, sendAdminNotification } from "./shared-utils";

interface TranscriptionParams {
  lessonId: string;
  courseId: string;
  mediaKey: string;
  lessonType: string;
  title: string;
}

function uint8ArrayToBase64(uint8: Uint8Array): string {
  const chunkSize = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const slice = uint8.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...slice));
  }
  return btoa(chunks.join(""));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export class LessonTranscriptionWorkflow extends WorkflowEntrypoint<Env, TranscriptionParams> {
  async run(event: WorkflowEvent<TranscriptionParams>, step: WorkflowStep) {
    const { lessonId, courseId, mediaKey, lessonType, title } = event.payload;
    const env = this.env;

    await step.do("init", async () => {
      console.log(`[Workflow] init: ${lessonId} (${lessonType})`);
      await env.DB.prepare(
        "UPDATE Lessons SET processing_status = 'processing' WHERE id = ?"
      ).bind(lessonId).run();
    });

    try {

    const { chunks } = await step.do("readAndPrepareMedia", async () => {
      const meta = await env.STORAGE.head(mediaKey);
      if (!meta) throw new Error(`Media not found: ${mediaKey}`);

      const totalSize = meta.size;

      if (totalSize > 100 * 1024 * 1024) {
        throw new Error(`File too large for transcription: ${totalSize} bytes`);
      }

      const CHUNK_SIZE = 24 * 1024 * 1024;
      const object = await env.STORAGE.get(mediaKey);
      if (!object) throw new Error(`Failed to read media from storage: ${mediaKey}`);
      const buffer = await object.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      if (uint8.length <= CHUNK_SIZE) {
        return { chunks: [{ data: uint8, index: 0 }] };
      }

      const chunkList: { data: Uint8Array; index: number; key: string }[] = [];
      for (let offset = 0; offset < uint8.length; offset += CHUNK_SIZE) {
        const end = Math.min(offset + CHUNK_SIZE, uint8.length);
        const chunkData = uint8.slice(offset, end);
        const chunkKey = `${courseId}/transcripts/${lessonId}_chunk_${chunkList.length}.mp3`;
        await env.STORAGE.put(chunkKey, chunkData, {
          httpMetadata: { contentType: "audio/mpeg" },
        });
        chunkList.push({ data: chunkData, index: chunkList.length, key: chunkKey });
      }
      return { chunks: chunkList };
    });

    let fullText = "";
    for (const chunk of chunks) {
      const text = await step.do(`transcribeChunk${chunk.index}`, async () => {
        const whisperResponse = await env.AI.run(
          "@cf/openai/whisper-large-v3-turbo",
          { audio: uint8ArrayToBase64(chunk.data) }
        );
        return ((whisperResponse as any)?.text || "").trim();
      });
      fullText += text + " ";
    }
    fullText = fullText.trim();

    if (!fullText) {
      await step.do("markCompletedNoText", async () => {
        await env.DB.prepare(
          "UPDATE Lessons SET processing_status = 'completed' WHERE id = ?"
        ).bind(lessonId).run();
      });

      await step.do("notifyAdminNoText", async () => {
        const adminEmail = await env.PLATFORM_SECRETS.get("ADMIN_CONTACT_EMAIL");
        if (adminEmail) {
          const safeTitle = escapeHtml(title);
          const safeType = escapeHtml(lessonType);
          await sendAdminNotification(
            env, adminEmail,
            `⚠️ No Text Extracted - ${title}`,
            "No Text in Media",
            `<p>No text could be extracted from the media for lesson: <strong>${safeTitle}</strong> (${lessonId})</p>
             <p>Type: ${safeType}<br/>The audio/video may be silent or corrupted.</p>`,
            `No text extracted for lesson ${title} (${lessonId}). Type: ${lessonType}`
          );
        }
      });

      return { success: false, reason: "No text extracted" };
    }

    const isHindi = await step.do("detectLanguage", async () => {
      return /[\u0900-\u097F]/.test(fullText);
    });

    await step.do("saveTranscript", async () => {
      if (isHindi) {
        await env.DB.prepare(
          "UPDATE Lessons SET text_content_hi = ?, text_content = ?, processing_status = 'completed' WHERE id = ?"
        ).bind(fullText, fullText, lessonId).run();
      } else {
        await env.DB.prepare(
          "UPDATE Lessons SET text_content = ?, processing_status = 'completed' WHERE id = ?"
        ).bind(fullText, lessonId).run();
      }

      const transcriptKey = `${courseId}/transcripts/${lessonId}.txt`;
      await env.STORAGE.put(transcriptKey, fullText, {
        httpMetadata: { contentType: "text/plain" },
      });
    });

    await step.do("indexToAISearch", async () => {
      const lesson = await env.DB.prepare(
        "SELECT id, course_id, batch_id, is_free, title, type, chapter_title, text_content, text_content_hi, order_index FROM Lessons WHERE id = ?"
      ).bind(lessonId).first();
      if (lesson) {
        await indexLessonToAISearch(env, lesson);
      }
    });

    // Cleanup temp chunk files
    if (chunks.length > 1 && (chunks[0] as any).key) {
      await step.do("cleanupChunks", async () => {
        for (const chunk of chunks as { key: string }[]) {
          await env.STORAGE.delete(chunk.key).catch(() => {});
        }
      });
    }

    await step.do("notifyAdmin", async () => {
      const adminEmail = await env.PLATFORM_SECRETS.get("ADMIN_CONTACT_EMAIL");
      if (adminEmail) {
        const lessonData = await env.DB.prepare(
          "SELECT title FROM Lessons WHERE id = ?"
        ).bind(lessonId).first() as any;

        const langLabel = isHindi ? "Hindi" : "English";
        const displayTitle = escapeHtml(lessonData?.title || title);
        const displayType = escapeHtml(lessonType);
        const transcriptPreview = escapeHtml(fullText.substring(0, 1000));
        const subject = `✅ Transcription Complete - ${lessonData?.title || title}`;
        const htmlBody = `
          <h2 style="color:#16a34a;">Transcription Completed Successfully</h2>
          <table style="border-collapse:collapse;width:100%;max-width:600px;margin:16px 0;">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Lesson</td><td style="padding:8px;border:1px solid #ddd;">${displayTitle}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Type</td><td style="padding:8px;border:1px solid #ddd;">${displayType}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Language</td><td style="padding:8px;border:1px solid #ddd;">${langLabel}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Transcript Length</td><td style="padding:8px;border:1px solid #ddd;">${fullText.length} characters</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Chunks Processed</td><td style="padding:8px;border:1px solid #ddd;">${chunks.length}</td></tr>
          </table>
          <h3>Transcript Preview:</h3>
          <blockquote style="background:#f3f4f6;padding:16px;border-radius:8px;border-left:4px solid #16a34a;white-space:pre-wrap;">${transcriptPreview}...</blockquote>`;

        await sendAdminNotification(
          env, adminEmail, subject, "Transcription Complete",
          htmlBody,
          `Transcription complete for ${lessonData?.title || title}\nLength: ${fullText.length} chars\nLanguage: ${langLabel}\nChunks: ${chunks.length}`
        );
      }
    });

    return { success: true, textLength: fullText.length, chunksProcessed: chunks.length, language: isHindi ? "hindi" : "english" };
    } catch (err: any) {
      console.error(`[Workflow] Fatal error for lesson ${lessonId}:`, err);
      await env.DB.prepare(
        "UPDATE Lessons SET processing_status = 'failed' WHERE id = ?"
      ).bind(lessonId).run().catch(() => {});
      throw err;
    }
  }
}

export class EnvSyncWorkflow extends WorkflowEntrypoint<Env, {}> {
  async run(event: WorkflowEvent<{}>, step: WorkflowStep) {
    const env = this.env;

    try {
      // 1. Sync D1 Database
      await step.do("syncD1", async () => {
        // Since we cannot run raw PRAGMA table_info or export cross-db easily with direct bindings without
        // reading everything into memory, we will use the existing db-migrate export/import logic if possible,
        // or just read all tables.

        // Let's import exportDatabaseToJson from db-migrate
        const { exportDatabaseToJson } = await import('../db-migrate');

        // Export prod DB
        const backupJson = await exportDatabaseToJson(env.DB);

        // We will call a helper to import it to preview
        // Or we can parse the json and run it directly.
        // Actually, importing the JSON involves dropping tables and recreating them.

        // Let's create an import function locally
        const data = JSON.parse(backupJson);

        // Disable foreign keys temporarily
        try { await env.PREVIEW_DB.prepare('PRAGMA foreign_keys = OFF').run(); } catch (e) {}

        for (const [tableName, tableData] of Object.entries(data)) {
          if (tableName === 'sqlite_sequence' || tableName === '_cf_KV') continue;

          const safeTableName = tableName.replace(/"/g, '""');
          const typedTableData = tableData as { schema: string, rows: any[] };

          // 1. Drop the table if it exists in Preview
          await env.PREVIEW_DB.prepare(`DROP TABLE IF EXISTS "${safeTableName}"`).run().catch(e => {
             console.log(`Table drop failed or doesn't exist: ${safeTableName}`);
          });

          // 2. Recreate the table using the Production schema
          if (typedTableData.schema) {
            await env.PREVIEW_DB.prepare(typedTableData.schema).run();
          }

          // 3. Insert rows
          const rowArray = typedTableData.rows;
          if (rowArray && rowArray.length > 0) {
            const columns = Object.keys(rowArray[0]);
            const placeholders = columns.map(() => '?').join(', ');
            const insertQuery = `INSERT INTO "${safeTableName}" (${columns.map(c => `"${c.replace(/"/g, '""')}"`).join(', ')}) VALUES (${placeholders})`;

            const stmt = env.PREVIEW_DB.prepare(insertQuery);
            const batchStmts = rowArray.map((row: any) => {
              return stmt.bind(...columns.map(c => row[c]));
            });

            // Batch insert in chunks of 50
            for (let i = 0; i < batchStmts.length; i += 50) {
              await env.PREVIEW_DB.batch(batchStmts.slice(i, i + 50));
            }
          }
        }

        try { await env.PREVIEW_DB.prepare('PRAGMA foreign_keys = ON').run(); } catch (e) {}
      });

      // 2. Sync KV
      await step.do("syncKV", async () => {
        let cursor: string | undefined;
        do {
          const result = await env.PLATFORM_SECRETS.list({ cursor });
          for (const key of result.keys) {
            const value = await env.PLATFORM_SECRETS.get(key.name);
            if (value !== null) {
              await env.PREVIEW_KV.put(key.name, value);
            }
          }
          cursor = result.list_complete ? undefined : result.cursor;
        } while (cursor);
      });

      // 3. Sync R2
      // This could take a while, S3 objects can be listed and then copied
      await step.do("syncR2", async () => {
        let cursor: string | undefined;
        do {
          const result = await env.STORAGE.list({ cursor });
          for (const object of result.objects) {
            const objData = await env.STORAGE.get(object.key);
            if (objData) {
              await env.PREVIEW_STORAGE.put(object.key, objData.body, {
                httpMetadata: objData.httpMetadata,
                customMetadata: objData.customMetadata,
              });
            }
          }
          cursor = result.truncated ? result.cursor : undefined;
        } while (cursor);
      });

      return { success: true };
    } catch (error: any) {
      console.error("[EnvSyncWorkflow] Error:", error);
      throw error;
    }
  }
}
