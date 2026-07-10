import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import type { Env } from "./index";
import { indexLessonToAISearch, sendAdminNotification } from "./shared-utils";
import { getTopologicallySortedTables } from "../db-migrate";

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
        // Step A: Get production tables (source of truth)
        const tablesRes = await env.DB.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
        const prodTables = tablesRes.results || [];

        // Step B: Get all preview tables and DROP them all (FK disabled)
        await env.PREVIEW_DB.prepare('PRAGMA defer_foreign_keys = ON').run().catch(() => {});

        const previewTablesRes = await env.PREVIEW_DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const previewTables = (previewTablesRes.results || [])
          .map((t: any) => t.name as string)
          .filter(n => n !== 'sqlite_sequence' && n !== '_cf_KV');

        if (previewTables.length > 0) {
          // Drop each table individually with error handling
          for (const name of previewTables) {
            const safeName = name.replace(/"/g, '""');
            await env.PREVIEW_DB.prepare(`DROP TABLE IF EXISTS "${safeName}"`).run()
              .catch(() => {});
          }
        }

        // Step C: Recreate all tables from Production schema in FK dependency order
        // Collect CREATE TABLE statements from prod schema, then topologically sort
        const validTableSqls: { name: string; sql: string }[] = [];
        for (const row of prodTables) {
          const tableName = row.name as string;
          const tableSql = row.sql as string;
          if (tableName === 'sqlite_sequence' || tableName === '_cf_KV' || !tableSql) continue;
          validTableSqls.push({ name: tableName, sql: tableSql });
        }

        const combinedSql = validTableSqls.map(t => t.sql).join(';\n');
        const sortedNames = getTopologicallySortedTables(combinedSql);
        const nameOrder = new Map(sortedNames.map((name, i) => [name, i]));
        const sortedTables = validTableSqls.sort((a, b) => (nameOrder.get(a.name) || 0) - (nameOrder.get(b.name) || 0));

        for (const { sql: tableSql } of sortedTables) {
          // Ensure IF NOT EXISTS is always present (handles both cases: with or without)
          let safeSql = tableSql
            .replace(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+/i, 'CREATE_TABLE_PLACEHOLDER ')
            .replace(/CREATE\s+TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ')
            .replace('CREATE_TABLE_PLACEHOLDER', 'CREATE TABLE IF NOT EXISTS');
          await env.PREVIEW_DB.prepare(safeSql).run().catch(e => {
            console.log(`[EnvSync] Table create warning: ${e}`);
          });
        }

        // Step D: Insert all data from Production into Preview in FK dependency order
        const sortedTableNames = sortedTables.map(t => t.name);
        await env.PREVIEW_DB.prepare('PRAGMA defer_foreign_keys = ON').run().catch(() => {});

        for (const tableName of sortedTableNames) {
          const safeTableName = tableName.replace(/"/g, '""');

          const BATCH_SIZE = 50;
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const rowsRes = await env.DB.prepare(`SELECT * FROM "${safeTableName}" LIMIT ? OFFSET ?`)
              .bind(BATCH_SIZE, offset)
              .all();

            const rows = rowsRes.results || [];
            if (rows.length === 0) { hasMore = false; break; }

            const columns = Object.keys(rows[0]);
            const placeholders = columns.map(() => '?').join(', ');
            const insertQuery = `INSERT INTO "${safeTableName}" (${columns.map(c => `"${c.replace(/"/g, '""')}"`).join(', ')}) VALUES (${placeholders})`;

            const stmt = env.PREVIEW_DB.prepare(insertQuery);
            const batchStmts = rows.map((r: any) => stmt.bind(...columns.map(c => r[c])));

            await env.PREVIEW_DB.batch(batchStmts).catch(e => console.log(`[EnvSync] Insert batch error in ${safeTableName}: ${e}`));

            if (rows.length < BATCH_SIZE) { hasMore = false; } else { offset += BATCH_SIZE; }
          }
        }
      });

      // 2. Sync KV (Reset and Clone)
      await step.do("syncKV", async () => {
        // Wipe Preview KV
        let prevCursor: string | undefined;
        do {
          const res: any = await env.PREVIEW_KV.list(prevCursor ? { cursor: prevCursor } : {});
          for (const key of res.keys) {
            await env.PREVIEW_KV.delete(key.name);
          }
          prevCursor = res.list_complete ? undefined : res.cursor;
        } while (prevCursor);

        // Copy Prod KV to Preview
        let cursor: string | undefined;
        do {
          const result: any = await env.PLATFORM_SECRETS.list(cursor ? { cursor } : {});
          for (const key of result.keys) {
            const value = await env.PLATFORM_SECRETS.get(key.name);
            if (value !== null) {
              await env.PREVIEW_KV.put(key.name, value);
            }
          }
          cursor = result.list_complete ? undefined : result.cursor;
        } while (cursor);
      });


      // 3. Sync R2 (Reset and Clone)
      await step.do("syncR2", async () => {
        // Wipe Preview R2
        let prevCursor: string | undefined;
        do {
          const result: any = await env.PREVIEW_STORAGE.list(prevCursor ? { cursor: prevCursor } : {});
          const keys = result.objects.map((o: any) => o.key);
          if (keys.length > 0) {
            await env.PREVIEW_STORAGE.delete(keys);
          }
          prevCursor = result.truncated ? result.cursor : undefined;
        } while (prevCursor);

        // Copy Prod R2 to Preview
        let cursor: string | undefined;
        do {
          const result: any = await env.STORAGE.list(cursor ? { cursor } : {});
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
