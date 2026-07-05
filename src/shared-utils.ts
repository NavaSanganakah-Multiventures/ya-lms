/**
 * Shared utilities used by both index.ts and workflows.ts.
 * Breaks the circular dependency between them.
 */

import { createMimeMessage } from "mimetext";
// @ts-ignore
import { EmailMessage } from "cloudflare:email";

function escapeHtml(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getISTTime(date: Date | number | string = new Date()): string {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export async function sendAdminNotification(
  env: any,
  adminEmail: string,
  subject: string,
  title: string,
  htmlBody: string,
  textBody: string,
): Promise<boolean> {
  try {
    const msg = createMimeMessage();
    msg.setSender({ name: "Adityanveshan LMS", addr: "om@yagyaashram.com" });
    msg.setRecipient(adminEmail);
    msg.setSubject(subject);
    msg.addMessage({ contentType: "text/plain", data: textBody });
    msg.addMessage({ contentType: "text/html", data: htmlBody });
    const rawEmail = msg.asRaw();
    const emailMessage = new EmailMessage("om@yagyaashram.com", adminEmail, rawEmail);
    await env.SEND_EMAIL.send(emailMessage);
    return true;
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${adminEmail} (${subject}):`, error);
    return false;
  }
}

export async function indexLessonToAISearch(
  env: any,
  lesson: any,
): Promise<void> {
  try {
    if (!env.AI_SEARCH) {
      console.warn("[AI Search] AI_SEARCH binding missing, skipping index");
      return;
    }

    const instance = env.AI_SEARCH.get("ya-lms");
    const content = [
      lesson.title || "",
      lesson.text_content || "",
      lesson.text_content_hi || "",
    ].filter(Boolean).join("\n\n");

    if (!content.trim()) return;

    await instance.items.uploadAndPoll(`lesson-${lesson.id}.md`, content, {
      metadata: {
        lesson_id: lesson.id,
        course_id: lesson.course_id,
        title: lesson.title || "",
        type: lesson.type || "",
        chapter_title: lesson.chapter_title || "",
        order_index: lesson.order_index ?? 0,
      },
    });
  } catch (e) {
    console.error(`[AI Search] Index failed for lesson ${lesson.id}:`, e);
  }
}
