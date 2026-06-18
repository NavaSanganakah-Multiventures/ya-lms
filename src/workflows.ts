import { WorkflowEntrypoint } from "cloudflare:workers";
import type { Env } from "./index";

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

export class LessonTranscriptionWorkflow extends WorkflowEntrypoint<Env, TranscriptionParams> {
  async run(event: any, step: any) {
    const { lessonId, courseId, mediaKey, lessonType, title } = event.payload;
    const env = this.env;

    await step.do("init", async () => {
      console.log(`[Workflow] init: ${lessonId} (${lessonType})`);
      await env.DB.prepare(
        "UPDATE Lessons SET processing_status = 'processing' WHERE id = ?"
      ).bind(lessonId).run();
    });

    const { chunks } = await step.do("readAndPrepareMedia", async () => {
      const meta = await env.STORAGE.head(mediaKey);
      if (!meta) throw new Error(`Media not found: ${mediaKey}`);

      const totalSize = meta.size;
      const contentType = meta.httpMetadata?.contentType || "";
      const isVideoFormat = /^video\//.test(contentType);

      if (totalSize > 100 * 1024 * 1024) {
        throw new Error(`File too large for transcription: ${totalSize} bytes`);
      }

      if (isVideoFormat) {
        if (totalSize > 28 * 1024 * 1024) {
          console.warn(`[Workflow] Video >28MB (${totalSize} bytes), attempting direct processing`);
        }
        const object = await env.STORAGE.get(mediaKey);
        const buffer = await object!.arrayBuffer();
        return { chunks: [{ data: new Uint8Array(buffer), index: 0 }] };
      }

      const CHUNK_SIZE = 24 * 1024 * 1024;
      const object = await env.STORAGE.get(mediaKey);
      const buffer = await object!.arrayBuffer();
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
          const { safeSendEmail } = await import("./index");
          await safeSendEmail(
            env, adminEmail,
            `⚠️ No Text Extracted - ${title}`,
            "No Text in Media",
            `<p>No text could be extracted from the media for lesson: <strong>${title}</strong> (${lessonId})</p>
             <p>Type: ${lessonType}<br/>The audio/video may be silent or corrupted.</p>`,
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
        const { indexLessonToAISearch } = await import("./index");
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
        const subject = `✅ Transcription Complete - ${lessonData?.title || title}`;
        const htmlBody = `
          <h2 style="color:#16a34a;">Transcription Completed Successfully</h2>
          <table style="border-collapse:collapse;width:100%;max-width:600px;margin:16px 0;">
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Lesson</td><td style="padding:8px;border:1px solid #ddd;">${lessonData?.title || title}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Type</td><td style="padding:8px;border:1px solid #ddd;">${lessonType}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Language</td><td style="padding:8px;border:1px solid #ddd;">${langLabel}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Transcript Length</td><td style="padding:8px;border:1px solid #ddd;">${fullText.length} characters</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Chunks Processed</td><td style="padding:8px;border:1px solid #ddd;">${chunks.length}</td></tr>
          </table>
          <h3>Transcript Preview:</h3>
          <blockquote style="background:#f3f4f6;padding:16px;border-radius:8px;border-left:4px solid #16a34a;white-space:pre-wrap;">${fullText.substring(0, 1000)}...</blockquote>`;

        const { safeSendEmail } = await import("./index");
        await safeSendEmail(
          env, adminEmail, subject, "Transcription Complete",
          htmlBody,
          `Transcription complete for ${lessonData?.title || title}\nLength: ${fullText.length} chars\nLanguage: ${langLabel}\nChunks: ${chunks.length}`
        );
      }
    });

    return { success: true, textLength: fullText.length, chunksProcessed: chunks.length, language: isHindi ? "hindi" : "english" };
  }
}
