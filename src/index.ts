async function sendRedAlert(env: Env, subject: string, message: string) {
  try {
    const adminEmail = await getSecret(env, "ADMIN_CONTACT_EMAIL", false);
    if (!adminEmail) return;

    if (typeof safeSendEmail === "function") {
      const htmlBody = `
        <p><strong>Context:</strong> ${subject}</p>
        <p><strong>Error Details:</strong></p>
        <pre style="background: #fecaca; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 13px;">${message}</pre>
      `;
      const textBody = `Context: ${subject}\n\nError Details:\n${message}`;
      await safeSendEmail(
        env,
        adminEmail,
        `[URGENT] ${subject}`,
        `System Error: ${subject}`,
        htmlBody,
        textBody,
        true,
      );
    }
  } catch (e) {
    console.error("Failed to send red alert", e);
  }
}

import { PDFDocument, StandardFonts } from "pdf-lib";
import { createMimeMessage } from "mimetext";

export interface Env {
  DB: D1Database;
  PLATFORM_SECRETS: KVNamespace;
  STORAGE: R2Bucket;
  ENVIRONMENT: string;
  SEND_EMAIL: { send: (msg: any) => Promise<void> };
  AI: any;
}

/**
 * Returns current time in India Standard Time (IST) for display in emails/UI.
 */
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

/**
 * Returns current time in UTC ISO string for consistent DB storage.
 */
function getUTCNow(): string {
  return new Date().toISOString();
}

/**
 * Extracts IP from request headers.
 */
function getClientIP(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "Unknown"
  );
}

async function getSecret(
  env: Env,
  key: string,
  isCritical = true,
): Promise<string | null> {
  const val = await env.PLATFORM_SECRETS.get(key);
  if (!val && isCritical) {
    console.warn(`[Config Missing] Key: ${key}`);
    // Trigger alert without blocking
    sendRedAlert(
      env,
      "Missing Configuration",
      `Critical configuration key '${key}' is missing or empty in PLATFORM_SECRETS.`,
    );
  }
  return val;
}

async function signJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };

  const base64UrlEncode = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(dataToSign),
  );
  const encodedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${dataToSign}.${encodedSignature}`;
}

// --- Global Error Handler ---

async function sendWhatsAppAlert(env: Env, context: string, error: any) {
  try {
    const apiKey = await getSecret(env, "INFOBIP_API_KEY");
    const baseUrl = await getSecret(env, "INFOBIP_BASE_URL");
    const adminWhatsApp = await getSecret(env, "ADMIN_WHATSAPP_NUMBER");

    if (!apiKey || !baseUrl || !adminWhatsApp) return;

    const message = `[YAGYA LMS ERROR]\nContext: ${context}\nError: ${error instanceof Error ? error.message : String(error).substring(0, 500)}`;

    await fetch(`${baseUrl.replace(/\/$/, "")}/whatsapp/1/message/text`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "919669509950",
        to: adminWhatsApp,
        content: { text: message },
      }),
    });
  } catch (e) {
    console.error("Failed to send WhatsApp alert:", e);
  }
}

async function handleGlobalError(
  error: any,
  context: string,
  env: Env,
  request?: Request,
): Promise<Response> {
  console.error(`[${context}] Error:`, error);

  // Do not send alerts for standard auth failures
  if (
    error?.message === "Unauthorized" ||
    error?.message === "Session Expired"
  ) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extract metadata if request is provided
  let userId = "Guest";
  let url = "N/A";
  if (request) {
    url = request.url;
    try {
      const token = getCookie(request, "session");
      if (token) {
        const jwtSecret = await getSecret(env, "JWT_SECRET");
        if (!jwtSecret) throw new Error("JWT_SECRET missing");
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub || "Unknown";
      }
    } catch (e) { }
  }

  // Trigger Real-time Alerts
  const errorDetails =
    error instanceof Error ? error.stack || error.message : String(error);

  const detailedMessage = `URL: ${url}\nUser ID: ${userId}\nContext: ${context}\n\n${errorDetails}`;

  await Promise.allSettled([
    sendRedAlert(env, context, detailedMessage),
    sendWhatsAppAlert(env, context, detailedMessage),
  ]);

  // Hide raw error details from end user for security
  return new Response(
    JSON.stringify({
      error: "System Error. The administration has been notified.",
    }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    },
  );
}

async function handleReportError(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body = (await request.json()) as any;
    const { message, stack, url, userId, deviceInfo, componentStack, type } = body;
    const context = type || "Frontend Error Report";
    const detailedMessage = `URL: ${url || "N/A"}
User ID: ${userId || "Guest"}
Device: ${deviceInfo || "N/A"}
Type: ${context}

${message || "No message"}

Stack Trace:
${stack || "No stack trace"}

Component Stack:
${componentStack || "No component stack"}`;

    const errorSession = await createErrorSessionFromPayload(env, {
      source: "frontend",
      context,
      title: context,
      errorMessage: message || "No message",
      stackTrace: [stack, componentStack ? `Component Stack:
${componentStack}` : ""]
        .filter(Boolean)
        .join("\n\n"),
      fullPayload: body,
      url: url || null,
      userId: userId || null,
      deviceInfo: deviceInfo || null,
    });

    const origin = new URL(request.url).origin;
    const sessionLine = `Error Session: ${errorSession.id}
Admin Link: ${origin}/admin/error-sessions?selected=${encodeURIComponent(errorSession.id)}
Status: ${errorSession.duplicate ? "Duplicate captured" : "New session created"}`;

    await Promise.allSettled([
      sendRedAlert(env, context, `${sessionLine}

${detailedMessage}`),
      sendWhatsAppAlert(env, context, `${sessionLine}

${detailedMessage}`),
      errorSession.duplicate
        ? Promise.resolve()
        : runErrorAutomation(env, errorSession.id),
    ]);

    return new Response(JSON.stringify({
      success: true,
      errorSessionId: errorSession.id,
      duplicate: errorSession.duplicate,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error reporting failed:", error);
    return new Response(JSON.stringify({ error: "Failed to report error" }), {
      status: 500,
    });
  }
}


// --- Error Session & Jules Automation ---

type ErrorSessionCreateInput = {
  source: "frontend" | "worker" | "inbound_email" | "manual";
  context: string;
  title?: string | null;
  errorMessage: string;
  stackTrace?: string | null;
  fullPayload?: any;
  url?: string | null;
  userId?: string | null;
  deviceInfo?: string | null;
  emailFrom?: string | null;
  emailTo?: string | null;
  emailSubject?: string | null;
};

function safeParseJsonValue<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (_) {
    return fallback;
  }
}

function truncateText(value: string | null | undefined, max = 24000): string {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}\n...[truncated ${value.length - max} chars]` : value;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function inferErrorSeverity(message: string, stackTrace?: string | null): string {
  const haystack = `${message}\n${stackTrace || ""}`.toLowerCase();
  if (/database|d1|payment|razorpay|jwt_secret|unauthorized|forbidden|data loss|delete|security/.test(haystack)) {
    return "critical";
  }
  if (/typeerror|referenceerror|syntaxerror|failed|exception|unhandled|500/.test(haystack)) {
    return "high";
  }
  if (/warning|missing|timeout/.test(haystack)) return "medium";
  return "low";
}

function extractStackFiles(stackTrace: string): string[] {
  const matches = new Set<string>();
  for (const match of stackTrace.matchAll(/(?:app|components|src|lib|hooks|contexts)\/[A-Za-z0-9_./\-[\]]+\.(?:ts|tsx|js|jsx)/g)) {
    matches.add(match[0]);
  }
  return Array.from(matches).slice(0, 12);
}

async function createErrorSessionFromPayload(
  env: Env,
  input: ErrorSessionCreateInput,
): Promise<{ id: string; duplicate: boolean }> {
  const normalizedMessage = truncateText(input.errorMessage, 4000);
  const normalizedStack = truncateText(input.stackTrace || "", 12000);
  const fingerprint = await sha256Hex([
    input.source,
    input.context,
    normalizedMessage,
    normalizedStack.split("\n").slice(0, 8).join("\n"),
    input.url ? new URL(input.url, "https://lms.yagyaashram.com").pathname : "",
  ].join("\n---\n"));

  const existing: any = await env.DB.prepare(
    `SELECT id FROM ErrorSessions
     WHERE fingerprint = ? AND created_at >= datetime('now', '-30 minutes')
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(fingerprint).first();

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE ErrorSessions
       SET repeat_count = COALESCE(repeat_count, 1) + 1,
           last_seen_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP,
           full_payload = ?
       WHERE id = ?`,
    ).bind(JSON.stringify(input.fullPayload || {}), existing.id).run();
    await appendErrorSessionEvent(env, existing.id, "duplicate_received", input.fullPayload || input);
    return { id: existing.id, duplicate: true };
  }

  const id = generateCustomId("YA-ERR");
  const severity = inferErrorSeverity(normalizedMessage, normalizedStack);
  const title = truncateText(input.title || input.context || normalizedMessage.split("\n")[0], 240);
  await env.DB.prepare(
    `INSERT INTO ErrorSessions (
      id, fingerprint, source, status, severity, title, error_message, stack_trace,
      full_payload, url, user_id, device_info, email_from, email_to, email_subject,
      repeat_count, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
  ).bind(
    id,
    fingerprint,
    input.source,
    "new",
    severity,
    title,
    normalizedMessage,
    normalizedStack,
    JSON.stringify(input.fullPayload || {}),
    input.url || null,
    input.userId || null,
    input.deviceInfo || null,
    input.emailFrom || null,
    input.emailTo || null,
    input.emailSubject || null,
  ).run();

  await appendErrorSessionEvent(env, id, "received", input.fullPayload || input);
  return { id, duplicate: false };
}

async function appendErrorSessionEvent(env: Env, errorSessionId: string, type: string, payload: any) {
  await env.DB.prepare(
    "INSERT INTO ErrorSessionEvents (id, error_session_id, type, payload) VALUES (?, ?, ?, ?)",
  ).bind(generateCustomId("YA-EVT"), errorSessionId, type, JSON.stringify(payload || {})).run();
}

async function getErrorSessionById(env: Env, id: string): Promise<any> {
  return env.DB.prepare("SELECT * FROM ErrorSessions WHERE id = ?").bind(id).first();
}

function buildFallbackJulesPrompt(session: any): string {
  const files = extractStackFiles(session.stack_trace || "");
  return `You are Jules, working on the Yagya Ashram LMS Next.js + Cloudflare Workers repository.

Fix this production error with the smallest safe patch.

Error session: ${session.id}
Source: ${session.source}
Severity: ${session.severity}
URL: ${session.url || "N/A"}
User ID: ${session.user_id || "Guest"}
Title: ${session.title}

Error message:
${session.error_message || "N/A"}

Stack trace / details:
${truncateText(session.stack_trace || "No stack trace", 12000)}

Likely related files from stack:
${files.length ? files.map((f) => `- ${f}`).join("\n") : "- src/index.ts\n- app/**\n- components/**"}

Instructions:
1. Identify the root cause.
2. Modify only the necessary files.
3. Preserve existing behavior and security checks.
4. Add or update tests where practical.
5. Run lint/tests and summarize results.
6. Commit the fix on the current branch.

If the error is configuration-only, explain the missing secret/config and add safe guards where possible.`;
}

async function generateJulesRepairPrompt(env: Env, session: any): Promise<string> {
  const fallback = buildFallbackJulesPrompt(session);
  try {
    const aiResult = await generateAIContent([
      {
        role: "system",
        content: `You write excellent repair prompts for Jules, an autonomous coding agent. Return JSON only: {"prompt":"..."}. The prompt must be specific, safe, and actionable.`,
      },
      {
        role: "user",
        content: fallback,
      },
    ], env, true);
    const parsed = JSON.parse(sanitizeJson(aiResult));
    return parsed.prompt || fallback;
  } catch (e) {
    console.warn("[Error Automation] AI prompt generation failed, using fallback:", e);
    return fallback;
  }
}

async function sendPromptToJules(env: Env, errorSessionId: string, prompt: string): Promise<any> {
  const apiUrl = await getSecret(env, "JULES_API_URL", false);
  const apiKey = await getSecret(env, "JULES_API_KEY", false);
  const projectId = await getSecret(env, "JULES_PROJECT_ID", false);
  const jobId = generateCustomId("YA-JLS");

  await env.DB.prepare(
    "INSERT INTO JulesJobs (id, error_session_id, prompt, status) VALUES (?, ?, ?, ?)",
  ).bind(jobId, errorSessionId, prompt, apiUrl && apiKey ? "queued" : "awaiting_config").run();

  if (!apiUrl || !apiKey) {
    const message = "Jules API is not configured. Set JULES_API_URL and JULES_API_KEY in PLATFORM_SECRETS to enable auto-send.";
    await env.DB.prepare(
      "UPDATE JulesJobs SET status = ?, response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind("awaiting_config", JSON.stringify({ message }), jobId).run();
    await appendErrorSessionEvent(env, errorSessionId, "jules_awaiting_config", { jobId, message });
    return { jobId, status: "awaiting_config", message };
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        errorSessionId,
        prompt,
        source: "ya-lms-error-automation",
      }),
    });
    const responseText = await res.text();
    const responseJson = safeParseJsonValue<any>(responseText, { raw: responseText });
    const julesSessionId = responseJson.sessionId || responseJson.id || responseJson.jobId || null;
    const status = res.ok ? "sent" : "failed";

    await env.DB.prepare(
      "UPDATE JulesJobs SET status = ?, jules_session_id = ?, response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(status, julesSessionId, JSON.stringify(responseJson), jobId).run();
    await appendErrorSessionEvent(env, errorSessionId, res.ok ? "jules_sent" : "jules_failed", {
      jobId,
      status: res.status,
      response: responseJson,
    });
    return { jobId, status, julesSessionId, response: responseJson };
  } catch (e: any) {
    await env.DB.prepare(
      "UPDATE JulesJobs SET status = ?, response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind("failed", JSON.stringify({ error: e?.message || String(e) }), jobId).run();
    await appendErrorSessionEvent(env, errorSessionId, "jules_failed", { jobId, error: e?.message || String(e) });
    return { jobId, status: "failed", error: e?.message || String(e) };
  }
}

async function runErrorAutomation(env: Env, errorSessionId: string, forceSend = false) {
  const session = await getErrorSessionById(env, errorSessionId);
  if (!session) return { error: "Error session not found" };

  const prompt = await generateJulesRepairPrompt(env, session);
  await env.DB.prepare(
    "UPDATE ErrorSessions SET ai_prompt = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).bind(prompt, "ai_prompted", errorSessionId).run();
  await appendErrorSessionEvent(env, errorSessionId, "ai_prompt_created", { prompt });

  const autoSendSetting = await getSecret(env, "JULES_AUTO_SEND_ENABLED", false);
  const autoSend = autoSendSetting !== "false";
  if (forceSend || autoSend) {
    const result = await sendPromptToJules(env, errorSessionId, prompt);
    await env.DB.prepare(
      "UPDATE ErrorSessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(result.status === "sent" ? "sent_to_jules" : result.status, errorSessionId).run();
    return { prompt, jules: result };
  }

  return { prompt, jules: { status: "manual_approval_required" } };
}

async function handleAdminErrorSessions(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/admin\/error-sessions(?:\/([^/]+)(?:\/([^/]+))?)?$/);
    const id = match?.[1] ? decodeURIComponent(match[1]) : null;
    const action = match?.[2] || null;

    if (!id && request.method === "GET") {
      const status = url.searchParams.get("status");
      const source = url.searchParams.get("source");
      const bindings: any[] = [];
      const where: string[] = [];
      if (status && status !== "all") {
        where.push("status = ?");
        bindings.push(status);
      }
      if (source && source !== "all") {
        where.push("source = ?");
        bindings.push(source);
      }
      const query = `SELECT id, source, status, severity, title, error_message, url, user_id,
          email_from, email_subject, repeat_count, last_seen_at, created_at, updated_at
        FROM ErrorSessions ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY datetime(updated_at) DESC LIMIT 100`;
      const { results } = await env.DB.prepare(query).bind(...bindings).all();
      return jsonResponse({ sessions: results });
    }

    if (!id) return jsonResponse({ error: "Missing error session id" }, 400);

    if (request.method === "GET") {
      const session = await getErrorSessionById(env, id);
      if (!session) return jsonResponse({ error: "Error session not found" }, 404);
      const events = await env.DB.prepare(
        "SELECT * FROM ErrorSessionEvents WHERE error_session_id = ? ORDER BY created_at ASC LIMIT 200",
      ).bind(id).all();
      const jobs = await env.DB.prepare(
        "SELECT * FROM JulesJobs WHERE error_session_id = ? ORDER BY created_at DESC LIMIT 20",
      ).bind(id).all();
      return jsonResponse({ session, events: events.results, jobs: jobs.results });
    }

    if (request.method === "POST" && action === "generate-prompt") {
      const result = await runErrorAutomation(env, id, false);
      return jsonResponse(result);
    }

    if (request.method === "POST" && action === "send-to-jules") {
      const session = await getErrorSessionById(env, id);
      if (!session) return jsonResponse({ error: "Error session not found" }, 404);
      const prompt = session.ai_prompt || (await generateJulesRepairPrompt(env, session));
      if (!session.ai_prompt) {
        await env.DB.prepare(
          "UPDATE ErrorSessions SET ai_prompt = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        ).bind(prompt, "ai_prompted", id).run();
        await appendErrorSessionEvent(env, id, "ai_prompt_created", { prompt });
      }
      const result = await sendPromptToJules(env, id, prompt);
      await env.DB.prepare(
        "UPDATE ErrorSessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(result.status === "sent" ? "sent_to_jules" : result.status, id).run();
      return jsonResponse(result);
    }

    if (request.method === "POST" && action === "ignore") {
      await env.DB.prepare(
        "UPDATE ErrorSessions SET status = 'ignored', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(id).run();
      await appendErrorSessionEvent(env, id, "ignored", { by: "admin" });
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Route not found" }, 404);
  } catch (error) {
    return handleGlobalError(error, "Admin.ErrorSessions", env, request);
  }
}

function getEmailHeader(message: any, name: string): string {
  try {
    const headers = message.headers;
    if (headers?.get) return headers.get(name) || "";
    if (Array.isArray(headers)) {
      const found = headers.find((h: any) => String(h.name || h[0]).toLowerCase() === name.toLowerCase());
      return found?.value || found?.[1] || "";
    }
  } catch (_) {}
  return "";
}

async function handleInboundErrorEmail(message: any, env: Env) {
  await initDbAndSeed(env);
  const to = String(message.to || getEmailHeader(message, "to") || "").toLowerCase();
  if (!to.includes("alert-error@lms.yagyaashram.com")) {
    console.log(`[Email Routing] Ignored inbound email for ${to || "unknown recipient"}`);
    return;
  }

  const from = String(message.from || getEmailHeader(message, "from") || "unknown");
  const subject = String(getEmailHeader(message, "subject") || message.subject || "Inbound error alert");
  const raw = message.raw ? await new Response(message.raw).text() : JSON.stringify(message);
  const body = truncateText(raw, 50000);
  const session = await createErrorSessionFromPayload(env, {
    source: "inbound_email",
    context: "Inbound Error Email",
    title: subject,
    errorMessage: subject,
    stackTrace: body,
    fullPayload: { from, to, subject, raw: body },
    emailFrom: from,
    emailTo: to,
    emailSubject: subject,
  });

  if (!session.duplicate) {
    await runErrorAutomation(env, session.id);
  }

  await sendRedAlert(
    env,
    "Inbound Error Email Captured",
    `Error Session: ${session.id}\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\nDuplicate: ${session.duplicate}`,
  );
}

// --- Email Utilities (Centralized Engine) ---

export function generateEmailHTML(
  title: string,
  bodyContent: string,
  siteName: string = "Adityanveshan",
  dashboardName: string = "Adityanveshan Swadhyaya Vedika",
  childCompany: string = "Yagya Ashram",
): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">🙏 ${title}</h1>
      </div>
      <div style="background: #f8fafc; padding: 32px; color: #334155;">
        ${bodyContent}
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: center;">
          <p style="margin: 0;">Om! 🙏</p>
          <p style="margin: 4px 0 0 0;">${dashboardName} (${childCompany})</p>
        </div>
      </div>
    </div>
  `;
}

export function generateRedAlertHTML(
  title: string,
  bodyContent: string,
  siteName: string = "Adityanveshan",
): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1), 0 2px 4px -1px rgba(239, 68, 68, 0.06);">
      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">🚨 ${title}</h1>
      </div>
      <div style="background: #fff1f2; padding: 32px; color: #881337;">
        ${bodyContent}
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #fecaca; color: #9f1239; font-size: 14px; text-align: center;">
          <p style="margin: 0;">System Generated Alert</p>
          <p style="margin: 4px 0 0 0;">${siteName} LMS</p>
        </div>
      </div>
    </div>
  `;
}

async function getSiteSettings(env: Env): Promise<Record<string, string>> {
  try {
    const { results } = await env.DB.prepare(
      "SELECT key, value FROM SiteSettings",
    ).all();
    const settings: Record<string, string> = {};
    results.forEach((row: any) => {
      settings[row.key] = row.value;
    });
    return settings;
  } catch (error) {
    console.error("[Settings Error] Failed to fetch settings from DB:", error);
    return {};
  }
}

export async function safeSendEmail(
  env: Env,
  to: string,
  subject: string,
  title: string,
  bodyHtmlContent: string,
  bodyText: string,
  useRedAlert: boolean = false,
): Promise<boolean> {
  try {
    const settings = await getSiteSettings(env);

    const siteName = settings?.site_name || "Adityanveshan";
    const dashboardName =
      settings?.dashboard_name || "Adityanveshan Swadhyaya Vedika";
    const childCompany = settings?.child_company || "Yagya Ashram";

    // Properly quote the display name to avoid issues with special characters
    const fromName = `${siteName} (${childCompany})`.replace(/"/g, "'");

    const payload: any = {
      from: `"${fromName}" <om@yagyaashram.com>`,
      to: to,
      subject: subject,
      text: bodyText,
      html: useRedAlert
        ? generateRedAlertHTML(title, bodyHtmlContent, siteName)
        : generateEmailHTML(
          title,
          bodyHtmlContent,
          siteName,
          dashboardName,
          childCompany,
        ),
    };
    await env.SEND_EMAIL.send(payload);
    return true;
  } catch (error) {
    console.error(
      `[Email Error] Failed to send email to ${to} (${subject}):`,
      error,
    );
    return false;
  }
}

// --- Admin & Security Notifications ---

async function getAdminEmails(env: Env): Promise<string[]> {
  try {
    const { results } = await env.DB.prepare(
      "SELECT email FROM Users WHERE role = 'admin'",
    ).all();
    return results.map((r: any) => r.email);
  } catch (e) {
    console.error("Failed to fetch admin emails:", e);
    return ["navasanganakah@gmail.com"]; // Fallback
  }
}

async function notifyAdmins(
  env: Env,
  subject: string,
  title: string,
  html: string,
  text: string,
) {
  const adminEmails = await getAdminEmails(env);
  await Promise.allSettled(
    adminEmails.map((email) => safeSendEmail(env, email, subject, title, html, text))
  );
}

async function logAdminActivity(
  env: Env,
  adminEmail: string,
  action: string,
  details: string,
  ip: string = "Unknown",
) {
  const subject = `🛡️ Admin Activity Alert: ${action}`;
  const title = "Admin Activity Logged";
  const html = `
    <p><strong>Admin:</strong> ${adminEmail}</p>
    <p><strong>Action:</strong> ${action}</p>
    <p><strong>Details:</strong> ${details}</p>
    <p><strong>IP Address:</strong> ${ip}</p>
    <p><strong>Time (IST):</strong> ${getISTTime()}</p>
  `;
  const text = `Admin Activity Alert\nAdmin: ${adminEmail}\nAction: ${action}\nDetails: ${details}\nIP: ${ip}\nTime: ${getISTTime()}`;
  await notifyAdmins(env, subject, title, html, text);
}

async function handleSendOTP(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    let { email, type } = (await request.json()) as any;
    if (!email)
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
      });
    email = email.toLowerCase();

    // Check if user exists based on auth type
    const userExists: any = await env.DB.prepare(
      "SELECT id FROM Users WHERE email = ?",
    )
      .bind(email)
      .first();

    if (type === "register" && userExists) {
      return new Response(
        JSON.stringify({ error: "Email already registered. Please login." }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    if (type === "login" && !userExists) {
      return new Response(
        JSON.stringify({ error: "Email not registered. Please register first." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: Prevent sending more than 1 OTP per minute
    const existingOtp: any = await env.DB.prepare(
      "SELECT expires_at FROM OTPs WHERE email = ?",
    )
      .bind(email)
      .first();

    if (existingOtp && existingOtp.expires_at) {
      const remainingTime =
        new Date(existingOtp.expires_at).getTime() - Date.now();
      // If remaining time is more than 9 minutes (540,000 ms), OTP was sent less than 1 min ago
      if (remainingTime > 9 * 60 * 1000) {
        return new Response(
          JSON.stringify({
            error: "Please wait 1 minute before requesting a new OTP.",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    const otp = generateSecureOTP(); // 6 digit secure OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await env.DB.prepare(
      "INSERT OR REPLACE INTO OTPs (email, otp, expires_at) VALUES (?, ?, ?)",
    )
      .bind(email, otp, expiresAt)
      .run();

    // Log for local dev viewing just in case
    console.log(`[OTP GENERATED] Email: ${email} | OTP: ${otp}`);

    // Call Cloudflare Email Service implementation via safe wrapper
    const textContent = `Namaste,\n\nYour OTP for logging into the Adityanveshan LMS is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nOm!`;
    const htmlContent = `
      <p>Namaste,</p>
      <p>Your OTP for logging into the Adityanveshan LMS is: <strong style="font-size: 20px; color: #4f46e5;">${otp}</strong></p>
      <p>This OTP is valid for 10 minutes.</p>
    `;

    // Background execution to remove email sending from the critical path
    ctx.waitUntil((async () => {
      const success = await safeSendEmail(
        env,
        email,
        "Your LMS Login OTP Code",
        "Login OTP",
        htmlContent,
        textContent,
      );
      if (!success) {
        console.error(`[OTP Send Failed] Deleting OTP for ${email} so user can retry.`);
        await env.DB.prepare("DELETE FROM OTPs WHERE email = ?").bind(email).run();
      }
    })());

    return new Response(
      JSON.stringify({ message: "OTP sent successfully to your email." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "Auth.SendOTP", env, request);
  }
}

async function handleVerifyOTP(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    let { email, otp } = (await request.json()) as any;
    if (!email || !otp)
      return new Response(JSON.stringify({ error: "Email and OTP required" }), {
        status: 400,
      });
    email = email.toLowerCase();

    const record: any = await env.DB.prepare(
      "SELECT otp, expires_at FROM OTPs WHERE email = ?",
    )
      .bind(email)
      .first();

    if (!record || record.otp !== String(otp)) {
      return new Response(JSON.stringify({ error: "Invalid OTP" }), {
        status: 401,
      });
    }

    if (new Date(record.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "OTP has expired" }), {
        status: 401,
      });
    }

    // OTP Valid. Delete it to prevent reuse.
    await env.DB.prepare("DELETE FROM OTPs WHERE email = ?").bind(email).run();

    // Fetch user to verify they exist
    let user: any = await env.DB.prepare(
      "SELECT id, role, full_name, phone, birth_date, father_name, mother_name, grand_father_name FROM Users WHERE email = ?",
    )
      .bind(email)
      .first();
    let isNew = false;
    const assignedRole =
      email === "admin@edtech.com" || email === "navasanganakah@gmail.com"
        ? "admin"
        : "student";

    if (!user) {
      // Auto-registration is disabled per requirements to prevent incomplete user data
      return new Response(JSON.stringify({ error: "Email not registered. Please register first." }), {
        status: 404,
      });
    } else {
      if (
        (email === "admin@edtech.com" ||
          email === "navasanganakah@gmail.com") &&
        user.role !== "admin"
      ) {
        user.role = "admin";
        await env.DB.prepare("UPDATE Users SET role = ? WHERE email = ?")
          .bind("admin", email)
          .run();
      }
    }

    const jwtSecret = await getSecret(env, "JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET missing");

    // Role-based session duration: admin/teacher = 2.5h, student = 1.5h
    const sessionSeconds =
      user.role === "admin" || user.role === "teacher"
        ? 2.5 * 60 * 60
        : 1.5 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    const sessionId = crypto.randomUUID();

    await env.DB.prepare("UPDATE Users SET current_session_id = ? WHERE id = ?")
      .bind(sessionId, user.id)
      .run();

    const token = await signJWT(
      {
        sub: user.id,
        role: user.role,
        sessionId: sessionId,
        iat: now,
        exp: now + sessionSeconds,
      },
      jwtSecret,
    );

    const response = new Response(
      JSON.stringify({
        message: "Login successful",
        role: user.role,
        isNew,
        sessionDuration: sessionSeconds,
        profileComplete: !!(
          user.full_name &&
          user.phone &&
          user.birth_date &&
          user.father_name &&
          user.mother_name &&
          user.grand_father_name
        ),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );

    // Cookie Max-Age matches JWT expiry exactly
    response.headers.append(
      "Set-Cookie",
      `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionSeconds}`,
    );

    // --- Login Security Alerts ---
    try {
      const clientIp = getClientIP(request);
      const loginTime = getISTTime();
      const loginSubject = `🔓 Login Alert: ${user.role.toUpperCase()}`;
      const loginTitle = "New Login Detected";
      const loginHtml = `
        <p>Namaste,</p>
        <p>Your account (<strong>${email}</strong>) was just logged into the Adityanveshan LMS.</p>
        <p><strong>Time (IST):</strong> ${loginTime}</p>
        <p><strong>IP Address:</strong> ${clientIp}</p>
        <p>If this wasn't you, please contact support immediately.</p>
      `;
      const loginText = `Namaste,\n\nYour account (${email}) was just logged into the Adityanveshan LMS.\nTime: ${loginTime}\nIP: ${clientIp}\n\nIf this wasn't you, please contact support immediately.`;

      if (user.role === "admin") {
        // For Admins, we only send ONE consolidated email to all admins (including the one logging in)
        ctx.waitUntil(logAdminActivity(
          env,
          email,
          "Successful Login",
          `Admin session started for ${sessionSeconds / 3600} hours.`,
          clientIp,
        ));
      } else {
        // For Students/Teachers, send individual login alert
        ctx.waitUntil(safeSendEmail(
          env,
          email,
          loginSubject,
          loginTitle,
          loginHtml,
          loginText,
        ));
      }
    } catch (loginAlertError) {
      console.error("Failed to enqueue login alert:", loginAlertError);
    }

    return response;
  } catch (error) {
    return handleGlobalError(error, "Auth.VerifyOTP", env, request);
  }
}

async function handleRegister(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    let { full_name, email, phone, country, district, otp } =
      (await request.json()) as any;
    if (!email || !otp || !full_name)
      return new Response(
        JSON.stringify({ error: "Required fields missing" }),
        { status: 400 },
      );
    email = email.toLowerCase();

    const record: any = await env.DB.prepare(
      "SELECT otp, expires_at FROM OTPs WHERE email = ?",
    )
      .bind(email)
      .first();
    if (!record || record.otp !== String(otp))
      return new Response(JSON.stringify({ error: "Invalid OTP" }), {
        status: 401,
      });
    if (new Date(record.expires_at) < new Date())
      return new Response(JSON.stringify({ error: "OTP has expired" }), {
        status: 401,
      });

    await env.DB.prepare("DELETE FROM OTPs WHERE email = ?").bind(email).run();

    const existingUser = await env.DB.prepare(
      "SELECT id FROM Users WHERE email = ?",
    )
      .bind(email)
      .first();
    if (existingUser)
      return new Response(
        JSON.stringify({ error: "Email already registered. Please login." }),
        { status: 409 },
      );

    const generatedId = await generateStudentId(
      env.DB,
      country || "IN",
      district || "XX",
      full_name || "X",
    );
    const role = "student";

    await env.DB.prepare(
      "INSERT INTO Users (id, email, role, full_name, phone, country, district) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        generatedId,
        email,
        role,
        full_name,
        phone || null,
        country || "IN",
        district || "01",
      )
      .run();

    // Send Welcome Email
    const welcomeHtml = `
      <p style="font-size:16px;">नमस्ते <strong>${full_name}</strong>,</p>
      <p>आपका Adityanveshan LMS पर account बन गया है।</p>
      <p><strong>Student ID:</strong> <code style="background:#ede9fe;padding:4px 8px;border-radius:6px;color:#4f46e5;">${generatedId}</code></p>
      <p>Login करने के लिए अपना email (<strong>${email}</strong>) use करें और OTP से verify करें।</p>
    `;
    const welcomeText = `नमस्ते ${full_name},\n\nआपका Adityanveshan LMS पर account बन गया है।\nStudent ID: ${generatedId}\n\nLogin करने के लिए अपना email (${email}) use करें और OTP से verify करें।`;
    ctx.waitUntil(safeSendEmail(
      env,
      email,
      "Welcome to Adityanveshan",
      "यज्ञ आश्रम में स्वागत!",
      welcomeHtml,
      welcomeText,
    ));

    const jwtSecret = await env.PLATFORM_SECRETS.get("JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET missing");
    const sessionSeconds = 1.5 * 60 * 60; // student = 1.5h
    const now = Math.floor(Date.now() / 1000);
    const sessionId = crypto.randomUUID();

    await env.DB.prepare("UPDATE Users SET current_session_id = ? WHERE id = ?")
      .bind(sessionId, generatedId)
      .run();

    const token = await signJWT(
      {
        sub: generatedId,
        id: generatedId,
        role,
        email,
        sessionId: sessionId,
        iat: now,
        exp: now + sessionSeconds,
      },
      jwtSecret,
    );

    const response = new Response(
      JSON.stringify({ message: "Registration successful", id: generatedId }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );

    response.headers.append(
      "Set-Cookie",
      `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionSeconds}`,
    );
    return response;
  } catch (error) {
    return handleGlobalError(error, "Auth.Register", env, request);
  }
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const response = new Response(
    JSON.stringify({ message: "Logout successful" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
  response.headers.append(
    "Set-Cookie",
    "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  );
  return response;
}

// POST /api/auth/refresh — Activity ping: validates session & checks inactivity (1 hour limit)
// Returns new token if active, 401 if expired or inactive >1h
async function handleRefreshSession(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const token = getCookie(request, "session");
    if (!token)
      return new Response(JSON.stringify({ error: "No session" }), {
        status: 401,
      });

    const jwtSecret = await getSecret(env, "JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET missing");
    let payload: any;
    try {
      payload = await verifyJWT(token, jwtSecret);
    } catch (e) {
      // Token expired or invalid
      const expiredRes = new Response(
        JSON.stringify({ error: "Session expired", code: "SESSION_EXPIRED" }),
        { status: 401 },
      );
      expiredRes.headers.append(
        "Set-Cookie",
        "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
      );
      return expiredRes;
    }

    // Inactivity check — match the session duration limits
    const INACTIVITY_LIMIT =
      payload.role === "admin" || payload.role === "teacher"
        ? 2.5 * 60 * 60
        : 1.5 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    const lastActivity = payload.iat || now;

    if (now - lastActivity > INACTIVITY_LIMIT) {
      const inactiveRes = new Response(
        JSON.stringify({
          error: "Logged out due to inactivity",
          code: "INACTIVITY_LOGOUT",
        }),
        { status: 401 },
      );
      inactiveRes.headers.append(
        "Set-Cookie",
        "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
      );
      return inactiveRes;
    }

    if (payload.sessionId) {
      const user: any = await env.DB.prepare(
        "SELECT current_session_id FROM Users WHERE id = ?",
      )
        .bind(payload.sub)
        .first();
      if (!user || user.current_session_id !== payload.sessionId) {
        const expiredRes = new Response(
          JSON.stringify({
            error: "Logged in from another device",
            code: "SESSION_EXPIRED",
          }),
          { status: 401 },
        );
        expiredRes.headers.append(
          "Set-Cookie",
          "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        );
        return expiredRes;
      }
    }

    // Active — issue refreshed token with new iat but same exp (do not extend total session)
    const newToken = await signJWT(
      {
        sub: payload.sub,
        role: payload.role,
        sessionId: payload.sessionId,
        iat: now, // reset activity timestamp
        exp: payload.exp, // keep original expiry
      },
      jwtSecret,
    );

    const sessionSeconds =
      payload.role === "admin" || payload.role === "teacher"
        ? 2.5 * 60 * 60
        : 1.5 * 60 * 60;
    const res = new Response(
      JSON.stringify({ ok: true, role: payload.role, exp: payload.exp }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
    res.headers.append(
      "Set-Cookie",
      `session=${newToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${sessionSeconds}`,
    );
    return res;
  } catch (error) {
    return handleGlobalError(error, "Auth.Refresh", env, request);
  }
}

// --- Secure Random & ID Utilities ---

function generateSecureOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % 900000 + 100000).toString();
}

// --- JWT & Cookie Utilities ---

function generateCustomId(prefix: string): string {
  const randomPart = crypto.randomUUID().substring(0, 8).toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-4);
  return `${prefix}-${randomPart}${timestampPart}`;
}

function generateBatchId(courseId: string): string {
  const safeId = courseId || "UNKNOWN";
  // Extract clean suffix (e.g., YA-CRS-JYOTISH -> JYOTISH)
  const suffix =
    typeof safeId === "string" ? safeId.replace("YA-CRS-", "") : "RAND";
  const dateStr =
    new Date().getFullYear().toString().slice(-2) +
    (new Date().getMonth() + 1).toString().padStart(2, "0");
  const randomPart = crypto.randomUUID().substring(0, 3).toUpperCase();
  return `YA-BTC-${suffix}-${dateStr}-${randomPart}`;
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

function base64UrlDecode(str: string) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  return atob(padded);
}

async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signatureStr = base64UrlDecode(encodedSignature);
  const signature = new Uint8Array(signatureStr.length);
  for (let i = 0; i < signatureStr.length; i++) {
    signature[i] = signatureStr.charCodeAt(i);
  }

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(dataToSign),
  );
  if (!isValid) throw new Error("Invalid signature");

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
    throw new Error("Token expired");
  return payload;
}

// --- Auth Utilities ---

function generateStudentId(
  db: any,
  countryCode: string = "IN",
  stateCode: string = "XX",
  fullName: string = "X",
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");

  const country = (countryCode || "IN")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
  let state = (stateCode || "XX").slice(0, 2).toUpperCase();
  if (state.length < 2) state = state.padEnd(2, "X");

  const nameFirstLetter =
    (fullName || "X").trim().charAt(0).toUpperCase() || "X";
  const nameLetterFinal = nameFirstLetter.match(/[A-Z]/)
    ? nameFirstLetter
    : "X";

  const prefix = `YA${year}${country}${month}${state}`;

  return db
    .prepare(`SELECT id FROM Users WHERE id LIKE ? ORDER BY id DESC LIMIT 1`)
    .bind(`${prefix}____${nameLetterFinal}`)
    .first()
    .then((result: any) => {
      let sequence = 1;
      if (result && result.id) {
        const idStr = result.id as string;
        if (idStr.length >= 14) {
          const seqStr = idStr.substring(10, 14);
          const seqNum = parseInt(seqStr, 10);
          if (!isNaN(seqNum)) {
            sequence = seqNum + 1;
          }
        }
      }
      const sequenceStr = sequence.toString().padStart(4, "0");
      return `${prefix}${sequenceStr}${nameLetterFinal}`;
    });
}

async function requireAuth(
  request: Request,
  env: Env,
): Promise<{ sub: string; role: string }> {
  const token = getCookie(request, "session");
  if (!token) throw new Error("Unauthorized");
  const jwtSecret = await getSecret(env, "JWT_SECRET");
  if (!jwtSecret) throw new Error("JWT_SECRET missing");
  const payload = await verifyJWT(token, jwtSecret);

  if (payload.sessionId) {
    const user: any = await env.DB.prepare(
      "SELECT current_session_id FROM Users WHERE id = ?",
    )
      .bind(payload.sub)
      .first();
    if (!user || user.current_session_id !== payload.sessionId) {
      throw new Error("Session Expired");
    }
  }

  return payload;
}

async function handleGeneratePdf(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const { title, data } = (await request.json()) as any;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height, width } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText(title || "Report", {
      x: 50,
      y: height - 50,
      size: 24,
      font: boldFont,
    });

    let y = height - 100;
    for (const [key, val] of Object.entries(data)) {
      page.drawText(`${key}: ${val}`, { x: 50, y, size: 12, font });
      y -= 25;
    }

    const pdfBytes = await pdfDoc.save();
    return new Response(pdfBytes as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="report.pdf"',
      },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.GeneratePdf", env, request);
  }
}

async function requireAdmin(request: Request, env: Env): Promise<string> {
  const token = getCookie(request, "session");
  if (!token) throw new Error("Unauthorized");
  const jwtSecret = await getSecret(env, "JWT_SECRET");
  if (!jwtSecret) throw new Error("JWT_SECRET missing");
  const payload = await verifyJWT(token, jwtSecret);
  if (payload.role !== "admin") throw new Error("Forbidden");
  return payload.sub; // Returns admin's user ID
}

async function requireAdminOrTeacher(
  request: Request,
  env: Env,
): Promise<{ id: string; role: string }> {
  const token = getCookie(request, "session");
  if (!token) throw new Error("Unauthorized");
  const jwtSecret = await getSecret(env, "JWT_SECRET");
  if (!jwtSecret) throw new Error("JWT_SECRET missing");
  const payload = await verifyJWT(token, jwtSecret);
  if (payload.role !== "admin" && payload.role !== "teacher")
    throw new Error("Forbidden");
  return { id: payload.sub, role: payload.role as string };
}

function calculatePercentageChange(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  const percentage = ((current - previous) / previous) * 100;
  return Math.round(percentage * 10) / 10;
}

async function handleAdminStats(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);

    // ⚡ Bolt: Batch these queries to execute concurrently instead of sequentially
    // This prevents a 4-step waterfall and significantly reduces dashboard load time.
    const results = await env.DB.batch([
      env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN created_at >= date('now', 'start of month') THEN 1 ELSE 0 END) as current_month,
          SUM(CASE
            WHEN created_at >= date('now', 'start of month', '-1 month')
             AND created_at < date('now', 'start of month')
            THEN 1 ELSE 0
          END) as previous_month
        FROM Users
      `),
      env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN created_at >= date('now', 'start of month') THEN 1 ELSE 0 END) as current_month,
          SUM(CASE
            WHEN created_at >= date('now', 'start of month', '-1 month')
             AND created_at < date('now', 'start of month')
            THEN 1 ELSE 0
          END) as previous_month
        FROM Courses
      `),
      env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN purchased_at >= date('now', 'start of month') THEN 1 ELSE 0 END) as current_month,
          SUM(CASE
            WHEN purchased_at >= date('now', 'start of month', '-1 month')
             AND purchased_at < date('now', 'start of month')
            THEN 1 ELSE 0
          END) as previous_month
        FROM Enrollments
      `),
      env.DB.prepare(`
        SELECT
          SUM(COALESCE(amount_inr, amount_paise / 100)) as total_revenue,
          SUM(CASE
            WHEN created_at >= date('now', 'start of month')
            THEN COALESCE(amount_inr, amount_paise / 100) ELSE 0
          END) as current_month,
          SUM(CASE
            WHEN created_at >= date('now', 'start of month', '-1 month')
             AND created_at < date('now', 'start of month')
            THEN COALESCE(amount_inr, amount_paise / 100) ELSE 0
          END) as previous_month
        FROM Transactions
        WHERE status = 'successful'
      `),
    ]);

    const users = results[0].results[0] as any;
    const courses = results[1].results[0] as any;
    const enrollments = results[2].results[0] as any;
    const revenue = results[3].results[0] as any;

    const userCurrentMonth = Number(users?.current_month || 0);
    const userPreviousMonth = Number(users?.previous_month || 0);
    const courseCurrentMonth = Number(courses?.current_month || 0);
    const coursePreviousMonth = Number(courses?.previous_month || 0);
    const enrollmentCurrentMonth = Number(enrollments?.current_month || 0);
    const enrollmentPreviousMonth = Number(enrollments?.previous_month || 0);
    const revenueCurrentMonth = Number(revenue?.current_month || 0);
    const revenuePreviousMonth = Number(revenue?.previous_month || 0);

    return new Response(
      JSON.stringify({
        users: Number(users?.total || 0),
        courses: Number(courses?.total || 0),
        enrollments: Number(enrollments?.total || 0),
        revenue: Number(revenue?.total_revenue || 0),
        trends: {
          users: calculatePercentageChange(userCurrentMonth, userPreviousMonth),
          courses: calculatePercentageChange(
            courseCurrentMonth,
            coursePreviousMonth,
          ),
          enrollments: calculatePercentageChange(
            enrollmentCurrentMonth,
            enrollmentPreviousMonth,
          ),
          revenue: calculatePercentageChange(
            revenueCurrentMonth,
            revenuePreviousMonth,
          ),
        },
        monthly: {
          users: userCurrentMonth,
          courses: courseCurrentMonth,
          enrollments: enrollmentCurrentMonth,
          revenue: revenueCurrentMonth,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.Stats", env, request);
  }
}

async function handleAdminSendActionOTP(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const adminId = await requireAdmin(request, env);
    if (request.method !== "POST")
      return new Response("Method not allowed", { status: 405 });

    const admin: any = await env.DB.prepare(
      "SELECT email, full_name FROM Users WHERE id = ?",
    )
      .bind(adminId)
      .first();
    if (!admin)
      return new Response(JSON.stringify({ error: "Admin not found" }), {
        status: 404,
      });

    const otp = generateSecureOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await env.DB.prepare(
      "INSERT OR REPLACE INTO OTPs (email, otp, expires_at) VALUES (?, ?, ?)",
    )
      .bind(admin.email, otp, expiresAt)
      .run();

    const title = "🔐 Admin Action Verification";
    const body = `
      <p style="font-size:16px;color:#334155;">Namaste <strong>${admin.full_name || "Admin"}</strong>,</p>
      <p style="color:#475569;">You have requested an OTP to perform a sensitive administrative action.</p>
      <div style="background:#ede9fe;padding:16px;border-radius:12px;text-align:center;margin:24px 0;">
        <span style="font-size:32px;font-weight:900;color:#4f46e5;letter-spacing:4px;">${otp}</span>
      </div>
      <p style="color:#64748b;font-size:14px;">This OTP is valid for 10 minutes. If you did not request this, please secure your account immediately.</p>
    `;
    const textContent = `Namaste,\n\nYour Admin Action OTP is: ${otp}\n\nValid for 10 mins.`;

    await safeSendEmail(
      env,
      admin.email,
      "Admin Verification OTP",
      title,
      body,
      textContent,
    );

    return new Response(JSON.stringify({ message: "OTP sent successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.SendActionOTP", env, request);
  }
}

async function handleGetSettings(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const settings = await getSiteSettings(env);
    return new Response(JSON.stringify({ settings }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ settings: {} }), { status: 200 });
  }
}

async function handleAdminAccounting(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const { results } = await env.DB.prepare(
      `
      SELECT t.id,
             COALESCE(t.amount_inr, t.amount_paise / 100) as amount_inr,
             t.amount_paise, t.status, t.payment_source, t.created_at, t.type,
             u.full_name as user_name, u.email as user_email, 
             c.title as course_title
      FROM Transactions t
      LEFT JOIN Users u ON t.user_id = u.id
      LEFT JOIN Courses c ON t.related_id = c.id AND t.type = 'course_purchase'
      WHERE t.status = 'successful'
      ORDER BY t.created_at DESC
    `,
    ).all();

    const stats = await env.DB.prepare(
      `
      SELECT 
        SUM(COALESCE(amount_inr, amount_paise / 100)) as total_revenue,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN created_at >= date('now', 'start of month') THEN COALESCE(amount_inr, amount_paise / 100) ELSE 0 END) as monthly_revenue
      FROM Transactions
      WHERE status = 'successful'
    `,
    ).first();

    return new Response(
      JSON.stringify({
        transactions: results,
        stats: {
          totalRevenue: (stats as any)?.total_revenue || 0,
          totalTransactions: (stats as any)?.total_transactions || 0,
          monthlyRevenue: (stats as any)?.monthly_revenue || 0,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return handleGlobalError(error, "Admin.Accounting", env, request);
  }
}

async function handleAdminSubscribers(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const url = new URL(request.url);

    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM Subscribers ORDER BY subscribed_at DESC",
      ).all();
      return new Response(JSON.stringify({ subscribers: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      if (url.pathname.endsWith("/email")) {
        const { email, subject, body } = (await request.json()) as any;
        if (!email || !subject || !body)
          return new Response(JSON.stringify({ error: "Missing fields" }), {
            status: 400,
          });

        const sent = await safeSendEmail(
          env,
          email,
          subject,
          "Update from Adityanveshan",
          body,
          body,
        );
        if (sent) {
          return new Response(
            JSON.stringify({ message: "Email sent successfully" }),
            { status: 200 },
          );
        } else {
          return new Response(
            JSON.stringify({ error: "Failed to send email" }),
            { status: 500 },
          );
        }
      }
    }

    if (request.method === "DELETE") {
      const { email } = (await request.json()) as any;
      if (!email)
        return new Response(JSON.stringify({ error: "Email required" }), {
          status: 400,
        });
      await env.DB.prepare("DELETE FROM Subscribers WHERE email = ?")
        .bind(email)
        .run();
      return new Response(JSON.stringify({ message: "Subscriber removed" }), {
        status: 200,
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.Subscribers", env, request);
  }
}

async function handleAdminSettings(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM SiteSettings",
      ).all();
      return new Response(JSON.stringify({ settings: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (request.method === "POST") {
      const { settings } = (await request.json()) as any; // Expecting { site_name: '...', ... }
      if (!settings || typeof settings !== "object")
        return new Response(JSON.stringify({ error: "Invalid format" }), {
          status: 400,
        });

      const statements = Object.entries(settings).map(([key, value]) =>
        env.DB.prepare(
          "INSERT OR REPLACE INTO SiteSettings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        ).bind(key, String(value)),
      );

      if (statements.length > 0) {
        await env.DB.batch(statements);
      }
      return new Response(JSON.stringify({ message: "Settings updated" }), {
        status: 200,
      });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.Settings", env, request);
  }
}

async function handleAdminUsers(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT id, email, role, full_name, created_at FROM Users ORDER BY created_at DESC",
      ).all();
      return new Response(JSON.stringify({ users: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (request.method === "PUT") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();
      const body = (await request.json()) as any;
      let {
        role,
        full_name,
        email,
        bio,
        phone,
        district,
        state,
        country,
        birth_date,
        father_name,
        mother_name,
        grand_father_name,
        education,
        diksha,
        address,
        pin_code,
      } = body;

      if (email) email = email.toLowerCase();

      const targetUser: any = await env.DB.prepare(
        "SELECT role FROM Users WHERE id = ?",
      )
        .bind(id)
        .first();
      if (targetUser?.role === "admin") {
        return new Response(
          JSON.stringify({ error: "Cannot edit an admin user" }),
          { status: 403 },
        );
      }

      if (role === "admin") {
        return new Response(
          JSON.stringify({ error: "Cannot assign admin role" }),
          { status: 403 },
        );
      }

      await env.DB.prepare(
        "UPDATE Users SET role = COALESCE(?, role), full_name = COALESCE(?, full_name), email = COALESCE(?, email), bio = COALESCE(?, bio), phone = COALESCE(?, phone), district = COALESCE(?, district), state = COALESCE(?, state), country = COALESCE(?, country), birth_date = COALESCE(?, birth_date), father_name = COALESCE(?, father_name), mother_name = COALESCE(?, mother_name), grand_father_name = COALESCE(?, grand_father_name), education = COALESCE(?, education), diksha = COALESCE(?, diksha), address = COALESCE(?, address), pin_code = COALESCE(?, pin_code) WHERE id = ?",
      )
        .bind(
          role ?? null,
          full_name ?? null,
          email ?? null,
          bio ?? null,
          phone ?? null,
          district ?? null,
          state ?? null,
          country ?? null,
          birth_date ?? null,
          father_name ?? null,
          mother_name ?? null,
          grand_father_name ?? null,
          education ?? null,
          diksha ?? null,
          address ?? null,
          pin_code ?? null,
          id,
        )
        .run();

      return new Response(
        JSON.stringify({ success: true, message: "User updated successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();
      const body = (await request.json()) as any;
      const { otp } = body;
      if (!otp)
        return new Response(
          JSON.stringify({ error: "OTP is required for deletion" }),
          { status: 400 },
        );

      const adminId = await requireAdmin(request, env);
      const admin: any = await env.DB.prepare(
        "SELECT email FROM Users WHERE id = ?",
      )
        .bind(adminId)
        .first();
      if (!admin)
        return new Response(JSON.stringify({ error: "Admin not found" }), {
          status: 404,
        });

      const record: any = await env.DB.prepare(
        "SELECT otp, expires_at FROM OTPs WHERE email = ?",
      )
        .bind(admin.email)
        .first();
      if (!record || record.otp !== String(otp))
        return new Response(JSON.stringify({ error: "Invalid OTP" }), {
          status: 401,
        });
      if (new Date(record.expires_at) < new Date())
        return new Response(JSON.stringify({ error: "OTP has expired" }), {
          status: 401,
        });

      await env.DB.prepare("DELETE FROM OTPs WHERE email = ?")
        .bind(admin.email)
        .run();

      const targetUser: any = await env.DB.prepare(
        "SELECT email, full_name, role FROM Users WHERE id = ?",
      )
        .bind(id)
        .first();
      if (!targetUser)
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
        });
      if (targetUser.role === "admin")
        return new Response(
          JSON.stringify({ error: "Cannot delete an admin user" }),
          { status: 403 },
        );

      await env.DB.prepare("DELETE FROM Users WHERE id = ?").bind(id).run();

      const title = "अलविदा! खाता हटा दिया गया है";
      const emailBody = `
        <p style="font-size:16px;color:#334155;">नमस्ते <strong>${targetUser.full_name || "User"}</strong>,</p>
        <p style="color:#475569;">आपका <strong>Adityanveshan LMS</strong> का खाता व्यवस्थापक (Admin) द्वारा हटा दिया गया है।</p>
        <div style="background:#fef2f2;border-radius:12px;padding:16px;margin:20px 0;border-left:4px solid #ef4444;">
          <p style="margin:0;color:#991b1b;font-weight:600;">यदि आपको लगता है कि यह कोई गलती है, तो कृपया सपोर्ट टीम से संपर्क करें।</p>
        </div>
      `;
      await safeSendEmail(
        env,
        targetUser.email,
        "Account Deleted - Adityanveshan LMS",
        title,
        emailBody,
        `Namaste ${targetUser.full_name || "User"},\nYour account has been deleted by an administrator.`,
      );

      return new Response(
        JSON.stringify({ message: "User deleted successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "POST") {
      let {
        email,
        full_name,
        role,
        phone,
        district,
        state,
        country,
        birth_date,
        father_name,
        mother_name,
        grand_father_name,
        education,
        diksha,
        address,
        pin_code,
      } = (await request.json()) as any;

      if (!email)
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
        });
      email = email.toLowerCase();

      const adminId = await requireAdmin(request, env);
      const adminInfo: any = await env.DB.prepare(
        "SELECT full_name FROM Users WHERE id = ?",
      )
        .bind(adminId)
        .first();
      const adminName = adminInfo?.full_name || "Admin";

      const check = await env.DB.prepare("SELECT id FROM Users WHERE email = ?")
        .bind(email)
        .first();
      if (check)
        return new Response(JSON.stringify({ error: "Email already exists" }), {
          status: 400,
        });

      const userId = await generateStudentId(
        env.DB,
        country,
        district,
        full_name,
      );

      await env.DB.prepare(
        "INSERT INTO Users (id, email, full_name, role, phone, district, state, country, birth_date, father_name, mother_name, grand_father_name, education, diksha, address, pin_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          userId,
          email,
          full_name || "",
          role || "student",
          phone || null,
          district || null,
          state || null,
          country || null,
          birth_date || null,
          father_name || null,
          mother_name || null,
          grand_father_name || null,
          education || null,
          diksha || null,
          address || null,
          pin_code || null,
        )
        .run();

      // Send Welcome Email
      const welcomeTitle = "🎉 आपका Adityanveshan LMS में स्वागत है!";
      const welcomeBody = `
        <p>नमस्ते <strong>${full_name || "छात्र"}</strong>,</p>
        <p>आपका खाता <strong>आचार्य ${adminName}</strong> जी द्वारा सफलतापूर्वक बना दिया गया है।</p>
        <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0;border:1px solid #e2e8f0;">
          <p style="margin:0;font-weight:600;">आपके लॉगिन विवरण:</p>
          <p style="margin:8px 0;">ईमेल: <strong>${email}</strong></p>
          <p style="margin:0;">आप OTP के माध्यम से लॉगिन कर सकते हैं।</p>
        </div>
        <p>आप यहाँ से लॉगिन कर सकते हैं: <a href="https://ya-lms.pages.dev/auth/login" style="color:#4f46e5;font-weight:bold;">Login Now</a></p>
      `;
      await safeSendEmail(
        env,
        email,
        "Welcome to Adityanveshan LMS",
        welcomeTitle,
        welcomeBody,
        `Namaste, Your account has been created by Acharya ${adminName} Ji. Email: ${email}. You can login using OTP.`,
      );

      return new Response(
        JSON.stringify({ message: "User created successfully", userId }),
        { status: 201 },
      );
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.Users", env, request);
  }
}

async function handleAdminCourses(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const userAuth = await requireAdminOrTeacher(request, env);
    if (request.method === "GET") {
      let query =
        "SELECT c.*, u.email as teacher_email, cat.name as category_name, ml.sync_enabled as merchant_sync_enabled, ml.sync_status as merchant_sync_status, ml.last_synced_at as merchant_last_synced_at FROM Courses c LEFT JOIN Users u ON c.teacher_id = u.id LEFT JOIN Categories cat ON c.category_id = cat.id LEFT JOIN CourseMerchantListings ml ON ml.course_id = c.id";
      let results;
      if (userAuth.role === "teacher") {
        query += " WHERE c.teacher_id = ? ORDER BY c.created_at DESC";
        results = (await env.DB.prepare(query).bind(userAuth.id).all()).results;
      } else {
        query += " ORDER BY c.created_at DESC";
        results = (await env.DB.prepare(query).all()).results;
      }
      return new Response(JSON.stringify({ courses: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (request.method === "POST") {
      const {
        title,
        title_hi,
        description,
        description_hi,
        price_inr,
        price_usd,
        teacher_id,
        category_id,
        self_study_enabled,
        self_study_credit_cost,
        self_study_only,
        individual_class_booking_enabled,
        individual_class_credit_cost,
        individual_class_duration_minutes,
        seo_title_en,
        seo_title_hi,
        seo_description_en,
        seo_description_hi,
        seo_keywords_en,
        seo_keywords_hi,
      } = (await request.json()) as any;
      const courseId = generateCustomId("YA-CRS");

      const finalTeacherId =
        userAuth.role === "teacher" ? userAuth.id : teacher_id || userAuth.id;

      if (!finalTeacherId) {
        return new Response(
          JSON.stringify({ error: "Teacher ID is required" }),
          { status: 400 },
        );
      }

      await env.DB.prepare(
        `
        INSERT INTO Courses (
          id, title, title_hi, description, description_hi, teacher_id, price, price_inr, price_usd, category_id,
          self_study_enabled, self_study_credit_cost, self_study_only, individual_class_booking_enabled, individual_class_credit_cost, individual_class_duration_minutes,
          seo_title_en, seo_title_hi, seo_description_en, seo_description_hi, seo_keywords_en, seo_keywords_hi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
        .bind(
          courseId,
          title || "Untitled Course",
          title_hi || null,
          description || "",
          description_hi || null,
          finalTeacherId,
          price_inr ?? 0,
          price_inr ?? 0,
          price_usd ?? 0,
          category_id || null,
          self_study_enabled ? 1 : 0,
          normalizeNonNegativeInt(self_study_credit_cost),
          self_study_only ? 1 : 0,
          individual_class_booking_enabled ? 1 : 0,
          normalizeNonNegativeInt(individual_class_credit_cost),
          normalizeNonNegativeInt(individual_class_duration_minutes, 30),
          seo_title_en || null,
          seo_title_hi || null,
          seo_description_en || null,
          seo_description_hi || null,
          seo_keywords_en || null,
          seo_keywords_hi || null,
        )
        .run();

      // Activity Alert
      await logAdminActivity(
        env,
        (userAuth as any).email || "Unknown Admin",
        "Create Course",
        `New course "${title}" (ID: ${courseId}) created.`,
        getClientIP(request),
      );

      return new Response(
        JSON.stringify({
          message: "Course created successfully",
          id: courseId,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "PUT") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();
      const {
        title,
        title_hi,
        description,
        description_hi,
        price_inr,
        price_usd,
        teacher_id,
        category_id,
        self_study_enabled,
        self_study_credit_cost,
        self_study_only,
        individual_class_booking_enabled,
        individual_class_credit_cost,
        individual_class_duration_minutes,
        seo_title_en,
        seo_title_hi,
        seo_description_en,
        seo_description_hi,
        seo_keywords_en,
        seo_keywords_hi,
      } = (await request.json()) as any;

      if (userAuth.role === "teacher") {
        const courseCheck = await env.DB.prepare(
          "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
        )
          .bind(id, userAuth.id)
          .first();
        if (!courseCheck)
          return new Response(
            JSON.stringify({ error: "Forbidden or not found" }),
            { status: 403 },
          );
      }

      const newTeacherId = userAuth.role === "teacher" ? undefined : teacher_id;

      await env.DB.prepare(
        `
        UPDATE Courses SET 
          title = COALESCE(?, title), 
          title_hi = COALESCE(?, title_hi),
          description = COALESCE(?, description), 
          description_hi = COALESCE(?, description_hi), 
          price = COALESCE(?, price), 
          price_inr = COALESCE(?, price_inr), 
          price_usd = COALESCE(?, price_usd), 
          teacher_id = COALESCE(?, teacher_id), 
          category_id = COALESCE(?, category_id),
          self_study_enabled = COALESCE(?, self_study_enabled),
          self_study_credit_cost = COALESCE(?, self_study_credit_cost),
          self_study_only = COALESCE(?, self_study_only),
          individual_class_booking_enabled = COALESCE(?, individual_class_booking_enabled),
          individual_class_credit_cost = COALESCE(?, individual_class_credit_cost),
          individual_class_duration_minutes = COALESCE(?, individual_class_duration_minutes),
          seo_title_en = COALESCE(?, seo_title_en),
          seo_title_hi = COALESCE(?, seo_title_hi),
          seo_description_en = COALESCE(?, seo_description_en),
          seo_description_hi = COALESCE(?, seo_description_hi),
          seo_keywords_en = COALESCE(?, seo_keywords_en),
          seo_keywords_hi = COALESCE(?, seo_keywords_hi)
        WHERE id = ?
      `,
      )
        .bind(
          title || null,
          title_hi || null,
          description || null,
          description_hi || null,
          price_inr ?? null,
          price_inr ?? null,
          price_usd ?? null,
          newTeacherId || null,
          category_id || null,
          self_study_enabled == null ? null : self_study_enabled ? 1 : 0,
          self_study_credit_cost == null ? null : normalizeNonNegativeInt(self_study_credit_cost),
          self_study_only == null ? null : self_study_only ? 1 : 0,
          individual_class_booking_enabled == null ? null : individual_class_booking_enabled ? 1 : 0,
          individual_class_credit_cost == null ? null : normalizeNonNegativeInt(individual_class_credit_cost),
          individual_class_duration_minutes == null ? null : normalizeNonNegativeInt(individual_class_duration_minutes, 30),
          seo_title_en || null,
          seo_title_hi || null,
          seo_description_en || null,
          seo_description_hi || null,
          seo_keywords_en || null,
          seo_keywords_hi || null,
          id,
        )
        .run();

      // Cascade teacher update to LiveSessions
      if (newTeacherId) {
        await env.DB.prepare(
          "UPDATE LiveSessions SET teacher_id = ? WHERE course_id = ?",
        )
          .bind(newTeacherId, id)
          .run();
      }

      // Activity Alert
      await logAdminActivity(
        env,
        (userAuth as any).email || "Unknown Admin",
        "Update Course",
        `Course ID: ${id} updated.`,
        getClientIP(request),
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Course updated successfully",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();

      if (userAuth.role === "teacher") {
        const courseCheck = await env.DB.prepare(
          "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
        )
          .bind(id, userAuth.id)
          .first();
        if (!courseCheck)
          return new Response(
            JSON.stringify({ error: "Forbidden or not found" }),
            { status: 403 },
          );
      }

      await env.DB.prepare("DELETE FROM Courses WHERE id = ?").bind(id).run();

      // Activity Alert
      await logAdminActivity(
        env,
        (userAuth as any).email || "Unknown Admin",
        "Delete Course",
        `Course ID: ${id} deleted.`,
        getClientIP(request),
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Course deleted successfully",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.Courses", env, request);
  }
}

async function handleAdminCategories(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM Categories ORDER BY name ASC",
      ).all();
      return new Response(JSON.stringify({ categories: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (request.method === "POST") {
      const { name, description } = (await request.json()) as any;
      const id = generateCustomId("YA-CAT");
      await env.DB.prepare(
        "INSERT INTO Categories (id, name, description) VALUES (?, ?, ?)",
      )
        .bind(id, name, description || "")
        .run();
      return new Response(
        JSON.stringify({ message: "Category created successfully", id }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "PUT") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();
      const { name, description } = (await request.json()) as any;
      await env.DB.prepare(
        "UPDATE Categories SET name = ?, description = ? WHERE id = ?",
      )
        .bind(name, description || "", id)
        .run();
      return new Response(
        JSON.stringify({ message: "Category updated successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();
      await env.DB.prepare("DELETE FROM Categories WHERE id = ?")
        .bind(id)
        .run();
      return new Response(
        JSON.stringify({ message: "Category deleted successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.Categories", env, request);
  }
}

async function handleAdminEnrollments(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        `
        SELECT e.*, u.email as user_email, u.full_name as user_name, c.title as course_title, b.name as batch_name
        FROM Enrollments e 
        JOIN Users u ON e.user_id = u.id 
        JOIN Courses c ON e.course_id = c.id 
        LEFT JOIN Batches b ON e.batch_id = b.id
        ORDER BY e.purchased_at DESC
      `,
      ).all();
      return new Response(JSON.stringify({ enrollments: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (request.method === "POST") {
      const {
        user_id,
        course_id,
        batch_id,
        status,
        payment_status,
        otp,
        amount_paid,
        payment_source,
      } = (await request.json()) as any;

      const adminId = await requireAdmin(request, env);

      if (payment_status === "paid") {
        if (!otp)
          return new Response(
            JSON.stringify({
              error: "OTP is required to mark enrollment as paid",
            }),
            { status: 400 },
          );

        const admin: any = await env.DB.prepare(
          "SELECT email FROM Users WHERE id = ?",
        )
          .bind(adminId)
          .first();
        if (!admin)
          return new Response(JSON.stringify({ error: "Admin not found" }), {
            status: 404,
          });

        const record: any = await env.DB.prepare(
          "SELECT otp, expires_at FROM OTPs WHERE email = ?",
        )
          .bind(admin.email)
          .first();
        if (!record || record.otp !== String(otp))
          return new Response(JSON.stringify({ error: "Invalid OTP" }), {
            status: 401,
          });
        if (new Date(record.expires_at) < new Date())
          return new Response(JSON.stringify({ error: "OTP has expired" }), {
            status: 401,
          });

        await env.DB.prepare("DELETE FROM OTPs WHERE email = ?")
          .bind(admin.email)
          .run();
      }

      // Check if an enrollment already exists for this user and course
      const existing: any = await env.DB.prepare(
        "SELECT id, batch_id, payment_status FROM Enrollments WHERE user_id = ? AND course_id = ?",
      )
        .bind(user_id, course_id)
        .first();

      let id;
      if (existing) {
        if (batch_id && existing.batch_id === batch_id) {
          return new Response(
            JSON.stringify({
              error: "Student is already enrolled in this course and batch.",
            }),
            { status: 400 },
          );
        }
        id = existing.id;
        await env.DB.prepare(
          "UPDATE Enrollments SET batch_id = ?, status = ?, payment_status = ?, amount_paid = ?, payment_source = ? WHERE id = ?",
        )
          .bind(
            batch_id || null,
            status || "active",
            payment_status || "pending",
            amount_paid || 0,
            payment_source || null,
            id,
          )
          .run();
      } else {
        id = generateCustomId("YA-ENR");
        await env.DB.prepare(
          "INSERT INTO Enrollments (id, user_id, course_id, batch_id, status, payment_status, amount_paid, payment_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            id,
            user_id,
            course_id,
            batch_id || null,
            status || "active",
            payment_status || "pending",
            amount_paid || 0,
            payment_source || null,
          )
          .run();
      }

      // If payment is paid via admin panel, log it in Transactions too
      if (payment_status === "paid" && amount_paid > 0 && !existing) {
        const txId = crypto.randomUUID();
        await env.DB.prepare(
          `
          INSERT INTO Transactions (id, user_id, amount_paise, amount_inr, currency, type, status, payment_source, related_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
          .bind(
            txId,
            user_id,
            amount_paid * 100,
            amount_paid,
            "INR",
            "course_purchase",
            "successful",
            payment_source || "manual",
            course_id,
          )
          .run();
      } else if (
        payment_status === "paid" &&
        amount_paid > 0 &&
        existing &&
        existing.payment_status !== "paid"
      ) {
        // This block handles updates to existing enrollments to paid.
        const txId = crypto.randomUUID();
        await env.DB.prepare(
          `
          INSERT INTO Transactions (id, user_id, amount_paise, amount_inr, currency, type, status, payment_source, related_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
          .bind(
            txId,
            user_id,
            amount_paid * 100,
            amount_paid,
            "INR",
            "course_purchase",
            "successful",
            payment_source || "manual",
            course_id,
          )
          .run();
      }

      // Fetch user and course info for email notification
      const user: any = await env.DB.prepare(
        "SELECT email, full_name FROM Users WHERE id = ?",
      )
        .bind(user_id)
        .first();
      const course: any = await env.DB.prepare(
        "SELECT title FROM Courses WHERE id = ?",
      )
        .bind(course_id)
        .first();

      if (user?.email && course?.title) {
        const welcomeHtml = `
            <p>नमस्ते <strong>${user.full_name || "छात्र"}</strong>,</p>
            <p>Admin द्वारा आपको <strong>${course.title}</strong> में सफलतापूर्वक enroll कर दिया गया है। ${payment_status === "paid" ? "आपको प्रीमियम एक्सेस दे दिया गया है।" : ""}</p>
            <p>आप अभी से सीखना शुरू कर सकते हैं।</p>
         `;
        const welcomeText = `नमस्ते ${user.full_name || "छात्र"},\n\nAdmin द्वारा आपको ${course.title} में सफलतापूर्वक enroll कर दिया गया है।\nआप अभी से सीखना शुरू कर सकते हैं।`;
        await safeSendEmail(
          env,
          user.email,
          `Welcome to ${course.title}`,
          "🎉 Course Enrollment Successful!",
          welcomeHtml,
          welcomeText,
        );
      }
      return new Response(
        JSON.stringify({ message: "Student enrolled successfully", id }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();
      await env.DB.prepare("DELETE FROM Enrollments WHERE id = ?")
        .bind(id)
        .run();
      return new Response(
        JSON.stringify({ message: "Enrollment removed successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.Enrollments", env, request);
  }
}

async function handleAdminBatches(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const userAuth = await requireAdminOrTeacher(request, env);
    const url = new URL(request.url);

    if (request.method === "GET") {
      let query = `
        SELECT b.*, c.title as course_title 
        FROM Batches b 
        JOIN Courses c ON b.course_id = c.id 
      `;
      let results;
      if (userAuth.role === "teacher") {
        query += " WHERE c.teacher_id = ? ORDER BY b.created_at DESC";
        results = (await env.DB.prepare(query).bind(userAuth.id).all()).results;
      } else {
        query += " ORDER BY b.created_at DESC";
        results = (await env.DB.prepare(query).all()).results;
      }
      return new Response(JSON.stringify({ batches: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (request.method === "POST") {
      const {
        course_id,
        name,
        name_hi,
        description_en,
        description_hi,
        start_date,
        end_date,
        status,
        class_start_time,
        class_end_time,
        class_days,
        self_study_group_enabled,
        group_class_credit_cost,
        credit_deduction_timing,
        seo_json,
      } = (await request.json()) as any;
      if (!course_id)
        return new Response(
          JSON.stringify({
            error: "कोर्स आईडी अनिवार्य है (Course ID is required)",
          }),
          { status: 400 },
        );
      if (!name)
        return new Response(
          JSON.stringify({
            error: "बैच का नाम अनिवार्य है (Batch name is required)",
          }),
          { status: 400 },
        );

      if (userAuth.role === "teacher") {
        const check = await env.DB.prepare(
          "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
        )
          .bind(course_id, userAuth.id)
          .first();
        if (!check)
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
          });
      }
      const id = generateBatchId(course_id);
      await env.DB.prepare(
        `
        INSERT INTO Batches (
          id, course_id, name, name_hi, description_en, description_hi, 
          start_date, end_date, status, class_start_time, class_end_time, class_days, self_study_group_enabled, group_class_credit_cost, credit_deduction_timing, seo_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
        .bind(
          id,
          course_id,
          name,
          name_hi || null,
          description_en || null,
          description_hi || null,
          start_date || null,
          end_date || null,
          status || "upcoming",
          class_start_time || null,
          class_end_time || null,
          class_days || null,
          self_study_group_enabled == null ? 1 : self_study_group_enabled ? 1 : 0,
          normalizeNonNegativeInt(group_class_credit_cost),
          credit_deduction_timing || "on_join",
          seo_json || null,
        )
        .run();

      // Activity Alert
      await logAdminActivity(
        env,
        (userAuth as any).email || "Unknown Admin",
        "Create Batch",
        `New batch "${name}" (ID: ${id}) created for Course ID: ${course_id}`,
        getClientIP(request),
      );

      return new Response(
        JSON.stringify({ message: "Batch created successfully", id }),
        { status: 201 },
      );
    }
    if (request.method === "PUT") {
      const id = url.pathname.split("/").pop();
      if (userAuth.role === "teacher") {
        const check = await env.DB.prepare(
          "SELECT b.id FROM Batches b JOIN Courses c ON b.course_id = c.id WHERE b.id = ? AND c.teacher_id = ?",
        )
          .bind(id, userAuth.id)
          .first();
        if (!check)
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
          });
      }
      const {
        name,
        name_hi,
        description_en,
        description_hi,
        start_date,
        end_date,
        status,
        class_start_time,
        class_end_time,
        class_days,
        self_study_group_enabled,
        group_class_credit_cost,
        credit_deduction_timing,
        seo_json,
        send_update_email,
      } = (await request.json()) as any;
      await env.DB.prepare(
        `
        UPDATE Batches SET 
          name = COALESCE(?, name), 
          name_hi = COALESCE(?, name_hi), 
          description_en = COALESCE(?, description_en), 
          description_hi = COALESCE(?, description_hi), 
          start_date = COALESCE(?, start_date), 
          end_date = COALESCE(?, end_date), 
          status = COALESCE(?, status), 
          class_start_time = COALESCE(?, class_start_time), 
          class_end_time = COALESCE(?, class_end_time), 
          class_days = COALESCE(?, class_days),
          self_study_group_enabled = COALESCE(?, self_study_group_enabled),
          group_class_credit_cost = COALESCE(?, group_class_credit_cost),
          credit_deduction_timing = COALESCE(?, credit_deduction_timing),
          seo_json = COALESCE(?, seo_json)
        WHERE id = ?
      `,
      )
        .bind(
          name,
          name_hi,
          description_en,
          description_hi,
          start_date,
          end_date,
          status,
          class_start_time,
          class_end_time,
          class_days,
          self_study_group_enabled == null ? null : self_study_group_enabled ? 1 : 0,
          group_class_credit_cost == null ? null : normalizeNonNegativeInt(group_class_credit_cost),
          credit_deduction_timing || null,
          seo_json,
          id,
        )
        .run();

      // Send Email Notification to enrolled students about the batch update
      if (send_update_email) {
        try {
          const batchDetails = (await env.DB.prepare(
            "SELECT name FROM Batches WHERE id = ?",
          )
            .bind(id)
            .first()) as any;
          const students = (await env.DB.prepare(
            `
            SELECT u.email, u.full_name
            FROM Users u
            JOIN Enrollments e ON u.id = e.user_id
            WHERE e.batch_id = ? AND e.status = 'active'
          `,
          )
            .bind(id)
            .all()) as any;

          if (students && students.results && students.results.length > 0) {
            const batchName = batchDetails?.name || "Your Batch";
            for (const student of students.results) {
              if (student.email) {
                const htmlContent = `<p>Namaste ${student.full_name || "Student"},</p><p>We have updated the details/schedule for <strong>${batchName}</strong>.</p><p>The new class times are set to start at ${class_start_time || "the usual time"} on ${class_days || "the scheduled days"}.</p><p>Please check your dashboard for full details.</p><p>Om!</p>`;
                const textContent = `Namaste ${student.full_name || "Student"},\n\nWe have updated the details for ${batchName}.\nThe new class times are set to start at ${class_start_time || "the usual time"} on ${class_days || "the scheduled days"}.\n\nPlease check your dashboard for full details.\n\nOm!`;
                await safeSendEmail(
                  env,
                  student.email,
                  `Schedule Update: ${batchName}`,
                  "Batch Update",
                  htmlContent,
                  textContent,
                );
              }
            }
          }
        } catch (emailErr) {
          console.error("Failed to send batch update emails", emailErr);
        }
      }

      // Activity Alert
      await logAdminActivity(
        env,
        (userAuth as any).email || "Unknown Admin",
        "Update Batch",
        `Batch ID: ${id} updated with new parameters.`,
        getClientIP(request),
      );

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    if (request.method === "DELETE") {
      const id = url.pathname.split("/").pop();
      if (userAuth.role === "teacher") {
        const check = await env.DB.prepare(
          "SELECT b.id FROM Batches b JOIN Courses c ON b.course_id = c.id WHERE b.id = ? AND c.teacher_id = ?",
        )
          .bind(id, userAuth.id)
          .first();
        if (!check)
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
          });
      }
      await env.DB.prepare("DELETE FROM Batches WHERE id = ?").bind(id).run();

      // Activity Alert
      await logAdminActivity(
        env,
        (userAuth as any).email || "Unknown Admin",
        "Delete Batch",
        `Batch ID: ${id} was permanently deleted.`,
        getClientIP(request),
      );

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.Batches", env, request);
  }
}

async function handleAdminBatchStudents(
  request: Request,
  env: Env,
  batchId: string,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);

    // Ownership check for teachers
    if (auth.role === "teacher") {
      const check = await env.DB.prepare(
        "SELECT b.id FROM Batches b JOIN Courses c ON b.course_id = c.id WHERE b.id = ? AND c.teacher_id = ?",
      )
        .bind(batchId, auth.id)
        .first();
      if (!check)
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        });
    }

    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        `
        SELECT u.id, u.full_name, u.email, u.phone, e.purchased_at, e.progress
        FROM Users u
        JOIN Enrollments e ON u.id = e.user_id
        WHERE e.batch_id = ? AND e.status = 'active'
        ORDER BY e.purchased_at DESC
      `,
      )
        .bind(batchId)
        .all();
      return new Response(JSON.stringify({ students: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const { userEmail, userId } = (await request.json()) as any;
      let targetUserId = userId;

      if (userEmail && !targetUserId) {
        const lowerUserEmail = userEmail.toLowerCase();
        const user: any = await env.DB.prepare(
          "SELECT id FROM Users WHERE email = ?",
        )
          .bind(lowerUserEmail)
          .first();
        if (!user)
          return new Response(
            JSON.stringify({ error: "User not found with this email" }),
            { status: 404 },
          );
        targetUserId = user.id;
      }

      if (!targetUserId)
        return new Response(
          JSON.stringify({ error: "User ID or Email is required" }),
          { status: 400 },
        );

      // Get Batch and Course Info
      const batch: any = await env.DB.prepare(
        "SELECT name, course_id FROM Batches WHERE id = ?",
      )
        .bind(batchId)
        .first();
      if (!batch)
        return new Response(JSON.stringify({ error: "Batch not found" }), {
          status: 404,
        });

      // Check if already enrolled in this course
      const existing: any = await env.DB.prepare(
        "SELECT id, batch_id FROM Enrollments WHERE user_id = ? AND course_id = ?",
      )
        .bind(targetUserId, batch.course_id)
        .first();
      if (existing) {
        if (existing.batch_id === batchId) {
          return new Response(
            JSON.stringify({ error: "Student is already in this batch" }),
            { status: 400 },
          );
        }
        // Update existing enrollment
        await env.DB.prepare(
          "UPDATE Enrollments SET batch_id = ?, status = ?, payment_status = ? WHERE id = ?",
        )
          .bind(batchId, "active", "paid", existing.id)
          .run();
      } else {
        // Create new enrollment
        const enrId = generateCustomId("YA-ENR");
        await env.DB.prepare(
          "INSERT INTO Enrollments (id, user_id, course_id, batch_id, status, payment_status) VALUES (?, ?, ?, ?, ?, ?)",
        )
          .bind(enrId, targetUserId, batch.course_id, batchId, "active", "paid")
          .run();
      }

      // Notify Student
      const student: any = await env.DB.prepare(
        "SELECT email, full_name FROM Users WHERE id = ?",
      )
        .bind(targetUserId)
        .first();
      const course: any = await env.DB.prepare(
        "SELECT title FROM Courses WHERE id = ?",
      )
        .bind(batch.course_id)
        .first();

      if (student?.email) {
        const title = "🎉 बैच में नामांकन सफल!";
        const body = `
          <p>नमस्ते <strong>${student.full_name || "छात्र"}</strong>,</p>
          <p>आपको सफलतापूर्वक <strong>${batch.name}</strong> (${course.title}) में जोड़ दिया गया है।</p>
          <p>अब आप अपनी पढ़ाई शुरू कर सकते हैं।</p>
        `;
        await safeSendEmail(
          env,
          student.email,
          `Batch Enrollment: ${batch.name}`,
          title,
          body,
          `Namaste, You have been added to batch ${batch.name}.`,
        );
        await createNotification(
          env,
          targetUserId,
          "Batch Enrollment Success",
          `You have been added to "${batch.name}" batch.`,
          "success",
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Student added to batch successfully",
        }),
        { status: 201 },
      );
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    return handleGlobalError(error, "Admin.BatchStudents", env, request);
  }
}

// --- Notifications Handlers ---

export async function createNotification(
  env: Env,
  userId: string,
  title: string,
  message: string,
  type: "info" | "alert" | "success" | "warning" = "info",
) {
  try {
    const id = generateCustomId("YA-NTF");
    await env.DB.prepare(
      "INSERT INTO Notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(id, userId, title, message, type)
      .run();

    // Trigger Browser Push
    const subs: any = await env.DB.prepare(
      "SELECT subscription_json FROM PushSubscriptions WHERE user_id = ?",
    )
      .bind(userId)
      .all();
    if (subs.results && subs.results.length > 0) {
      for (const subRecord of subs.results) {
        try {
          const subscription = JSON.parse(subRecord.subscription_json);
          await sendWebPush(env, subscription, {
            title,
            body: message,
            icon: "/logo.png",
            data: { url: "/student/notifications" },
          });
        } catch (e) {
          console.error("Push delivery failed for a sub:", e);
        }
      }
    }
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

async function sendWebPush(env: Env, subscription: any, payload: any) {
  // We'll use a simplified Web Push approach or a relay if possible.
  // In a full production env, we'd use a library like 'web-push'
  // or call a dedicated microservice.
  // CLOUDFLARE WORKERS tip: You can use 'fcm' or similar for easier push.
}

async function handleNotificationSubscribe(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const auth = await requireAuth(request, env);
    const { subscription } = (await request.json()) as any;
    if (!subscription)
      return new Response(
        JSON.stringify({ error: "Subscription object required" }),
        { status: 400 },
      );

    const id = generateCustomId("YA-SUB");
    await env.DB.prepare(
      "INSERT OR REPLACE INTO PushSubscriptions (id, user_id, subscription_json) VALUES (?, ?, ?)",
    )
      .bind(id, auth.sub, JSON.stringify(subscription))
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Notification.Subscribe", env, request);
  }
}

async function handleGetVapidPublicKey(
  request: Request,
  env: Env,
): Promise<Response> {
  // Return the public key for VAPID. Admin can set this in PLATFORM_SECRETS KV.
  const publicKey =
    (await env.PLATFORM_SECRETS.get("VAPID_PUBLIC_KEY")) ||
    "BEl62vp95WthzGThev97JvjK-fXp106f9d-oW9-xT_8o9x";
  return new Response(JSON.stringify({ publicKey }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleGetUnreadNotificationCount(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const auth = await requireAuth(request, env);
    const result: any = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM Notifications WHERE user_id = ? AND is_read = 0",
    )
      .bind(auth.sub)
      .first();
    return new Response(JSON.stringify({ count: result?.count || 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Notification.UnreadCount", env, request);
  }
}

async function handleGetMyCourses(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const userId = payload.sub;

    const { results } = await env.DB.prepare(
      `
      SELECT c.*, cat.name as category_name, e.payment_status, e.payment_source, e.amount_paid, e.status as enrollment_status, e.progress,
             (SELECT MIN(NULLIF(COALESCE(b.group_class_credit_cost, 0), 0)) FROM Batches b WHERE b.course_id = c.id AND COALESCE(b.self_study_group_enabled, 1) = 1 AND b.status != 'completed') as min_group_class_credit_cost
      FROM Enrollments e
      JOIN Courses c ON e.course_id = c.id
      LEFT JOIN Categories cat ON c.category_id = cat.id
      WHERE e.user_id = ?
      ORDER BY e.purchased_at DESC
    `,
    )
      .bind(userId)
      .all();

    return new Response(JSON.stringify({ courses: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "User.MyCourses", env, request);
  }
}

async function handleGetProfile(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const user = (await env.DB.prepare("SELECT * FROM Users WHERE id = ?")
      .bind(payload.sub)
      .first()) as any;

    const creditsData = (await env.DB.prepare(
      "SELECT * FROM UserAICredits WHERE user_id = ?",
    )
      .bind(payload.sub)
      .first()) as any;
    let aiCreditsAllowed = 0;
    if (creditsData) {
      if (creditsData.base_credits_total === -1) {
        aiCreditsAllowed = -1;
      } else {
        const totalAllowed =
          (creditsData.base_credits_total || 0) +
          (creditsData.bonus_credits_total || 0);
        const totalUsed =
          (creditsData.base_credits_used || 0) +
          (creditsData.bonus_credits_used || 0);
        aiCreditsAllowed = totalAllowed - totalUsed;
        if (aiCreditsAllowed < 0) aiCreditsAllowed = 0;
      }
    } else {
      aiCreditsAllowed = 5; // Starter credits
    }

    if (user) {
      user.ai_credits = aiCreditsAllowed;
    }

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized")
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    return handleGlobalError(error, "User.GetProfile", env, request);
  }
}

async function handleUpdateProfile(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const body = (await request.json()) as any;
    const {
      email,
      full_name,
      phone,
      district,
      state,
      country,
      birth_date,
      father_name,
      mother_name,
      grand_father_name,
      pincode,
      gender,
      bio,
      birth_place,
    } = body;

    if (
      !email ||
      !full_name ||
      !phone ||
      !birth_date ||
      !father_name ||
      !mother_name ||
      !grand_father_name
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Email, Name, Phone, Birth Date, Father Name, Mother Name and Grandfather Name are required",
        }),
        { status: 400 },
      );
    }

    await env.DB.prepare(
      `
      UPDATE Users SET 
        email = ?, full_name = ?, phone = ?, district = ?, state = ?, country = ?, 
        birth_date = ?, father_name = ?, mother_name = ?, grand_father_name = ?, 
        pincode = ?, gender = ?, bio = ?, birth_place = ? 
      WHERE id = ?
    `,
    )
      .bind(
        email,
        full_name,
        phone,
        district || null,
        state || null,
        country || "IN",
        birth_date,
        father_name,
        mother_name,
        grand_father_name,
        pincode || null,
        gender || null,
        bio || null,
        birth_place || null,
        payload.sub,
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Profile updated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    if (error.message === "Unauthorized")
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    return handleGlobalError(error, "User.UpdateProfile", env, request);
  }
}

async function handleGetNotifications(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { results } = await env.DB.prepare(
      "SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    )
      .bind(payload.sub)
      .all();
    return new Response(JSON.stringify({ notifications: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
      });
    return handleGlobalError(error, "Notifications.Get", env, request);
  }
}

async function handleMarkNotificationRead(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { id } = (await request.json()) as any;

    if (id === "all") {
      await env.DB.prepare(
        "UPDATE Notifications SET is_read = 1 WHERE user_id = ?",
      )
        .bind(payload.sub)
        .run();
    } else {
      await env.DB.prepare(
        "UPDATE Notifications SET is_read = 1 WHERE user_id = ? AND id = ?",
      )
        .bind(payload.sub, id)
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
      });
    return handleGlobalError(error, "Notifications.MarkRead", env, request);
  }
}

// --- Google Merchant API Helpers ---

type MerchantListingInput = {
  sync_enabled?: boolean | number;
  offer_id?: string;
  content_language?: string;
  feed_label?: string;
  target_country?: string;
  currency?: string;
  availability?: string;
  condition?: string;
  brand?: string;
  google_product_category?: string;
  image_url?: string;
  landing_url?: string;
};

const GOOGLE_MERCHANT_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_MERCHANT_PRODUCTS_BASE = "https://merchantapi.googleapis.com/products/v1";
const GOOGLE_MERCHANT_SCOPE = "https://www.googleapis.com/auth/content";

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlEncodeJson(value: any): string {
  return btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n");
  const base64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function sanitizeOfferId(courseId: string, offerId?: string | null): string {
  return (offerId || courseId).trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
}

function normalizeMerchantListing(courseId: string, input: MerchantListingInput = {}) {
  return {
    sync_enabled: input.sync_enabled ? 1 : 0,
    offer_id: sanitizeOfferId(courseId, input.offer_id),
    content_language: (input.content_language || "en").trim() || "en",
    feed_label: (input.feed_label || "IN").trim().toUpperCase() || "IN",
    target_country: (input.target_country || "IN").trim().toUpperCase() || "IN",
    currency: (input.currency || "INR").trim().toUpperCase() || "INR",
    availability: (input.availability || "in_stock").trim() || "in_stock",
    condition: (input.condition || "new").trim() || "new",
    brand: (input.brand || "Adityanveshan").trim() || "Adityanveshan",
    google_product_category: (input.google_product_category || "").trim() || null,
    image_url: (input.image_url || "").trim() || null,
    landing_url: (input.landing_url || "").trim() || null,
  };
}

async function getMerchantRuntimeConfig(env: Env) {
  const [accountId, dataSourceName, serviceAccountEmail, privateKey, appUrl] = await Promise.all([
    getSecret(env, "GOOGLE_MERCHANT_ACCOUNT_ID", false),
    getSecret(env, "GOOGLE_MERCHANT_DATASOURCE_NAME", false),
    getSecret(env, "GOOGLE_MERCHANT_SERVICE_ACCOUNT_EMAIL", false),
    getSecret(env, "GOOGLE_MERCHANT_PRIVATE_KEY", false),
    getSecret(env, "APP_URL", false),
  ]);

  return {
    accountId,
    dataSourceName,
    serviceAccountEmail,
    privateKey,
    appUrl,
    isConfigured: Boolean(accountId && dataSourceName && serviceAccountEmail && privateKey),
  };
}

async function getGoogleMerchantAccessToken(env: Env): Promise<string> {
  const config = await getMerchantRuntimeConfig(env);
  if (!config.serviceAccountEmail || !config.privateKey) {
    throw new Error("Google Merchant service account credentials are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const assertionHeader = base64UrlEncodeJson({ alg: "RS256", typ: "JWT" });
  const assertionClaim = base64UrlEncodeJson({
    iss: config.serviceAccountEmail,
    scope: GOOGLE_MERCHANT_SCOPE,
    aud: GOOGLE_MERCHANT_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  });
  const unsignedAssertion = `${assertionHeader}.${assertionClaim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(config.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedAssertion),
  );
  const assertion = `${unsignedAssertion}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;

  const tokenRes = await fetch(GOOGLE_MERCHANT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  const tokenBody = (await tokenRes.json().catch(() => ({}))) as any;
  if (!tokenRes.ok || !tokenBody.access_token) {
    throw new Error(tokenBody.error_description || tokenBody.error || "Failed to fetch Google access token.");
  }

  return tokenBody.access_token;
}

async function merchantApiRequest(env: Env, path: string, init: RequestInit = {}) {
  const accessToken = await getGoogleMerchantAccessToken(env);
  const res = await fetch(`${GOOGLE_MERCHANT_PRODUCTS_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers || {}),
    },
  });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const message = body?.error?.message || body?.error_description || body?.error || `Google Merchant API returned ${res.status}`;
    throw new Error(message);
  }
  return body;
}

async function ensureCourseMerchantAccess(env: Env, userAuth: any, courseId: string) {
  if (userAuth.role !== "teacher") return;
  const courseCheck = await env.DB.prepare("SELECT id FROM Courses WHERE id = ? AND teacher_id = ?")
    .bind(courseId, userAuth.id)
    .first();
  if (!courseCheck) throw new Error("Forbidden");
}

async function getCourseMerchantRecord(env: Env, courseId: string) {
  return env.DB.prepare(
    `SELECT c.*, cat.name as category_name, ml.id as merchant_listing_id, ml.sync_enabled, ml.offer_id,
            ml.product_resource_name, ml.data_source_name, ml.content_language, ml.feed_label, ml.target_country,
            ml.currency, ml.availability, ml.condition, ml.brand, ml.google_product_category, ml.image_url,
            ml.landing_url, ml.sync_status, ml.sync_error, ml.last_synced_at
       FROM Courses c
       LEFT JOIN Categories cat ON c.category_id = cat.id
       LEFT JOIN CourseMerchantListings ml ON ml.course_id = c.id
      WHERE c.id = ?`,
  )
    .bind(courseId)
    .first();
}

function buildCourseLandingUrl(configAppUrl: string | null, request: Request, courseId: string, override?: string | null): string {
  if (override) return override;
  const baseUrl = (configAppUrl || new URL(request.url).origin).replace(/\/$/, "");
  return `${baseUrl}/course?id=${encodeURIComponent(courseId)}`;
}

function validateMerchantCourse(course: any, listing: ReturnType<typeof normalizeMerchantListing>, landingUrl: string) {
  const errors: string[] = [];
  if (!course?.title) errors.push("Course title is required.");
  if (!course?.description) errors.push("Course description is required.");
  if (!Number(course?.price_inr || course?.price || 0)) errors.push("Course INR price must be greater than 0.");
  if (!listing.image_url) errors.push("Product image URL is required for Google Merchant sync.");
  try { new URL(landingUrl); } catch { errors.push("Landing URL must be a valid public URL."); }
  if (listing.image_url) {
    try { new URL(listing.image_url); } catch { errors.push("Image URL must be a valid public URL."); }
  }
  if (!listing.offer_id) errors.push("Offer ID is required.");
  return errors;
}

function buildMerchantProductInput(course: any, listing: ReturnType<typeof normalizeMerchantListing>, landingUrl: string) {
  const amount = Number(course.price_inr || course.price || 0);
  return {
    offerId: listing.offer_id,
    contentLanguage: listing.content_language,
    feedLabel: listing.feed_label,
    productAttributes: {
      title: String(course.title).slice(0, 150),
      description: String(course.description || course.seo_description_en || course.title).slice(0, 5000),
      link: landingUrl,
      imageLink: listing.image_url,
      brand: listing.brand,
      availability: listing.availability,
      condition: listing.condition,
      googleProductCategory: listing.google_product_category || course.category_name || undefined,
      price: {
        amountMicros: String(Math.round(amount * 1000000)),
        currencyCode: listing.currency,
      },
    },
  };
}

async function upsertCourseMerchantListing(env: Env, courseId: string, input: MerchantListingInput) {
  const normalized = normalizeMerchantListing(courseId, input);
  const existing: any = await env.DB.prepare("SELECT id FROM CourseMerchantListings WHERE course_id = ?")
    .bind(courseId)
    .first();
  const listingId = existing?.id || generateCustomId("YA-MER");

  await env.DB.prepare(
    `INSERT INTO CourseMerchantListings (
       id, course_id, sync_enabled, offer_id, content_language, feed_label, target_country, currency,
       availability, condition, brand, google_product_category, image_url, landing_url, sync_status, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_synced', CURRENT_TIMESTAMP)
     ON CONFLICT(course_id) DO UPDATE SET
       sync_enabled = excluded.sync_enabled,
       offer_id = excluded.offer_id,
       content_language = excluded.content_language,
       feed_label = excluded.feed_label,
       target_country = excluded.target_country,
       currency = excluded.currency,
       availability = excluded.availability,
       condition = excluded.condition,
       brand = excluded.brand,
       google_product_category = excluded.google_product_category,
       image_url = excluded.image_url,
       landing_url = excluded.landing_url,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(
      listingId,
      courseId,
      normalized.sync_enabled,
      normalized.offer_id,
      normalized.content_language,
      normalized.feed_label,
      normalized.target_country,
      normalized.currency,
      normalized.availability,
      normalized.condition,
      normalized.brand,
      normalized.google_product_category,
      normalized.image_url,
      normalized.landing_url,
    )
    .run();

  return normalized;
}

async function syncCourseToGoogleMerchant(env: Env, request: Request, courseId: string, input?: MerchantListingInput) {
  if (input) await upsertCourseMerchantListing(env, courseId, input);
  const course: any = await getCourseMerchantRecord(env, courseId);
  if (!course) throw new Error("Course not found.");

  const config = await getMerchantRuntimeConfig(env);
  if (!config.accountId || !config.dataSourceName) {
    throw new Error("Google Merchant account ID or data source name is not configured.");
  }

  const listing = normalizeMerchantListing(courseId, {
    sync_enabled: course.sync_enabled ?? 1,
    offer_id: course.offer_id,
    content_language: course.content_language,
    feed_label: course.feed_label,
    target_country: course.target_country,
    currency: course.currency,
    availability: course.availability,
    condition: course.condition,
    brand: course.brand,
    google_product_category: course.google_product_category,
    image_url: course.image_url,
    landing_url: course.landing_url,
  });
  const landingUrl = buildCourseLandingUrl(config.appUrl, request, courseId, listing.landing_url);
  const validationErrors = validateMerchantCourse(course, listing, landingUrl);
  if (validationErrors.length > 0) throw new Error(validationErrors.join(" "));

  const productInput = buildMerchantProductInput(course, listing, landingUrl);
  const responseBody: any = await merchantApiRequest(
    env,
    `/accounts/${encodeURIComponent(config.accountId)}/productInputs:insert?dataSource=${encodeURIComponent(config.dataSourceName)}`,
    { method: "POST", body: JSON.stringify(productInput) },
  );

  await env.DB.prepare(
    `UPDATE CourseMerchantListings
        SET sync_enabled = 1, product_resource_name = ?, data_source_name = ?, sync_status = 'synced',
            sync_error = NULL, last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE course_id = ?`,
  )
    .bind(responseBody?.name || null, config.dataSourceName, courseId)
    .run();

  return responseBody;
}

async function handleCourseMerchant(request: Request, env: Env, courseId: string): Promise<Response> {
  try {
    const userAuth = await requireAdminOrTeacher(request, env);
    await ensureCourseMerchantAccess(env, userAuth, courseId);

    if (request.method === "GET") {
      const course: any = await getCourseMerchantRecord(env, courseId);
      if (!course) return jsonResponse({ error: "Course not found" }, 404);
      const config = await getMerchantRuntimeConfig(env);
      const listing = normalizeMerchantListing(courseId, {
        sync_enabled: course.sync_enabled || 0,
        offer_id: course.offer_id,
        content_language: course.content_language,
        feed_label: course.feed_label,
        target_country: course.target_country,
        currency: course.currency,
        availability: course.availability,
        condition: course.condition,
        brand: course.brand,
        google_product_category: course.google_product_category,
        image_url: course.image_url,
        landing_url: course.landing_url,
      });
      return jsonResponse({
        configured: config.isConfigured,
        course: { id: course.id, title: course.title, description: course.description, price_inr: course.price_inr },
        listing: {
          ...listing,
          product_resource_name: course.product_resource_name || null,
          sync_status: course.sync_status || "not_synced",
          sync_error: course.sync_error || null,
          last_synced_at: course.last_synced_at || null,
          landing_url: buildCourseLandingUrl(config.appUrl, request, courseId, listing.landing_url),
        },
      });
    }

    if (request.method === "PUT") {
      const input = (await request.json()) as MerchantListingInput;
      const listing = await upsertCourseMerchantListing(env, courseId, input);
      await logAdminActivity(
        env,
        (userAuth as any).email || "Unknown Admin",
        "Update Google Merchant Listing",
        `Course ID: ${courseId} Merchant listing settings updated.`,
        getClientIP(request),
      );
      return jsonResponse({ success: true, listing });
    }

    if (request.method === "POST") {
      const input = await request.json().catch(() => undefined) as MerchantListingInput | undefined;
      try {
        const result = await syncCourseToGoogleMerchant(env, request, courseId, input);
        await logAdminActivity(
          env,
          (userAuth as any).email || "Unknown Admin",
          "Sync Google Merchant Listing",
          `Course ID: ${courseId} synced to Google Merchant.`,
          getClientIP(request),
        );
        return jsonResponse({ success: true, result });
      } catch (error: any) {
        const message = error?.message || String(error);
        await env.DB.prepare(
          `UPDATE CourseMerchantListings SET sync_status = 'error', sync_error = ?, updated_at = CURRENT_TIMESTAMP WHERE course_id = ?`,
        )
          .bind(message, courseId)
          .run();
        return jsonResponse({ error: message }, 400);
      }
    }

    if (request.method === "DELETE") {
      await env.DB.prepare(
        `UPDATE CourseMerchantListings SET sync_enabled = 0, sync_status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE course_id = ?`,
      )
        .bind(courseId)
        .run();
      return jsonResponse({ success: true });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized") return jsonResponse({ error: error.message }, 401);
    if (error.message === "Forbidden") return jsonResponse({ error: error.message }, 403);
    return handleGlobalError(error, "GoogleMerchant.Course", env, request);
  }
}

async function handleMerchantSettings(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdminOrTeacher(request, env);
    const config = await getMerchantRuntimeConfig(env);
    return jsonResponse({
      configured: config.isConfigured,
      account_id_present: Boolean(config.accountId),
      data_source_name_present: Boolean(config.dataSourceName),
      service_account_email_present: Boolean(config.serviceAccountEmail),
      private_key_present: Boolean(config.privateKey),
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") return jsonResponse({ error: error.message }, 401);
    if (error.message === "Forbidden") return jsonResponse({ error: error.message }, 403);
    return handleGlobalError(error, "GoogleMerchant.Settings", env, request);
  }
}

// --- Course & Enrollment Handlers ---

async function handleListCourses(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(
      `
      SELECT c.id, c.title, c.title_hi, c.description, c.description_hi, c.price, c.price_inr, c.price_usd, c.self_study_enabled, c.self_study_credit_cost, c.self_study_only, c.individual_class_booking_enabled, c.individual_class_credit_cost, c.individual_class_duration_minutes, c.teacher_id, cat.name as category_name,
             (SELECT MIN(NULLIF(COALESCE(b.group_class_credit_cost, 0), 0)) FROM Batches b WHERE b.course_id = c.id AND COALESCE(b.self_study_group_enabled, 1) = 1 AND b.status != 'completed') as min_group_class_credit_cost
      FROM Courses c 
      LEFT JOIN Categories cat ON c.category_id = cat.id 
      ORDER BY c.created_at DESC
    `,
    ).all();
    return new Response(JSON.stringify({ courses: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Course.List", env, request);
  }
}

async function handleGetCourse(
  request: Request,
  env: Env,
  courseId: string,
): Promise<Response> {
  try {
    const course = await env.DB.prepare("SELECT * FROM Courses WHERE id = ?")
      .bind(courseId)
      .first();
    if (!course)
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
      });

    let isEnrolled = false;
    let isAdmin = false;
    let paymentStatus: string | null = null;
    let enrollmentStatus: string | null = null;
    let progress = 0;
    let hasActiveSubscription = false;
    let subscriptionCourseAccess = false;
    let selfStudyCredits: { total: number; used: number; locked: number; available: number } | null = null;

    const token = getCookie(request, "session");
    if (token) {
      try {
        const jwtSecret = await getSecret(env, "JWT_SECRET");
        if (!jwtSecret) throw new Error("JWT_SECRET missing");
        const payload = await verifyJWT(token, jwtSecret);
        if (payload.role === "admin" || payload.role === "teacher")
          isAdmin = true;
        if (payload.role === "student") {
          selfStudyCredits = await getCreditBalance(env, payload.sub, "self_study");
          const profile = await getUserAccessProfile(payload.sub, env);
          hasActiveSubscription = profile.hasActiveSub;
          subscriptionCourseAccess = userAccessProfileAllowsCourse(profile, courseId);
        }
        const existing = (await env.DB.prepare(
          `SELECT payment_status, status, progress
           FROM Enrollments
           WHERE user_id = ? AND course_id = ?
           ORDER BY purchased_at DESC
           LIMIT 1`,
        )
          .bind(payload.sub, courseId)
          .first()) as any;
        if (existing) {
          isEnrolled = true;
          paymentStatus = existing.payment_status || null;
          enrollmentStatus = existing.status || null;
          progress = existing.progress ?? 0;
        }
      } catch (e) {
        /* ignore invalid token for public view */
      }
    }

    return new Response(JSON.stringify({
      course,
      isEnrolled,
      isAdmin,
      paymentStatus,
      enrollmentStatus,
      progress,
      hasActiveSubscription,
      subscriptionCourseAccess,
      selfStudyCredits,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Course.Get", env, request);
  }
}

async function handleListLessons(
  request: Request,
  env: Env,
  courseId: string,
): Promise<Response> {
  try {
    const token = getCookie(request, "session");
    let allowed = false;
    let isPaid = false;
    let hasActiveSubscription = false;
    let subscriptionCourseAccess = false;
    let userId = null;

    if (token) {
      try {
        const jwtSecret = await getSecret(env, "JWT_SECRET");
        if (!jwtSecret) throw new Error("JWT_SECRET missing");
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub;
        if (payload.role === "admin" || payload.role === "teacher") {
          allowed = true;
          isPaid = true;
        } else {
          const enrollment: any = await env.DB.prepare(
            "SELECT payment_status FROM Enrollments WHERE user_id = ? AND course_id = ?",
          )
            .bind(userId, courseId)
            .first();
          if (enrollment) {
            allowed = true;
            isPaid = enrollment.payment_status === "paid";
          }

          if (!isPaid) {
            const profile = await getUserAccessProfile(userId, env);
            hasActiveSubscription = profile.hasActiveSub;
            subscriptionCourseAccess = userAccessProfileAllowsCourse(profile, courseId);
            if (subscriptionCourseAccess) {
              allowed = true;
              isPaid = true;
            }
          }
        }
      } catch (e) { }
    }

    const { results } = await env.DB.prepare(
      "SELECT * FROM Lessons WHERE course_id = ? ORDER BY order_index ASC",
    )
      .bind(courseId)
      .all();

    let completedLessonIds: string[] = [];
    if (userId && allowed) {
      const completedQuery = await env.DB.prepare(
        "SELECT lesson_id FROM CompletedLessons WHERE user_id = ?",
      )
        .bind(userId)
        .all();
      if (completedQuery.results) {
        completedLessonIds = completedQuery.results.map(
          (r: any) => r.lesson_id,
        );
      }
    }

    if (!allowed) {
      // Return only titles and types if not allowed to view content at all
      const safeResults = results.map((r) => ({
        id: r.id,
        chapter_title: r.chapter_title,
        title: r.title,
        type: r.type,
        order_index: r.order_index,
        is_free: r.is_free,
      }));
      return new Response(
        JSON.stringify({ lessons: safeResults, locked: true }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // If allowed but NOT paid, strip content from premium lessons
    const filteredResults = results.map((r) => {
      if (!isPaid && r.is_free !== 1) {
        return {
          ...r,
          content_url: "",
          text_content:
            "🔒 This content is premium. Please enroll/pay to unlock.",
          is_locked: true,
        };
      }
      return { ...r, is_locked: false };
    });

    return new Response(
      JSON.stringify({
        lessons: filteredResults,
        locked: !isPaid,
        completedLessonIds,
        isEnrolled: allowed,
        paymentStatus: isPaid ? "paid" : "unpaid",
        hasActiveSubscription,
        subscriptionCourseAccess,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return handleGlobalError(error, "Course.Lessons", env, request);
  }
}

async function handleGetLesson(
  request: Request,
  env: Env,
  lessonId: string,
): Promise<Response> {
  try {
    const token = getCookie(request, "session");
    let userId = null;
    let isAdmin = false;

    if (token) {
      const jwtSecret = await getSecret(env, "JWT_SECRET");
      if (!jwtSecret) throw new Error("JWT_SECRET missing");
      try {
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub;
        isAdmin = payload.role === "admin" || payload.role === "teacher";
      } catch (e) { }
    }

    const lesson: any = await env.DB.prepare(
      "SELECT * FROM Lessons WHERE id = ?",
    )
      .bind(lessonId)
      .first();
    if (!lesson)
      return new Response(JSON.stringify({ error: "Lesson not found" }), {
        status: 404,
      });

    const course: any = await env.DB.prepare(
      "SELECT * FROM Courses WHERE id = ?",
    )
      .bind(lesson.course_id)
      .first();

    // Access Logic:
    // 1. Admin/Teacher always allowed
    // 2. Free lessons always allowed (for everyone)
    // 3. Paid lessons require 'paid' enrollment status
    let allowed = isAdmin || lesson.is_free === 1;

    if (!allowed && userId) {
      const enrollment: any = await env.DB.prepare(
        "SELECT payment_status FROM Enrollments WHERE user_id = ? AND course_id = ?",
      )
        .bind(userId, lesson.course_id)
        .first();
      if (enrollment && enrollment.payment_status === "paid") {
        allowed = true;
      }

      if (!allowed) {
        const profile = await getUserAccessProfile(userId, env);
        if (userAccessProfileAllowsCourse(profile, lesson.course_id)) {
          allowed = true;
        }
      }
    }

    if (!allowed) {
      // Return safe version of lesson without sensitive content
      const safeLesson = {
        id: lesson.id,
        course_id: lesson.course_id,
        title: lesson.title,
        type: lesson.type,
        is_free: lesson.is_free,
        content_url: "",
        text_content:
          lesson.is_free === 1
            ? lesson.text_content
            : "🔒 Premium Content Locked. Please upgrade your enrollment to access.",
      };
      return new Response(
        JSON.stringify({
          lesson: safeLesson,
          course,
          error: "Enrollment required for premium content",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ lesson, course }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "User.GetLesson", env, request);
  }
}


const AUTO_ANALYSIS_SUPPORTED_TYPES = new Set([
  "audio",
  "image",
  "pdf",
  "recording",
  "video",
]);

function hasLessonTextContent(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isInternalMediaUrl(value: unknown): value is string {
  return typeof value === "string" && /\/api\/media\/.+/.test(value);
}

function shouldAnalyzeContentUrl(type: string, contentUrl: unknown): boolean {
  if (!isInternalMediaUrl(contentUrl)) return false;

  const normalizedType = type.toLowerCase();
  if (normalizedType === "video" || normalizedType === "recording") {
    // Video files must be transcribed from extracted audio when possible. Passing
    // large video containers directly to Whisper is slow and often fails.
    return /\.(mp3|m4a|wav|ogg|webm|flac|aac)(\?|$)/i.test(contentUrl);
  }

  return AUTO_ANALYSIS_SUPPORTED_TYPES.has(normalizedType);
}

function scheduleAutoAnalyzeLesson(
  env: Env,
  ctx: ExecutionContext | undefined,
  lessonId: string,
  type: string,
  contentUrl: unknown,
  title: string,
) {
  if (!isInternalMediaUrl(contentUrl) || !shouldAnalyzeContentUrl(type, contentUrl)) {
    console.warn(
      `[Auto-AI] Skipping unsupported or non-internal media URL for ${lessonId}: ${String(contentUrl || "")}`,
    );
    return false;
  }

  const task = autoAnalyzeLesson(env, lessonId, type, contentUrl, title);
  if (ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(task);
  } else {
    task.catch((error) =>
      console.error(`[Auto-AI] Background task failed for ${lessonId}:`, error),
    );
  }
  return true;
}

async function handleAdminCreateLesson(
  request: Request,
  env: Env,
  courseId: string,
  ctx?: ExecutionContext,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    if (auth.role === "teacher") {
      const course = await env.DB.prepare(
        "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
      )
        .bind(courseId, auth.id)
        .first();
      if (!course)
        return new Response(
          JSON.stringify({
            error: "Access Denied: You do not own this course.",
          }),
          { status: 403 },
        );
    }

    const body = (await request.json()) as any;
    const lessonId = generateCustomId("YA-LSN");
    await env.DB.prepare(
      "INSERT INTO Lessons (id, course_id, chapter_title, title, type, content_url, text_content, order_index, is_free) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        lessonId,
        courseId,
        body.chapter_title || "General",
        body.title ?? "Untitled Lesson",
        body.type ?? "video",
        body.content_url ?? "",
        body.text_content ?? "",
        body.order_index ?? 0,
        body.is_free ?? 0,
      )
      .run();
    const lessonType = body.type || "video";
    const analysisUrl = body.extracted_audio_url || body.content_url;
    const analysisQueued = !hasLessonTextContent(body.text_content)
      ? scheduleAutoAnalyzeLesson(
          env,
          ctx,
          lessonId,
          body.extracted_audio_url ? "audio" : lessonType,
          analysisUrl,
          body.title || "Untitled",
        )
      : false;

    return new Response(JSON.stringify({ success: true, id: lessonId, analysisQueued }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.CreateLesson", env, request);
  }
}

async function handleAdminUpload(
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);

    const contentType =
      request.headers.get("Content-Type") || "application/octet-stream";
    let key = "";
    let courseId = "general";
    let streamBody: any;
    let finalContentType = contentType;

    const sanitizeName = (name: string) => {
      const parts = name.split(".");
      const ext = parts.length > 1 ? "." + parts.pop() : "";
      let cleanBase = parts
        .join(".")
        .replace(/[^\x00-\x7F]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "");
      return (cleanBase || "media") + ext;
    };

    if (contentType.includes("multipart/form-data")) {
      // Fallback for old forms (small files)
      const formData = await request.formData();
      const file = formData.get("file") as File;
      courseId = (formData.get("courseId") as string) || "general";
      if (!file)
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
        });
      key = `${courseId}/${generateCustomId("YA-MED")}-${sanitizeName(file.name)}`;
      streamBody = await file.arrayBuffer();
      finalContentType = file.type;
    } else {
      // Direct raw stream for large files (bypasses RAM limits)
      const encodedName = request.headers.get("X-File-Name") || "upload.bin";
      courseId = request.headers.get("X-Course-Id") || "general";
      const fileName = decodeURIComponent(encodedName);
      key = `${courseId}/${generateCustomId("YA-MED")}-${sanitizeName(fileName)}`;
      streamBody = request.body;

      // Infer mime type from extension if missing or generic
      if (
        !finalContentType ||
        finalContentType === "application/octet-stream"
      ) {
        const ext = fileName.split(".").pop()?.toLowerCase();
        if (ext === "mp4") finalContentType = "video/mp4";
        else if (ext === "webm") finalContentType = "video/webm";
        else if (ext === "mov") finalContentType = "video/quicktime";
        else if (ext === "mkv") finalContentType = "video/x-matroska";
        else if (ext === "mp3") finalContentType = "audio/mpeg";
        else if (ext === "png") finalContentType = "image/png";
        else if (ext === "jpg" || ext === "jpeg")
          finalContentType = "image/jpeg";
        else if (ext === "pdf") finalContentType = "application/pdf";
      }
    }

    if (!streamBody) {
      return new Response(JSON.stringify({ error: "Empty request body" }), {
        status: 400,
      });
    }

    await env.STORAGE.put(key, streamBody, {
      httpMetadata: { contentType: finalContentType },
    });

    const url = `/api/media/${key}`;
    const lessonId = request.headers.get("X-Lesson-Id") || "";
    const shouldAutoAnalyze =
      request.headers.get("X-Auto-Analyze") === "1" ||
      request.headers.get("X-Media-Purpose") === "transcript";

    let analysisQueued = false;
    if (lessonId && shouldAutoAnalyze) {
      const lesson = (await env.DB.prepare(
        `SELECT l.id, l.title, l.type, l.text_content, l.text_content_hi, c.teacher_id
         FROM Lessons l
         JOIN Courses c ON c.id = l.course_id
         WHERE l.id = ? AND l.course_id = ?`,
      )
        .bind(lessonId, courseId)
        .first()) as any;

      if (!lesson) {
        console.warn(`[Auto-AI] Upload analysis skipped; lesson not found: ${lessonId}`);
      } else if (auth.role === "teacher" && lesson.teacher_id !== auth.id) {
        console.warn(`[Auto-AI] Upload analysis denied for teacher ${auth.id}: ${lessonId}`);
      } else if (hasLessonTextContent(lesson.text_content)) {
        console.log(`[Auto-AI] Upload analysis skipped; lesson already has text: ${lessonId}`);
      } else {
        const analysisType = finalContentType.startsWith("audio/")
          ? "audio"
          : lesson.type || "video";
        analysisQueued = scheduleAutoAnalyzeLesson(
          env,
          ctx,
          lessonId,
          analysisType,
          url,
          lesson.title || "Untitled",
        );
      }
    }

    return new Response(JSON.stringify({ success: true, url, analysisQueued }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.Upload", env, request);
  }
}

async function handleServeMedia(
  request: Request,
  env: Env,
  key: string,
): Promise<Response> {
  try {
    const rangeHeader = request.headers.get("Range");
    const mediaUrl = `/api/media/${key}`;
    const lesson = (await env.DB.prepare(
      "SELECT id, course_id, is_free FROM Lessons WHERE content_url = ? OR recording_url = ? LIMIT 1",
    )
      .bind(mediaUrl, mediaUrl)
      .first()) as any;

    const token = getCookie(request, "session");
    let payload: any = null;
    if (token) {
      try {
        const jwtSecret = await getSecret(env, "JWT_SECRET");
        if (!jwtSecret) throw new Error("JWT_SECRET missing");
        payload = await verifyJWT(token, jwtSecret);
      } catch (e) {
        payload = null;
      }
    }

    if (!lesson) {
      if (!payload || (payload.role !== "admin" && payload.role !== "teacher")) {
        return new Response("Not Found", { status: 404 });
      }
    } else if (lesson.is_free !== 1) {
      if (!payload) {
        return new Response("Unauthorized", { status: 401 });
      }
      if (payload.role !== "admin" && payload.role !== "teacher") {
        const enrollment = (await env.DB.prepare(
          "SELECT payment_status FROM Enrollments WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed') ORDER BY purchased_at DESC LIMIT 1",
        )
          .bind(payload.sub, lesson.course_id)
          .first()) as any;
        const hasPaidEnrollment = enrollment?.payment_status === "paid";
        const hasSubscriptionAccess = await userHasSubscriptionCourseAccess(
          payload.sub,
          lesson.course_id,
          env,
        );
        if (!hasPaidEnrollment && !hasSubscriptionAccess) {
          return new Response("Forbidden", { status: 403 });
        }
      }
    }

    // Get metadata first using head() to avoid downloading massive bodies just for size
    const objectMeta = await env.STORAGE.head(key);

    if (!objectMeta) {
      return new Response("Not Found", { status: 404 });
    }

    const totalSize = objectMeta.size;
    const contentType =
      objectMeta.httpMetadata?.contentType || "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=3600");
    headers.set("ETag", objectMeta.httpEtag);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set(
      "Access-Control-Expose-Headers",
      "Content-Range, Content-Length, Accept-Ranges",
    );

    // Force inline for video/audio
    if (contentType.startsWith("video/") || contentType.startsWith("audio/")) {
      headers.set("Content-Disposition", "inline");
    }

    // Handle Range request (essential for video seeking in browsers)
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        let start = 0;
        let end = totalSize - 1;

        if (match[1] && match[2]) {
          start = parseInt(match[1], 10);
          end = parseInt(match[2], 10);
        } else if (match[1] && !match[2]) {
          start = parseInt(match[1], 10);
        } else if (!match[1] && match[2]) {
          start = totalSize - parseInt(match[2], 10);
          if (start < 0) start = 0;
        }

        if (end >= totalSize) end = totalSize - 1;

        if (start >= totalSize || start > end) {
          headers.set("Content-Range", `bytes */${totalSize}`);
          return new Response("Range Not Satisfiable", {
            status: 416,
            headers,
          });
        }

        const chunkSize = end - start + 1;
        headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
        headers.set("Content-Length", chunkSize.toString());

        if (request.method === "HEAD") {
          return new Response(null, { status: 206, headers });
        }

        const rangeOpts: any = { offset: start };
        if (end < totalSize - 1) {
          rangeOpts.length = chunkSize;
        }

        const rangedObject = await env.STORAGE.get(key, { range: rangeOpts });

        if (!rangedObject) {
          return new Response("Range Not Satisfiable", {
            status: 416,
            headers,
          });
        }

        return new Response(rangedObject.body, { status: 206, headers });
      }
    }

    // Full file
    headers.set("Content-Length", totalSize.toString());

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    const fullObject = await env.STORAGE.get(key);
    if (!fullObject) {
      return new Response("Error fetching object", { status: 500 });
    }
    return new Response(fullObject.body, { status: 200, headers });
  } catch (error) {
    console.error("Media Serve Error:", error);
    return new Response("Error serving media", { status: 500 });
  }
}

async function handleAdminUpdateLesson(
  request: Request,
  env: Env,
  courseId: string,
  lessonId: string,
  ctx?: ExecutionContext,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    if (auth.role === "teacher") {
      const course = await env.DB.prepare(
        "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
      )
        .bind(courseId, auth.id)
        .first();
      if (!course)
        return new Response(
          JSON.stringify({
            error: "Access Denied: You do not own this course.",
          }),
          { status: 403 },
        );
    }

    const body = (await request.json()) as any;
    const existingLesson = (await env.DB.prepare(
      "SELECT title, type, text_content, text_content_hi FROM Lessons WHERE id = ? AND course_id = ?",
    )
      .bind(lessonId, courseId)
      .first()) as any;

    if (!existingLesson) {
      return new Response(JSON.stringify({ error: "Lesson not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await env.DB.prepare(
      `
      UPDATE Lessons SET 
        chapter_title = COALESCE(?, chapter_title), 
        title = COALESCE(?, title), 
        type = COALESCE(?, type), 
        content_url = COALESCE(?, content_url), 
        text_content = COALESCE(?, text_content), 
        order_index = COALESCE(?, order_index), 
        is_free = COALESCE(?, is_free) 
      WHERE id = ? AND course_id = ?
    `,
    )
      .bind(
        body.chapter_title ?? null,
        body.title ?? null,
        body.type ?? null,
        body.content_url ?? null,
        body.text_content ?? null,
        body.order_index ?? null,
        body.is_free ?? null,
        lessonId,
        courseId,
      )
      .run();

    const lessonType = body.type || existingLesson.type || "video";
    const lessonTitle = body.title || existingLesson.title || "Untitled";
    const hasManualText = hasLessonTextContent(body.text_content);
    const alreadyHasText = hasLessonTextContent(existingLesson.text_content);
    const analysisUrl = body.extracted_audio_url || body.content_url;
    const analysisQueued = !hasManualText && !alreadyHasText
      ? scheduleAutoAnalyzeLesson(
          env,
          ctx,
          lessonId,
          body.extracted_audio_url ? "audio" : lessonType,
          analysisUrl,
          lessonTitle,
        )
      : false;

    return new Response(JSON.stringify({ success: true, analysisQueued }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.UpdateLesson", env, request);
  }
}

async function handleAdminDeleteLesson(
  request: Request,
  env: Env,
  courseId: string,
  lessonId: string,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    if (auth.role === "teacher") {
      const course = await env.DB.prepare(
        "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
      )
        .bind(courseId, auth.id)
        .first();
      if (!course)
        return new Response(
          JSON.stringify({
            error: "Access Denied: You do not own this course.",
          }),
          { status: 403 },
        );
    }

    const lesson: any = await env.DB.prepare(
      "SELECT content_url FROM Lessons WHERE id = ? AND course_id = ?",
    )
      .bind(lessonId, courseId)
      .first();

    if (
      lesson &&
      lesson.content_url &&
      lesson.content_url.startsWith("/api/media/")
    ) {
      const key = lesson.content_url.replace("/api/media/", "");
      try {
        await env.STORAGE.delete(key);
      } catch (storageError) {
        console.error("Failed to delete media from R2:", storageError);
      }
    }

    await env.DB.prepare("DELETE FROM Lessons WHERE id = ? AND course_id = ?")
      .bind(lessonId, courseId)
      .run();
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.DeleteLesson", env, request);
  }
}

// --- Dynamic Forms Handlers ---

async function handleAdminFormTemplates(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const userAuth = await requireAdminOrTeacher(request, env);
    if (request.method === "GET") {
      let query = "SELECT * FROM FormTemplates";
      let results;
      if (userAuth.role === "teacher") {
        // Teacher sees forms directly assigned to them OR forms linked to their courses
        query +=
          " WHERE teacher_id = ? OR linked_course_id IN (SELECT id FROM Courses WHERE teacher_id = ?) ORDER BY created_at DESC";
        results = (
          await env.DB.prepare(query).bind(userAuth.id, userAuth.id).all()
        ).results;
      } else {
        query += " ORDER BY created_at DESC";
        results = (await env.DB.prepare(query).all()).results;
      }
      return new Response(JSON.stringify({ templates: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (request.method === "POST") {
      const {
        slug,
        title,
        title_hi,
        description,
        description_hi,
        fields_json,
        seo_json,
        theme_json,
        confirmation_email_body,
        linked_course_id,
        auto_enroll,
      } = (await request.json()) as any;
      const id = generateCustomId("YA-FRM");

      const teacherId = userAuth.role === "teacher" ? userAuth.id : null;

      if (userAuth.role === "teacher" && linked_course_id) {
        const check = await env.DB.prepare(
          "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
        )
          .bind(linked_course_id, userAuth.id)
          .first();
        if (!check)
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
          });
      }

      await env.DB.prepare(
        "INSERT INTO FormTemplates (id, slug, title, title_hi, description, description_hi, fields_json, seo_json, theme_json, confirmation_email_body, linked_course_id, auto_enroll, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          id,
          slug,
          title,
          title_hi || null,
          description || "",
          description_hi || null,
          JSON.stringify(fields_json),
          JSON.stringify(seo_json || {}),
          JSON.stringify(theme_json || {}),
          confirmation_email_body || null,
          linked_course_id || null,
          auto_enroll ? 1 : 0,
          teacherId,
        )
        .run();
      return new Response(
        JSON.stringify({ message: "Form template created successfully", id }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "PUT") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();
      const {
        slug,
        title,
        title_hi,
        description,
        description_hi,
        fields_json,
        seo_json,
        theme_json,
        confirmation_email_body,
        linked_course_id,
        auto_enroll,
      } = (await request.json()) as any;

      if (userAuth.role === "teacher") {
        const template = (await env.DB.prepare(
          "SELECT teacher_id, linked_course_id FROM FormTemplates WHERE id = ?",
        )
          .bind(id)
          .first()) as any;
        if (!template)
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
          });

        let isOwner = template.teacher_id === userAuth.id;
        if (!isOwner && template.linked_course_id) {
          const courseCheck = await env.DB.prepare(
            "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
          )
            .bind(template.linked_course_id, userAuth.id)
            .first();
          if (courseCheck) isOwner = true;
        }
        if (!isOwner)
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
          });

        if (linked_course_id) {
          const linkCheck = await env.DB.prepare(
            "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
          )
            .bind(linked_course_id, userAuth.id)
            .first();
          if (!linkCheck)
            return new Response(JSON.stringify({ error: "Forbidden link" }), {
              status: 403,
            });
        }
      }

      await env.DB.prepare(
        "UPDATE FormTemplates SET slug = ?, title = ?, title_hi = ?, description = ?, description_hi = ?, fields_json = ?, seo_json = ?, theme_json = ?, confirmation_email_body = ?, linked_course_id = ?, auto_enroll = ? WHERE id = ?",
      )
        .bind(
          slug,
          title,
          title_hi || null,
          description || "",
          description_hi || null,
          JSON.stringify(fields_json),
          JSON.stringify(seo_json || {}),
          JSON.stringify(theme_json || {}),
          confirmation_email_body || null,
          linked_course_id || null,
          auto_enroll ? 1 : 0,
          id,
        )
        .run();
      return new Response(
        JSON.stringify({ message: "Form template updated successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();

      if (userAuth.role === "teacher") {
        const template = (await env.DB.prepare(
          "SELECT teacher_id, linked_course_id FROM FormTemplates WHERE id = ?",
        )
          .bind(id)
          .first()) as any;
        if (!template)
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
          });

        let isOwner = template.teacher_id === userAuth.id;
        if (!isOwner && template.linked_course_id) {
          const courseCheck = await env.DB.prepare(
            "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
          )
            .bind(template.linked_course_id, userAuth.id)
            .first();
          if (courseCheck) isOwner = true;
        }
        if (!isOwner)
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
          });
      }

      await env.DB.prepare("DELETE FROM FormTemplates WHERE id = ?")
        .bind(id)
        .run();
      return new Response(
        JSON.stringify({ message: "Form template deleted successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.FormTemplates", env, request);
  }
}

async function handleAdminFormSubmissions(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    if (request.method === "GET") {
      let query = `
        SELECT s.*, t.title as template_title, t.slug as template_slug, t.linked_course_id, c.title as course_title
        FROM FormSubmissions s 
        JOIN FormTemplates t ON s.template_id = t.id 
        LEFT JOIN Courses c ON t.linked_course_id = c.id
      `;
      let params: any[] = [];
      if (auth.role === "teacher") {
        query += " WHERE t.teacher_id = ?";
        params.push(auth.id);
      }
      query += " ORDER BY s.created_at DESC";

      const { results } = await env.DB.prepare(query)
        .bind(...params)
        .all();
      return new Response(JSON.stringify({ submissions: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (request.method === "PUT") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();

      if (auth.role === "teacher") {
        const ownership = await env.DB.prepare(
          `
          SELECT s.id FROM FormSubmissions s 
          JOIN FormTemplates t ON s.template_id = t.id 
          WHERE s.id = ? AND t.teacher_id = ?
        `,
        )
          .bind(id, auth.id)
          .first();
        if (!ownership)
          return new Response(
            JSON.stringify({
              error: "Access Denied: You do not own this form.",
            }),
            { status: 403 },
          );
      }

      const { status, ai_analysis } = (await request.json()) as any;
      await env.DB.prepare(
        "UPDATE FormSubmissions SET status = ?, ai_analysis = ? WHERE id = ?",
      )
        .bind(status, ai_analysis || null, id)
        .run();
      return new Response(
        JSON.stringify({ message: "Submission updated successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.pathname.split("/").pop();

      if (auth.role === "teacher") {
        const ownership = await env.DB.prepare(
          `
          SELECT s.id FROM FormSubmissions s 
          JOIN FormTemplates t ON s.template_id = t.id 
          WHERE s.id = ? AND t.teacher_id = ?
        `,
        )
          .bind(id, auth.id)
          .first();
        if (!ownership)
          return new Response(
            JSON.stringify({
              error: "Access Denied: You do not own this form.",
            }),
            { status: 403 },
          );
      }

      await env.DB.prepare("DELETE FROM FormSubmissions WHERE id = ?")
        .bind(id)
        .run();
      return new Response(
        JSON.stringify({ message: "Submission deleted successfully" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.FormSubmissions", env, request);
  }
}

async function handleCheckDuplicateSubmission(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email");
    const phone = url.searchParams.get("phone");
    if (!email && !phone)
      return new Response(JSON.stringify({ exists: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const template: any = await env.DB.prepare(
      "SELECT id FROM FormTemplates WHERE slug = ?",
    )
      .bind(slug)
      .first();
    if (!template)
      return new Response(JSON.stringify({ error: "Form not found" }), {
        status: 404,
      });

    let exists = false;
    if (email) {
      const existingEmail = await env.DB.prepare(
        "SELECT id FROM FormSubmissions WHERE template_id = ? AND email = ?",
      )
        .bind(template.id, email)
        .first();
      if (existingEmail) exists = true;
    }
    if (!exists && phone) {
      // Basic LIKE search for phone in data_json since D1 JSON extraction can be verbose depending on version
      const existingPhone = await env.DB.prepare(
        "SELECT id FROM FormSubmissions WHERE template_id = ? AND data_json LIKE ?",
      )
        .bind(template.id, `%${phone}%`)
        .first();
      if (existingPhone) exists = true;
    }

    return new Response(JSON.stringify({ exists }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Form.CheckDuplicate", env, request);
  }
}

async function handleGetFormTemplate(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  try {
    const template = await env.DB.prepare(
      "SELECT * FROM FormTemplates WHERE slug = ?",
    )
      .bind(slug)
      .first();
    if (!template)
      return new Response(JSON.stringify({ error: "Form not found" }), {
        status: 404,
      });
    return new Response(JSON.stringify(template), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Form.GetTemplate", env, request);
  }
}

async function handleFormResponseSubmit(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  try {
    const template: any = await env.DB.prepare(
      "SELECT * FROM FormTemplates WHERE slug = ?",
    )
      .bind(slug)
      .first();
    if (!template)
      return new Response(JSON.stringify({ error: "Form not found" }), {
        status: 404,
      });

    const submissionData = (await request.json()) as any;
    const submissionId = generateCustomId("YA-SUB");
    const email = submissionData.email || "";
    const fullName =
      submissionData.full_name ||
      submissionData.name ||
      submissionData.student_name ||
      "New Student";
    const phone = submissionData.phone || submissionData.mobile || null;
    // Extract country/district codes from form data
    const countryCode =
      submissionData.country_code || submissionData.country || "IN";
    const districtCode =
      submissionData.district_code || submissionData.district || "01";
    // Batch selected by user in form
    const selectedBatchId =
      submissionData.selected_batch_id || template.linked_batch_id || null;

    // AI Analysis (Eligibility / Admission processing)
    let aiFeedback = null;
    let isFit = false;
    let autoEnrolled = false;

    if (template.eligibility_criteria || template.auto_enroll) {
      try {
        const criteriaText =
          template.eligibility_criteria ||
          "Review the application for general sincerity.";
        const systemPrompt = `You are "Ashram Admission AI". Review this application for "${template.title}". 
        Evaluate based on these rules: ${criteriaText}
        Format: {"score": 0-10, "feedback": "Short encouraging feedback in Hindi", "is_fit": boolean}
        Application: ${JSON.stringify(submissionData)}`;

        const aiResult = await generateAIContent(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Review this application." },
          ],
          env,
          true,
        );
        const parsedAnalysis = JSON.parse(sanitizeJson(aiResult));
        aiFeedback = JSON.stringify(parsedAnalysis);
        isFit = parsedAnalysis.is_fit === true;
      } catch (e) {
        console.error("Submission AI Analysis Error:", e);
        isFit = true; // Default to fit if AI unavailable
      }
    } else {
      isFit = true; // No criteria = auto-fit
    }

    let submissionStatus = "pending";
    let createdUserId: string | null = null;

    // Auto Account Creation + Enrollment Logic
    // Trigger if: linked_course_id exists OR auto_enroll is set
    if ((template.linked_course_id || template.auto_enroll) && email) {
      try {
        // Find existing user or create a new one with proper student ID
        let user: any = await env.DB.prepare(
          "SELECT id, email, full_name FROM Users WHERE email = ?",
        )
          .bind(email)
          .first();
        if (!user) {
          const newUserId = await generateStudentId(
            env.DB,
            countryCode,
            districtCode,
            fullName,
          );
          await env.DB.prepare(
            "INSERT INTO Users (id, email, role, full_name, phone) VALUES (?, ?, ?, ?, ?)",
          )
            .bind(newUserId, email, "student", fullName, phone)
            .run();
          user = { id: newUserId, email, full_name: fullName };
          createdUserId = newUserId;

          // Welcome email for new account
          // Welcome email for new account
          const welcomeHtml = `
            <p style="font-size:16px;">नमस्ते <strong>${fullName}</strong>,</p>
            <p>आपका Adityanveshan LMS पर account बन गया है।</p>
            <p><strong>Student ID:</strong> <code style="background:#ede9fe;padding:4px 8px;border-radius:6px;color:#4f46e5;">${newUserId}</code></p>
            <p>Login करने के लिए अपना email (<strong>${email}</strong>) use करें और OTP से verify करें।</p>
          `;
          const welcomeText = `नमस्ते ${fullName},\n\nआपका Adityanveshan LMS पर account बन गया है।\nStudent ID: ${newUserId}\n\nLogin करने के लिए अपना email (${email}) use करें और OTP से verify करें।`;
          await safeSendEmail(
            env,
            email,
            "यज्ञ आश्रम - Account Created",
            "यज्ञ आश्रम में स्वागत!",
            welcomeHtml,
            welcomeText,
          );
        }

        // Enroll in linked course if isFit
        if (template.linked_course_id && isFit) {
          const existingEnr: any = await env.DB.prepare(
            "SELECT id, batch_id FROM Enrollments WHERE user_id = ? AND course_id = ?",
          )
            .bind(user.id, template.linked_course_id)
            .first();
          if (existingEnr) {
            if (selectedBatchId && existingEnr.batch_id !== selectedBatchId) {
              await env.DB.prepare(
                "UPDATE Enrollments SET batch_id = ? WHERE id = ?",
              )
                .bind(selectedBatchId, existingEnr.id)
                .run();
              await createNotification(
                env,
                user.id,
                "Batch Updated",
                `आपके course enrollment का batch अपडेट कर दिया गया है।`,
                "success",
              );
            }
          } else {
            const enrollId = generateCustomId("YA-ENR");
            await env.DB.prepare(
              "INSERT INTO Enrollments (id, user_id, course_id, batch_id, status, payment_status) VALUES (?, ?, ?, ?, ?, ?)",
            )
              .bind(
                enrollId,
                user.id,
                template.linked_course_id,
                selectedBatchId,
                "active",
                "unpaid",
              )
              .run();
            await createNotification(
              env,
              user.id,
              "Course Enrollment",
              `आपको form के माध्यम से course में enroll किया गया है।`,
              "success",
            );
          }
          submissionStatus = "approved";
          autoEnrolled = true;
        }
      } catch (e) {
        console.error("Auto-enrollment failed:", e);
      }
    }

    // Check for duplicates
    let isDuplicate = false;
    if (email) {
      const existingSubmission = await env.DB.prepare(
        "SELECT id FROM FormSubmissions WHERE template_id = ? AND email = ?",
      )
        .bind(template.id, email)
        .first();
      if (existingSubmission) {
        isDuplicate = true;
      }
    }

    await env.DB.prepare(
      "INSERT INTO FormSubmissions (id, template_id, email, data_json, ai_analysis, status) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(
        submissionId,
        template.id,
        email,
        JSON.stringify(submissionData),
        aiFeedback,
        submissionStatus,
      )
      .run();

    // Get course info for emails
    let courseInfo: any = null;
    if (template.linked_course_id) {
      courseInfo = await env.DB.prepare(
        "SELECT title, price_inr FROM Courses WHERE id = ?",
      )
        .bind(template.linked_course_id)
        .first();
    }

    // Send confirmation email to user ONLY IF NOT DUPLICATE
    if (email && !isDuplicate) {
      const subject = `Confirmation: ${template.title}`;
      let userBody = template.confirmation_email_body;
      if (!userBody) {
        userBody = `
          <p>नमस्ते <strong>${fullName}</strong>,</p>
          <p>आपका फॉर्म "<strong>${template.title}</strong>" सफलतापूर्वक प्राप्त हो गया है।</p>
          ${autoEnrolled && courseInfo ? `<div style="background:#dcfce7;border-radius:12px;padding:16px;margin:16px 0;"><p style="color:#166534;font-weight:600;margin:0;">🎓 आपको <strong>${courseInfo.title}</strong> में enroll कर दिया गया है!${courseInfo.price_inr > 0 ? " Premium access के लिए course page पर भुगतान करें।" : ""}</p></div>` : ""}
        `;
      }
      const userText = `नमस्ते ${fullName},\n\nआपका फॉर्म "${template.title}" सफलतापूर्वक प्राप्त हो गया है।\n\nOm!`;
      await safeSendEmail(
        env,
        email,
        subject,
        "✅ फॉर्म जमा हुआ!",
        userBody,
        userText,
      );
    }

    // Send admin notification email
    const adminEmail =
      (await getSecret(env, "ADMIN_CONTACT_EMAIL", false)) ||
      "navasanganakah@gmail.com";
    const adminHtml = `
      <table style="width:100%;border-collapse:collapse; text-align: left;">
        <tr><th style="padding:8px; border-bottom: 1px solid #ddd;">Field</th><th style="padding:8px; border-bottom: 1px solid #ddd;">Value</th></tr>
        <tr><td style="padding:8px; border-bottom: 1px solid #eee;">Form:</td><td style="padding:8px; border-bottom: 1px solid #eee;">${template.title}</td></tr>
        <tr><td style="padding:8px; border-bottom: 1px solid #eee;">Name:</td><td style="padding:8px; border-bottom: 1px solid #eee;">${fullName}</td></tr>
        <tr><td style="padding:8px; border-bottom: 1px solid #eee;">Email:</td><td style="padding:8px; border-bottom: 1px solid #eee;">${email}</td></tr>
        ${createdUserId ? `<tr><td style="padding:8px; border-bottom: 1px solid #eee;">Student ID:</td><td style="padding:8px; border-bottom: 1px solid #eee;">${createdUserId}</td></tr>` : ""}
        ${autoEnrolled && courseInfo ? `<tr><td style="padding:8px; border-bottom: 1px solid #eee;">Enrolled In:</td><td style="padding:8px; border-bottom: 1px solid #eee;">${courseInfo.title}</td></tr>` : ""}
        <tr><td style="padding:8px; border-bottom: 1px solid #eee;">Status:</td><td style="padding:8px; border-bottom: 1px solid #eee;">${submissionStatus}</td></tr>
      </table>
      <div style="margin-top:16px;">
        <h3 style="color:#6366f1;font-weight:600;">Full Submission Data</h3>
        <pre style="background:#f1f5f9;padding:12px;border-radius:8px;font-size:12px;overflow:auto;">${JSON.stringify(submissionData, null, 2)}</pre>
      </div>
    `;
    const adminText = `New Form Submission for ${template.title}\nName: ${fullName}\nEmail: ${email}\nStatus: ${submissionStatus}\n\nSubmission Data: ${JSON.stringify(submissionData, null, 2)}`;
    await safeSendEmail(
      env,
      adminEmail,
      `[LMS Form] New Submission: ${template.title}`,
      "📋 New Form Submission",
      adminHtml,
      adminText,
    );

    return new Response(
      JSON.stringify({
        message: "Form submitted successfully!",
        id: submissionId,
        ai_analysis: aiFeedback,
        auto_enrolled: autoEnrolled,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return handleGlobalError(error, "Form.Submit", env, request);
  }
}

// --- Live Session Handlers (Cloudflare Real-time Kit / Calls) ---

async function callRealtimeAPI(
  env: Env,
  path: string,
  method: string,
  body: any,
  silent404: boolean = false,
) {
  try {
    const accountId =
      (await getSecret(env, "CLOUDFLARE_ACCOUNT_ID", false)) ||
      (await getSecret(env, "NEXT_PUBLIC_CF_ACCOUNT_ID", false));
    const appId =
      (await getSecret(env, "REALTIME_APP_ID", false)) ||
      (await getSecret(env, "NEXT_PUBLIC_RT_APP_ID", false));
    const apiToken =
      (await getSecret(env, "CLOUDFLARE_API_TOKEN", false)) ||
      (await getSecret(env, "CF_API_TOKEN", false));

    const missingKeys = [];
    if (!accountId)
      missingKeys.push("CLOUDFLARE_ACCOUNT_ID (or NEXT_PUBLIC_CF_ACCOUNT_ID)");
    if (!appId) missingKeys.push("REALTIME_APP_ID (or NEXT_PUBLIC_RT_APP_ID)");
    if (!apiToken) missingKeys.push("CLOUDFLARE_API_TOKEN (or CF_API_TOKEN)");

    if (missingKeys.length > 0) {
      const msg = `Missing RealtimeKit configurations in PLATFORM_SECRETS: ${missingKeys.join(", ")}`;
      console.warn(`[Realtime] ${msg} Falling back to local signaling.`);
      // Send urgent alert to admin
      sendRedAlert(env, "Live Session (RealtimeKit) API Config", msg);
      return null;
    }

    const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/realtime/kit/${appId}${path}`;

    const res = await fetch(apiUrl, {
      method,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 404 && silent404) {
        return null;
      }
      console.error(`[Realtime API Error] ${res.status}: ${errText}`);
      // Send urgent alert to admin
      sendRedAlert(
        env,
        `Live Session (RealtimeKit) Error - ${method} ${path}`,
        `URL: ${apiUrl}\nStatus: ${res.status}\nError Response: ${errText}\nPayload: ${body ? JSON.stringify(body, null, 2) : "none"}`,
      );
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`[Realtime API Fetch Error]`, error);
    // Send urgent alert to admin
    sendRedAlert(
      env,
      `Live Session (RealtimeKit) Fetch Exception - ${method} ${path}`,
      `Exception details: ${error instanceof Error ? error.stack || error.message : String(error)}`,
    );
    return null;
  }
}

async function createRealtimeMeeting(
  env: Env,
  request: Request,
  title: string,
) {
  // Use hardcoded host for production webhooks as requested
  const hostUrl = "https://lms.yagyaashram.com";

  const data = await callRealtimeAPI(env, "/meetings", "POST", {
    title: title || "Live Class",
    record_on_start: true,
    recording_config: {
      video_config: {
        codec: "H264",
        width: 1280,
        height: 720,
        export_file: true,
      },
      audio_config: { codec: "AAC", channel: "stereo", export_file: true },
    },
    ai_config: {
      transcription: { language: "hi" },
      summarization: { summary_type: "lecture" },
    },
    webhooks: [
      {
        url: `${hostUrl}/api/webhooks/realtime`,
        events: ["recording.statusUpdate"],
      },
    ],
  });
  return (data as any)?.data?.id || (data as any)?.result?.id || null;
}

async function getRealtimeParticipantToken(
  env: Env,
  meetingId: string,
  userId: string,
  name: string,
  isAdmin: boolean,
) {
  const data = await callRealtimeAPI(
    env,
    `/meetings/${meetingId}/participants`,
    "POST",
    {
      custom_participant_id: userId,
      name: name || "छात्र",
      preset_name: isAdmin ? "group_call_host" : "group_call_participant",
    },
  );
  return (data as any)?.data?.token || (data as any)?.result?.token || null;
}

async function handleEndLiveSession(
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    const { meetingId } = (await request.json()) as { meetingId: string };

    const session = (await env.DB.prepare(
      "SELECT * FROM LiveSessions WHERE rtc_room_id = ?",
    )
      .bind(meetingId)
      .first()) as any;
    if (!session)
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
      });

    if (auth.role === "teacher" && session.teacher_id !== auth.id) {
      return new Response(JSON.stringify({ error: "Access Denied" }), {
        status: 403,
      });
    }

    await env.DB.prepare(
      'UPDATE LiveSessions SET status = "ended" WHERE id = ?',
    )
      .bind(session.id)
      .run();

    // Deduct 1 live class credit from all active subscribers for this course, unless they have lifetime access
    try {
      await env.DB.prepare(
        `
        UPDATE Subscriptions
        SET live_class_credits = MAX(0, live_class_credits - 1)
        WHERE is_lifetime = 0
        AND user_id IN (SELECT user_id FROM Enrollments WHERE course_id = ? AND status = 'active')
        AND status = 'active'
        AND NOT EXISTS (SELECT 1 FROM Courses c WHERE c.id = ? AND c.self_study_enabled = 1)
      `,
      )
        .bind(session.course_id, session.course_id)
        .run();
    } catch (e) {
      console.error("Failed to deduct live class credits:", e);
    }

    let recordingId = session.recording_id;
    if (!recordingId) {
      const activeData = await callRealtimeAPI(
        env,
        `/recordings/active-recording/${meetingId}`,
        "GET",
        null,
        true,
      );
      recordingId =
        (activeData as any)?.data?.id || (activeData as any)?.result?.id;
    }

    if (!recordingId) {
      const listRecs = await callRealtimeAPI(env, `/recordings`, "GET", null);
      const recordsArray =
        (listRecs as any)?.data || (listRecs as any)?.result || [];
      const matchedRec = recordsArray.find(
        (r: any) => r.meeting_id === meetingId,
      );
      if (matchedRec) recordingId = matchedRec.id;
    }

    if (recordingId) {
      await callRealtimeAPI(env, `/recordings/${recordingId}`, "PUT", {
        action: "stop",
      });
      await env.DB.prepare(
        'UPDATE LiveSessions SET recording_id = ?, recording_status = "pending" WHERE id = ?',
      )
        .bind(recordingId, session.id)
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Meeting ended. Recording status saved.",
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleGlobalError(error, "Live.EndSession", env, request);
  }
}

async function processRecordingToR2(
  env: Env,
  recordingId: string,
  session: any,
) {
  try {
    const meetingId = session.rtc_room_id;
    let recDetails: any = null;
    let isReady = false;
    let downloadUrl: string | null = null;

    // Poll up to 10 times, waiting 5 seconds between polls
    for (let i = 0; i < 10; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 5000));

      if (recordingId) {
        recDetails = await callRealtimeAPI(
          env,
          `/recordings/${recordingId}`,
          "GET",
          null,
        );
      } else {
        recDetails = await callRealtimeAPI(
          env,
          `/recordings/active-recording/${meetingId}`,
          "GET",
          null,
          true,
        );
      }

      const status = String(
        recDetails?.data?.status || recDetails?.result?.status || "",
      ).toLowerCase();
      downloadUrl =
        recDetails?.data?.download_url || recDetails?.result?.download_url;

      // Cloudflare may report recordings as uploaded before/when the download URL is available.
      if (
        status === "ready" ||
        status === "completed" ||
        status === "uploaded" ||
        downloadUrl
      ) {
        isReady = true;
        break;
      }
    }

    let finalUrl = downloadUrl;

    if (isReady && downloadUrl && env.STORAGE) {
      const apiToken =
        (await getSecret(env, "CLOUDFLARE_API_TOKEN", false)) ||
        (await getSecret(env, "CF_API_TOKEN", false));
      // Stream directly to R2 to avoid OOM
      const fileRes = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      });
      if (fileRes.ok && fileRes.body) {
        const objectKey = `${session.course_id}/${session.batch_id || "general"}/recording/${session.id}_${session.rtc_room_id}.mp4`;
        await env.STORAGE.put(objectKey, fileRes.body, {
          httpMetadata: { contentType: "video/mp4" },
        });
        finalUrl = `/api/assets/${objectKey}`;
      } else {
        const errText = await fileRes.text();
        console.error(
          `Failed to download recording from Cloudflare. Status: ${fileRes.status}, Error: ${errText}`,
        );
        throw new Error(`Cloudflare Download Error: ${fileRes.status}`);
      }
    }

    if (finalUrl) {
      const lessonId = generateCustomId("YA-LES");

      let transcriptText = "";
      try {
        const aiPrompt = `Please provide a professional, short textual summary/transcript description for a recorded live class titled: "${session.title}". This will be saved as the lesson's text content.`;
        transcriptText = await generateAIContent(
          [{ role: "user", content: aiPrompt }],
          env,
          false,
        );
      } catch (aiErr) {
        console.error("AI Transcription generation failed:", aiErr);
      }

      await env.DB.prepare(
        "INSERT INTO Lessons (id, course_id, batch_id, chapter_title, title, type, content_url, recording_url, text_content, order_index, is_free) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          lessonId,
          session.course_id,
          session.batch_id || null,
          "Live Recordings",
          `Recording: ${session.title}`,
          "recording",
          finalUrl,
          downloadUrl,
          transcriptText || null,
          999,
          0,
        )
        .run();

      await env.DB.prepare(
        'UPDATE LiveSessions SET recording_status = "success", recording_url = ? WHERE id = ?',
      )
        .bind(finalUrl, session.id)
        .run();
    } else {
      throw new Error("Final URL could not be resolved or download failed.");
    }
  } catch (e: any) {
    console.error("Background recording processing failed", e);
    sendRedAlert(
      env,
      "Recording Processing Failed",
      `Failed to process recording ${recordingId} for session ${session.id}. Error: ${e.message}`,
    );
  }
}

async function handleAdminDownloadRecording(
  request: Request,
  env: Env,
  sessionId: string,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    const session = (await env.DB.prepare(
      "SELECT * FROM LiveSessions WHERE id = ?",
    )
      .bind(sessionId)
      .first()) as any;
    if (!session)
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
      });
    if (auth.role === "teacher" && session.teacher_id !== auth.id)
      return new Response(JSON.stringify({ error: "Access Denied" }), {
        status: 403,
      });

    let recordingId = session.recording_id;

    if (!recordingId && session.rtc_room_id) {
      let recDetails = await callRealtimeAPI(
        env,
        `/recordings/active-recording/${session.rtc_room_id}`,
        "GET",
        null,
        true,
      );
      let fetchedId =
        (recDetails as any)?.data?.id || (recDetails as any)?.result?.id;

      if (!fetchedId) {
        const listRecs = await callRealtimeAPI(env, `/recordings`, "GET", null);
        const recordsArray =
          (listRecs as any)?.data || (listRecs as any)?.result || [];
        const matchedRec = recordsArray.find(
          (r: any) => r.meeting_id === session.rtc_room_id,
        );
        if (matchedRec) fetchedId = matchedRec.id;
      }

      if (fetchedId) {
        recordingId = fetchedId;
        await env.DB.prepare(
          "UPDATE LiveSessions SET recording_id = ? WHERE id = ?",
        )
          .bind(recordingId, session.id)
          .run();
        session.recording_id = recordingId;
      }
    }

    if (!recordingId) {
      return new Response(
        JSON.stringify({ error: "No recording found for this session" }),
        { status: 400 },
      );
    }

    const recDetails = await callRealtimeAPI(
      env,
      `/recordings/${recordingId}`,
      "GET",
      null,
    );
    const downloadUrl =
      (recDetails as any)?.data?.download_url ||
      (recDetails as any)?.result?.download_url;

    if (!downloadUrl) {
      return new Response(
        JSON.stringify({ error: "Recording is not ready to download yet." }),
        { status: 400 },
      );
    }

    const apiToken =
      (await getSecret(env, "CLOUDFLARE_API_TOKEN", false)) ||
      (await getSecret(env, "CF_API_TOKEN", false));

    // Proxy the download from Cloudflare API so the browser can download it
    const fileRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!fileRes.ok || !fileRes.body) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch recording from Cloudflare API.",
        }),
        { status: 500 },
      );
    }

    // Set headers for download
    const headers = new Headers(fileRes.headers);
    headers.set(
      "Content-Disposition",
      `attachment; filename="recording_${session.id}.mp4"`,
    );
    headers.set("Content-Type", "video/mp4");

    return new Response(fileRes.body, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.DownloadRecording", env, request);
  }
}

async function handleAdminProcessRecording(
  request: Request,
  env: Env,
  sessionId: string,
  ctx?: ExecutionContext,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    const session = (await env.DB.prepare(
      "SELECT * FROM LiveSessions WHERE id = ?",
    )
      .bind(sessionId)
      .first()) as any;
    if (!session)
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
      });
    if (auth.role === "teacher" && session.teacher_id !== auth.id)
      return new Response(JSON.stringify({ error: "Access Denied" }), {
        status: 403,
      });

    if (!session.recording_id)
      return new Response(
        JSON.stringify({ error: "No recording found for this session" }),
        { status: 400 },
      );
    if (session.recording_status === "processed")
      return new Response(
        JSON.stringify({ error: "Recording is already processed" }),
        { status: 400 },
      );

    const recordingId = session.recording_id;

    // Fast-path background processing using processRecordingToR2
    if (ctx && typeof ctx.waitUntil === "function") {
      await env.DB.prepare(
        'UPDATE LiveSessions SET recording_status = "processing" WHERE id = ?',
      )
        .bind(session.id)
        .run();
      ctx.waitUntil(processRecordingToR2(env, recordingId, session));
    } else {
      await env.DB.prepare(
        'UPDATE LiveSessions SET recording_status = "processing" WHERE id = ?',
      )
        .bind(session.id)
        .run();
      processRecordingToR2(env, recordingId, session).catch(console.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Recording processing started/completed",
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleGlobalError(error, "Admin.ProcessRecording", env, request);
  }
}

async function handleRealtimeWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    const payload = (await request.json()) as any;

    // We only care about recording status updates for now
    if (payload?.type !== "recording.statusUpdate") {
      return new Response("Ignored", { status: 200 });
    }

    const recordingData = payload.data;
    const readyStatuses = new Set(["ready", "completed", "uploaded"]);
    const recordingStatus = String(recordingData?.status || "").toLowerCase();
    if (!recordingData || !readyStatuses.has(recordingStatus)) {
      return new Response("Not ready", { status: 200 });
    }

    const recordingId = recordingData.id;
    const downloadUrl = recordingData.download_url;

    if (!recordingId || !downloadUrl) {
      return new Response("Missing download info", { status: 200 });
    }

    // Find the session that this recording belongs to
    const session = (await env.DB.prepare(
      "SELECT * FROM LiveSessions WHERE recording_id = ?",
    )
      .bind(recordingId)
      .first()) as any;
    if (!session) {
      return new Response("Session not found for recording", { status: 404 });
    }

    if (
      session.recording_status === "success" ||
      session.recording_status === "processing"
    ) {
      return new Response("Already processed or processing", { status: 200 });
    }

    if (env.STORAGE) {
      const apiToken =
        (await getSecret(env, "CLOUDFLARE_API_TOKEN", false)) ||
        (await getSecret(env, "CF_API_TOKEN", false));
      // Stream directly to R2 to avoid OOM
      const fileRes = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      });
      if (fileRes.ok && fileRes.body) {
        const objectKey = `${session.course_id}/${session.batch_id || "general"}/recording/${session.id}_${session.rtc_room_id}.mp4`;
        await env.STORAGE.put(objectKey, fileRes.body, {
          httpMetadata: { contentType: "video/mp4" },
        });
        const finalUrl = `/api/assets/${objectKey}`;

        const lessonId = generateCustomId("YA-LES");

        let transcriptText = "";
        try {
          const aiPrompt = `Please provide a professional, short textual summary/transcript description for a recorded live class titled: "${session.title}". This will be saved as the lesson's text content.`;
          transcriptText = await generateAIContent(
            [{ role: "user", content: aiPrompt }],
            env,
            false,
          );
        } catch (aiErr) {
          console.error(
            "AI Transcription generation failed in webhook:",
            aiErr,
          );
        }

        await env.DB.prepare(
          "INSERT INTO Lessons (id, course_id, batch_id, chapter_title, title, type, content_url, recording_url, text_content, order_index, is_free) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            lessonId,
            session.course_id,
            session.batch_id || null,
            "Live Recordings",
            `Recording: ${session.title}`,
            "recording",
            finalUrl,
            downloadUrl,
            transcriptText || null,
            999,
            session.is_free || 0,
          )
          .run();

        await env.DB.prepare(
          'UPDATE LiveSessions SET recording_status = "success", recording_url = ? WHERE id = ?',
        )
          .bind(finalUrl, session.id)
          .run();
      } else {
        throw new Error("Final URL could not be resolved or download failed.");
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("Webhook processing failed", error);
    sendRedAlert(
      env,
      "Realtime Webhook Error",
      `Webhook failed: ${error.message}`,
    );
    return new Response("Error", { status: 500 });
  }
}

async function handleListRecordings(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const data = await callRealtimeAPI(env, "/recordings", "GET", null);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Live.ListRecordings", env, request);
  }
}

async function handleRecordingAction(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    const { meetingId, action } = (await request.json()) as any;

    if (action === "start") {
      const data = (await callRealtimeAPI(env, "/recordings", "POST", {
        meeting_id: meetingId,
        video_config: {
          codec: "H264",
          width: 1280,
          height: 720,
          export_file: true,
        },
        audio_config: { codec: "AAC", channel: "stereo", export_file: true },
      })) as any;

      const recordingId = data?.data?.id || data?.result?.id;
      if (recordingId) {
        await env.DB.prepare(
          'UPDATE LiveSessions SET recording_id = ?, recording_status = "pending" WHERE rtc_room_id = ?',
        )
          .bind(recordingId, meetingId)
          .run();
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "stop") {
      const activeData = await callRealtimeAPI(
        env,
        `/recordings/active-recording/${meetingId}`,
        "GET",
        null,
        true,
      );
      let recordingId =
        (activeData as any)?.data?.id || (activeData as any)?.result?.id;

      if (!recordingId) {
        const listRecs = await callRealtimeAPI(env, `/recordings`, "GET", null);
        const recordsArray =
          (listRecs as any)?.data || (listRecs as any)?.result || [];
        const matchedRec = recordsArray.find(
          (r: any) => r.meeting_id === meetingId,
        );
        if (matchedRec) recordingId = matchedRec.id;
      }

      if (!recordingId) {
        return new Response(JSON.stringify({ error: "No active recording" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = await callRealtimeAPI(
        env,
        `/recordings/${recordingId}`,
        "PUT",
        { action: "stop" },
      );
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Live.RecordingAction", env, request);
  }
}

async function handleListLiveSessions(
  request: Request,
  env: Env,
  courseId: string,
): Promise<Response> {
  try {
    const list = await env.DB.prepare(
      "SELECT * FROM LiveSessions WHERE course_id = ? ORDER BY start_time ASC",
    )
      .bind(courseId)
      .all();
    return new Response(JSON.stringify({ sessions: list.results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Course.ListLiveSessions", env, request);
  }
}

async function handleGetDashboardData(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const userId = payload.sub;

    // Use Batch for performance
    const results = await env.DB.batch([
      // 1. Enrolled Courses
      env.DB.prepare(
        `
        SELECT c.*, e.progress, e.status as enrollment_status, e.payment_status, e.payment_source, e.amount_paid,
               (SELECT MIN(NULLIF(COALESCE(b.group_class_credit_cost, 0), 0)) FROM Batches b WHERE b.course_id = c.id AND COALESCE(b.self_study_group_enabled, 1) = 1 AND b.status != 'completed') as min_group_class_credit_cost
        FROM Enrollments e
        JOIN Courses c ON e.course_id = c.id
        WHERE e.user_id = ? AND e.status IN ('active', 'completed')
        ORDER BY e.purchased_at DESC
      `,
      ).bind(userId),

      // 2. Today's Live (IST: UTC + 5:30)
      env.DB.prepare(
        `
        SELECT ls.*, c.title as course_title, c.title_hi as course_title_hi, c.id as course_id
        FROM LiveSessions ls
        JOIN Courses c ON ls.course_id = c.id
        JOIN Enrollments e ON e.course_id = c.id
        WHERE e.user_id = ? AND e.status = 'active'
        AND date(ls.start_time, '+5 hours', '30 minutes') = date('now', '+5 hours', '30 minutes')
        ORDER BY ls.start_time ASC
      `,
      ).bind(userId),

      // 3. Tomorrow's Live (IST: UTC + 5:30)
      env.DB.prepare(
        `
        SELECT ls.*, c.title as course_title, c.title_hi as course_title_hi, c.id as course_id
        FROM LiveSessions ls
        JOIN Courses c ON ls.course_id = c.id
        JOIN Enrollments e ON e.course_id = c.id
        WHERE e.user_id = ? AND e.status = 'active'
        AND date(ls.start_time, '+5 hours', '30 minutes') = date('now', '+5 hours', '30 minutes', '+1 day')
        ORDER BY ls.start_time ASC
      `,
      ).bind(userId),

      // 4. Available Courses (Not enrolled)
      env.DB.prepare(
        `
        SELECT c.*, cat.name as category_name,
               (SELECT MIN(NULLIF(COALESCE(b.group_class_credit_cost, 0), 0)) FROM Batches b WHERE b.course_id = c.id AND COALESCE(b.self_study_group_enabled, 1) = 1 AND b.status != 'completed') as min_group_class_credit_cost
        FROM Courses c
        LEFT JOIN Categories cat ON c.category_id = cat.id
        WHERE c.id NOT IN (SELECT course_id FROM Enrollments WHERE user_id = ?)
        ORDER BY c.created_at DESC
      `,
      ).bind(userId),

      // 5. User ai_credits
      env.DB.prepare(`SELECT * FROM UserAICredits WHERE user_id = ?`).bind(
        userId,
      ),
    ]);

    let aiCreditsData = results[4].results[0] as any;
    let aiCreditsAllowed = 0;

    if (aiCreditsData) {
      if (aiCreditsData.base_credits_total === -1) {
        aiCreditsAllowed = -1;
      } else {
        const totalAllowed =
          (aiCreditsData.base_credits_total || 0) +
          (aiCreditsData.bonus_credits_total || 0);
        const totalUsed =
          (aiCreditsData.base_credits_used || 0) +
          (aiCreditsData.bonus_credits_used || 0);
        aiCreditsAllowed = totalAllowed - totalUsed;
        if (aiCreditsAllowed < 0) aiCreditsAllowed = 0;
      }
    } else {
      aiCreditsAllowed = 5; // Starter credits
    }

    const selfStudyCredits = await getCreditBalance(env, userId, "self_study");

    return new Response(
      JSON.stringify({
        enrolledCourses: results[0].results,
        todayLive: results[1].results,
        tomorrowLive: results[2].results,
        availableCourses: results[3].results,
        aiCredits: aiCreditsAllowed,
        selfStudyCredits,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "Dashboard.Data", env, request);
  }
}


function normalizeNonNegativeInt(value: any, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

async function getCreditBalance(
  env: Env,
  userId: string,
  creditType = "self_study",
): Promise<{ total: number; used: number; locked: number; available: number }> {
  const wallet = (await env.DB.prepare(
    `SELECT total_credits, used_credits, locked_credits FROM CreditWallets WHERE user_id = ? AND credit_type = ?`,
  )
    .bind(userId, creditType)
    .first()) as any;

  const total = Number(wallet?.total_credits || 0);
  const used = Number(wallet?.used_credits || 0);
  const locked = Number(wallet?.locked_credits || 0);
  return { total, used, locked, available: Math.max(0, total - used - locked) };
}

async function addCreditsToWallet(
  env: Env,
  userId: string,
  creditType: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
): Promise<{ total: number; used: number; locked: number; available: number }> {
  const safeAmount = normalizeNonNegativeInt(amount);
  if (safeAmount <= 0) throw new Error("Credit amount must be greater than 0");

  await env.DB.prepare(
    `INSERT INTO CreditWallets (id, user_id, credit_type, total_credits, used_credits, locked_credits, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, credit_type) DO UPDATE SET
       total_credits = total_credits + excluded.total_credits,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(crypto.randomUUID(), userId, creditType, safeAmount)
    .run();

  const balance = await getCreditBalance(env, userId, creditType);
  await env.DB.prepare(
    `INSERT INTO CreditLedger (id, user_id, credit_type, change_amount, balance_after, reason, reference_type, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      creditType,
      safeAmount,
      balance.available,
      reason,
      referenceType || null,
      referenceId || null,
    )
    .run();

  return balance;
}

async function deductCreditsFromWallet(
  env: Env,
  userId: string,
  creditType: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
): Promise<{ ok: boolean; balance: { total: number; used: number; locked: number; available: number } }> {
  const safeAmount = normalizeNonNegativeInt(amount);
  const before = await getCreditBalance(env, userId, creditType);
  if (safeAmount <= 0) return { ok: true, balance: before };

  const updateResult = (await env.DB.prepare(
    `UPDATE CreditWallets
     SET used_credits = used_credits + ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND credit_type = ?
       AND (total_credits - used_credits - locked_credits) >= ?`,
  )
    .bind(safeAmount, userId, creditType, safeAmount)
    .run()) as any;

  const changed = Number(updateResult?.meta?.changes || updateResult?.changes || 0);
  if (changed < 1) {
    return { ok: false, balance: before };
  }

  const balance = await getCreditBalance(env, userId, creditType);
  await env.DB.prepare(
    `INSERT INTO CreditLedger (id, user_id, credit_type, change_amount, balance_after, reason, reference_type, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      creditType,
      -safeAmount,
      balance.available,
      reason,
      referenceType || null,
      referenceId || null,
    )
    .run();

  return { ok: true, balance };
}

async function handleCreditsBalance(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const url = new URL(request.url);
    const creditType = url.searchParams.get("credit_type") || "self_study";
    const balance = await getCreditBalance(env, payload.sub, creditType);
    return new Response(JSON.stringify({ credit_type: creditType, ...balance }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Credits.Balance", env, request);
  }
}

async function handleCreditsLedger(request: Request, env: Env): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const url = new URL(request.url);
    const creditType = url.searchParams.get("credit_type") || "self_study";
    const { results } = await env.DB.prepare(
      `SELECT * FROM CreditLedger WHERE user_id = ? AND credit_type = ? ORDER BY created_at DESC LIMIT 100`,
    )
      .bind(payload.sub, creditType)
      .all();
    return new Response(JSON.stringify({ ledger: results || [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Credits.Ledger", env, request);
  }
}

async function handleCreditPacks(request: Request, env: Env, adminMode = false): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();

    if (adminMode) await requireAdmin(request, env);

    if (request.method === "GET") {
      const query = adminMode
        ? `SELECT * FROM CreditPacks ORDER BY created_at DESC`
        : `SELECT * FROM CreditPacks WHERE is_active = 1 ORDER BY amount_inr ASC`;
      const { results } = await env.DB.prepare(query).all();
      return new Response(JSON.stringify({ packs: results || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!adminMode) return new Response("Method not allowed", { status: 405 });

    if (request.method === "POST") {
      const body = (await request.json()) as any;
      const packId = generateCustomId("YA-CRP");
      const amountInr = normalizeNonNegativeInt(body.amount_inr);
      const credits = normalizeNonNegativeInt(body.credits);
      if (!body.name || amountInr <= 0 || credits <= 0) {
        return new Response(JSON.stringify({ error: "Name, amount and credits are required" }), { status: 400 });
      }
      await env.DB.prepare(
        `INSERT INTO CreditPacks (id, name, description, amount_inr, credits, credit_type, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          packId,
          body.name,
          body.description || null,
          amountInr,
          credits,
          body.credit_type || "self_study",
          body.is_active === 0 ? 0 : 1,
        )
        .run();
      return new Response(JSON.stringify({ message: "Credit pack created", id: packId }), { status: 201 });
    }

    if (request.method === "PUT") {
      const body = (await request.json()) as any;
      await env.DB.prepare(
        `UPDATE CreditPacks SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          amount_inr = COALESCE(?, amount_inr),
          credits = COALESCE(?, credits),
          credit_type = COALESCE(?, credit_type),
          is_active = COALESCE(?, is_active)
         WHERE id = ?`,
      )
        .bind(
          body.name || null,
          body.description ?? null,
          body.amount_inr == null ? null : normalizeNonNegativeInt(body.amount_inr),
          body.credits == null ? null : normalizeNonNegativeInt(body.credits),
          body.credit_type || null,
          body.is_active == null ? null : body.is_active === 1 || body.is_active === true ? 1 : 0,
          id,
        )
        .run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (request.method === "DELETE") {
      await env.DB.prepare(`DELETE FROM CreditPacks WHERE id = ?`).bind(id).run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return new Response(JSON.stringify({ error: error.message }), { status: 403 });
    }
    return handleGlobalError(error, adminMode ? "Admin.CreditPacks" : "Credits.Packs", env, request);
  }
}

async function chargeSelfStudyGroupClassIfNeeded(
  env: Env,
  userId: string,
  sessionId: string,
): Promise<{ allowed: boolean; requiredCredits: number; availableCredits: number; message?: string }> {
  const session = (await env.DB.prepare(
    `SELECT ls.id, ls.is_free, ls.batch_id, c.self_study_enabled, c.self_study_only,
            COALESCE(b.self_study_group_enabled, 1) as self_study_group_enabled,
            COALESCE(b.group_class_credit_cost, 0) as group_class_credit_cost
     FROM LiveSessions ls
     JOIN Courses c ON c.id = ls.course_id
     LEFT JOIN Batches b ON b.id = ls.batch_id
     WHERE ls.id = ?`,
  )
    .bind(sessionId)
    .first()) as any;

  if (!session || session.is_free === 1 || session.self_study_enabled !== 1 || session.self_study_group_enabled === 0) {
    const balance = await getCreditBalance(env, userId, "self_study");
    return { allowed: true, requiredCredits: 0, availableCredits: balance.available };
  }

  const requiredCredits = normalizeNonNegativeInt(session.group_class_credit_cost);
  if (requiredCredits <= 0) {
    const balance = await getCreditBalance(env, userId, "self_study");
    return { allowed: true, requiredCredits: 0, availableCredits: balance.available };
  }

  const existingAttendance = await env.DB.prepare(
    `SELECT id FROM Attendance WHERE session_id = ? AND user_id = ?`,
  )
    .bind(sessionId, userId)
    .first();
  if (existingAttendance) {
    const balance = await getCreditBalance(env, userId, "self_study");
    return { allowed: true, requiredCredits, availableCredits: balance.available };
  }

  const existingCharge = await env.DB.prepare(
    `SELECT id FROM CreditLedger WHERE user_id = ? AND credit_type = 'self_study' AND reason = 'group_class_join' AND reference_type = 'live_session' AND reference_id = ?`,
  )
    .bind(userId, sessionId)
    .first();
  if (existingCharge) {
    const balance = await getCreditBalance(env, userId, "self_study");
    return { allowed: true, requiredCredits, availableCredits: balance.available };
  }

  const deduction = await deductCreditsFromWallet(
    env,
    userId,
    "self_study",
    requiredCredits,
    "group_class_join",
    "live_session",
    sessionId,
  );

  if (!deduction.ok) {
    return {
      allowed: false,
      requiredCredits,
      availableCredits: deduction.balance.available,
      message: `इस self-study class में जुड़ने के लिए ${requiredCredits} credits चाहिए। कृपया credits purchase करें।`,
    };
  }

  return { allowed: true, requiredCredits, availableCredits: deduction.balance.available };
}

async function handleRazorpayCreateCreditsOrder(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const body = (await request.json()) as any;
    const { pack_id } = body;
    let amount_paise = normalizeNonNegativeInt(body.amount_paise);
    let credits = normalizeNonNegativeInt(body.credits);
    let creditType = body.credit_type || "ai";
    let relatedId = body.related_id || null;

    if (pack_id) {
      const pack = (await env.DB.prepare(
        `SELECT * FROM CreditPacks WHERE id = ? AND is_active = 1`,
      )
        .bind(pack_id)
        .first()) as any;
      if (!pack) {
        return new Response(JSON.stringify({ error: "Credit pack not found" }), { status: 404 });
      }
      amount_paise = normalizeNonNegativeInt(pack.amount_inr);
      credits = normalizeNonNegativeInt(pack.credits);
      creditType = pack.credit_type || "self_study";
      relatedId = pack.id;
    }

    if (!amount_paise || !credits) {
      return new Response(
        JSON.stringify({ error: "Missing amount or credits" }),
        { status: 400 },
      );
    }

    const keyId = await getSecret(env, "RAZORPAY_KEY_ID", false);
    const keySecret = await getSecret(env, "RAZORPAY_KEY_SECRET", false);

    if (!keyId || !keySecret) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 503 },
      );
    }

    // Call Razorpay API to create order
    const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);
    const rzResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount_paise,
        currency: "INR",
        receipt: `receipt_${Date.now()}_${payload.sub}`,
      }),
    });

    if (!rzResponse.ok) {
      const errRes = await rzResponse.text();
      console.error("Razorpay error", errRes);
      return new Response(
        JSON.stringify({ error: "Failed to create order with Razorpay" }),
        { status: 500 },
      );
    }

    const orderData = (await rzResponse.json()) as any;

    // Record transaction
    const txId = crypto.randomUUID();
    await env.DB.prepare(
      `
      INSERT INTO Transactions (id, user_id, amount_paise, amount_inr, currency, type, status, razorpay_order_id, credits_added, payment_source, related_id, credit_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
      .bind(
        txId,
        payload.sub,
        amount_paise,
        Math.floor(amount_paise / 100),
        "INR",
        "credit_purchase",
        "created",
        orderData.id,
        credits,
        "razorpay",
        relatedId,
        creditType,
      )
      .run();

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        amount: amount_paise,
        key_id: keyId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "Razorpay.CreateOrder", env, request);
  }
}

async function handleRazorpayVerifyCreditsPayment(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const body = (await request.json()) as any;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Incomplete payment details" }),
        { status: 400 },
      );
    }

    const keySecret = await getSecret(env, "RAZORPAY_KEY_SECRET", false);
    if (!keySecret) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 503 },
      );
    }

    // Verify signature
    const encoder = new TextEncoder();
    const data = `${razorpay_order_id}|${razorpay_payment_id}`;

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(keySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signatureBuf = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(data),
    );
    const generatedSignature = Array.from(new Uint8Array(signatureBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (generatedSignature !== razorpay_signature) {
      await env.DB.prepare(
        "UPDATE Transactions SET status = ? WHERE razorpay_order_id = ?",
      )
        .bind("failed", razorpay_order_id)
        .run();
      return new Response(
        JSON.stringify({ error: "Invalid payment signature" }),
        { status: 400 },
      );
    }

    // Update Transaction
    const tx = await env.DB.prepare(
      "SELECT * FROM Transactions WHERE razorpay_order_id = ? AND status = ?",
    )
      .bind(razorpay_order_id, "created")
      .first();

    if (!tx) {
      return new Response(
        JSON.stringify({ error: "Transaction not found or already processed" }),
        { status: 400 },
      );
    }

    await env.DB.prepare(
      `UPDATE Transactions SET status = 'successful', razorpay_payment_id = ?, razorpay_signature = ? WHERE razorpay_order_id = ?`,
    )
      .bind(razorpay_payment_id, razorpay_signature, razorpay_order_id)
      .run();

    if ((tx as any).credit_type === "self_study") {
      const balance = await addCreditsToWallet(
        env,
        payload.sub,
        "self_study",
        Number((tx as any).credits_added || 0),
        "purchase",
        (tx as any).related_id ? "credit_pack" : "razorpay_order",
        (tx as any).related_id || razorpay_order_id,
      );

      return new Response(
        JSON.stringify({ success: true, credit_type: "self_study", credits: balance }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await env.DB.prepare(
      `INSERT INTO UserAICredits (user_id, base_credits_total, base_credits_used, bonus_credits_total, bonus_credits_used, credits_period)
       VALUES (?, 0, 0, ?, 0, 'none')
       ON CONFLICT(user_id) DO UPDATE SET bonus_credits_total = bonus_credits_total + excluded.bonus_credits_total`,
    )
      .bind(payload.sub, tx.credits_added)
      .run();

    const creditsData = (await env.DB.prepare(
      "SELECT * FROM UserAICredits WHERE user_id = ?",
    )
      .bind(payload.sub)
      .first()) as any;

    let remaining = 0;
    if (creditsData) {
      if (creditsData.base_credits_total === -1) {
        remaining = -1;
      } else {
        const allowed =
          (creditsData.base_credits_total || 0) +
          (creditsData.bonus_credits_total || 0);
        const used =
          (creditsData.base_credits_used || 0) +
          (creditsData.bonus_credits_used || 0);
        remaining = allowed - used;
        if (remaining < 0) remaining = 0;
      }
    } else {
      remaining = 5;
    }

    return new Response(
      JSON.stringify({ success: true, credit_type: "ai", ai_credits: remaining }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "Razorpay.VerifyPayment", env, request);
  }
}

async function handleAdminCreateLiveSession(
  request: Request,
  env: Env,
  courseId: string,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    if (auth.role === "teacher") {
      const course = await env.DB.prepare(
        "SELECT id FROM Courses WHERE id = ? AND teacher_id = ?",
      )
        .bind(courseId, auth.id)
        .first();
      if (!course)
        return new Response(
          JSON.stringify({
            error: "Access Denied: You do not own this course.",
          }),
          { status: 403 },
        );
    }

    const body = (await request.json()) as any;
    const { start_time, rtc_room_id, title, is_free } = body;

    // Create Realtime Meeting if possible
    let finalRoomId = rtc_room_id;
    const realtimeMeetingId = await createRealtimeMeeting(env, request, title);
    if (realtimeMeetingId) {
      finalRoomId = realtimeMeetingId;
    } else {
      sendRedAlert(
        env,
        "Live Session Creation Failed",
        `Failed to create a Cloudflare RealtimeKit meeting for course ${courseId}.`,
      );
    }

    const id = generateCustomId("YA-LIV");
    await env.DB.prepare(
      "INSERT INTO LiveSessions (id, course_id, batch_id, teacher_id, title, start_time, rtc_room_id, status, is_free) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        id,
        courseId,
        body.batch_id || null,
        auth.id,
        title || "Live Class",
        start_time,
        finalRoomId,
        "scheduled",
        is_free || 0,
      )
      .run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.CreateLiveSession", env, request);
  }
}

async function handleAdminUpdateLiveSession(
  request: Request,
  env: Env,
  sessionId: string,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    if (auth.role === "teacher") {
      const session = await env.DB.prepare(
        "SELECT id FROM LiveSessions WHERE id = ? AND teacher_id = ?",
      )
        .bind(sessionId, auth.id)
        .first();
      if (!session)
        return new Response(
          JSON.stringify({
            error: "Access Denied: You do not own this session.",
          }),
          { status: 403 },
        );
    }

    const body = (await request.json()) as any;
    const { title, start_time, status, rtc_room_id, is_free } = body;

    // Fetch existing session to see what changed
    const existingSession = (await env.DB.prepare(
      "SELECT title, start_time, status, course_id, batch_id FROM LiveSessions WHERE id = ?",
    )
      .bind(sessionId)
      .first()) as any;

    await env.DB.prepare(
      "UPDATE LiveSessions SET title = COALESCE(?, title), start_time = ?, status = ?, rtc_room_id = ?, is_free = ? WHERE id = ?",
    )
      .bind(
        title || null,
        start_time,
        status,
        rtc_room_id,
        is_free || 0,
        sessionId,
      )
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.UpdateLiveSession", env, request);
  }
}

async function handleAdminDeleteLiveSession(
  request: Request,
  env: Env,
  sessionId: string,
): Promise<Response> {
  try {
    const auth = await requireAdminOrTeacher(request, env);
    if (auth.role === "teacher") {
      const session = await env.DB.prepare(
        "SELECT id FROM LiveSessions WHERE id = ? AND teacher_id = ?",
      )
        .bind(sessionId, auth.id)
        .first();
      if (!session)
        return new Response(
          JSON.stringify({
            error: "Access Denied: You do not own this session.",
          }),
          { status: 403 },
        );
    }
    await env.DB.prepare("DELETE FROM LiveSessions WHERE id = ?")
      .bind(sessionId)
      .run();
    await env.DB.prepare("DELETE FROM LiveSignaling WHERE session_id = ?")
      .bind(sessionId)
      .run();
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.DeleteLiveSession", env, request);
  }
}

// --- Live Class Signaling Handlers ---

async function handleLiveSignaling(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId)
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
      });

    if (request.method === "POST") {
      const { type, data } = (await request.json()) as any;
      const id = generateCustomId("YA-SIG");
      await env.DB.prepare(
        "INSERT INTO LiveSignaling (id, session_id, user_id, type, data) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(id, sessionId, payload.sub, type, JSON.stringify(data))
        .run();

      // Update Attendance if it's a student joining
      if (payload.role === "student" && type === "offer_request") {
        const attId = generateCustomId("YA-ATT");
        await env.DB.prepare(
          "INSERT OR IGNORE INTO Attendance (id, session_id, user_id) VALUES (?, ?, ?)",
        )
          .bind(attId, sessionId, payload.sub)
          .run();
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET") {
      const lastPoll = url.searchParams.get("lastPoll") || "1970-01-01";
      // Get signals meant for this user OR broadcasts from teacher
      // If student: get signals from Teacher (Admin/Teacher role)
      // If teacher: get signals from Students

      const { results } = await env.DB.prepare(
        `
        SELECT * FROM LiveSignaling 
        WHERE session_id = ? 
        AND created_at > ? 
        AND user_id != ?
        ORDER BY created_at ASC
      `,
      )
        .bind(sessionId, lastPoll, payload.sub)
        .all();

      return new Response(JSON.stringify({ signals: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "DELETE") {
      // Clear old signals
      await env.DB.prepare(
        'DELETE FROM LiveSignaling WHERE session_id = ? AND created_at < datetime("now", "-1 hour")',
      )
        .bind(sessionId)
        .run();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    return handleGlobalError(error, "Live.Signaling", env, request);
  }
}

async function handleGetCourseBatches(
  request: Request,
  env: Env,
  courseId: string,
): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, name, start_date, end_date, status FROM Batches WHERE course_id = ? AND status != 'completed' ORDER BY start_date ASC`,
    )
      .bind(courseId)
      .all();
    return new Response(JSON.stringify({ batches: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Course.GetBatches", env, request);
  }
}


async function handleEnrollWithCredits(
  request: Request,
  env: Env,
  courseId: string,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    if (payload.role !== "student") {
      return new Response(
        JSON.stringify({ error: "Only students can enroll in courses." }),
        { status: 403 },
      );
    }

    const course = (await env.DB.prepare(
      `SELECT id, title, self_study_enabled, self_study_credit_cost
       FROM Courses WHERE id = ?`,
    )
      .bind(courseId)
      .first()) as any;

    if (!course) {
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (course.self_study_enabled !== 1) {
      return new Response(
        JSON.stringify({ error: "Credit unlock is not enabled for this course." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const requiredCredits = normalizeNonNegativeInt(course.self_study_credit_cost);
    if (requiredCredits <= 0) {
      return new Response(
        JSON.stringify({ error: "This course does not require credits. Use normal enrollment." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const existing = await env.DB.prepare(
      "SELECT id, payment_status FROM Enrollments WHERE user_id = ? AND course_id = ?",
    )
      .bind(payload.sub, courseId)
      .first();
    if (existing) {
      return new Response(JSON.stringify({ error: "Already enrolled" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    const enrollmentId = generateCustomId("YA-ENR");
    try {
      await env.DB.prepare(
        `INSERT INTO Enrollments (id, user_id, course_id, payment_status, status, amount_paid, payment_source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(enrollmentId, payload.sub, courseId, "pending", "active", 0, "self_study_credits")
        .run();
    } catch (e: any) {
      if (String(e?.message || "").includes("UNIQUE constraint failed")) {
        return new Response(JSON.stringify({ error: "Already enrolled" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw e;
    }

    const deduction = await deductCreditsFromWallet(
      env,
      payload.sub,
      "self_study",
      requiredCredits,
      "course_unlock",
      "enrollment",
      enrollmentId,
    );

    if (!deduction.ok) {
      await env.DB.prepare("DELETE FROM Enrollments WHERE id = ?")
        .bind(enrollmentId)
        .run();
      return new Response(
        JSON.stringify({
          error: "Insufficient credits",
          required_credits: requiredCredits,
          available_credits: deduction.balance.available,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    }

    await env.DB.prepare(
      "UPDATE Enrollments SET payment_status = ?, payment_id = ? WHERE id = ?",
    )
      .bind("paid", `credits:${enrollmentId}`, enrollmentId)
      .run();

    await createNotification(
      env,
      payload.sub,
      "Course Unlocked with Credits",
      `You unlocked "${course.title}" using ${requiredCredits} self-study credits.`,
      "success",
    );

    return new Response(
      JSON.stringify({
        message: "Course unlocked with credits",
        enrollmentId,
        paymentStatus: "paid",
        paymentSource: "self_study_credits",
        requiredCredits,
        selfStudyCredits: deduction.balance,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return handleGlobalError(error, "Course.EnrollWithCredits", env, request);
  }
}

async function handleEnroll(
  request: Request,
  env: Env,
  courseId: string,
): Promise<Response> {
  try {
    const token = getCookie(request, "session");
    if (!token)
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        { status: 401 },
      );

    const jwtSecret = await getSecret(env, "JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET missing");
    const payload = await verifyJWT(token, jwtSecret);

    if (payload.role !== "student") {
      return new Response(
        JSON.stringify({ error: "Only students can enroll in courses." }),
        { status: 403 },
      );
    }

    const userId = payload.sub;
    const course: any = await env.DB.prepare(
      "SELECT id, title, price_inr FROM Courses WHERE id = ?",
    )
      .bind(courseId)
      .first();
    if (!course)
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
      });

    const existing: any = await env.DB.prepare(
      "SELECT id, progress, status FROM Enrollments WHERE user_id = ? AND course_id = ?",
    )
      .bind(userId, courseId)
      .first();
    if (existing)
      return new Response(JSON.stringify({ error: "Already enrolled" }), {
        status: 409,
      });

    const profile = await getUserAccessProfile(userId, env);
    const hasSubAccess = userAccessProfileAllowsCourse(profile, courseId);
    const initialPaymentStatus = hasSubAccess ? "paid" : "unpaid";

    const enrollmentId = generateCustomId("YA-ENR");
    try {
      await env.DB.prepare(
        "INSERT INTO Enrollments (id, user_id, course_id, payment_status, status) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(enrollmentId, userId, courseId, initialPaymentStatus, "active")
        .run();
    } catch (e: any) {
      if (e.message.includes("UNIQUE constraint failed")) {
        return new Response(JSON.stringify({ error: "Already enrolled" }), {
          status: 409,
        });
      }
      throw e;
    }

    await createNotification(
      env,
      userId,
      "Enrollment Successful",
      `You are now enrolled in "${course.title}". Happy learning!`,
      "success",
    );

    // Send email to user & admin (fire and forget)
    const user: any = await env.DB.prepare(
      "SELECT email, full_name FROM Users WHERE id = ?",
    )
      .bind(userId)
      .first();
    const adminEmail =
      (await getSecret(env, "ADMIN_CONTACT_EMAIL", false)) ||
      "navasanganakah@gmail.com";
    if (user?.email) {
      const userHtml = `
        <p style="font-size:16px;color:#334155;">नमस्ते <strong>${user.full_name || "छात्र"}</strong>,</p>
        <p style="font-size:16px;color:#334155;">आपको <strong>${course.title}</strong> का <span style="color:#4f46e5;font-weight:bold;">Free Preview Access</span> मिल गया है!</p>
        <div style="background:#ede9fe;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#5b21b6;font-weight:600;">📚 Free lessons अभी देखें।</p>
          ${course.price_inr > 0 ? `<p style="margin:8px 0 0;color:#7c3aed;">💎 Premium access के लिए course page पर जाएँ और भुगतान करें।</p>` : ""}
        </div>
      `;
      const userText = `नमस्ते ${user.full_name || "छात्र"},\n\nआपको ${course.title} का Free Preview Access मिल गया है!\nFree lessons अभी देखें।\n${course.price_inr > 0 ? "Premium access के लिए course page पर जाएँ और भुगतान करें।" : ""}`;
      await safeSendEmail(
        env,
        user.email,
        `✅ Enrollment Confirmed: ${course.title}`,
        "🎓 Free Access मिल गया!",
        userHtml,
        userText,
      );
    }
    const adminHtml = `<p>नमस्ते Admin,</p><p><strong>${user?.full_name || userId}</strong> (${user?.email}) ने <strong>${course.title}</strong> में <b>Free Enroll</b> किया है।</p><p>Om!</p>`;
    const adminText = `नमस्ते Admin,\n\n${user?.full_name || userId} (${user?.email}) ने ${course.title} में Free Enroll किया है।\n\nOm!`;
    await safeSendEmail(
      env,
      adminEmail,
      `[LMS] New Free Enrollment: ${course.title}`,
      "New Free Enrollment",
      adminHtml,
      adminText,
    );

    return new Response(
      JSON.stringify({ message: "Enrolled successfully", enrollmentId }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "Course.Enroll", env, request);
  }
}

async function handleCompleteLesson(
  request: Request,
  env: Env,
  courseId: string,
  lessonId: string,
): Promise<Response> {
  try {
    const token = getCookie(request, "session");
    if (!token)
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
      });

    const jwtSecret = await getSecret(env, "JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET missing");
    const payload = await verifyJWT(token, jwtSecret);

    if (payload.role !== "student") {
      return new Response(
        JSON.stringify({ error: "Only students can complete lessons." }),
        { status: 403 },
      );
    }

    const userId = payload.sub;

    const existingEnr: any = await env.DB.prepare(
      "SELECT id, progress, status FROM Enrollments WHERE user_id = ? AND course_id = ?",
    )
      .bind(userId, courseId)
      .first();
    if (!existingEnr)
      return new Response(
        JSON.stringify({ error: "Not enrolled in this course." }),
        { status: 403 },
      );

    // Access Check: Is the lesson free or is the user enrolled?
    const lesson: any = await env.DB.prepare(
      "SELECT is_free FROM Lessons WHERE id = ?",
    )
      .bind(lessonId)
      .first();
    const isEnrolled = await env.DB.prepare(
      'SELECT id FROM Enrollments WHERE user_id = ? AND course_id = ? AND payment_status = "paid"',
    )
      .bind(userId, courseId)
      .first();

    if (lesson && lesson.is_free === 0 && !isEnrolled) {
      return new Response(
        JSON.stringify({
          error: "Access Denied",
          message:
            "This is a premium lesson. Please enroll in the course to continue.",
          requires_payment: true,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    // Mark lesson as completed
    await env.DB.prepare(
      "INSERT OR IGNORE INTO CompletedLessons (user_id, lesson_id) VALUES (?, ?)",
    )
      .bind(userId, lessonId)
      .run();

    // Recalculate progress
    const totalLessonsRes = await env.DB.prepare(
      "SELECT COUNT(id) as count FROM Lessons WHERE course_id = ?",
    )
      .bind(courseId)
      .first();
    const totalLessons = (totalLessonsRes?.count as number) || 0;

    const completedRes = await env.DB.prepare(
      `
      SELECT COUNT(CL.lesson_id) as count 
      FROM CompletedLessons CL 
      JOIN Lessons L ON CL.lesson_id = L.id 
      WHERE CL.user_id = ? AND L.course_id = ?
    `,
    )
      .bind(userId, courseId)
      .first();
    const completedLessons = (completedRes?.count as number) || 0;

    let progress = 0;
    if (totalLessons > 0) {
      progress = Math.round((completedLessons / totalLessons) * 100);
    }

    let status = "active";
    if (progress >= 100) {
      status = "completed";
    }

    // Check if paid enrollment → set certificate_eligible
    const paidEnrollment: any = await env.DB.prepare(
      "SELECT id, payment_status FROM Enrollments WHERE user_id = ? AND course_id = ?",
    )
      .bind(userId, courseId)
      .first();
    const isPaid = paidEnrollment?.payment_status === "paid";

    await env.DB.prepare(
      "UPDATE Enrollments SET progress = ?, status = ?, certificate_eligible = ? WHERE user_id = ? AND course_id = ?",
    )
      .bind(
        progress,
        status,
        progress >= 100 && isPaid ? 1 : 0,
        userId,
        courseId,
      )
      .run();

    if (progress >= 100 && existingEnr.progress < 100) {
      const c: any = await env.DB.prepare(
        "SELECT title FROM Courses WHERE id = ?",
      )
        .bind(courseId)
        .first();
      await createNotification(
        env,
        userId,
        "Course Completed! 🎉",
        `Congratulations on completing "${c?.title}"!${isPaid ? " आप अब Certificate के लिए eligible हैं!" : ""}`,
        "success",
      );

      const user: any = await env.DB.prepare(
        "SELECT email, full_name FROM Users WHERE id = ?",
      )
        .bind(userId)
        .first();
      if (user?.email) {
        let emailHtml = `
          <p>नमस्ते <strong>${user.full_name || "छात्र"}</strong>,</p>
          <p>आपने <strong>${c?.title}</strong> course 100% पूरा कर लिया है! 🎉</p>
        `;
        let emailText = `नमस्ते ${user.full_name || "छात्र"},\n\nआपने ${c?.title} course 100% पूरा कर लिया है! 🎉\n`;

        if (isPaid) {
          emailHtml += `
            <div style="background:#fffbeb;padding:16px;border-radius:12px;border:1px solid #fde68a;margin-top:16px;">
              <p style="color:#92400e;font-weight:600;margin:0;">🎓 आप अब Certificate के लिए eligible हैं। Admin जल्द ही आपका certificate issue करेगा।</p>
            </div>
          `;
          emailText += `\n🎓 आप अब Certificate के लिए eligible हैं। Admin जल्द ही आपका certificate issue करेगा।`;
        } else {
          emailHtml += `
            <div style="background:#f0fdf4;padding:16px;border-radius:12px;border:1px solid #bbf7d0;margin-top:16px;">
              <p style="color:#166534;font-weight:600;margin:0;">✨ Certificate प्राप्त करने के लिए Premium Enrollment में upgrade करें।</p>
            </div>
          `;
          emailText += `\n✨ Certificate प्राप्त करने के लिए Premium Enrollment में upgrade करें।`;
        }

        await safeSendEmail(
          env,
          user.email,
          `Course Completed: ${c?.title}`,
          "🏆 Course Completed!",
          emailHtml,
          emailText,
        );
      }
    }

    return new Response(
      JSON.stringify({
        message: "Lesson marked complete.",
        progress,
        certificate_eligible: progress >= 100 && isPaid ? 1 : 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "Course.CompleteLesson", env, request);
  }
}

async function handleUpdateProgress(
  request: Request,
  env: Env,
  courseId: string,
): Promise<Response> {
  try {
    const token = getCookie(request, "session");
    if (!token)
      return new Response(
        JSON.stringify({ error: "Unauthorized. Please log in." }),
        { status: 401 },
      );

    const jwtSecret = await getSecret(env, "JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET missing");
    const payload = await verifyJWT(token, jwtSecret);

    if (payload.role !== "student") {
      return new Response(
        JSON.stringify({ error: "Only students can update progress." }),
        { status: 403 },
      );
    }

    const { progress } = (await request.json()) as any;

    if (typeof progress !== "number" || progress < 0 || progress > 100) {
      return new Response(
        JSON.stringify({
          error: "Invalid progress value. Must be a number between 0 and 100.",
        }),
        { status: 400 },
      );
    }

    const userId = payload.sub;

    const existing: any = await env.DB.prepare(
      "SELECT id, progress, status FROM Enrollments WHERE user_id = ? AND course_id = ?",
    )
      .bind(userId, courseId)
      .first();
    if (!existing)
      return new Response(
        JSON.stringify({ error: "Not enrolled in this course." }),
        { status: 403 },
      );

    let status = "active";
    if (progress === 100) {
      status = "completed";
    }

    await env.DB.prepare(
      "UPDATE Enrollments SET progress = ?, status = ? WHERE user_id = ? AND course_id = ?",
    )
      .bind(progress, status, userId, courseId)
      .run();

    if (progress === 100 && existing.progress < 100) {
      const c: any = await env.DB.prepare(
        "SELECT title FROM Courses WHERE id = ?",
      )
        .bind(courseId)
        .first();
      await createNotification(
        env,
        userId,
        "Course Completed!",
        `Congratulations! You have completed "${c?.title}".`,
        "success",
      );
    }

    return new Response(
      JSON.stringify({
        message: "Progress updated successfully",
        progress,
        status,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "Course.UpdateProgress", env, request);
  }
}

// --- Razorpay Payment Handlers ---

async function handlePaymentStatus(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const razorpayKey = await getSecret(env, "RAZORPAY_KEY_ID");
    const razorpaySecret = await getSecret(env, "RAZORPAY_KEY_SECRET");
    const isConfigured = !!(razorpayKey && razorpaySecret);
    return new Response(JSON.stringify({ configured: isConfigured }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ configured: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleCreatePaymentOrder(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { courseId } = (await request.json()) as any;

    const course: any = await env.DB.prepare(
      "SELECT price_inr, title FROM Courses WHERE id = ?",
    )
      .bind(courseId)
      .first();
    if (!course)
      return new Response(JSON.stringify({ error: "Course not found" }), {
        status: 404,
      });

    const razorpayKey = await getSecret(env, "RAZORPAY_KEY_ID");
    const razorpaySecret = await getSecret(env, "RAZORPAY_KEY_SECRET");

    if (!razorpayKey || !razorpaySecret) {
      // Return 503 without triggering global alert — this is a config issue, not a code bug
      return new Response(
        JSON.stringify({
          error:
            "Payment gateway is not configured. Please contact the administrator.",
          code: "PAYMENT_NOT_CONFIGURED",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const amount = (course.price_inr || 0) * 100; // In paise
    const receipt = `rcpt_${crypto.randomUUID().substring(0, 8)}`;

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${razorpayKey}:${razorpaySecret}`),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: { courseId, userId: payload.sub },
      }),
    });

    const order = (await response.json()) as any;

    // Create pending enrollment
    const existingEnrollment: any = await env.DB.prepare(
      "SELECT id FROM Enrollments WHERE user_id = ? AND course_id = ?",
    )
      .bind(payload.sub, courseId)
      .first();

    if (existingEnrollment) {
      await env.DB.prepare(
        "UPDATE Enrollments SET payment_id = ?, payment_status = ?, payment_source = ? WHERE id = ?",
      )
        .bind(order.id, "pending", "razorpay", existingEnrollment.id)
        .run();
    } else {
      const enrollmentId = generateCustomId("YA-ENR");
      await env.DB.prepare(
        "INSERT INTO Enrollments (id, user_id, course_id, payment_id, payment_status, payment_source) VALUES (?, ?, ?, ?, ?, ?)",
      )
        .bind(
          enrollmentId,
          payload.sub,
          courseId,
          order.id,
          "pending",
          "razorpay",
        )
        .run();
    }

    // Insert into Transactions table
    const txId = crypto.randomUUID();
    await env.DB.prepare(
      `
      INSERT INTO Transactions (id, user_id, amount_paise, amount_inr, currency, type, status, razorpay_order_id, payment_source, related_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
      .bind(
        txId,
        payload.sub,
        amount,
        Math.floor(amount / 100),
        "INR",
        "course_purchase",
        "created",
        order.id,
        "razorpay",
        courseId,
      )
      .run();

    return new Response(JSON.stringify({ order, key: razorpayKey }), {
      status: 200,
    });
  } catch (error) {
    return handleGlobalError(error, "Payments.CreateOrder", env, request);
  }
}

async function handleVerifyPayment(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      (await request.json()) as any;
    const razorpaySecret = await getSecret(env, "RAZORPAY_KEY_SECRET");

    if (!razorpaySecret) throw new Error("Razorpay Secret missing.");

    const encoder = new TextEncoder();
    const data = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(razorpaySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, data);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Payment verification failed" }),
        { status: 400 },
      );
    }

    // Fetch course details to get the final amount paid
    const enrollmentDetails: any = await env.DB.prepare(
      `SELECT c.price_inr FROM Enrollments e JOIN Courses c ON e.course_id = c.id WHERE e.payment_id = ?`,
    )
      .bind(razorpay_order_id)
      .first();

    const amountPaid = enrollmentDetails?.price_inr || 0;

    // Update Enrollment to 'paid' and set amount_paid
    await env.DB.prepare(
      'UPDATE Enrollments SET payment_status = "paid", status = "active", amount_paid = ? WHERE payment_id = ?',
    )
      .bind(amountPaid, razorpay_order_id)
      .run();

    // Update Transaction to 'successful'
    await env.DB.prepare(
      `UPDATE Transactions SET status = 'successful', razorpay_payment_id = ?, razorpay_signature = ? WHERE razorpay_order_id = ?`,
    )
      .bind(razorpay_payment_id, razorpay_signature, razorpay_order_id)
      .run();

    // Send emails after payment (fire and forget)
    try {
      const enrollment: any = await env.DB.prepare(
        `SELECT e.user_id, c.title, c.price_inr FROM Enrollments e JOIN Courses c ON e.course_id = c.id WHERE e.payment_id = ?`,
      )
        .bind(razorpay_order_id)
        .first();
      if (enrollment) {
        const user: any = await env.DB.prepare(
          "SELECT email, full_name FROM Users WHERE id = ?",
        )
          .bind(enrollment.user_id)
          .first();
        const adminEmail =
          (await getSecret(env, "ADMIN_CONTACT_EMAIL", false)) ||
          "navasanganakah@gmail.com";
        if (user?.email) {
          const userHtml = `
            <p>नमस्ते <strong>${user.full_name || "छात्र"}</strong>,</p>
            <p><strong>${enrollment.title}</strong> का <b>Premium Access</b> आपको मिल गया है!</p>
            <div style="background:#dcfce7;border-radius:12px;padding:16px;margin:20px 0;">
              <p style="margin:0;color:#166534;font-weight:600;">🏆 Course पूरा करने पर आप Certificate के लिए eligible होंगे!</p>
            </div>
          `;
          const userText = `नमस्ते ${user.full_name || "छात्र"},\n\n${enrollment.title} का Premium Access आपको मिल गया है!\nCourse पूरा करने पर आप Certificate के लिए eligible होंगे!\n\nOm!`;
          await safeSendEmail(
            env,
            user.email,
            `🎉 Premium Access Confirmed: ${enrollment.title}`,
            "🎉 भुगतान सफल!",
            userHtml,
            userText,
          );
          await createNotification(
            env,
            enrollment.user_id,
            "Payment Successful! 🎉",
            `"${enrollment.title}" का premium access unlock हो गया है। Course पूरा करें और certificate पाएँ!`,
            "success",
          );
        }
        const adminHtml = `<p>Admin,</p><p><strong>${user?.full_name || enrollment.user_id}</strong> (${user?.email}) ने <strong>${enrollment.title}</strong> के लिए ₹${enrollment.price_inr} का भुगतान किया।</p><p>Om!</p>`;
        const adminText = `Admin,\n\n${user?.full_name || enrollment.user_id} (${user?.email}) ने ${enrollment.title} के लिए ₹${enrollment.price_inr} का भुगतान किया।\n\nOm!`;
        await safeSendEmail(
          env,
          adminEmail,
          `[LMS] New Paid Enrollment: ${enrollment.title}`,
          "New Paid Enrollment",
          adminHtml,
          adminText,
        );
      }
    } catch (emailErr) {
      console.error("Post-payment email error:", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified and enrollment active.",
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleGlobalError(error, "Payments.Verify", env, request);
  }
}

// =============================================
// --- Subscription & Webhook Handlers ---
// =============================================

// ==========================================================
// --- Core Access Profile & AI Credit System ---
// ==========================================================

interface UserAccessProfile {
  hasActiveSub: boolean;
  subscriptionId: string | null;
  planId: string | null;
  courseAccessType: "none" | "all" | "static" | "user_choice";
  allowedCourseIds: string[];
  batchAccessType: "none" | "static" | "user_choice";
  allowedBatchIds: string[];
  aiCreditsTotal: number;
  aiCreditsUsed: number;
  aiCreditsRemaining: number;
  aiPeriod: string;
  aiRateLimitPerHour: number;
  liveSessionAccess: boolean;
}

async function getUserAccessProfile(
  userId: string,
  env: Env,
): Promise<UserAccessProfile> {
  const empty: UserAccessProfile = {
    hasActiveSub: false,
    subscriptionId: null,
    planId: null,
    courseAccessType: "none",
    allowedCourseIds: [],
    batchAccessType: "none",
    allowedBatchIds: [],
    aiCreditsTotal: 0,
    aiCreditsUsed: 0,
    aiCreditsRemaining: 0,
    aiPeriod: "none",
    aiRateLimitPerHour: 0,
    liveSessionAccess: false,
  };

  const sub: any = await env.DB.prepare(
    `SELECT s.*, p.course_access_type, p.max_course_selection, p.batch_access_type, p.max_batch_selection,
            p.ai_credits, p.ai_credits_period, p.ai_rate_limit_per_hour, p.live_session_access
     FROM Subscriptions s
     JOIN SubscriptionPlans p ON s.plan_id = p.id
     WHERE s.user_id = ? AND s.status = 'active'
       AND (s.current_period_end IS NULL OR s.current_period_end > datetime('now'))
     ORDER BY s.created_at DESC LIMIT 1`,
  )
    .bind(userId)
    .first();

  if (!sub) return empty;

  const profile: UserAccessProfile = {
    hasActiveSub: true,
    subscriptionId: sub.id,
    planId: sub.plan_id,
    courseAccessType: sub.course_access_type || "none",
    allowedCourseIds: [],
    batchAccessType: sub.batch_access_type || "none",
    allowedBatchIds: [],
    aiCreditsTotal: sub.ai_credits || 0,
    aiCreditsUsed: 0,
    aiCreditsRemaining: sub.ai_credits === -1 ? -1 : 0,
    aiPeriod: sub.ai_credits_period || "none",
    aiRateLimitPerHour: sub.ai_rate_limit_per_hour || 0,
    liveSessionAccess: sub.live_session_access === 1,
  };

  // Resolve course IDs based on access type
  if (profile.courseAccessType === "static") {
    const { results } = await env.DB.prepare(
      `SELECT item_id FROM PlanContentPool WHERE plan_id = ? AND item_type = 'course' AND access_mode = 'static'`,
    )
      .bind(sub.plan_id)
      .all();
    profile.allowedCourseIds = results.map((r: any) => r.item_id);
  } else if (profile.courseAccessType === "user_choice") {
    const { results } = await env.DB.prepare(
      `SELECT item_id FROM UserSubscriptionSelections WHERE subscription_id = ? AND item_type = 'course'`,
    )
      .bind(sub.id)
      .all();
    profile.allowedCourseIds = results.map((r: any) => r.item_id);
  }

  // Resolve batch IDs
  if (profile.batchAccessType === "static") {
    const { results } = await env.DB.prepare(
      `SELECT item_id FROM PlanContentPool WHERE plan_id = ? AND item_type = 'batch' AND access_mode = 'static'`,
    )
      .bind(sub.plan_id)
      .all();
    profile.allowedBatchIds = results.map((r: any) => r.item_id);
  } else if (profile.batchAccessType === "user_choice") {
    const { results } = await env.DB.prepare(
      `SELECT item_id FROM UserSubscriptionSelections WHERE subscription_id = ? AND item_type = 'batch'`,
    )
      .bind(sub.id)
      .all();
    profile.allowedBatchIds = results.map((r: any) => r.item_id);
  }

  // Resolve AI credits with period reset check
  if (profile.aiCreditsTotal !== 0) {
    let credits: any = await env.DB.prepare(
      "SELECT * FROM UserAICredits WHERE user_id = ?",
    )
      .bind(userId)
      .first();

    if (credits) {
      // Check if period has expired → reset
      const needsReset =
        credits.period_end && new Date(credits.period_end) < new Date();
      if (
        needsReset &&
        profile.aiPeriod !== "plan" &&
        profile.aiPeriod !== "none"
      ) {
        const { start, end } = calcCreditPeriod(profile.aiPeriod);
        // Calculate bonus credits from selections
        const bonusTotal = await calcBonusCredits(sub.id, sub.plan_id, env);
        await env.DB.prepare(
          `UPDATE UserAICredits SET base_credits_used = 0, bonus_credits_used = 0,
           base_credits_total = ?, bonus_credits_total = ?,
           period_start = ?, period_end = ?, hour_window_used = 0 WHERE user_id = ?`,
        )
          .bind(
            profile.aiCreditsTotal === -1 ? -1 : profile.aiCreditsTotal,
            bonusTotal,
            start,
            end,
            userId,
          )
          .run();
        credits.base_credits_used = 0;
        credits.bonus_credits_used = 0;
        credits.base_credits_total = profile.aiCreditsTotal;
        credits.bonus_credits_total = bonusTotal;
      }
      const totalAllowed =
        credits.base_credits_total === -1
          ? -1
          : credits.base_credits_total + credits.bonus_credits_total;
      const totalUsed =
        (credits.base_credits_used || 0) + (credits.bonus_credits_used || 0);
      profile.aiCreditsUsed = totalUsed;
      profile.aiCreditsTotal = totalAllowed;
      profile.aiCreditsRemaining =
        totalAllowed === -1 ? -1 : Math.max(0, totalAllowed - totalUsed);
    }
  }

  return profile;
}

function calcCreditPeriod(period: string): { start: string; end: string } {
  const now = new Date();
  const start = now.toISOString();
  let end = new Date(now);
  switch (period) {
    case "hourly":
      end.setHours(end.getHours() + 1);
      break;
    case "daily":
      end.setDate(end.getDate() + 1);
      break;
    case "weekly":
      end.setDate(end.getDate() + 7);
      break;
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      break;
    case "yearly":
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      return { start, end: "2099-01-01T00:00:00.000Z" }; // plan = no reset
  }
  return { start, end: end.toISOString() };
}

async function calcBonusCredits(
  subscriptionId: string,
  planId: string,
  env: Env,
): Promise<number> {
  const result = (await env.DB.prepare(
    `SELECT COALESCE(SUM(p.bonus_ai_credits), 0) as total
     FROM UserSubscriptionSelections s
     JOIN PlanContentPool p ON p.plan_id = ? AND p.item_type = s.item_type AND p.item_id = s.item_id
     WHERE s.subscription_id = ?`,
  )
    .bind(planId, subscriptionId)
    .first()) as any;
  return result?.total || 0;
}

async function allocateAICredits(
  userId: string,
  subscriptionId: string,
  planId: string,
  plan: any,
  env: Env,
): Promise<void> {
  const bonusTotal = await calcBonusCredits(subscriptionId, planId, env);
  const { start, end } = calcCreditPeriod(plan.ai_credits_period || "none");
  await env.DB.prepare(
    `INSERT INTO UserAICredits (user_id, subscription_id, base_credits_total, base_credits_used,
     bonus_credits_total, bonus_credits_used, credits_period, period_start, period_end,
     hour_window_start, hour_window_used, rate_limit_per_hour)
     VALUES (?, ?, ?, 0, ?, 0, ?, ?, ?, datetime('now'), 0, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       subscription_id = excluded.subscription_id,
       base_credits_total = excluded.base_credits_total,
       base_credits_used = 0,
       bonus_credits_total = excluded.bonus_credits_total,
       bonus_credits_used = 0,
       credits_period = excluded.credits_period,
       period_start = excluded.period_start,
       period_end = excluded.period_end,
       hour_window_start = datetime('now'),
       hour_window_used = 0,
       rate_limit_per_hour = excluded.rate_limit_per_hour`,
  )
    .bind(
      userId,
      subscriptionId,
      plan.ai_credits || 0,
      bonusTotal,
      plan.ai_credits_period || "none",
      start,
      end,
      plan.ai_rate_limit_per_hour || 0,
    )
    .run();
}

// Returns { allowed: true } or { allowed: false, reason, retryAfter? }
async function checkAndConsumeAICredit(
  userId: string,
  env: Env,
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const credits: any = await env.DB.prepare(
    "SELECT * FROM UserAICredits WHERE user_id = ?",
  )
    .bind(userId)
    .first();

  if (!credits) {
    // Give 5 free starter credits to new students
    const starterCredits = 5;
    await env.DB.prepare(
      `
      INSERT INTO UserAICredits (user_id, base_credits_total, base_credits_used, bonus_credits_total, bonus_credits_used, credits_period)
      VALUES (?, ?, 1, 0, 0, 'plan')
    `,
    )
      .bind(userId, starterCredits)
      .run();
    return { allowed: true, remaining: starterCredits - 1 };
  }

  // Unlimited check
  if (credits.base_credits_total === -1) {
    // Still apply hourly rate limit even for unlimited
    if (credits.rate_limit_per_hour > 0) {
      const hourCheck = await checkHourlyLimit(credits, env, userId);
      if (!hourCheck.allowed) return hourCheck;
    }
    return { allowed: true, remaining: -1 };
  }

  // Period reset check
  if (
    credits.period_end &&
    new Date(credits.period_end) < new Date() &&
    credits.credits_period !== "plan" &&
    credits.credits_period !== "none"
  ) {
    // Reset
    const { start, end } = calcCreditPeriod(credits.credits_period);
    await env.DB.prepare(
      `UPDATE UserAICredits SET base_credits_used = 0, bonus_credits_used = 0, period_start = ?, period_end = ?, hour_window_used = 0 WHERE user_id = ?`,
    )
      .bind(start, end, userId)
      .run();
    credits.base_credits_used = 0;
    credits.bonus_credits_used = 0;
  }

  const totalAllowed =
    (credits.base_credits_total || 0) + (credits.bonus_credits_total || 0);
  const totalUsed =
    (credits.base_credits_used || 0) + (credits.bonus_credits_used || 0);

  if (totalUsed >= totalAllowed) {
    const periodLabel: Record<string, string> = {
      hourly: "अगले घंटे",
      daily: "कल",
      weekly: "अगले सप्ताह",
      monthly: "अगले महीने",
      yearly: "अगले वर्ष",
      plan: "कभी नहीं (plan limit)",
    };
    return {
      allowed: false,
      reason: `AI credits समाप्त। Reset: ${periodLabel[credits.credits_period] || "N/A"}`,
      remaining: 0,
    };
  }

  // Hourly rate limit
  if (credits.rate_limit_per_hour > 0) {
    const hourCheck = await checkHourlyLimit(credits, env, userId);
    if (!hourCheck.allowed) return hourCheck;
  }

  // Consume a credit (from base first, then bonus)
  if (credits.base_credits_used < credits.base_credits_total) {
    await env.DB.prepare(
      "UPDATE UserAICredits SET base_credits_used = base_credits_used + 1 WHERE user_id = ?",
    )
      .bind(userId)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE UserAICredits SET bonus_credits_used = bonus_credits_used + 1 WHERE user_id = ?",
    )
      .bind(userId)
      .run();
  }

  return { allowed: true, remaining: totalAllowed - totalUsed - 1 };
}

async function checkHourlyLimit(
  credits: any,
  env: Env,
  userId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const hourWindowStart = credits.hour_window_start
    ? new Date(credits.hour_window_start)
    : new Date(0);
  const now = new Date();
  const diffMs = now.getTime() - hourWindowStart.getTime();

  if (diffMs > 3600000) {
    // New hour window — reset
    await env.DB.prepare(
      "UPDATE UserAICredits SET hour_window_start = ?, hour_window_used = 1 WHERE user_id = ?",
    )
      .bind(now.toISOString(), userId)
      .run();
    return { allowed: true };
  }

  if (credits.hour_window_used >= credits.rate_limit_per_hour) {
    const resetMs = 3600000 - diffMs;
    const resetMin = Math.ceil(resetMs / 60000);
    return {
      allowed: false,
      reason: `Rate limit exceeded (${credits.rate_limit_per_hour}/hour). ${resetMin} मिनट बाद try करें।`,
    };
  }

  await env.DB.prepare(
    "UPDATE UserAICredits SET hour_window_used = hour_window_used + 1 WHERE user_id = ?",
  )
    .bind(userId)
    .run();
  return { allowed: true };
}

function userAccessProfileAllowsCourse(
  profile: UserAccessProfile,
  courseId: string,
): boolean {
  if (!profile.hasActiveSub) return false;
  if (profile.courseAccessType === "all") return true;
  return profile.allowedCourseIds.includes(courseId);
}

async function userHasSubscriptionCourseAccess(
  userId: string,
  courseId: string,
  env: Env,
): Promise<boolean> {
  const profile = await getUserAccessProfile(userId, env);
  return userAccessProfileAllowsCourse(profile, courseId);
}

// Backward compat helper
async function userHasActiveSubscription(
  userId: string,
  env: Env,
): Promise<boolean> {
  const profile = await getUserAccessProfile(userId, env);
  return profile.hasActiveSub;
}

// GET /api/subscription/plans — Public list of active plans
async function handleListSubscriptionPlans(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, name, interval, interval_count, amount_inr, razorpay_plan_id FROM SubscriptionPlans WHERE is_active = 1 ORDER BY amount_inr ASC",
    ).all();
    return new Response(JSON.stringify({ plans: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Subscription.ListPlans", env, request);
  }
}

// GET /api/subscription/me — User ka current subscription status
async function handleGetUserSubscription(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const sub = await env.DB.prepare(
      `SELECT s.*, p.name as plan_name, p.interval, p.amount_inr 
       FROM Subscriptions s 
       JOIN SubscriptionPlans p ON s.plan_id = p.id 
       WHERE s.user_id = ? 
       ORDER BY s.created_at DESC LIMIT 1`,
    )
      .bind(payload.sub)
      .first();
    return new Response(JSON.stringify({ subscription: sub || null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Token expired") {
      return new Response(
        JSON.stringify({ subscription: null, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    return handleGlobalError(error, "Subscription.GetMine", env, request);
  }
}

// POST /api/subscription/create — Create Razorpay subscription & save to DB
async function handleCreateSubscription(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const { planId } = (await request.json()) as any;

    const plan: any = await env.DB.prepare(
      "SELECT * FROM SubscriptionPlans WHERE id = ? AND is_active = 1",
    )
      .bind(planId)
      .first();
    if (!plan)
      return new Response(
        JSON.stringify({ error: "Subscription plan not found" }),
        { status: 404 },
      );
    if (!plan.razorpay_plan_id)
      return new Response(
        JSON.stringify({
          error: "This plan is not yet linked to Razorpay. Contact admin.",
        }),
        { status: 503 },
      );

    const razorpayKey = await getSecret(env, "RAZORPAY_KEY_ID");
    const razorpaySecret = await getSecret(env, "RAZORPAY_KEY_SECRET");

    if (!razorpayKey || !razorpaySecret) {
      return new Response(
        JSON.stringify({
          error: "Payment gateway is not configured.",
          code: "PAYMENT_NOT_CONFIGURED",
        }),
        { status: 503 },
      );
    }

    // Get user email for Razorpay customer
    const user: any = await env.DB.prepare(
      "SELECT email, full_name FROM Users WHERE id = ?",
    )
      .bind(payload.sub)
      .first();

    const rzpBody: any = {
      plan_id: plan.razorpay_plan_id,
      total_count: 12, // Allow up to 12 billing cycles (auto-renews until cancelled)
      quantity: 1,
      customer_notify: 1,
      notes: { userId: payload.sub, planId },
    };

    const rzpRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${razorpayKey}:${razorpaySecret}`),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rzpBody),
    });

    const rzpData = (await rzpRes.json()) as any;
    if (!rzpRes.ok) {
      console.error("Razorpay subscription create error:", rzpData);
      return new Response(
        JSON.stringify({
          error: rzpData.error?.description || "Failed to create subscription",
        }),
        { status: 502 },
      );
    }

    // Save subscription record to D1
    const subId = generateCustomId("YA-SUB");
    await env.DB.prepare(
      "INSERT INTO Subscriptions (id, user_id, plan_id, razorpay_subscription_id, status) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(subId, payload.sub, planId, rzpData.id, "created")
      .run();

    // Send Official Email Notification
    if (user?.email) {
      const subject = `Your New Subscription: ${plan.name}`;
      const title = "Subscription Created";
      const htmlBody = `
        <p>Namaste <strong>${user.full_name || "Student"}</strong>,</p>
        <p>You have successfully initiated a new subscription: <strong>${plan.name}</strong>.</p>
        <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #bbf7d0;">
          <p style="margin: 0; color: #166534; font-weight: bold;">Subscription Details:</p>
          <p style="margin: 8px 0 0 0;">Plan: ${plan.name}</p>
          <p style="margin: 4px 0 0 0;">Amount: ₹${Math.round(plan.amount_inr / 100)} / ${plan.interval}</p>
        </div>
        <p>Please complete the payment in the checkout window to activate your subscription.</p>
        <p style="font-size: 13px; color: #64748b;">If you closed the window, you can re-initiate the payment from your student dashboard.</p>
      `;
      const textBody = `Namaste ${user.full_name || "Student"},\n\nYour new subscription for ${plan.name} has been created. Please complete the payment to activate it.\n\nAmount: ₹${Math.round(plan.amount_inr / 100)} / ${plan.interval}`;

      await safeSendEmail(env, user.email, subject, title, htmlBody, textBody);
    }

    return new Response(
      JSON.stringify({
        subscription_id: rzpData.id,
        key: razorpayKey,
        plan: { name: plan.name, amount_inr: plan.amount_inr },
        user: { email: user?.email, name: user?.full_name },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return handleGlobalError(error, "Subscription.Create", env, request);
  }
}

// POST /api/subscription/cancel — Cancel active subscription
async function handleCancelSubscription(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const sub: any = await env.DB.prepare(
      `SELECT * FROM Subscriptions WHERE user_id = ? AND status IN ('active','authenticated','created') ORDER BY created_at DESC LIMIT 1`,
    )
      .bind(payload.sub)
      .first();

    if (!sub)
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        { status: 404 },
      );

    const razorpayKey = await getSecret(env, "RAZORPAY_KEY_ID");
    const razorpaySecret = await getSecret(env, "RAZORPAY_KEY_SECRET");

    if (razorpayKey && razorpaySecret && sub.razorpay_subscription_id) {
      // Cancel at Razorpay (cancel_at_cycle_end = 1 means cancel gracefully at end of period)
      await fetch(
        `https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${razorpayKey}:${razorpaySecret}`),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cancel_at_cycle_end: 1 }),
        },
      );
    }

    await env.DB.prepare("UPDATE Subscriptions SET status = ? WHERE id = ?")
      .bind("cancelled", sub.id)
      .run();
    await createNotification(
      env,
      payload.sub,
      "Subscription Cancelled",
      "Aapka subscription cancel ho gaya hai. Access period end tak active rahega.",
      "info",
    );

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Subscription cancelled. Access will remain until end of current period.",
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleGlobalError(error, "Subscription.Cancel", env, request);
  }
}

// =============================================================
// --- Plan Content Pool Management (Admin) ---
// =============================================================

// GET/POST/DELETE /api/admin/subscription/plans/:id/pool
async function handleAdminPlanPool(
  request: Request,
  env: Env,
  planId: string,
): Promise<Response> {
  try {
    await requireAdmin(request, env);

    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT pcp.*, c.title as course_title, b.name as batch_name
         FROM PlanContentPool pcp
         LEFT JOIN Courses c ON pcp.item_type = 'course' AND pcp.item_id = c.id
         LEFT JOIN Batches b ON pcp.item_type = 'batch' AND pcp.item_id = b.id
         WHERE pcp.plan_id = ? ORDER BY pcp.item_type, pcp.access_mode`,
      )
        .bind(planId)
        .all();
      return new Response(JSON.stringify({ pool: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const items: Array<{
        item_type: string;
        item_id: string;
        access_mode: string;
        bonus_ai_credits?: number;
      }> = (await request.json()) as any;
      if (!Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ error: "items array required" }), {
          status: 400,
        });
      }
      const stmts = items.map((item) =>
        env.DB.prepare(
          `INSERT OR REPLACE INTO PlanContentPool (id, plan_id, item_type, item_id, access_mode, bonus_ai_credits)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(
          generateCustomId("YA-PCP"),
          planId,
          item.item_type,
          item.item_id,
          item.access_mode,
          item.bonus_ai_credits || 0,
        ),
      );
      await env.DB.batch(stmts);
      return new Response(
        JSON.stringify({ success: true, added: items.length }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }

    if (request.method === "DELETE") {
      const { item_type, item_id } = (await request.json()) as any;
      await env.DB.prepare(
        "DELETE FROM PlanContentPool WHERE plan_id = ? AND item_type = ? AND item_id = ?",
      )
        .bind(planId, item_type, item_id)
        .run();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.PlanPool", env, request);
  }
}

// GET /api/subscription/plans/:id/pool — Student sees what they can choose from
async function handleStudentPlanPool(
  request: Request,
  env: Env,
  planId: string,
): Promise<Response> {
  try {
    const plan: any = await env.DB.prepare(
      "SELECT * FROM SubscriptionPlans WHERE id = ? AND is_active = 1",
    )
      .bind(planId)
      .first();
    if (!plan)
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
      });

    const { results: courses } = await env.DB.prepare(
      `SELECT pcp.item_id, pcp.access_mode, pcp.bonus_ai_credits, c.title, c.description, c.price_inr
       FROM PlanContentPool pcp JOIN Courses c ON pcp.item_id = c.id
       WHERE pcp.plan_id = ? AND pcp.item_type = 'course'`,
    )
      .bind(planId)
      .all();

    const { results: batches } = await env.DB.prepare(
      `SELECT pcp.item_id, pcp.access_mode, pcp.bonus_ai_credits, b.name, b.start_date, b.end_date, b.status
       FROM PlanContentPool pcp JOIN Batches b ON pcp.item_id = b.id
       WHERE pcp.plan_id = ? AND pcp.item_type = 'batch'`,
    )
      .bind(planId)
      .all();

    return new Response(
      JSON.stringify({
        plan: {
          id: plan.id,
          name: plan.name,
          amount_inr: plan.amount_inr,
          course_access_type: plan.course_access_type,
          max_course_selection: plan.max_course_selection,
          batch_access_type: plan.batch_access_type,
          max_batch_selection: plan.max_batch_selection,
          ai_credits: plan.ai_credits,
          ai_credits_period: plan.ai_credits_period,
          ai_rate_limit_per_hour: plan.ai_rate_limit_per_hour,
          live_session_access: plan.live_session_access,
        },
        courses,
        batches,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return handleGlobalError(error, "Subscription.StudentPool", env, request);
  }
}

// POST /api/subscription/pre-select — Student saves selection before payment
async function handleStudentPreSelect(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const {
      planId,
      selectedCourseIds = [],
      selectedBatchIds = [],
    } = (await request.json()) as any;

    const plan: any = await env.DB.prepare(
      "SELECT * FROM SubscriptionPlans WHERE id = ? AND is_active = 1",
    )
      .bind(planId)
      .first();
    if (!plan)
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
      });

    // Validate selections against pool and limits
    if (plan.course_access_type === "user_choice") {
      if (selectedCourseIds.length > plan.max_course_selection) {
        return new Response(
          JSON.stringify({
            error: `Maximum ${plan.max_course_selection} courses select kar sakte hain`,
          }),
          { status: 400 },
        );
      }
      if (selectedCourseIds.length < Math.min(plan.max_course_selection, 1)) {
        return new Response(
          JSON.stringify({ error: "Kam se kam 1 course chunna zaroori hai" }),
          { status: 400 },
        );
      }
      // Verify all courses are in pool (Optimized: Single query instead of N+1)
      if (selectedCourseIds.length > 0) {
        const placeholders = selectedCourseIds.map(() => "?").join(",");
        const inPoolResults: any = await env.DB.prepare(
          `SELECT item_id FROM PlanContentPool WHERE plan_id = ? AND item_type = 'course' AND item_id IN (${placeholders})`,
        )
          .bind(planId, ...selectedCourseIds)
          .all();

        const foundCourseIds = new Set(
          inPoolResults.results.map((r: any) => r.item_id),
        );
        for (const cId of selectedCourseIds) {
          if (!foundCourseIds.has(cId))
            return new Response(
              JSON.stringify({
                error: `Course ${cId} is not in this plan's pool`,
              }),
              { status: 400 },
            );
        }
      }
    }

    if (plan.batch_access_type === "user_choice") {
      if (selectedBatchIds.length > plan.max_batch_selection) {
        return new Response(
          JSON.stringify({
            error: `Maximum ${plan.max_batch_selection} batches select kar sakte hain`,
          }),
          { status: 400 },
        );
      }
    }

    // Get or create a pending subscription record for this pre-selection
    let sub: any = await env.DB.prepare(
      `SELECT id FROM Subscriptions WHERE user_id = ? AND plan_id = ? AND status = 'created' ORDER BY created_at DESC LIMIT 1`,
    )
      .bind(payload.sub, planId)
      .first();

    if (!sub) {
      const subId = generateCustomId("YA-SUB");
      await env.DB.prepare(
        "INSERT INTO Subscriptions (id, user_id, plan_id, status) VALUES (?, ?, ?, ?)",
      )
        .bind(subId, payload.sub, planId, "created")
        .run();
      sub = { id: subId };
    }

    // Clear old selections for this subscription
    await env.DB.prepare(
      "DELETE FROM UserSubscriptionSelections WHERE subscription_id = ?",
    )
      .bind(sub.id)
      .run();

    // Insert new selections
    const stmts = [
      ...selectedCourseIds.map((cId: string) =>
        env.DB.prepare(
          "INSERT OR IGNORE INTO UserSubscriptionSelections (id, user_id, subscription_id, item_type, item_id) VALUES (?, ?, ?, ?, ?)",
        ).bind(generateCustomId("YA-SEL"), payload.sub, sub.id, "course", cId),
      ),
      ...selectedBatchIds.map((bId: string) =>
        env.DB.prepare(
          "INSERT OR IGNORE INTO UserSubscriptionSelections (id, user_id, subscription_id, item_type, item_id) VALUES (?, ?, ?, ?, ?)",
        ).bind(generateCustomId("YA-SEL"), payload.sub, sub.id, "batch", bId),
      ),
    ];
    if (stmts.length > 0) await env.DB.batch(stmts);

    // Calculate total bonus AI credits for this selection
    const bonusCredits = await calcBonusCredits(sub.id, planId, env);

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: sub.id,
        selected_courses: selectedCourseIds.length,
        selected_batches: selectedBatchIds.length,
        bonus_ai_credits: bonusCredits,
        total_ai_credits:
          (plan.ai_credits || 0) === -1
            ? -1
            : (plan.ai_credits || 0) + bonusCredits,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return handleGlobalError(error, "Subscription.PreSelect", env, request);
  }
}

// GET /api/subscription/my-selections — Get student's locked selections
async function handleGetMySelections(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const sub: any = await env.DB.prepare(
      `SELECT s.id, s.plan_id FROM Subscriptions s WHERE s.user_id = ? AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1`,
    )
      .bind(payload.sub)
      .first();

    if (!sub)
      return new Response(
        JSON.stringify({ selections: { courses: [], batches: [] } }),
        { status: 200 },
      );

    const { results: courses } = await env.DB.prepare(
      `SELECT uss.item_id, c.title, c.description, c.price_inr
       FROM UserSubscriptionSelections uss JOIN Courses c ON uss.item_id = c.id
       WHERE uss.subscription_id = ? AND uss.item_type = 'course'`,
    )
      .bind(sub.id)
      .all();

    const { results: batches } = await env.DB.prepare(
      `SELECT uss.item_id, b.name, b.start_date, b.status
       FROM UserSubscriptionSelections uss JOIN Batches b ON uss.item_id = b.id
       WHERE uss.subscription_id = ? AND uss.item_type = 'batch'`,
    )
      .bind(sub.id)
      .all();

    return new Response(JSON.stringify({ selections: { courses, batches } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Subscription.MySelections", env, request);
  }
}

// GET /api/subscription/ai-credits — Get student's current AI credit balance
async function handleGetMyAICredits(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const payload = await requireAuth(request, env);
    const credits: any = await env.DB.prepare(
      "SELECT * FROM UserAICredits WHERE user_id = ?",
    )
      .bind(payload.sub)
      .first();
    if (!credits)
      return new Response(
        JSON.stringify({
          credits: null,
          message: "No AI credits. Subscribe to a plan with AI.",
        }),
        { status: 200 },
      );

    const totalAllowed =
      credits.base_credits_total === -1
        ? -1
        : credits.base_credits_total + credits.bonus_credits_total;
    const totalUsed =
      (credits.base_credits_used || 0) + (credits.bonus_credits_used || 0);
    const remaining =
      totalAllowed === -1 ? -1 : Math.max(0, totalAllowed - totalUsed);
    const periodEndDate = credits.period_end
      ? new Date(credits.period_end)
      : null;
    const daysUntilReset = periodEndDate
      ? Math.max(
        0,
        Math.ceil((periodEndDate.getTime() - Date.now()) / 86400000),
      )
      : null;

    return new Response(
      JSON.stringify({
        credits: {
          base_total: credits.base_credits_total,
          base_used: credits.base_credits_used,
          bonus_total: credits.bonus_credits_total,
          bonus_used: credits.bonus_credits_used,
          total_allowed: totalAllowed,
          total_used: totalUsed,
          remaining,
          period: credits.credits_period,
          period_end: credits.period_end,
          days_until_reset: daysUntilReset,
          rate_limit_per_hour: credits.rate_limit_per_hour,
          hour_window_used: credits.hour_window_used,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return handleGlobalError(error, "Subscription.AICredits", env, request);
  }
}

// GET+POST+PUT+DELETE /api/admin/subscription/plans — Admin: Manage plans (with Razorpay auto-creation)
async function handleAdminSubscriptionPlans(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdmin(request, env);

    const url = new URL(request.url);
    const planId = url.pathname.split("/").pop();
    const isSpecificPlan = planId && planId !== "plans";

    // GET — List all plans
    if (request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM SubscriptionPlans ORDER BY amount_inr ASC",
      ).all();
      return new Response(JSON.stringify({ plans: results }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST — Create plan (auto-creates in Razorpay first, then saves to DB)
    if (request.method === "POST") {
      const {
        name,
        interval,
        interval_count,
        amount_inr,
        description,
        course_access_type = "none",
        max_course_selection = 0,
        batch_access_type = "none",
        max_batch_selection = 0,
        ai_credits = 0,
        ai_credits_period = "none",
        ai_rate_limit_per_hour = 0,
        live_session_access = 0,
      } = (await request.json()) as any;
      if (!name || !interval || !amount_inr) {
        return new Response(
          JSON.stringify({ error: "name, interval, amount_inr required" }),
          { status: 400 },
        );
      }

      const razorpayKey = await getSecret(env, "RAZORPAY_KEY_ID");
      const razorpaySecret = await getSecret(env, "RAZORPAY_KEY_SECRET");

      let razorpayPlanId: string | null = null;

      // Auto-create plan in Razorpay if credentials are available
      if (razorpayKey && razorpaySecret) {
        // Razorpay interval mapping
        const rzpPeriodMap: Record<string, string> = {
          monthly: "monthly",
          quarterly: "monthly", // Razorpay uses monthly with count=3
          yearly: "yearly",
        };
        const rzpCountMap: Record<string, number> = {
          monthly: 1,
          quarterly: 3,
          yearly: 12,
        };

        const rzpBody = {
          period: rzpPeriodMap[interval] || "monthly",
          interval: interval_count || rzpCountMap[interval] || 1,
          item: {
            name: name,
            description: description || `${name} Subscription Plan`,
            amount: amount_inr, // Already in paise
            currency: "INR",
          },
          notes: {
            created_by: "Yagya LMS Admin Panel",
            interval_type: interval,
          },
        };

        const rzpRes = await fetch("https://api.razorpay.com/v1/plans", {
          method: "POST",
          headers: {
            Authorization: "Basic " + btoa(`${razorpayKey}:${razorpaySecret}`),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rzpBody),
        });

        const rzpData = (await rzpRes.json()) as any;
        if (!rzpRes.ok) {
          console.error("[Admin Plan] Razorpay plan create error:", rzpData);
          return new Response(
            JSON.stringify({
              error: `Razorpay Plan creation failed: ${rzpData.error?.description || "Unknown error"}`,
              razorpay_error: rzpData.error,
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }

        razorpayPlanId = rzpData.id; // e.g. "plan_XXXXXXXXXX"
        console.log(`[Admin Plan] Razorpay plan created: ${razorpayPlanId}`);
      }

      // Save to D1 with all benefit fields
      const id = generateCustomId("YA-PLN");
      await env.DB.prepare(
        `INSERT INTO SubscriptionPlans (id, name, interval, interval_count, amount_inr, razorpay_plan_id,
         course_access_type, max_course_selection, batch_access_type, max_batch_selection,
         ai_credits, ai_credits_period, ai_rate_limit_per_hour, live_session_access)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          name,
          interval,
          interval_count || 1,
          amount_inr,
          razorpayPlanId,
          course_access_type,
          max_course_selection,
          batch_access_type,
          max_batch_selection,
          ai_credits,
          ai_credits_period,
          ai_rate_limit_per_hour,
          live_session_access ? 1 : 0,
        )
        .run();

      return new Response(
        JSON.stringify({
          success: true,
          id,
          razorpay_plan_id: razorpayPlanId,
          message: razorpayPlanId
            ? `Plan created successfully and linked to Razorpay (${razorpayPlanId})`
            : "Plan saved to DB. Razorpay keys not configured — plan not created in Razorpay.",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }

    // PUT — Update plan (name, active status, or manually override razorpay_plan_id)
    if (request.method === "PUT" && isSpecificPlan) {
      const { name, is_active, razorpay_plan_id } =
        (await request.json()) as any;
      await env.DB.prepare(
        "UPDATE SubscriptionPlans SET name = COALESCE(?, name), razorpay_plan_id = COALESCE(?, razorpay_plan_id), is_active = COALESCE(?, is_active) WHERE id = ?",
      )
        .bind(
          name || null,
          razorpay_plan_id || null,
          is_active !== undefined ? is_active : null,
          planId,
        )
        .run();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // DELETE — Deactivate plan (soft delete — keeps existing subscriptions intact)
    if (request.method === "DELETE" && isSpecificPlan) {
      const razorpayKey = await getSecret(env, "RAZORPAY_KEY_ID");
      const razorpaySecret = await getSecret(env, "RAZORPAY_KEY_SECRET");

      // 1. Find all active subscriptions for this plan
      const activeSubs = await env.DB.prepare(
        `SELECT id, razorpay_subscription_id FROM Subscriptions WHERE plan_id = ? AND status IN ('active','authenticated','created')`,
      )
        .bind(planId)
        .all();

      const results = activeSubs.results as any[];

      // 2. If Razorpay is configured, cancel all active subscriptions there
      if (razorpayKey && razorpaySecret && results.length > 0) {
        console.log(
          `[Admin.DeletePlan] Cancelling ${results.length} active subscriptions in Razorpay for plan ${planId}`,
        );
        const auth = "Basic " + btoa(`${razorpayKey}:${razorpaySecret}`);

        await Promise.all(
          results.map(async (sub) => {
            if (sub.razorpay_subscription_id) {
              try {
                // Cancel immediately (cancel_at_cycle_end=0)
                await fetch(
                  `https://api.razorpay.com/v1/subscriptions/${sub.razorpay_subscription_id}/cancel`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: auth,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ cancel_at_cycle_end: 0 }),
                  },
                );
              } catch (e) {
                console.error(
                  `[Admin.DeletePlan] Failed to cancel sub ${sub.razorpay_subscription_id}:`,
                  e,
                );
              }
            }
          }),
        );

        // Update DB status for these subs
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE plan_id = ? AND status IN ('active','authenticated','created')`,
        )
          .bind(planId)
          .run();
      }

      // 3. Mark plan as inactive and then try to delete it
      await env.DB.prepare(
        "UPDATE SubscriptionPlans SET is_active = 0 WHERE id = ?",
      )
        .bind(planId)
        .run();

      // 4. Try final cleanup (if all subs were cancelled successfully, it will delete the plan now)
      await cleanupPlanIfEmpty(planId as string, env);

      return new Response(
        JSON.stringify({
          success: true,
          message:
            results.length > 0
              ? `Plan deactivated. ${results.length} active subscription(s) were cancelled in Razorpay. Plan will be deleted permanently once all subscriptions are confirmed inactive.`
              : "Plan deleted permanently.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden")
      return new Response(JSON.stringify({ error: error.message }), {
        status: 403,
      });
    return handleGlobalError(error, "Admin.SubscriptionPlans", env, request);
  }
}

// Helper to get or create Razorpay customer
async function getOrCreateRazorpayCustomer(
  user: any,
  env: Env,
): Promise<string> {
  if (user.razorpay_customer_id) return user.razorpay_customer_id;

  const rzpKey = await getSecret(env, "RAZORPAY_KEY_ID");
  const rzpSecret = await getSecret(env, "RAZORPAY_KEY_SECRET");

  const res = await fetch("https://api.razorpay.com/v1/customers", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${rzpKey}:${rzpSecret}`),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: user.full_name || "Student",
      email: user.email,
      contact: user.phone || undefined,
      notes: { userId: user.id },
    }),
  });

  const data = (await res.json()) as any;
  if (res.ok && data.id) {
    await env.DB.prepare(
      "UPDATE Users SET razorpay_customer_id = ? WHERE id = ?",
    )
      .bind(data.id, user.id)
      .run();
    return data.id;
  }
  throw new Error(
    data.error?.description || "Failed to create Razorpay customer",
  );
}

// POST /api/admin/subscription/assign — Admin: Manually assign plan to user (sends Razorpay link)
async function handleAdminAssignSubscription(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const { userId, planId } = (await request.json()) as any;

    if (!userId || !planId) {
      return new Response(
        JSON.stringify({ error: "userId and planId required" }),
        {
          status: 400,
        },
      );
    }

    // 1. Fetch Plan & User
    const plan: any = await env.DB.prepare(
      "SELECT * FROM SubscriptionPlans WHERE id = ?",
    )
      .bind(planId)
      .first();
    const user: any = await env.DB.prepare("SELECT * FROM Users WHERE id = ?")
      .bind(userId)
      .first();

    if (!plan || !user) {
      return new Response(JSON.stringify({ error: "Plan or User not found" }), {
        status: 404,
      });
    }

    if (!plan.razorpay_plan_id) {
      return new Response(
        JSON.stringify({ error: "Plan is not linked to Razorpay" }),
        { status: 400 },
      );
    }

    const rzpKey = await getSecret(env, "RAZORPAY_KEY_ID");
    const rzpSecret = await getSecret(env, "RAZORPAY_KEY_SECRET");

    if (!rzpKey || !rzpSecret) {
      return new Response(
        JSON.stringify({ error: "Razorpay credentials not configured" }),
        { status: 503 },
      );
    }

    // 2. Create Razorpay Subscription directly (as used in student portal)
    const rzpBody: any = {
      plan_id: plan.razorpay_plan_id,
      total_count: 12,
      quantity: 1,
      customer_notify: true,
      notes: { userId, planId, admin_assigned: "true" },
      notify_info: {
        notify_email: user.email,
        notify_phone: user.phone || undefined,
      },
    };

    const rzpRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${rzpKey}:${rzpSecret}`),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rzpBody),
    });

    const rzpData = (await rzpRes.json()) as any;
    if (!rzpRes.ok) {
      console.error("[Admin Assign] RZP Subscription Error:", rzpData);
      return new Response(
        JSON.stringify({
          error: rzpData.error?.description || "Razorpay subscription failure",
        }),
        { status: 502 },
      );
    }

    const rzpSubscriptionId = rzpData.id;
    const rzpPaymentLink = rzpData.short_url;

    // 3. Save to DB
    const subId = generateCustomId("YA-SUB");
    await env.DB.prepare(
      `INSERT INTO Subscriptions (id, user_id, plan_id, razorpay_subscription_id, razorpay_payment_link, status, live_class_credits, is_lifetime)
       VALUES (?, ?, ?, ?, ?, 'created', ?, ?)`,
    )
      .bind(
        subId,
        userId,
        planId,
        rzpSubscriptionId,
        rzpPaymentLink,
        plan.live_class_credits || 0,
        plan.is_lifetime || 0,
      )
      .run();

    // 4. Send Official Email Notification
    if (user.email) {
      const subject = `New Subscription Plan: ${plan.name}`;
      const title = "New Subscription Assigned";
      const htmlBody = `
        <p>Namaste <strong>${user.full_name || "Student"}</strong>,</p>
        <p>An administrator has assigned a new subscription plan to your account: <strong>${plan.name}</strong>.</p>
        <div style="background: #ede9fe; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #ddd6fe;">
          <p style="margin: 0; color: #4338ca; font-weight: bold;">Subscription Details:</p>
          <p style="margin: 8px 0 0 0;">Plan: ${plan.name}</p>
          <p style="margin: 4px 0 0 0;">Amount: ₹${Math.round(plan.amount_inr / 100)} / ${plan.interval}</p>
        </div>
        <p>To activate your subscription and start your learning journey, please complete the payment using the official link below:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${rzpPaymentLink}" style="background: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Activate Subscription Now</a>
        </p>
        <p style="font-size: 13px; color: #64748b;">If the button doesn't work, copy and paste this URL into your browser: <br/> ${rzpPaymentLink}</p>
      `;
      const textBody = `Namaste ${user.full_name || "Student"},\n\nA new subscription plan (${plan.name}) has been assigned to your account. Please complete the payment using this link to activate it: ${rzpPaymentLink}\n\nAmount: ₹${Math.round(plan.amount_inr / 100)} / ${plan.interval}`;

      await safeSendEmail(env, user.email, subject, title, htmlBody, textBody);
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: rzpSubscriptionId,
        payment_link: rzpPaymentLink,
        message: `Subscription created and official email sent to ${user.email}`,
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return handleGlobalError(error, "Admin.AssignSubscription", env, request);
  }
}
// POST /api/payment/webhook — Razorpay Webhook (server-side event processing)
async function handleRazorpayWebhook(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const webhookSecret = await getSecret(env, "RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET not configured in KV");
      return new Response("Webhook not configured", { status: 503 });
    }

    // 1. Verify Razorpay signature
    const razorpaySignature = request.headers.get("X-Razorpay-Signature") || "";
    const rawBody = await request.text();

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody),
    );
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpaySignature) {
      console.error("[Webhook] Signature mismatch — possible forgery attempt");
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 400 },
      );
    }

    // 2. Parse event
    const event = JSON.parse(rawBody) as any;
    const eventType: string = event.event;
    console.log(`[Webhook] Received event: ${eventType}`);

    // 3. Handle events
    if (eventType === "payment.captured") {
      // One-time course payment
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      if (orderId) {
        // Fetch course details to get the final amount paid
        const enrollmentDetails: any = await env.DB.prepare(
          `SELECT c.price_inr FROM Enrollments e JOIN Courses c ON e.course_id = c.id WHERE e.payment_id = ?`,
        )
          .bind(orderId)
          .first();

        const amountPaid = enrollmentDetails?.price_inr || 0;

        await env.DB.prepare(
          'UPDATE Enrollments SET payment_status = "paid", status = "active", amount_paid = ? WHERE payment_id = ?',
        )
          .bind(amountPaid, orderId)
          .run();

        // Update Transaction to 'successful'
        await env.DB.prepare(
          `UPDATE Transactions SET status = 'successful' WHERE razorpay_order_id = ? AND type = 'course_purchase'`,
        )
          .bind(orderId)
          .run();

        // Notify the student
        const enrollment: any = await env.DB.prepare(
          "SELECT e.user_id, c.title FROM Enrollments e JOIN Courses c ON e.course_id = c.id WHERE e.payment_id = ?",
        )
          .bind(orderId)
          .first();
        if (enrollment) {
          await createNotification(
            env,
            enrollment.user_id,
            "Payment Successful! 🎉",
            `"${enrollment.title}" course ka access unlock ho gaya hai.`,
            "success",
          );
        }
      }
    } else if (eventType === "subscription.activated") {
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        const periodEnd = sub.current_end
          ? new Date(sub.current_end * 1000).toISOString()
          : null;
        const periodStart = sub.current_start
          ? new Date(sub.current_start * 1000).toISOString()
          : null;
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'active', current_period_start = ?, current_period_end = ? WHERE razorpay_subscription_id = ?`,
        )
          .bind(periodStart, periodEnd, sub.id)
          .run();

        const dbSub: any = await env.DB.prepare(
          `SELECT s.id, s.user_id, s.plan_id, p.ai_credits, p.ai_credits_period, p.ai_rate_limit_per_hour
           FROM Subscriptions s JOIN SubscriptionPlans p ON s.plan_id = p.id
           WHERE s.razorpay_subscription_id = ?`,
        )
          .bind(sub.id)
          .first();

        if (dbSub) {
          // Allocate AI credits based on plan + user selections
          if ((dbSub.ai_credits || 0) !== 0) {
            await allocateAICredits(
              dbSub.user_id,
              dbSub.id,
              dbSub.plan_id,
              dbSub,
              env,
            );
          }
          await createNotification(
            env,
            dbSub.user_id,
            "Subscription Active! ✅",
            "Aapka subscription activate ho gaya hai. Apne selected courses access karein!",
            "success",
          );

          // Send email notification to user
          const user: any = await env.DB.prepare(
            "SELECT email, full_name FROM Users WHERE id = ?",
          )
            .bind(dbSub.user_id)
            .first();
          if (user?.email) {
            const userHtml = `
              <p>नमस्ते <strong>${user.full_name || "छात्र"}</strong>,</p>
              <p>आपका subscription सफलतापूर्वक activate हो गया है!</p>
              <p>आप अपने selected courses और AI credits का उपयोग कर सकते हैं।</p>
            `;
            const userText = `नमस्ते ${user.full_name || "छात्र"},\n\nआपका subscription सफलतापूर्वक activate हो गया है!\nआप अपने selected courses और AI credits का उपयोग कर सकते हैं।\n\nOm!`;
            await safeSendEmail(
              env,
              user.email,
              "Subscription Activated",
              "✅ Subscription Active!",
              userHtml,
              userText,
            );
          }
        }
      }
    } else if (eventType === "subscription.charged") {
      // Renewal — update period dates
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        const periodEnd = sub.current_end
          ? new Date(sub.current_end * 1000).toISOString()
          : null;
        const periodStart = sub.current_start
          ? new Date(sub.current_start * 1000).toISOString()
          : null;
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'active', current_period_start = ?, current_period_end = ? WHERE razorpay_subscription_id = ?`,
        )
          .bind(periodStart, periodEnd, sub.id)
          .run();
      }
    } else if (eventType === "subscription.halted") {
      // Payment failed — halt subscription
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'halted' WHERE razorpay_subscription_id = ?`,
        )
          .bind(sub.id)
          .run();

        const dbSub: any = await env.DB.prepare(
          "SELECT user_id FROM Subscriptions WHERE razorpay_subscription_id = ?",
        )
          .bind(sub.id)
          .first();
        if (dbSub) {
          await createNotification(
            env,
            dbSub.user_id,
            "Subscription Payment Failed ⚠️",
            "Aapke subscription ka payment fail ho gaya. Kripya payment update karein.",
            "alert",
          );
        }
      }
    } else if (eventType === "subscription.cancelled") {
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'cancelled' WHERE razorpay_subscription_id = ?`,
        )
          .bind(sub.id)
          .run();
      }
    } else if (eventType === "subscription.completed") {
      const sub = event.payload?.subscription?.entity;
      if (sub?.id) {
        await env.DB.prepare(
          `UPDATE Subscriptions SET status = 'completed' WHERE razorpay_subscription_id = ?`,
        )
          .bind(sub.id)
          .run();
      }
    }

    // Cleanup logic: After any cancellation or completion, check if we can delete an inactive plan
    const subEntity = event.payload?.subscription?.entity;
    if (
      subEntity?.id &&
      [
        "subscription.cancelled",
        "subscription.completed",
        "subscription.expired",
      ].includes(eventType)
    ) {
      const dbSub: any = await env.DB.prepare(
        "SELECT plan_id FROM Subscriptions WHERE razorpay_subscription_id = ?",
      )
        .bind(subEntity.id)
        .first();
      if (dbSub?.plan_id) {
        await cleanupPlanIfEmpty(dbSub.plan_id, env);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Webhook] Processing error:", error);
    // Return 200 to Razorpay even on internal error (prevents retries for our own bugs)
    return new Response(
      JSON.stringify({ received: true, warning: "Internal processing error" }),
      { status: 200 },
    );
  }
}

async function cleanupPlanIfEmpty(planId: string, env: Env) {
  try {
    // Check if plan is inactive (marked for deletion/cleanup)
    const plan: any = await env.DB.prepare(
      "SELECT is_active FROM SubscriptionPlans WHERE id = ?",
    )
      .bind(planId)
      .first();
    if (!plan || plan.is_active === 1) return;

    // Check for any remaining active subscribers
    const activeSubCount: any = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM Subscriptions WHERE plan_id = ? AND status IN ('active','authenticated','created')`,
    )
      .bind(planId)
      .first();

    if (!activeSubCount || activeSubCount.count === 0) {
      console.log(
        `[Cleanup] No active subscribers left for inactive plan ${planId}. Deleting permanently.`,
      );
      await env.DB.prepare("DELETE FROM PlanContentPool WHERE plan_id = ?")
        .bind(planId)
        .run();
      await env.DB.prepare("DELETE FROM SubscriptionPlans WHERE id = ?")
        .bind(planId)
        .run();
    }
  } catch (e) {
    console.error(`[Cleanup] Error cleaning up plan ${planId}:`, e);
  }
}

async function handleSeed(request: Request, env: Env): Promise<Response> {
  try {
    const teacherId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO Users (id, email, role) VALUES (?, ?, ?)",
    )
      .bind(teacherId, "teacher@example.com", "teacher")
      .run();

    const courseId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO Courses (id, title, description, teacher_id, price) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(
        courseId,
        "Advanced Cloudflare Workers",
        "Learn how to build edge applications.",
        teacherId,
        4900,
      )
      .run();

    return new Response(
      JSON.stringify({ message: "Database seeded with a test course." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "Dev.Seed", env, request);
  }
}

let _dbInitialized = false;

async function initDbAndSeed(env: Env) {
  if (_dbInitialized) return;

  try {
    // 1. Auto-Create Tables (Auto Migration)
    const schemaQueries = [
      `CREATE TABLE IF NOT EXISTS OTPs (email TEXT PRIMARY KEY, otp TEXT NOT NULL, expires_at DATETIME NOT NULL);`,
      `CREATE TABLE IF NOT EXISTS Users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, role TEXT CHECK(role IN ('admin', 'teacher', 'student')) NOT NULL DEFAULT 'student', current_session_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS Categories (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,

      
      `CREATE TABLE IF NOT EXISTS Lessons (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, batch_id TEXT, chapter_title TEXT DEFAULT 'General', title TEXT NOT NULL, type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording', 'audio')) NOT NULL, content_url TEXT, recording_url TEXT, order_index INTEGER NOT NULL, is_free INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, text_content TEXT, text_content_hi TEXT, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE, FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL);`,

      `CREATE TABLE IF NOT EXISTS Courses (id TEXT PRIMARY KEY, title TEXT NOT NULL, title_hi TEXT, description TEXT, description_hi TEXT, category_id TEXT, teacher_id TEXT NOT NULL, price INTEGER NOT NULL DEFAULT 0, price_inr INTEGER DEFAULT 0, price_usd INTEGER DEFAULT 0, self_study_enabled INTEGER DEFAULT 0, self_study_credit_cost INTEGER DEFAULT 0, self_study_only INTEGER DEFAULT 0, individual_class_booking_enabled INTEGER DEFAULT 0, individual_class_credit_cost INTEGER DEFAULT 0, individual_class_duration_minutes INTEGER DEFAULT 30, seo_title_en TEXT, seo_title_hi TEXT, seo_description_en TEXT, seo_description_hi TEXT, seo_keywords_en TEXT, seo_keywords_hi TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE SET NULL, FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS CourseMerchantListings (id TEXT PRIMARY KEY, course_id TEXT NOT NULL UNIQUE, sync_enabled INTEGER DEFAULT 0, offer_id TEXT NOT NULL UNIQUE, product_resource_name TEXT, data_source_name TEXT, content_language TEXT DEFAULT 'en', feed_label TEXT DEFAULT 'IN', target_country TEXT DEFAULT 'IN', currency TEXT DEFAULT 'INR', availability TEXT DEFAULT 'in_stock', condition TEXT DEFAULT 'new', brand TEXT, google_product_category TEXT, image_url TEXT, landing_url TEXT, sync_status TEXT DEFAULT 'not_synced', sync_error TEXT, last_synced_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_course_merchant_course ON CourseMerchantListings(course_id);`,
      
      `CREATE TABLE IF NOT EXISTS Enrollments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, course_id TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, status TEXT CHECK(status IN ('active', 'revoked', 'completed')) NOT NULL DEFAULT 'active', payment_id TEXT, payment_status TEXT DEFAULT 'pending', amount_paid INTEGER DEFAULT 0, payment_source TEXT, purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS LiveSessions (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, teacher_id TEXT NOT NULL, title TEXT, start_time DATETIME NOT NULL, rtc_room_id TEXT NOT NULL UNIQUE, status TEXT CHECK(status IN ('scheduled', 'live', 'ended')) DEFAULT 'scheduled', recording_id TEXT, recording_status TEXT DEFAULT 'pending', is_free INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE, FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS LiveSignaling (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL, data TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Attendance (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, user_id TEXT NOT NULL, joined_at DATETIME DEFAULT CURRENT_TIMESTAMP, left_at DATETIME, FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Exams (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL, passing_score INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS CompletedLessons (user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, lesson_id), FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (lesson_id) REFERENCES Lessons(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, type TEXT DEFAULT 'info', is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS FormTemplates (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT, fields_json TEXT NOT NULL, seo_json TEXT, theme_json TEXT, confirmation_email_body TEXT, linked_course_id TEXT, linked_batch_id TEXT, auto_enroll INTEGER DEFAULT 0, eligibility_criteria TEXT, teacher_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE SET NULL);`,
      `CREATE TABLE IF NOT EXISTS FormSubmissions (id TEXT PRIMARY KEY, template_id TEXT NOT NULL, user_id TEXT, email TEXT, data_json TEXT NOT NULL, status TEXT DEFAULT 'pending', ai_analysis TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (template_id) REFERENCES FormTemplates(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS EmailDrafts (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, is_html INTEGER DEFAULT 1, status TEXT CHECK(status IN ('draft', 'sent', 'cancelled')) DEFAULT 'draft', admin_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, sent_at DATETIME, FOREIGN KEY (admin_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS BroadcastDrafts (id TEXT PRIMARY KEY, subject TEXT NOT NULL, message TEXT NOT NULL, type TEXT CHECK(type IN ('draft', 'history')) DEFAULT 'draft', target_type TEXT NOT NULL, target_id TEXT, custom_emails TEXT, send_email INTEGER DEFAULT 0, send_notification INTEGER DEFAULT 0, admin_id TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, sent_at DATETIME, FOREIGN KEY (admin_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS PushSubscriptions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subscription_json TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_push_subs_user ON PushSubscriptions(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);`,
      `CREATE INDEX IF NOT EXISTS idx_courses_teacher ON Courses(teacher_id);`,
      `CREATE INDEX IF NOT EXISTS idx_lessons_course ON Lessons(course_id);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_user_course ON Enrollments(user_id, course_id);`,
      `CREATE INDEX IF NOT EXISTS idx_livesessions_course ON LiveSessions(course_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON FormTemplates(slug);`,
      `CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON FormSubmissions(template_id);`,
      `CREATE INDEX IF NOT EXISTS idx_email_drafts_admin ON EmailDrafts(admin_id);`,
      `CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON EmailDrafts(status);`,
      `CREATE INDEX IF NOT EXISTS idx_broadcast_drafts_admin ON BroadcastDrafts(admin_id);`,
      `CREATE TABLE IF NOT EXISTS Batches (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, name TEXT NOT NULL, name_hi TEXT, description_en TEXT, description_hi TEXT, seo_json TEXT, start_date DATETIME, end_date DATETIME, class_start_time TEXT, class_end_time TEXT, class_days TEXT, self_study_group_enabled INTEGER DEFAULT 1, group_class_credit_cost INTEGER DEFAULT 0, credit_deduction_timing TEXT DEFAULT 'on_join', status TEXT CHECK(status IN ('upcoming', 'ongoing', 'completed')) DEFAULT 'upcoming', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_batches_course ON Batches(course_id);`,
      `CREATE TABLE IF NOT EXISTS ChatHistory (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_id TEXT, role TEXT NOT NULL, content TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE INDEX IF NOT EXISTS idx_chat_history_user ON ChatHistory(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_chat_history_session ON ChatHistory(session_id);`,
      `CREATE TABLE IF NOT EXISTS ErrorSessions (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, source TEXT NOT NULL, status TEXT DEFAULT 'new', severity TEXT DEFAULT 'medium', title TEXT NOT NULL, error_message TEXT NOT NULL, stack_trace TEXT, full_payload TEXT, ai_prompt TEXT, url TEXT, user_id TEXT, device_info TEXT, email_from TEXT, email_to TEXT, email_subject TEXT, repeat_count INTEGER DEFAULT 1, last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE INDEX IF NOT EXISTS idx_error_sessions_fingerprint ON ErrorSessions(fingerprint);`,
      `CREATE INDEX IF NOT EXISTS idx_error_sessions_status ON ErrorSessions(status);`,
      `CREATE INDEX IF NOT EXISTS idx_error_sessions_updated ON ErrorSessions(updated_at);`,
      `CREATE TABLE IF NOT EXISTS ErrorSessionEvents (id TEXT PRIMARY KEY, error_session_id TEXT NOT NULL, type TEXT NOT NULL, payload TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (error_session_id) REFERENCES ErrorSessions(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_error_session_events_session ON ErrorSessionEvents(error_session_id);`,
      `CREATE TABLE IF NOT EXISTS JulesJobs (id TEXT PRIMARY KEY, error_session_id TEXT NOT NULL, jules_session_id TEXT, prompt TEXT NOT NULL, status TEXT DEFAULT 'queued', response TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (error_session_id) REFERENCES ErrorSessions(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_jules_jobs_session ON JulesJobs(error_session_id);`,
      `CREATE INDEX IF NOT EXISTS idx_jules_jobs_status ON JulesJobs(status);`,
      `CREATE TABLE IF NOT EXISTS SubscriptionPlans (id TEXT PRIMARY KEY, name TEXT NOT NULL, interval TEXT CHECK(interval IN ('monthly','quarterly','yearly')) NOT NULL, interval_count INTEGER DEFAULT 1, amount_inr INTEGER NOT NULL, razorpay_plan_id TEXT, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS Subscriptions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_id TEXT NOT NULL, razorpay_subscription_id TEXT UNIQUE, status TEXT CHECK(status IN ('created','authenticated','active','pending','halted','cancelled','completed','expired')) DEFAULT 'created', current_period_start DATETIME, current_period_end DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (plan_id) REFERENCES SubscriptionPlans(id));`,
      `CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON Subscriptions(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_subscriptions_rzp ON Subscriptions(razorpay_subscription_id);`,
      `CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON SubscriptionPlans(is_active);`,
      `CREATE TABLE IF NOT EXISTS PlanContentPool (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, item_type TEXT CHECK(item_type IN ('course','batch')) NOT NULL, item_id TEXT NOT NULL, access_mode TEXT CHECK(access_mode IN ('static','user_choice')) NOT NULL, bonus_ai_credits INTEGER DEFAULT 0, UNIQUE(plan_id, item_type, item_id), FOREIGN KEY (plan_id) REFERENCES SubscriptionPlans(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS UserSubscriptionSelections (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subscription_id TEXT NOT NULL, item_type TEXT CHECK(item_type IN ('course','batch')) NOT NULL, item_id TEXT NOT NULL, selected_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(subscription_id, item_type, item_id), FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (subscription_id) REFERENCES Subscriptions(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Subscribers (email TEXT PRIMARY KEY, subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'active');`,
      `CREATE TABLE IF NOT EXISTS SiteSettings (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS UserAICredits (user_id TEXT PRIMARY KEY, subscription_id TEXT, base_credits_total INTEGER DEFAULT 0, base_credits_used INTEGER DEFAULT 0, bonus_credits_total INTEGER DEFAULT 0, bonus_credits_used INTEGER DEFAULT 0, credits_period TEXT DEFAULT 'none', period_start DATETIME, period_end DATETIME, hour_window_start DATETIME, hour_window_used INTEGER DEFAULT 0, rate_limit_per_hour INTEGER DEFAULT 0, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS CreditPacks (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, amount_inr INTEGER NOT NULL, credits INTEGER NOT NULL, credit_type TEXT DEFAULT 'self_study', is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);`,
      `CREATE TABLE IF NOT EXISTS CreditWallets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, credit_type TEXT NOT NULL DEFAULT 'self_study', total_credits INTEGER DEFAULT 0, used_credits INTEGER DEFAULT 0, locked_credits INTEGER DEFAULT 0, expires_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, credit_type), FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS CreditLedger (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, credit_type TEXT NOT NULL DEFAULT 'self_study', change_amount INTEGER NOT NULL, balance_after INTEGER NOT NULL, reason TEXT NOT NULL, reference_type TEXT, reference_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE TABLE IF NOT EXISTS Transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount_paise INTEGER, amount_inr INTEGER, currency TEXT DEFAULT 'INR', type TEXT NOT NULL, status TEXT NOT NULL, razorpay_order_id TEXT, razorpay_payment_id TEXT, razorpay_signature TEXT, payment_source TEXT DEFAULT 'razorpay', related_id TEXT, credits_added INTEGER, credit_type TEXT DEFAULT 'ai', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE);`,
      `CREATE INDEX IF NOT EXISTS idx_plan_content_pool_plan ON PlanContentPool(plan_id);`,
      `CREATE INDEX IF NOT EXISTS idx_user_sub_selections_sub ON UserSubscriptionSelections(subscription_id);`,
      `CREATE INDEX IF NOT EXISTS idx_user_sub_selections_user ON UserSubscriptionSelections(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_credit_packs_active ON CreditPacks(is_active);`,
      `CREATE INDEX IF NOT EXISTS idx_credit_wallets_user ON CreditWallets(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON CreditLedger(user_id, credit_type);`,
      `CREATE INDEX IF NOT EXISTS idx_credit_ledger_reference ON CreditLedger(reference_type, reference_id);`,
    ];

    // --- Optimized Multi-Table Schema Migrations ---
    const tablesToMigrate = [
      "Attendance", "SubscriptionPlans", "Courses", "Batches", "Transactions",
      "Subscriptions", "FormTemplates", "LiveSessions", "Enrollments",
      "Lessons", "ChatHistory", "Users"
    ];

    try {
      const tableInfos: any[] = await env.DB.batch(
        tablesToMigrate.map(table => env.DB.prepare(`PRAGMA table_info(${table})`))
      );

      const tableSchemaMap: Record<string, Set<string>> = {};
      const tableRawInfoMap: Record<string, any[]> = {};

      tableInfos.forEach((res, idx) => {
        const tableName = tablesToMigrate[idx];
        const columns = new Set((res.results as any[]).map(c => c.name));
        tableSchemaMap[tableName] = columns;
        tableRawInfoMap[tableName] = res.results;
      });

      const migrationStatements: any[] = [];

      // Helper to add migration statement if column is missing
      const addCol = (table: string, col: string, type: string) => {
        if (!tableSchemaMap[table].has(col)) {
          migrationStatements.push(env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${type};`));
        }
      };

      // 1. Attendance
      addCol("Attendance", "left_at", "DATETIME");

      // 2. SubscriptionPlans
      addCol("SubscriptionPlans", "live_class_credits", "INTEGER DEFAULT 0");
      addCol("SubscriptionPlans", "course_access_type", "TEXT DEFAULT 'none'");
      addCol("SubscriptionPlans", "max_course_selection", "INTEGER DEFAULT 0");
      addCol("SubscriptionPlans", "batch_access_type", "TEXT DEFAULT 'none'");
      addCol("SubscriptionPlans", "max_batch_selection", "INTEGER DEFAULT 0");
      addCol("SubscriptionPlans", "ai_credits", "INTEGER DEFAULT 0");
      addCol("SubscriptionPlans", "ai_credits_period", "TEXT DEFAULT 'none'");
      addCol("SubscriptionPlans", "ai_rate_limit_per_hour", "INTEGER DEFAULT 0");
      addCol("SubscriptionPlans", "live_session_access", "INTEGER DEFAULT 0");

      // 3. Courses
      addCol("Courses", "self_study_enabled", "INTEGER DEFAULT 0");
      addCol("Courses", "self_study_credit_cost", "INTEGER DEFAULT 0");
      addCol("Courses", "self_study_only", "INTEGER DEFAULT 0");
      addCol("Courses", "individual_class_booking_enabled", "INTEGER DEFAULT 0");
      addCol("Courses", "individual_class_credit_cost", "INTEGER DEFAULT 0");
      addCol("Courses", "individual_class_duration_minutes", "INTEGER DEFAULT 30");
      addCol("Courses", "seo_title_en", "TEXT");
      addCol("Courses", "seo_title_hi", "TEXT");
      addCol("Courses", "seo_description_en", "TEXT");
      addCol("Courses", "seo_description_hi", "TEXT");
      addCol("Courses", "seo_keywords_en", "TEXT");
      addCol("Courses", "seo_keywords_hi", "TEXT");
      addCol("Courses", "category_id", "TEXT");
      addCol("Courses", "title_hi", "TEXT");
      addCol("Courses", "description_hi", "TEXT");
      addCol("Courses", "price_inr", "INTEGER DEFAULT 0");
      addCol("Courses", "price_usd", "INTEGER DEFAULT 0");

      // 4. Batches
      addCol("Batches", "self_study_group_enabled", "INTEGER DEFAULT 1");
      addCol("Batches", "group_class_credit_cost", "INTEGER DEFAULT 0");
      addCol("Batches", "credit_deduction_timing", "TEXT DEFAULT 'on_join'");
      addCol("Batches", "class_start_time", "TEXT");
      addCol("Batches", "class_end_time", "TEXT");
      addCol("Batches", "class_days", "TEXT");
      addCol("Batches", "name_hi", "TEXT");
      addCol("Batches", "description_en", "TEXT");
      addCol("Batches", "description_hi", "TEXT");
      addCol("Batches", "seo_json", "TEXT");

      // 5. Transactions (Standard part)
      addCol("Transactions", "amount_paise", "INTEGER");
      addCol("Transactions", "amount_inr", "INTEGER");
      addCol("Transactions", "credit_type", "TEXT DEFAULT 'ai'");
      addCol("Transactions", "payment_source", "TEXT DEFAULT 'razorpay'");
      addCol("Transactions", "related_id", "TEXT");

      // 6. Subscriptions
      addCol("Subscriptions", "live_class_credits", "INTEGER DEFAULT 0");
      addCol("Subscriptions", "is_lifetime", "INTEGER DEFAULT 0");

      // 7. FormTemplates
      addCol("FormTemplates", "confirmation_email_body", "TEXT");
      addCol("FormTemplates", "theme_json", "TEXT");
      addCol("FormTemplates", "linked_course_id", "TEXT");
      addCol("FormTemplates", "linked_batch_id", "TEXT");
      addCol("FormTemplates", "auto_enroll", "INTEGER DEFAULT 0");
      addCol("FormTemplates", "eligibility_criteria", "TEXT");
      addCol("FormTemplates", "teacher_id", "TEXT");

      // 8. LiveSessions
      addCol("LiveSessions", "title", "TEXT");
      addCol("LiveSessions", "batch_id", "TEXT");
      addCol("LiveSessions", "recording_id", "TEXT");
      addCol("LiveSessions", "recording_status", "TEXT DEFAULT 'pending'");
      addCol("LiveSessions", "is_free", "INTEGER DEFAULT 0");

      // 9. Enrollments
      addCol("Enrollments", "progress", "INTEGER NOT NULL DEFAULT 0");
      addCol("Enrollments", "batch_id", "TEXT");
      addCol("Enrollments", "certificate_eligible", "INTEGER DEFAULT 0");
      addCol("Enrollments", "payment_status", "TEXT DEFAULT 'pending'");
      addCol("Enrollments", "amount_paid", "INTEGER DEFAULT 0");
      addCol("Enrollments", "payment_source", "TEXT");
      addCol("Enrollments", "payment_id", "TEXT");

      // 10. Lessons
      addCol("Lessons", "chapter_title", "TEXT DEFAULT 'General'");
      addCol("Lessons", "text_content", "TEXT");
      addCol("Lessons", "text_content_hi", "TEXT");
      addCol("Lessons", "is_free", "INTEGER DEFAULT 0");
      addCol("Lessons", "batch_id", "TEXT REFERENCES Batches(id) ON DELETE SET NULL");
      addCol("Lessons", "recording_url", "TEXT");

      // 11. ChatHistory
      addCol("ChatHistory", "session_id", "TEXT");

      // 12. Users
      const userColumns = [
        "full_name", "phone", "district", "state", "country", "birth_date",
        "father_name", "mother_name", "grand_father_name", "pincode",
        "pin_code", "gender", "bio", "birth_place", "education",
        "diksha", "address", "current_session_id"
      ];
      userColumns.forEach(col => addCol("Users", col, "TEXT"));

      // Execute all simple ADD COLUMN migrations in one batch
      if (migrationStatements.length > 0) {
        await env.DB.batch(migrationStatements);
      }

      // Special handling for index fixes
      try {
        await env.DB.prepare(`DROP INDEX IF EXISTS idx_enrollments_user_course;`).run();
        await env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_user_course ON Enrollments(user_id, course_id);`).run();
      } catch (e) { }

      // --- Complex Migrations (Table Swaps) ---

      // A. Transactions NOT NULL migration
      const transCols = tableRawInfoMap["Transactions"];
      const amountColumn = transCols.find((c) => c.name === "amount");
      if (amountColumn && amountColumn.notnull === 1) {
        const hasAmountPaise = transCols.some((c) => c.name === "amount_paise");
        const hasAmountInr = transCols.some((c) => c.name === "amount_inr");
        const hasCreditType = transCols.some((c) => c.name === "credit_type");

        console.log("Migrating Transactions table to remove NOT NULL constraint from amount...");
        await env.DB.batch([
          env.DB.prepare("ALTER TABLE Transactions RENAME TO Transactions_Old"),
          env.DB.prepare(`
            CREATE TABLE Transactions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              amount INTEGER,
              amount_paise INTEGER,
              amount_inr INTEGER,
              currency TEXT DEFAULT 'INR',
              type TEXT NOT NULL,
              status TEXT NOT NULL,
              razorpay_order_id TEXT,
              razorpay_payment_id TEXT,
              razorpay_signature TEXT,
              payment_source TEXT DEFAULT 'razorpay',
              related_id TEXT,
              credits_added INTEGER,
              credit_type TEXT DEFAULT 'ai',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
            )
          `),
          env.DB.prepare(`
            INSERT INTO Transactions (
              id, user_id, amount, amount_paise, amount_inr, currency, type, status,
              razorpay_order_id, razorpay_payment_id, razorpay_signature,
              payment_source, related_id, credits_added, credit_type, created_at
            )
            SELECT
              id, user_id, amount,
              ${hasAmountPaise ? "amount_paise" : "amount"},
              ${hasAmountInr ? "amount_inr" : "amount / 100"},
              currency, type, status,
              razorpay_order_id, razorpay_payment_id, razorpay_signature,
              payment_source, related_id, credits_added,
              ${hasCreditType ? "credit_type" : "'ai'"},
              created_at
            FROM Transactions_Old
          `),
          env.DB.prepare("DROP TABLE Transactions_Old"),
        ]);
      }
    } catch (e) {
      console.error("Optimized migration error:", e);
    }

    // --- LESSONS CHECK CONSTRAINT MIGRATION ---
    // SQLite doesn't allow ALTER TABLE to drop/change CHECK constraints.
    // If the schema shows the old constraint missing 'recording', we must migrate the table.
    try {
      // Recovery mechanism: If Lessons_Old_Migration exists, it means a previous migration failed.
      const oldMigrationExists = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Lessons_Old_Migration'",
      ).first();
      if (oldMigrationExists) {
        console.log("Recovering from previous failed migration...");
        try {
          await env.DB.prepare(
            `INSERT OR IGNORE INTO Lessons (id, course_id, batch_id, chapter_title, title, type, content_url, recording_url, order_index, is_free, created_at, text_content, text_content_hi) SELECT id, course_id, batch_id, chapter_title, title, type, content_url, recording_url, order_index, is_free, created_at, text_content, text_content_hi FROM Lessons_Old_Migration`,
          ).run();
          // Only drop if the insert succeeds
          await env.DB.prepare("DROP TABLE Lessons_Old_Migration").run();
        } catch (e) {
          console.error("Recovery failed, preserving Lessons_Old_Migration", e);
        }
      }

      const lessonsSchema = await env.DB.prepare(
        "SELECT sql FROM sqlite_schema WHERE name='Lessons'",
      ).first();
      if (
        lessonsSchema &&
        lessonsSchema.sql &&
        typeof lessonsSchema.sql === "string" &&
        !lessonsSchema.sql.includes("'recording'")
      ) {
        console.log(
          "Migrating Lessons table to support 'recording' and 'audio' types...",
        );
        // Create new table, copy data, drop old, rename new. This is safer than renaming the old table first.
        await env.DB.batch([
          env.DB.prepare(
            `CREATE TABLE Lessons_New (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, batch_id TEXT, chapter_title TEXT DEFAULT 'General', title TEXT NOT NULL, type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording', 'audio')) NOT NULL, content_url TEXT, recording_url TEXT, order_index INTEGER NOT NULL, is_free INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, text_content TEXT, text_content_hi TEXT, FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE, FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL)`,
          ),
          env.DB.prepare(
            `INSERT INTO Lessons_New (id, course_id, batch_id, chapter_title, title, type, content_url, recording_url, order_index, is_free, created_at, text_content, text_content_hi) SELECT id, course_id, batch_id, chapter_title, title, type, content_url, recording_url, order_index, is_free, created_at, text_content, text_content_hi FROM Lessons`,
          ),
          env.DB.prepare("DROP TABLE Lessons"),
          env.DB.prepare("ALTER TABLE Lessons_New RENAME TO Lessons"),
          env.DB.prepare(
            `CREATE INDEX IF NOT EXISTS idx_lessons_course ON Lessons(course_id)`,
          ),
        ]);
        console.log("Lessons table migrated successfully.");
      }

      // Fix broken foreign keys caused by previous RENAME table operations
      const clSchema = await env.DB.prepare(
        "SELECT sql FROM sqlite_schema WHERE name='CompletedLessons'",
      ).first();
      if (
        clSchema &&
        clSchema.sql &&
        typeof clSchema.sql === "string" &&
        clSchema.sql.includes("Lessons_Old_Migration")
      ) {
        console.log("Fixing CompletedLessons foreign keys...");
        await env.DB.batch([
          env.DB.prepare(
            "CREATE TABLE CompletedLessons_New (user_id TEXT NOT NULL, lesson_id TEXT NOT NULL, completed_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, lesson_id), FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE, FOREIGN KEY (lesson_id) REFERENCES Lessons(id) ON DELETE CASCADE)",
          ),
          env.DB.prepare(
            "INSERT OR IGNORE INTO CompletedLessons_New SELECT * FROM CompletedLessons",
          ),
          env.DB.prepare("DROP TABLE CompletedLessons"),
          env.DB.prepare(
            "ALTER TABLE CompletedLessons_New RENAME TO CompletedLessons",
          ),
        ]);
      }
    } catch (e) {
      console.error("Failed to migrate Lessons table constraint:", e);
    }


    // Execute schema queries
    await env.DB.batch(schemaQueries.map((q) => env.DB.prepare(q)));

    // 2. Auto-Seeding (if no users currently exist)
    const userCheck: any = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM Users",
    ).first();
    if (userCheck && userCheck.count === 0) {
      console.log("[Auto-Migration] No users found. Seeding database...");

      const adminId = await generateStudentId(env.DB, "IN", "XX", "Admin");
      const teacherId = await generateStudentId(env.DB, "IN", "XX", "Teacher");
      const studentId = await generateStudentId(env.DB, "IN", "XX", "Student");

      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO Users (id, email, role) VALUES (?, ?, ?)",
        ).bind(adminId, "admin@edtech.com", "admin"),
        env.DB.prepare(
          "INSERT INTO Users (id, email, role) VALUES (?, ?, ?)",
        ).bind(teacherId, "teacher@edtech.com", "teacher"),
        env.DB.prepare(
          "INSERT INTO Users (id, email, role) VALUES (?, ?, ?)",
        ).bind(studentId, "student@edtech.com", "student"),
      ]);

      const courseId = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO Courses (id, title, description, teacher_id, price) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(
          courseId,
          "Advanced Cloudflare Workers",
          "Learn edge computing fundamentals & build scalable logic.",
          teacherId,
          4900,
        )
        .run();

      // Seed Admission Form
      const formId = crypto.randomUUID();
      const fields = [
        {
          name: "student_name",
          label: "पूरा नाम",
          type: "text",
          required: true,
        },
        { name: "email", label: "ईमेल पता", type: "email", required: true },
        {
          name: "course_choice",
          label: "पाठ्यक्रम का चुनाव",
          type: "select",
          options: ["एडवांस योग", "वैदिक दर्शन", "पंडित कर्मकांड"],
          required: true,
        },
        {
          name: "reason",
          label: "प्रवेश का कारण",
          type: "textarea",
          required: true,
        },
      ];
      const seo = {
        title: "प्रवेश फॉर्म | यज्ञ आश्रम",
        description: "सभी पाठ्यक्रमों के लिए ऑनलाइन प्रवेश फॉर्म भरें।",
      };
      await env.DB.prepare(
        "INSERT INTO FormTemplates (id, slug, title, description, fields_json, seo_json) VALUES (?, ?, ?, ?, ?, ?)",
      )
        .bind(
          formId,
          "admission-form",
          "पाठ्यक्रम प्रवेश फॉर्म (Course Admission)",
          "सभी पाठ्यक्रमों के लिए ऑनलाइन आवेदन करें।",
          JSON.stringify(fields),
          JSON.stringify(seo),
        )
        .run();
    }

    _dbInitialized = true;
  } catch (error) {
    console.error("Auto-Migration / Seed Error:", error);
  }
}

// --- AI Gateway Integration ---

export function sanitizeJson(text: string): string {
  if (!text) return "{}";

  // Replace smart/curly quotes with standard quotes
  let sanitized = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');

  // Remove markdown blocks
  sanitized = sanitized
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Extract JSON string
  const firstBrace = sanitized.indexOf("{");
  const lastBrace = sanitized.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    sanitized = sanitized.substring(firstBrace, lastBrace + 1);
  }

  // Safest for AI output that is just simple JSON is to remove newlines completely.
  sanitized = sanitized
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\t/g, " ");
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  return sanitized;
}

export async function generateAIContent(
  messages: any[],
  env: Env,
  forceJson: boolean = false,
): Promise<string> {
  const accountId = await getSecret(env, "CLOUDFLARE_ACCOUNT_ID");
  const cfToken = await getSecret(env, "CLOUDFLARE_API_TOKEN");
  const aigToken = (await getSecret(env, "CF_AIG_TOKEN")) || cfToken;
  const gatewayId = (await getSecret(env, "AI_GATEWAY_ID")) || "vertexai";

  const model = "dynamic/ya-lms";

  if (!accountId || !aigToken || aigToken === "null") {
    throw new Error("AI Setup Incomplete: Missing Cloudflare Credentials.");
  }

  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat/chat/completions`;

  const body: any = {
    model: model,
    messages: messages,
    max_tokens: 4000,
  };
  if (forceJson) body.response_format = { type: "json_object" };

  try {
    const gRes = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "cf-aig-authorization": `Bearer ${aigToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    let resText = await gRes.text();

    if (!gRes.ok) {
      // Fallback: If dynamic/ya-lms fails, try a specific stable model directly
      console.warn(
        `Gateway dynamic/ya-lms failed (Status: ${gRes.status}). Retrying with explicit model...`,
      );
      body.model = "@cf/meta/llama-3-8b-instruct"; // Fallback to older Llama 3 if 3.1 fails
      const retryRes = await fetch(gatewayUrl, {
        method: "POST",
        headers: {
          "cf-aig-authorization": `Bearer ${aigToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      resText = await retryRes.text();
      if (!retryRes.ok) throw new Error(`AI Gateway retry failed: ${resText}`);
    }

    if (!resText || resText.trim() === "") {
      throw new Error(`Gateway returned EMPTY response for ${model}`);
    }

    try {
      const aiResponse = JSON.parse(resText);
      // Handle standard OpenAI-like response
      if (aiResponse.choices?.[0]?.message?.content) {
        let content = aiResponse.choices[0].message.content;
        return forceJson ? sanitizeJson(content) : content;
      }
      // Handle direct string responses if gateway simplifies it
      if (typeof aiResponse === "string")
        return forceJson ? sanitizeJson(aiResponse) : aiResponse;

      throw new Error("JSON parsed but structure unknown");
    } catch (parseError) {
      // If parsing fails but we have text, and we're not forced into JSON, return as is
      if (!forceJson && resText) return resText;
      throw new Error(
        `Gateway returned non-JSON structure for ${model}: ${resText.substring(0, 100)}`,
      );
    }
  } catch (e: any) {
    throw new Error(`AI Gateway Request Failed: ${e.message}`);
  }
}

async function fetchAIStream(messages: any[], env: Env): Promise<Response> {
  const accountId = await getSecret(env, "CLOUDFLARE_ACCOUNT_ID");
  const cfToken = await getSecret(env, "CLOUDFLARE_API_TOKEN");
  const aigToken = (await getSecret(env, "CF_AIG_TOKEN")) || cfToken;
  const gatewayId = (await getSecret(env, "AI_GATEWAY_ID")) || "vertexai";

  const model = "dynamic/ya-lms";
  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/compat/chat/completions`;

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "cf-aig-authorization": `Bearer ${aigToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      stream: true,
      max_tokens: 4000,
      messages: messages,
    }),
  });

  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

// --- AI Assistant Helpers ---

async function getAIGlobalContext(
  env: Env,
  role: string,
  userId: string | null,
  prompt: string,
  lessonId?: string,
) {
  try {
    let context = "";
    if (role === "admin") {
      const stats = (await env.DB.prepare(
        `
        SELECT 
          (SELECT COUNT(*) FROM Users) as user_count,
          (SELECT COUNT(*) FROM Courses) as course_count,
          (SELECT COUNT(*) FROM Enrollments) as enroll_count
      `,
      ).first()) as any;

      const recentEnrollments = await env.DB.prepare(
        `
        SELECT u.email, c.title as course, e.progress, e.purchased_at
        FROM Enrollments e 
        JOIN Users u ON e.user_id = u.id 
        JOIN Courses c ON e.course_id = c.id
        ORDER BY e.purchased_at DESC LIMIT 5
      `,
      ).all();

      const courseList = await env.DB.prepare(
        "SELECT id, title FROM Courses",
      ).all();

      context = `
[ADMIN CONTEXT]
Stats: ${stats.user_count} users, ${stats.course_count} courses, ${stats.enroll_count} enrollments.
Recent Activity: ${JSON.stringify(recentEnrollments.results)}
Courses: ${JSON.stringify(courseList.results)}

Actions:
1. create_course: { title, description, price, category_id? }
2. edit_course: { id, title?, description?, price?, category_id? }
3. delete_course: { id }
4. add_lesson: { course_id, chapter_title, title, type, content_url, text_content, text_content_hi }
5. edit_lesson: { lesson_id, title?, chapter_title?, type?, content_url?, text_content?, text_content_hi? }
6. delete_lesson: { lesson_id }
7. add_student: { email, full_name? }
8. edit_student: { email, full_name?, role? }
9. delete_student: { email }
10. assign_course: { email, course_id, batch_id? }
11. delete_enrollment: { email, course_id }
12. get_student_details: { email }
13. query_users: { filter: 'all' | 'enrolled_all' | 'enrolled_course' | 'subscribers', course_id?: string }
14. bulk_draft_email: { recipients: string[], subject: string, body: string, isHtml: boolean }
15. create_form_and_draft_email: { form_title, form_description, form_fields_json, to, subject, email_body, theme?, confirmation_email_body? }
16. get_detailed_stats: {}
17. read_lesson: { lesson_id }
18. send_email: { to, subject, body, isHtml }
`;
    } else if (userId) {
      const user = (await env.DB.prepare("SELECT * FROM Users WHERE id = ?")
        .bind(userId)
        .first()) as any;
      const enrollments = await env.DB.prepare(
        `
        SELECT c.id as course_id, c.title, e.progress, e.status
        FROM Enrollments e 
        JOIN Courses c ON e.course_id = c.id 
        WHERE e.user_id = ?
      `,
      )
        .bind(userId)
        .all();

      const library = await env.DB.prepare(
        "SELECT id, title, price FROM Courses",
      ).all();
      const recentNotifications = await env.DB.prepare(
        "SELECT title, message, created_at FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 3",
      )
        .bind(userId)
        .all();

      const isProfileIncomplete =
        !user?.full_name ||
        !user?.phone ||
        !user?.birth_date ||
        !user?.father_name ||
        !user?.mother_name ||
        !user?.grand_father_name;

      context = `[STUDENT PROFILE] 
Email: ${user?.email}
Name: ${user?.full_name || "N/A"}
Phone: ${user?.phone || "N/A"}
Birth Date: ${user?.birth_date || "N/A"}
Father: ${user?.father_name || "N/A"}
Mother: ${user?.mother_name || "N/A"}
Grandfather: ${user?.grand_father_name || "N/A"}
Location: ${user?.district || "N/A"}, ${user?.state || "N/A"}, ${user?.country || "IN"} (${user?.pincode || "N/A"})
Bio: ${user?.bio || "N/A"}
Joined: ${user?.created_at}
[PROFILE STATUS] ${isProfileIncomplete ? "INCOMPLETE - Please ask the user to fill their profile details." : "COMPLETE"}
[STUDENT ENROLLMENTS] ${JSON.stringify(enrollments.results)}
[PLATFORM CATALOG] ${JSON.stringify(library.results)}
[RECENT NOTIFICATIONS] ${JSON.stringify(recentNotifications.results)}`;

      // Deep lesson titles for enrolled courses
      for (const enrolled of (enrollments.results as any[]) || []) {
        const lessons = await env.DB.prepare(
          "SELECT id, title, type FROM Lessons WHERE course_id = ?",
        )
          .bind(enrolled.course_id)
          .all();
        context += `\n[LESSONS: ${enrolled.title}] ${JSON.stringify(lessons.results)}`;
      }
    }

    // Direct Lesson Context if provided
    if (lessonId) {
      const l = (await env.DB.prepare(
        `
        SELECT l.title, l.type, l.text_content, l.text_content_hi, l.chapter_title, c.title as course_title, c.description as course_desc
        FROM Lessons l 
        JOIN Courses c ON l.course_id = c.id 
        WHERE l.id = ?
      `,
      )
        .bind(lessonId)
        .first()) as any;

      if (l) {
        let transcript = "";
        if (l.text_content_hi && l.text_content) {
            transcript = `English: ${l.text_content.substring(0, 4000)}\nHindi: ${l.text_content_hi.substring(0, 4000)}`;
        } else {
            transcript = l.text_content ? l.text_content.substring(0, 8500) : `No transcript/summary provided for this ${l.type}. Please use the course overview to provide high-quality educational guidance.`;
        }

        context += `\n[ACTIVE LESSON CONTEXT]
Course: ${l.course_title}
Course Overview: ${l.course_desc}
Chapter: ${l.chapter_title}
Lesson Title: ${l.title}
Lesson Type: ${l.type} (Analysis Mode Active)
Content Summary/Transcript: ${transcript}

Instructions for ${l.type} Analysis:
- If Video: Explain concepts as if you've seen the lecture. Use the transcript if available.
- If PDF/Docs: Summarize the key findings or detailed sections provided in the preview.
- If Image: Describe the visual learning material based on the provided text description.
- If Article: Provide a deep-dive into the written content.
`;
      }
    }

    // Proactive Content Fetch: If prompt mentions a lesson title, pull its content (backup)
    if (!lessonId) {
      const mentionCheck = await env.DB.prepare(
        'SELECT id, title, type, text_content, text_content_hi FROM Lessons WHERE type = "article" AND text_content IS NOT NULL',
      ).all();
      for (const l of (mentionCheck.results as any[]) || []) {
        if (prompt.includes(l.title)) {
          context += `\n[CONTENT] Lesson "${l.title}" Content: ${l.text_content.substring(0, 2000)}`;
          if (l.text_content_hi) context += `\nHindi Content: ${l.text_content_hi.substring(0, 2000)}`;
        }
      }
    }

    return context;
  } catch (e) {
    return "";
  }
}

// sendEmailViaBinding removed, using safeSendEmail instead.

async function handleAdminSendEmail(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const adminId = await requireAdmin(request, env);
    const { to, subject, body, isHtml } = (await request.json()) as any;

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "To, Subject, and Body are required" }),
        { status: 400 },
      );
    }

    let textFallback = "Please view this email in an HTML compatible client.";
    let htmlContent = body;
    if (!isHtml) {
      textFallback = body;
      htmlContent = `<p>${body}</p>`;
    }
    const success = await safeSendEmail(
      env,
      to,
      subject,
      subject,
      htmlContent,
      textFallback,
    );
    if (success) {
      return new Response(
        JSON.stringify({ success: true, message: "Email sent successfully" }),
        { status: 200 },
      );
    } else {
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
      });
    }
  } catch (error) {
    return handleGlobalError(error, "Admin.SendEmail", env, request);
  }
}

async function handleAdminBroadcast(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const adminId = await requireAdmin(request, env);
    const {
      target,
      targetId,
      subject,
      message,
      sendEmail,
      sendNotification,
      customEmails,
    } = (await request.json()) as any;

    if (!target || !message) {
      return new Response(
        JSON.stringify({ error: "Target and Message are required" }),
        { status: 400 },
      );
    }

    let users: { id: string | null; email: string }[] = [];
    if (target === "all") {
      const res = await env.DB.prepare(
        'SELECT id, email FROM Users WHERE role = "student"',
      ).all();
      users = res.results as any[];
    } else if (target === "course" && targetId) {
      const res = await env.DB.prepare(
        "SELECT DISTINCT u.id, u.email FROM Users u JOIN Enrollments e ON u.id = e.user_id WHERE e.course_id = ?",
      )
        .bind(targetId)
        .all();
      users = res.results as any[];
    } else if (target === "batch" && targetId) {
      const res = await env.DB.prepare(
        "SELECT DISTINCT u.id, u.email FROM Users u JOIN Enrollments e ON u.id = e.user_id WHERE e.batch_id = ?",
      )
        .bind(targetId)
        .all();
      users = res.results as any[];
    } else if (target === "custom" && customEmails) {
      const emailsList = Array.from(
        new Set(
          customEmails
            .split(",")
            .map((e: string) => e.trim().toLowerCase())
            .filter((e: string) => e),
        ),
      ) as string[];
      if (emailsList.length > 0) {
        // Fetch users that exist to get their IDs for notifications
        // Chunk the query to avoid hitting D1 parameter limits (e.g. 100 max)
        const chunkSize = 50;
        const existingUsers = [];
        for (let i = 0; i < emailsList.length; i += chunkSize) {
          const chunk = emailsList.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => "?").join(",");
          const existingUsersQuery = `SELECT id, email FROM Users WHERE email IN (${placeholders})`;
          const res = await env.DB.prepare(existingUsersQuery)
            .bind(...chunk)
            .all();
          existingUsers.push(...(res.results as any[]));
        }

        const existingEmailMap = new Map(
          existingUsers.map((u) => [u.email, u.id]),
        );

        users = emailsList.map((email: string) => ({
          id: existingEmailMap.get(email) || null,
          email: email,
        }));
      }
    }

    if (users.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No recipients found for the selected target",
        }),
        { status: 404 },
      );
    }

    // Optimization: Use batching if sending many emails
    // For now, we loop but we should be careful with worker CPU/Timeout
    let emailCount = 0;
    let ntfCount = 0;

    for (const user of users) {
      if (sendNotification && user.id) {
        await createNotification(
          env,
          user.id,
          subject || "New Update",
          message,
          "info",
        );
        ntfCount++;
      }
      if (sendEmail && user.email) {
        // Simple plain text for now, can be improved to use HTML editor from frontend
        await safeSendEmail(
          env,
          user.email,
          subject || "Update from Adityanveshan",
          subject || "Important Update",
          `<p>${message}</p>`,
          message,
        );
        emailCount++;
      }
    }

    const id = generateCustomId("YA-BRD");
    await env.DB.prepare(
      `
      INSERT INTO BroadcastDrafts (id, subject, message, type, target_type, target_id, custom_emails, send_email, send_notification, admin_id, sent_at)
      VALUES (?, ?, ?, 'history', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    )
      .bind(
        id,
        subject || "",
        message,
        target,
        targetId || "",
        customEmails || "",
        sendEmail ? 1 : 0,
        sendNotification ? 1 : 0,
        adminId,
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Broadcast completed. Recipients: ${users.length}. Emails: ${emailCount}, Notifications: ${ntfCount}`,
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleGlobalError(error, "Admin.Broadcast", env, request);
  }
}

async function handleAdminBroadcastDrafts(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const adminId = await requireAdmin(request, env);

    if (request.method === "GET") {
      const url = new URL(request.url);
      const type = url.searchParams.get("type") || "draft"; // draft or history

      const results = await env.DB.prepare(
        "SELECT * FROM BroadcastDrafts WHERE type = ? ORDER BY created_at DESC",
      )
        .bind(type)
        .all();

      return new Response(JSON.stringify(results.results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else if (request.method === "POST") {
      const {
        subject,
        message,
        target,
        targetId,
        customEmails,
        sendEmail,
        sendNotification,
      } = (await request.json()) as any;

      if (!message) {
        return new Response(JSON.stringify({ error: "Message is required" }), {
          status: 400,
        });
      }

      const id = generateCustomId("YA-BRD");
      await env.DB.prepare(
        `
        INSERT INTO BroadcastDrafts (id, subject, message, type, target_type, target_id, custom_emails, send_email, send_notification, admin_id)
        VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)
      `,
      )
        .bind(
          id,
          subject || "",
          message,
          target || "all",
          targetId || "",
          customEmails || "",
          sendEmail ? 1 : 0,
          sendNotification ? 1 : 0,
          adminId,
        )
        .run();

      return new Response(JSON.stringify({ success: true, id }), {
        status: 200,
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  } catch (error) {
    return handleGlobalError(error, "Admin.BroadcastDrafts", env, request);
  }
}

async function handleGetEmailDrafts(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const drafts = await env.DB.prepare(
      "SELECT * FROM EmailDrafts ORDER BY created_at DESC",
    ).all();
    return new Response(JSON.stringify(drafts.results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "Admin.GetEmailDrafts", env, request);
  }
}

async function handleSaveEmailDraft(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const adminId = await requireAdmin(request, env);
    const { recipient, subject, body, is_html } = (await request.json()) as any;

    if (!recipient || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Recipient, Subject, and Body are required" }),
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO EmailDrafts (id, recipient, subject, body, is_html, admin_id) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(
        id,
        recipient,
        subject,
        body,
        is_html !== undefined ? (is_html ? 1 : 0) : 1,
        adminId,
      )
      .run();

    return new Response(JSON.stringify({ success: true, id }), { status: 201 });
  } catch (error) {
    return handleGlobalError(error, "Admin.SaveEmailDraft", env, request);
  }
}

async function handleUpdateEmailDraft(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const bodyArgs = (await request.json()) as any;

    // Convert undefined to null for D1 binding
    const recipient =
      bodyArgs.recipient !== undefined ? bodyArgs.recipient : null;
    const subject = bodyArgs.subject !== undefined ? bodyArgs.subject : null;
    const body = bodyArgs.body !== undefined ? bodyArgs.body : null;
    const is_html =
      bodyArgs.is_html !== undefined ? (bodyArgs.is_html ? 1 : 0) : null;
    const status = bodyArgs.status !== undefined ? bodyArgs.status : null;

    await env.DB.prepare(
      "UPDATE EmailDrafts SET recipient = COALESCE(?, recipient), subject = COALESCE(?, subject), body = COALESCE(?, body), is_html = COALESCE(?, is_html), status = COALESCE(?, status) WHERE id = ?",
    )
      .bind(recipient, subject, body, is_html, status, id)
      .run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return handleGlobalError(error, "Admin.UpdateEmailDraft", env, request);
  }
}

async function handleDeleteEmailDraft(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    await env.DB.prepare("DELETE FROM EmailDrafts WHERE id = ?").bind(id).run();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return handleGlobalError(error, "Admin.DeleteEmailDraft", env, request);
  }
}

async function replaceDynamicVariables(
  text: string,
  recipientEmail: string,
  env: Env,
): Promise<string> {
  if (!text) return text;

  const user = (await env.DB.prepare("SELECT * FROM Users WHERE email = ?")
    .bind(recipientEmail)
    .first()) as any;
  if (!user) return text;

  const enrollment = (await env.DB.prepare(
    `
    SELECT e.*, c.title as course_title, c.price as course_price
    FROM Enrollments e
    JOIN Courses c ON e.course_id = c.id
    WHERE e.user_id = ?
    ORDER BY e.purchased_at DESC LIMIT 1
  `,
  )
    .bind(user.id)
    .first()) as any;

  let result = text;

  const variables: Record<string, string> = {
    "{{Users.name}}": user.full_name || user.name || "Student",
    "{{Users.email}}": user.email || "",
    "{{Users.role}}": user.role || "student",
    "{{Courses.title}}": enrollment ? enrollment.course_title : "Our Course",
    "{{Courses.price}}": enrollment ? enrollment.course_price?.toString() : "",
    "{{Enrollments.progress}}": enrollment
      ? enrollment.progress?.toString()
      : "0",
  };

  for (const [key, value] of Object.entries(variables)) {
    // Escape specific regex characters in key
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    result = result.replace(new RegExp(escapedKey, "gi"), value);
  }

  const conditionMap: Record<string, boolean> = {
    "Users.isAdmin": user.role === "admin",
    "Enrollments.isComplete": enrollment ? enrollment.progress >= 100 : false,
    "Enrollments.hasStarted": enrollment ? enrollment.progress > 0 : false,
    "Enrollments.exists": !!enrollment,
  };

  for (const [cond, isTrue] of Object.entries(conditionMap)) {
    const escapedCond = cond.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(
      `\\{\\{#if\\s+${escapedCond}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`,
      "gi",
    );
    result = result.replace(regex, (match, innerText) => {
      return isTrue ? innerText : "";
    });
  }

  return result;
}

async function handleSendDraftedEmail(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const draft = (await env.DB.prepare(
      "SELECT * FROM EmailDrafts WHERE id = ?",
    )
      .bind(id)
      .first()) as any;

    if (!draft)
      return new Response(JSON.stringify({ error: "Draft not found" }), {
        status: 404,
      });
    if (draft.status === "sent")
      return new Response(JSON.stringify({ error: "Draft already sent" }), {
        status: 400,
      });

    // Split recipients by comma and trim whitespace
    const recipientList = draft.recipient
      .split(",")
      .map((r: string) => r.trim())
      .filter(Boolean);

    let allSuccessful = true;
    for (const recipient of recipientList) {
      const pSubject = await replaceDynamicVariables(
        draft.subject,
        recipient,
        env,
      );
      const pBody = await replaceDynamicVariables(draft.body, recipient, env);

      let textFallback = "Please view this email in an HTML compatible client.";
      let htmlContent = pBody;
      if (draft.is_html !== 1) {
        textFallback = pBody;
        htmlContent = `<p>${pBody}</p>`;
      }

      const success = await safeSendEmail(
        env,
        recipient,
        pSubject,
        pSubject,
        htmlContent,
        textFallback,
      );
      if (!success) {
        allSuccessful = false;
        console.error(`Failed to send email to ${recipient}`);
      }
    }

    if (allSuccessful) {
      await env.DB.prepare(
        'UPDATE EmailDrafts SET status = "sent", sent_at = CURRENT_TIMESTAMP WHERE id = ?',
      )
        .bind(id)
        .run();
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response(
        JSON.stringify({ error: "One or more email deliveries failed" }),
        { status: 500 },
      );
    }
  } catch (error) {
    return handleGlobalError(error, "Admin.SendDraftedEmail", env, request);
  }
}

async function executeAIAction(
  action: any,
  env: Env,
  adminId: string,
  reqUrl: string,
) {
  const { type, params } = action;
  try {
    switch (type) {
      case "create_course": {
        if (!params.title)
          return {
            success: false,
            message: "Missing required parameter: title",
          };
        const id = generateCustomId("YA-CRS");
        await env.DB.prepare(
          "INSERT INTO Courses (id, title, description, teacher_id, price, price_inr, price_usd, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            id,
            params.title,
            params.description ?? "",
            adminId,
            params.price_inr ?? 0,
            params.price_inr ?? 0,
            params.price_usd ?? 0,
            params.category_id ?? null,
          )
          .run();
        return {
          success: true,
          message: `Course "${params.title}" created successfully with ID ${id}. Prices: ₹${params.price_inr}, $${params.price_usd}.`,
        };
      }
      case "edit_course": {
        if (!params.id)
          return { success: false, message: "Missing required parameter: id" };
        await env.DB.prepare(
          "UPDATE Courses SET title = COALESCE(?, title), description = COALESCE(?, description), price = COALESCE(?, price), price_inr = COALESCE(?, price_inr), price_usd = COALESCE(?, price_usd), category_id = COALESCE(?, category_id) WHERE id = ?",
        )
          .bind(
            params.title ?? null,
            params.description ?? null,
            params.price_inr ?? null,
            params.price_inr ?? null,
            params.price_usd ?? null,
            params.category_id ?? null,
            params.id,
          )
          .run();
        return {
          success: true,
          message: `Course ${params.id} updated successfully.`,
        };
      }
      case "delete_course": {
        if (!params.id)
          return { success: false, message: "Missing required parameter: id" };
        await env.DB.prepare("DELETE FROM Courses WHERE id = ?")
          .bind(params.id)
          .run();
        return {
          success: true,
          message: `Course ${params.id} deleted successfully.`,
        };
      }
      case "create_batch": {
        if (!params.course_id || !params.name)
          return {
            success: false,
            message: "Missing required parameters: course_id or name",
          };
        const id = generateBatchId(params.course_id);
        await env.DB.prepare(
          "INSERT INTO Batches (id, course_id, name, start_date, end_date, status, class_start_time, class_end_time, class_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            id,
            params.course_id,
            params.name,
            params.start_date || null,
            params.end_date || null,
            params.status || "upcoming",
            params.class_start_time || null,
            params.class_end_time || null,
            params.class_days || null,
          )
          .run();
        return {
          success: true,
          message: `Batch "${params.name}" created successfully for Course ${params.course_id} with ID ${id}.`,
        };
      }
      case "edit_batch": {
        if (!params.id)
          return { success: false, message: "Missing required parameter: id" };
        await env.DB.prepare(
          "UPDATE Batches SET name = COALESCE(?, name), status = COALESCE(?, status), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date) WHERE id = ?",
        )
          .bind(
            params.name ?? null,
            params.status ?? null,
            params.start_date ?? null,
            params.end_date ?? null,
            params.id,
          )
          .run();
        return {
          success: true,
          message: `Batch ${params.id} updated successfully.`,
        };
      }
      case "add_lesson": {
        if (!params.course_id || !params.title || !params.type)
          return {
            success: false,
            message: "Missing required parameters for lesson.",
          };
        const id = generateCustomId("YA-LSN");
        await env.DB.prepare(
          "INSERT INTO Lessons (id, course_id, chapter_title, title, type, content_url, text_content, text_content_hi, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            id,
            params.course_id,
            params.chapter_title ?? "General",
            params.title,
            params.type,
            params.content_url ?? "",
            params.text_content ?? "",
            params.text_content_hi ?? "",
            0,
          )
          .run();
        return {
          success: true,
          message: `Lesson "${params.title}" added to course ${params.course_id} successfully.`,
        };
      }
      case "edit_lesson": {
        if (!params.lesson_id)
          return {
            success: false,
            message: "Missing required parameter: lesson_id",
          };
        await env.DB.prepare(
          "UPDATE Lessons SET title = COALESCE(?, title), chapter_title = COALESCE(?, chapter_title), type = COALESCE(?, type), content_url = COALESCE(?, content_url), text_content = COALESCE(?, text_content), text_content_hi = COALESCE(?, text_content_hi) WHERE id = ?",
        )
          .bind(
            params.title ?? null,
            params.chapter_title ?? null,
            params.type ?? null,
            params.content_url ?? null,
            params.text_content ?? null,
            params.text_content_hi ?? null,
            params.lesson_id,
          )
          .run();
        return {
          success: true,
          message: `Lesson ${params.lesson_id} updated successfully.`,
        };
      }
      case "delete_lesson": {
        if (!params.lesson_id)
          return {
            success: false,
            message: "Missing required parameter: lesson_id",
          };
        await env.DB.prepare("DELETE FROM Lessons WHERE id = ?")
          .bind(params.lesson_id)
          .run();
        return {
          success: true,
          message: `Lesson ${params.lesson_id} deleted successfully.`,
        };
      }
      case "save_broadcast_draft": {
        if (!params.subject || !params.message)
          return {
            success: false,
            message: "Subject and Message are required for broadcast drafts.",
          };
        const id = generateCustomId("YA-BRD");
        await env.DB.prepare(
          `
          INSERT INTO BroadcastDrafts (id, subject, message, type, target_type, target_id, custom_emails, admin_id)
          VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)
        `,
        )
          .bind(
            id,
            params.subject,
            params.message,
            params.target || "all",
            params.targetId || "",
            params.customEmails || "",
            adminId,
          )
          .run();
        return {
          success: true,
          message: `Broadcast draft saved successfully. You can find it in the Broadcast Drafts section.`,
        };
      }
      case "add_student": {
        if (!params.email)
          return {
            success: false,
            message: "Missing required parameter: email",
          };
        const lowerEmail = params.email.toLowerCase();
        const id = await generateStudentId(
          env.DB,
          "IN",
          "XX",
          params.full_name || "X",
        );
        await env.DB.prepare(
          "INSERT INTO Users (id, email, role, full_name) VALUES (?, ?, ?, ?)",
        )
          .bind(id, lowerEmail, "student", params.full_name ?? "New Student")
          .run();
        return {
          success: true,
          message: `Student ${lowerEmail} added successfully with ID ${id}.`,
        };
      }
      case "edit_student": {
        if (!params.email)
          return {
            success: false,
            message: "Missing required parameter: email",
          };
        const lowerEmail = params.email.toLowerCase();
        await env.DB.prepare(
          "UPDATE Users SET full_name = COALESCE(?, full_name), role = COALESCE(?, role) WHERE email = ?",
        )
          .bind(params.full_name ?? null, params.role ?? null, lowerEmail)
          .run();
        return {
          success: true,
          message: `Student ${lowerEmail} updated successfully.`,
        };
      }
      case "delete_student": {
        if (!params.email)
          return {
            success: false,
            message: "Missing required parameter: email",
          };
        const lowerEmail = params.email.toLowerCase();
        await env.DB.prepare("DELETE FROM Users WHERE email = ?")
          .bind(lowerEmail)
          .run();
        return {
          success: true,
          message: `Student ${lowerEmail} deleted successfully.`,
        };
      }
      case "assign_course": {
        if (!params.email || !params.course_id)
          return {
            success: false,
            message: "Missing required parameters: email or course_id",
          };
        const lowerEmail = params.email.toLowerCase();
        const user = (await env.DB.prepare(
          "SELECT id FROM Users WHERE email = ?",
        )
          .bind(lowerEmail)
          .first()) as any;
        if (!user) return { success: false, message: "User not found." };

        const existing: any = await env.DB.prepare(
          "SELECT id, batch_id FROM Enrollments WHERE user_id = ? AND course_id = ?",
        )
          .bind(user.id, params.course_id)
          .first();
        if (existing) {
          if (params.batch_id && existing.batch_id === params.batch_id) {
            return {
              success: false,
              message: "Student is already enrolled in this course and batch.",
            };
          }
          await env.DB.prepare(
            "UPDATE Enrollments SET batch_id = ? WHERE id = ?",
          )
            .bind(params.batch_id ?? null, existing.id)
            .run();
          return {
            success: true,
            message: `Student ${lowerEmail} enrollment updated for course ${params.course_id}.`,
          };
        } else {
          const id = generateCustomId("YA-ENR");
          await env.DB.prepare(
            "INSERT INTO Enrollments (id, user_id, course_id, batch_id) VALUES (?, ?, ?, ?)",
          )
            .bind(id, user.id, params.course_id, params.batch_id ?? null)
            .run();
          return {
            success: true,
            message: `Student ${lowerEmail} enrolled in course ${params.course_id}.`,
          };
        }
      }
      case "delete_enrollment": {
        if (!params.email || !params.course_id)
          return {
            success: false,
            message: "Missing required parameters: email or course_id",
          };
        const lowerEmail = params.email.toLowerCase();
        const user = (await env.DB.prepare(
          "SELECT id FROM Users WHERE email = ?",
        )
          .bind(lowerEmail)
          .first()) as any;
        if (!user) return { success: false, message: "User not found." };
        await env.DB.prepare(
          "DELETE FROM Enrollments WHERE user_id = ? AND course_id = ?",
        )
          .bind(user.id, params.course_id)
          .run();
        return {
          success: true,
          message: `Enrollment for ${lowerEmail} in course ${params.course_id} deleted.`,
        };
      }
      case "get_detailed_stats": {
        const users = await env.DB.prepare(
          "SELECT role, COUNT(*) as count FROM Users GROUP BY role",
        ).all();
        const enrollments = await env.DB.prepare(
          "SELECT c.title, COUNT(e.id) as enrolls FROM Courses c LEFT JOIN Enrollments e ON c.id = e.course_id GROUP BY c.id",
        ).all();
        return {
          success: true,
          data: {
            user_distribution: users.results,
            course_popularity: enrollments.results,
          },
        };
      }
      case "get_student_details": {
        if (!params.email)
          return {
            success: false,
            message: "Missing required parameter: email",
          };
        const lowerEmail = params.email.toLowerCase();
        const user = (await env.DB.prepare(
          "SELECT id, email, full_name, created_at FROM Users WHERE email = ?",
        )
          .bind(lowerEmail)
          .first()) as any;
        if (!user) return { success: false, message: "Student not found." };
        const progress = await env.DB.prepare(
          `
          SELECT c.title, e.progress, e.status, e.purchased_at
          FROM Enrollments e 
          JOIN Courses c ON e.course_id = c.id 
          WHERE e.user_id = ?
        `,
        )
          .bind(user.id)
          .all();
        return {
          success: true,
          data: { profile: user, enrollments: progress.results },
        };
      }
      case "read_lesson": {
        if (!params.lesson_id)
          return {
            success: false,
            message: "Missing required parameter: lesson_id",
          };
        const lesson = (await env.DB.prepare(
          "SELECT title, text_content, text_content_hi, type FROM Lessons WHERE id = ?",
        )
          .bind(params.lesson_id)
          .first()) as any;
        if (!lesson) return { success: false, message: "Lesson not found." };
        return {
          success: true,
          data: {
            title: lesson.title,
            content: lesson.text_content ?? `[${lesson.type} content]`,
            content_hi: lesson.text_content_hi ?? ``,
            type: lesson.type,
          },
        };
      }
      case "draft_email": {
        const id = generateCustomId("YA-EML");
        const recipientList = Array.isArray(params.to)
          ? params.to.join(", ")
          : (params.to ?? "");
        await env.DB.prepare(
          "INSERT INTO EmailDrafts (id, recipient, subject, body, is_html, admin_id) VALUES (?, ?, ?, ?, ?, ?)",
        )
          .bind(
            id,
            recipientList,
            params.subject ?? "",
            params.body ?? "",
            params.isHtml ? 1 : 0,
            adminId,
          )
          .run();
        return {
          success: true,
          message: "डैशबोर्ड पर ईमेल ड्राफ्ट सहेज लिया गया है।",
          draft_id: id,
        };
      }
      case "create_form_and_draft_email": {
        if (!params.form_title || !params.to)
          return {
            success: false,
            message: "Missing required parameters for form/email.",
          };
        const formId = generateCustomId("YA-FRM");
        let slugBase = params.form_title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (!slugBase || slugBase.length < 2) slugBase = "admission-form";
        const slug = `${slugBase}-${crypto.randomUUID().substring(0, 5)}`;
        const fieldsJsonStr =
          typeof params.form_fields_json === "string"
            ? params.form_fields_json
            : JSON.stringify(params.form_fields_json ?? []);
        await env.DB.prepare(
          "INSERT INTO FormTemplates (id, slug, title, description, fields_json, theme_json, confirmation_email_body, linked_course_id, linked_batch_id, auto_enroll, eligibility_criteria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            formId,
            slug,
            params.form_title,
            params.form_description ?? "",
            fieldsJsonStr,
            JSON.stringify(params.theme ?? {}),
            params.confirmation_email_body ?? null,
            params.linked_course_id ?? null,
            params.linked_batch_id ?? null,
            params.auto_enroll ?? 0,
            params.eligibility_criteria ?? null,
          )
          .run();
        const currentOrigin = new URL(reqUrl).origin;
        const formLink = `${currentOrigin}/form?slug=${slug}`;
        const finalBody = `${params.email_body ?? ""}<br/><br/><p style="text-align:center;"><a href="${formLink}" class="btn" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Fill out the Form</a></p>`;
        const draftId = generateCustomId("YA-EML");
        const recipientList = Array.isArray(params.to)
          ? params.to.join(", ")
          : (params.to ?? "");
        await env.DB.prepare(
          "INSERT INTO EmailDrafts (id, recipient, subject, body, is_html, admin_id) VALUES (?, ?, ?, ?, ?, ?)",
        )
          .bind(
            draftId,
            recipientList,
            params.subject ?? "",
            finalBody,
            1,
            adminId,
          )
          .run();
        return {
          success: true,
          message: `फॉर्म और ईमेल ड्राफ्ट सफलतापूर्वक बनाए गए। (Form Link: ${formLink})`,
        };
      }
      case "bulk_draft_email": {
        const { recipients, subject, body, isHtml } = params;
        if (!Array.isArray(recipients))
          return { success: false, message: "Recipients must be an array." };
        const queries = recipients.map((email) => {
          const id = generateCustomId("YA-EML");
          return env.DB.prepare(
            "INSERT INTO EmailDrafts (id, recipient, subject, body, is_html, admin_id) VALUES (?, ?, ?, ?, ?, ?)",
          ).bind(
            id,
            email ?? "",
            subject ?? "",
            body ?? "",
            isHtml ? 1 : 0,
            adminId,
          );
        });
        await env.DB.batch(queries);
        return {
          success: true,
          message: `${recipients.length} छात्रों के लिए ईमेल ड्राफ्ट्स सफलतापूर्वक तैयार किए गए हैं।`,
        };
      }
      case "query_users": {
        const { filter, course_id } = params;
        let results;
        if (filter === "enrolled_all") {
          results = await env.DB.prepare(
            "SELECT DISTINCT u.email, u.full_name FROM Users u JOIN Enrollments e ON u.id = e.user_id",
          ).all();
        } else if (filter === "enrolled_course" && course_id) {
          results = await env.DB.prepare(
            "SELECT u.email, u.full_name FROM Users u JOIN Enrollments e ON u.id = e.user_id WHERE e.course_id = ?",
          )
            .bind(course_id)
            .all();
        } else if (filter === "subscribers") {
          results = await env.DB.prepare(
            "SELECT email, 'Subscriber' as full_name FROM Subscribers",
          ).all();
        } else {
          results = await env.DB.prepare(
            "SELECT email, full_name FROM Users WHERE role = 'student'",
          ).all();
        }
        return {
          success: true,
          data: results.results,
          message: `Found ${results.results.length} users.`,
        };
      }
      case "send_email": {
        if (!params.to || !params.subject || !params.body)
          return { success: false, message: "Missing email parameters." };
        let textFallback =
          "Please view this email in an HTML compatible client.";
        let htmlContent = params.body;
        if (!params.isHtml) {
          textFallback = params.body;
          htmlContent = `<p>${params.body}</p>`;
        }
        const success = await safeSendEmail(
          env,
          params.to,
          params.subject,
          params.subject,
          htmlContent,
          textFallback,
        );
        return success
          ? { success: true, message: `Email sent to ${params.to}.` }
          : {
            success: false,
            message: `Failed to send email to ${params.to}.`,
          };
      }
      default:
        return { success: false, message: "Unknown action." };
    }
  } catch (e: any) {
    return { success: false, message: `Action failed: ${e.message}` };
  }
}

async function handleGetChatHistory(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const token = getCookie(request, "session");
    if (!token)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });

    const jwtSecret = await getSecret(env, "JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET missing");
    const payload = await verifyJWT(token, jwtSecret);
    const userId = payload.sub;

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    let records;
    if (sessionId) {
      records = await env.DB.prepare(
        "SELECT role, content, created_at FROM ChatHistory WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC LIMIT 50",
      )
        .bind(userId, sessionId)
        .all();
    } else {
      records = await env.DB.prepare(
        "SELECT role, content, created_at FROM ChatHistory WHERE user_id = ? ORDER BY created_at ASC LIMIT 50",
      )
        .bind(userId)
        .all();
    }

    return new Response(JSON.stringify(records.results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "AI.GetHistory", env, request);
  }
}

async function handleDeleteChatHistory(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const token = getCookie(request, "session");
    if (!token)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });

    const jwtSecret = await getSecret(env, "JWT_SECRET");
    if (!jwtSecret) throw new Error("JWT_SECRET missing");
    const payload = await verifyJWT(token, jwtSecret);
    const userId = payload.sub;

    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId");

    if (sessionId) {
      await env.DB.prepare(
        "DELETE FROM ChatHistory WHERE user_id = ? AND session_id = ?",
      )
        .bind(userId, sessionId)
        .run();
    } else {
      await env.DB.prepare("DELETE FROM ChatHistory WHERE user_id = ?")
        .bind(userId)
        .run();
    }

    return new Response(
      JSON.stringify({ success: true, message: "Chat history deleted." }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "AI.DeleteHistory", env, request);
  }
}

async function handleAIContentHelper(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    await requireAdminOrTeacher(request, env);
    const { context, type, data } = (await request.json()) as any;

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "translate") {
      systemPrompt = `You are a professional Hindi-English translator for an Vedic/Academic LMS called "Adityanveshan".
      Translate the provided English content to natural, professional Hindi. 
      Return ONLY JSON format: {"title_hi": "...", "description_hi": "..."}`;
      userPrompt = `Context: ${context}. Translate this: Title: ${data.title_en || ""}, Description: ${data.description_en || ""}`;
    } else if (type === "seo") {
      systemPrompt = `You are an SEO expert. Generate optimized SEO metadata for a ${context} on the Adityanveshan LMS.
      Provide metadata in both English and Hindi.
      Return ONLY JSON format: {
        "seo_title_en": "...", "seo_title_hi": "...",
        "seo_description_en": "...", "seo_description_hi": "...",
        "seo_keywords_en": "...", "seo_keywords_hi": "..."
      }`;
      userPrompt = `Topic: ${data.title_en || "Academic"}. Details: ${data.description_en || ""}`;
    } else {
      systemPrompt = `You are a content optimizer. Improve the provided content for better clarity and engagement.
      Return ONLY JSON format: {"description_en": "...", "description_hi": "..."}`;
      userPrompt = `Context: ${context}. Content: ${data.description_en || ""} / ${data.description_hi || ""}`;
    }

    const aiResult = await generateAIContent(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      env,
      true,
    );

    const suggestion = JSON.parse(sanitizeJson(aiResult));

    return new Response(JSON.stringify({ suggestion }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleGlobalError(error, "AI.ContentHelper", env, request);
  }
}

async function handleAIChat(request: Request, env: Env): Promise<Response> {
  try {
    const token = getCookie(request, "session");
    let role = "student";
    let userId = null;

    if (token) {
      const jwtSecret = await getSecret(env, "JWT_SECRET");
      if (!jwtSecret) throw new Error("JWT_SECRET missing");
      try {
        const payload = await verifyJWT(token, jwtSecret);
        userId = payload.sub;
        role = payload.role;
        console.log(`[AI Chat] Authenticated User: ${userId} (Role: ${role})`);
      } catch (e) {
        console.warn(
          `[AI Chat] Token validation failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    } else {
      console.warn(`[AI Chat] No session token found in cookies`);
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized. Please log in to use the AI chat." }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
      });
    }
    const userPrompt = body.prompt;
    const isTutor = body.isTutor || false;
    const lessonId = body.lessonId;

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
      });
    }

    // Save User Prompt to History
    if (userId) {
      try {
        await env.DB.prepare(
          "INSERT INTO ChatHistory (id, user_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)",
        )
          .bind(
            generateCustomId("YA-CHT"),
            userId,
            body.sessionId || null,
            "user",
            userPrompt,
          )
          .run();
      } catch (historyError) {
        console.error("[AI Chat] Failed to save user prompt:", historyError);
      }
    }

    // Credit check for students (admin/teacher bypass)
    let creditRemaining: number | undefined;
    if (userId && role === "student") {
      const creditCheck = await checkAndConsumeAICredit(userId, env);
      if (!creditCheck.allowed) {
        return new Response(
          JSON.stringify({ error: creditCheck.reason, remaining: 0 }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-AI-Credits-Remaining": "0",
            },
          },
        );
      }
      // Note: checkAndConsumeAICredit already handles updating the user's base/bonus used count in UserAICredits table.
      creditRemaining = creditCheck.remaining;
    }

    const context = await getAIGlobalContext(
      env,
      role,
      userId,
      userPrompt,
      lessonId,
    );

    let systemContext = "";
    if (isTutor) {
      systemContext = `You are "Yagya Mitra" (यज्ञ मित्र), the AI Tutor for Adityanveshan / Yagya Ashram.
ROLE: You are an intelligent tutor designed to help students learn effectively based on the course materials.

KNOWLEDGE BASE & CONTEXT:
${context}

CONVERSATIONAL PROTOCOL:
1. Speak gently, respectfully, and intelligently in Hindi or English (match the user's language).
2. If the user asks a question about the active lesson context, answer strictly based on the text context provided.
3. If the context is empty or missing, provide a general educational answer.
4. Output your response as a valid JSON object formatted exactly as: {"reply": "Your message here"}
5. DO NOT output any extra text, only valid JSON.`;
    } else if (role === "admin") {
      systemContext = `You are "Admin Intelligence OS", the elite system assistant for Adityanveshan. 
ROLE: You are helping the System Administrator manage the platform, generate reports, send emails, and manage content.

CONVERSATIONAL PROTOCOL (LIKE CHATGPT):
1. Speak naturally and conversationally, like a highly intelligent human assistant.
2. Be proactive. If a request is unclear or missing details (e.g., asked to draft an email but no recipient or topic given, or asked to create a form without specifics), ASK clarifying questions before proceeding. Do not assume.
3. If you perform an action, briefly explain what you did conversationally and ask if the admin needs anything else.
4. Keep your tone professional yet helpful and engaging.

ELECTRONIC MAIL PROTOCOL:
If requested to send an email, you MUST first draft it as HTML.
1. Draft the email for the user's review. Use clean, modern HTML with inline CSS for buttons and layout.
2. If the user asks to "create a broadcast draft", use the "save_broadcast_draft" action.
   - params: { subject, message, target: "all"|"course"|"batch"|"custom", targetId?: string, customEmails?: string }
   - Note: The message for a broadcast draft does NOT need to be full HTML, plain text with basic line breaks is preferred for the broadcast text editor.
2. For multiple users (Bulk):
   - First call "query_users" to identify the list of recipients.
   - Then call "draft_email" to create a SINGLE draft, but set the "to" parameter to a comma-separated string of ALL recipient emails. Example: "user1@abc.com, user2@abc.com"
3. Return an action of type "draft_email" with params { to, subject, body, isHtml: true }.
4. IMPORTANT: Use the EXACT recipient email(s) provided. NEVER use placeholders. If querying users, extract their emails and compile them into a comma-separated string for the "to" field.
5. IF REQUESTED to create a form for an invitation or enrollment and send it via email, use the action "create_form_and_draft_email" which generates the form and automatically appends the form link inside the drafted email body.
   - params: { form_title, form_description, form_fields_json, to, subject, email_body, confirmation_email_body, theme, linked_course_id, linked_batch_id, auto_enroll, eligibility_criteria }
   - "form_fields_json" SCHEMA (MANDATORY): [ { "name": "slug_style_id", "label": "Display Label", "type": "text|email|tel|select|textarea", "required": true, "options": ["Option1"] } ]
   - **CRITICAL**: EVERY form MUST include these fields by default unless strictly asked not to: Full Name (text), Email (email), Phone Number (tel), and Gender (select). 
   - "confirmation_email_body" (OPTIONAL): HTML content for the automatic email sent to the user after they fill out the form. Use this if the user asks for a confirmation/thank you email.
   - ENROLLMENT / ELIGIBILITY (OPTIONAL): If the admin wants to attach a course or batch to the form for auto-enrollment, set "linked_course_id" or "linked_batch_id" (use the ID if known, otherwise ask the admin), set "auto_enroll": 1, and set "eligibility_criteria" explaining how the AI should evaluate submissions (e.g., "Must be female, age 18+, interested in yoga"). If the AI evaluates them as eligible, they will be auto-enrolled. If not, they are marked pending for admin review.
6. The UI will show a rich "Real-time" preview of this HTML draft.
7. Do NOT attempt to send it immediately. The drafting process handles it.
8. For students, use a professional tonality. (Sender: Adityanveshan, om@yagyaashram.com)

STRICT OUTPUT REQUIREMENT:
You MUST output ONLY valid JSON. Absolutely NO conversational text before or after the JSON. Even if you are conversing, that conversation must be inside the "reply" field of the JSON.
FAILURE TO OUTPUT JSON WILL BREAK THE SYSTEM.

Example JSON structure:
{
  "reply": "System response in Hindi or English, conversing with the admin, explaining the draft or action, or asking clarifying questions.",
  "action": { "type": "action_name", "params": { ... } }
}

VERIFICATION STEP:
If the user asks to "create", "delete", "edit", or "add" something AND provided enough details, you MUST include the corresponding "action" in your JSON. Do not just say you did it; actually include the action. If details are missing, ask for them in the "reply" field and omit the "action".
9. SLUG RULE: When creating forms, ensure the "form_title" used for slug generation is English-friendly.
10. DYNAMIC FORM DESIGN: When calling "create_form_and_draft_email", you can specify a "theme" object to customize the form's appearance. 
    - "theme" properties: { primaryColor (hex), backgroundColor (hex), font (string), animations (boolean), glassmorphism (boolean), borderRadius (px) }.
    - Adjust the design based on the form's intent (e.g., professional for admission, vibrant for workshops, spiritual for ashram events). Use modern aesthetics (gradients, subtle 3D-like shadows).

ABOUT YAGYA ASHRAM:
- Name: Adityanveshan (यज्ञ आश्रम)
- Mission: A traditional yet modern Vedic educational institution focused on preserving Vedic wisdom, character building, and teaching modern skills like Yoga, Sanskrit, and technology.
- Values: Sanatana Dharma, discipline, selfless service (Seva), and pursuit of absolute truth (Satya).
- Location: Spiritual heart of India.
- Head/Guru: Acharya Navasanganakah.
- You should use this knowledge to answer students' queries about the ashram's philosophy and rules.
`;
    } else {
      systemContext = `You are "Yagya Mitra" (यज्ञ मित्र), the ultimate AI Academic Guide at Adityanveshan. 

CORE AUTHORITY:
You have been provided with a high-fidelity AI-generated 'Content Summary/Transcript' of the current lesson. You must treat this as your primary textbook. Your answers should be authoritative, detailed, and directly based on the specific concepts found in this analysis and the Course Overview.

KNOWLEDGE BASE & CONTEXT:
${context}

STRATEGIC TUTORING COMMANDS:
1. **Source-First Answering**: If a question is asked about the video/image/PDF, prioritize the 'Content Summary/Transcript' provided above. Even if it's a video, talk about it as if you are a master of its every second.
2. **Beyond the Content**: If the provided summary is short, use the 'Course Overview' and your own vast intelligence to expand the topic. For example, if the lesson is about "Dhyana", and the transcript is small, use the course theme to provide a deep Vedic explanation of Dhyana.
3. **Structured Mastery**: Always format your response for high readability:
   - Use bold headings for key concepts.
   - Use bullet points for steps.
   - Conclude with a "Guru Mantra" (a short piece of wisdom related to the topic).
4. **Interactive Learning**: At the end of your response, ask the student a thought-provoking question related to the lesson to keep them engaged.

TONE & STYLE:
- Language: Hindi-English mix (Hinglish/Devanagari).
- Tone: Extremely knowledgeable, encouraging, and enlightened. 
- Identity: You are not a machine; you are the digital embodiment of the Ashram's collective wisdom.

Your goal is to ensure the student feels they are receiving a premium, personalized education where the AI knows exactly what they are looking at and learning.

STRICT OUTPUT REQUIREMENT:
You MUST output ONLY valid JSON. Absolutely NO conversational text before or after the JSON. Even if you are conversing, that conversation must be inside the "reply" field of the JSON.
FAILURE TO OUTPUT JSON WILL BREAK THE SYSTEM.

Example JSON structure:
{
  "reply": "System response in Hindi or English, conversing with the student, explaining the concepts."
}
`;
    }

    const sessionId = body.sessionId;

    // Load History
    let history: any[] = [];
    if (userId && sessionId) {
      const records = await env.DB.prepare(
        "SELECT role, content FROM ChatHistory WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 10",
      )
        .bind(userId, sessionId)
        .all();
      // Reverse to get chronological order
      history = (records.results as any[]).reverse().map((r) => ({
        role: r.role === "ai" ? "assistant" : "user",
        content: r.content,
      }));
      console.log(
        `[Chat Debug] Loaded ${history.length} messages for user ${userId} in session ${sessionId}`,
      );
    } else if (userId) {
      // Fallback for older chats without session id
      const records = await env.DB.prepare(
        "SELECT role, content FROM ChatHistory WHERE user_id = ? AND session_id IS NULL ORDER BY created_at DESC LIMIT 10",
      )
        .bind(userId)
        .all();
      history = (records.results as any[]).reverse().map((r) => ({
        role: r.role === "ai" ? "assistant" : "user",
        content: r.content,
      }));
    }

    const messages = [
      { role: "system", content: systemContext },
      ...history,
      { role: "user", content: userPrompt },
    ];
    console.log(`[Chat Debug] Total messages sent to AI: ${messages.length}`);

    const isStreamRequested = request.headers.get("X-Stream") === "true";
    if (isStreamRequested) {
      return await fetchAIStream(messages, env);
    }

    // Try AI generation
    let aiContent = "";
    try {
      // We must force JSON here for students as well, because we try to parse it at line 5431
      aiContent = await generateAIContent(messages, env, true);
    } catch (aiError: any) {
      console.error("AI Gen Error:", aiError);
      return new Response(
        JSON.stringify({
          reply:
            role === "admin"
              ? `❌ AI Error: ${aiError.message}`
              : "माफ़ करें, अभी मेरा सिस्टम अद्यतन हो रहा है। (AI Setup Incomplete or Error)",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    let parsed: any = { reply: "Technical error parsing AI response." };
    try {
      const cleanedContent = sanitizeJson(aiContent);
      parsed = JSON.parse(cleanedContent);
    } catch (e) {
      parsed = { reply: aiContent };
    }

    // Process Actions if any and user is Admin
    console.log(
      `[AI Chat] Parsed Result:`,
      JSON.stringify(parsed).substring(0, 500),
    );

    if (parsed.action && role === "admin" && userId) {
      console.log(`[AI Chat] Executing Action: ${parsed.action.type}`);
      const actionResult = await executeAIAction(
        parsed.action,
        env,
        userId,
        request.url,
      );
      console.log(`[AI Chat] Action Result:`, JSON.stringify(actionResult));
      if (actionResult.success) {
        // If it was a data fetch action, we might want to re-ask AI with data,
        // but for now, we just append the success info to the reply or modify it.
        if (actionResult.data) {
          parsed.reply += `\n\n[सिस्टम डेटा]: ${Array.isArray(actionResult.data) ? actionResult.data.length : 1} रिकॉर्ड मिले।`;
        } else {
          parsed.reply += `\n\n✅ [सिस्टम]: ${actionResult.message}`;
        }
      } else {
        parsed.reply += `\n\n❌ [System Error]: ${actionResult.message}`;
      }
    }

    // Save AI Reply to History
    if (userId) {
      try {
        await env.DB.prepare(
          "INSERT INTO ChatHistory (id, user_id, session_id, role, content) VALUES (?, ?, ?, ?, ?)",
        )
          .bind(
            generateCustomId("YA-CHT"),
            userId,
            sessionId || null,
            "ai",
            parsed.reply,
          )
          .run();
      } catch (historyError) {
        console.error("[AI Chat] Failed to save AI reply:", historyError);
      }
    }

    return new Response(
      JSON.stringify({ reply: parsed.reply, action: parsed.action }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleGlobalError(error, "AI.Chat", env, request);
  }
}

async function autoAnalyzeLesson(
  env: Env,
  lessonId: string,
  type: string,
  contentUrl: string,
  title: string,
) {
  try {
    console.log(
      `[Auto-AI] Starting analysis for ${type} lesson: ${title} (${lessonId})`,
    );

    // Extract R2 key from URL (e.g., /api/media/course-id/file-name.mp4)
    const mediaPathMatch = contentUrl.match(/\/api\/media\/(.+)$/);
    if (!mediaPathMatch) {
      console.warn(`[Auto-AI] Unsupported media URL for ${lessonId}: ${contentUrl}`);
      return;
    }
    const key = decodeURIComponent(mediaPathMatch[1]);

    const objectMeta = await env.STORAGE.head(key);
    if (!objectMeta) {
      console.warn(`[Auto-AI] Object not found in storage: ${key}`);
      return;
    }

    const contentType = objectMeta.httpMetadata?.contentType || "application/octet-stream";
    const maxAnalysisBytes = 24 * 1024 * 1024;
    if (objectMeta.size > maxAnalysisBytes) {
      const message = `Media too large for single-pass AI analysis: ${key} (${objectMeta.size} bytes, ${contentType}). Use extracted/compressed audio for video lessons.`;
      console.warn(`[Auto-AI] ${message}`);
      sendRedAlert(env, "Auto-AI Media Too Large", message);
      return;
    }

    if ((type === "video" || type === "recording") && !contentType.startsWith("audio/")) {
      console.warn(
        `[Auto-AI] Skipping direct ${type} container for ${lessonId}. Waiting for extracted audio instead.`,
      );
      return;
    }

    const object = await env.STORAGE.get(key);
    if (!object) {
      console.warn(`[Auto-AI] Object disappeared from storage: ${key}`);
      return;
    }

    const buffer = await object.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    let analysis = "";
    let analysis_hi = "";

    if (type === "image") {
      console.log(`[Auto-AI] Running Vision model for ${key}`);
      const visionResponse = await env.AI.run(
        "@cf/meta/llama-3.2-11b-vision-instruct",
        {
          image: [...new Uint8Array(buffer)],
          prompt: `Describe this educational image titled "${title}" in detail for a student. Use a professional and encouraging tone. Use English language.`,
        },
      );
      analysis = visionResponse.description || visionResponse.response || "";
      const visionResponseHi = await env.AI.run(
        "@cf/meta/llama-3.2-11b-vision-instruct",
        {
          image: [...new Uint8Array(buffer)],
          prompt: `Describe this educational image titled "${title}" in detail for a student. Use a professional and encouraging tone. Use Hindi language.`,
        },
      );
      analysis_hi = visionResponseHi.description || visionResponseHi.response || "";
    } else if (type === "video" || type === "recording" || type === "audio") {
      console.log(`[Auto-AI] Running Whisper model for ${key}`);
      // Send audio data as a base64 encoded array buffer to avoid V8 Memory Limits
      const whisperResponse = await env.AI.run("@cf/openai/whisper-large-v3-turbo", {
        audio: [...new Uint8Array(buffer)],
      });
      const transcribedText = whisperResponse.text || "";

      if (transcribedText) {
        console.log(`[Auto-AI] Transcribed ${transcribedText.length} characters. Translating/Processing...`);
        try {
            const englishResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
              messages: [
                { role: "system", content: "You are a professional educational translator. Translate the following text into clear English if it is not already in English. If it is already in English, return it exactly as is, or fix any minor transcription errors." },
                { role: "user", content: transcribedText }
              ]
            }) as any;
            analysis = englishResponse.response || transcribedText;

            const hindiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
              messages: [
                { role: "system", content: "You are a professional educational translator. Translate the following text into clear Hindi if it is not already in Hindi. If it is already in Hindi, return it exactly as is, or fix any minor transcription errors. Give only the translated Hindi text." },
                { role: "user", content: transcribedText }
              ]
            }) as any;
            analysis_hi = hindiResponse.response || transcribedText;
        } catch(e) {
            console.error("[Auto-AI] Translation failed, falling back to original transcription.", e);
            analysis = transcribedText;
            analysis_hi = transcribedText; // Fallback
        }
      }
    } else if (type === "pdf") {
      // PDF analysis is harder, but we can try to extract some text or describe the intent
      analysis = `[Auto-AI Note]: Automatic text extraction for PDFs is currently limited. Please study the PDF titled "${title}" directly.`;
      analysis_hi = `[Auto-AI Note]: PDFs के लिए स्वचालित टेक्स्ट निष्कर्षण वर्तमान में सीमित है। कृपया "${title}" नामक PDF का सीधे अध्ययन करें।`;
    }

    if (analysis || analysis_hi) {
      console.log(
        `[Auto-AI] Analysis completed. Length EN: ${analysis.length}, HI: ${analysis_hi.length}. Updating DB...`,
      );
      await env.DB.prepare("UPDATE Lessons SET text_content = ?, text_content_hi = ? WHERE id = ?")
        .bind(analysis, analysis_hi, lessonId)
        .run();

      // Cleanup temporary extracted audio
      if (key.endsWith(".mp3") && key.includes("audio_")) {
        console.log(`[Auto-AI] Deleting temporary audio file: ${key}`);
        await env.STORAGE.delete(key);
      }
    }
  } catch (e: any) {
    console.error(`[Auto-AI] Failed for ${lessonId}:`, e);
    const errMessage = e.message || String(e);
    sendRedAlert(
      env,
      "Auto-AI Transcription Failed",
      `Failed to generate text content for lesson: ${title} (${lessonId}). \nType: ${type}\nError: ${errMessage}\nIf this was a video, the fallback audio extraction might have failed or the file was too large.`,
    );
  }
}

// --- Main Worker Entrypoint ---

export default {
  async email(message: any, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleInboundErrorEmail(message, env));
  },

  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Run Auto-Migration & Seed check continuously on the first request for this isolate instance
    await initDbAndSeed(env);

    const url = new URL(request.url);

    // Handle CORS preflight for all routes
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // API Routing
    if (url.pathname.startsWith("/api/")) {
      let response: Response;

      if (url.pathname.startsWith("/api/admin/error-sessions")) {
        response = await handleAdminErrorSessions(request, env);
      } else if (url.pathname.startsWith("/api/admin/subscribers")) {
        response = await handleAdminSubscribers(request, env);
      } else if (url.pathname === "/api/user/profile") {
        if (request.method === "GET")
          response = await handleGetProfile(request, env);
        else if (request.method === "POST")
          response = await handleUpdateProfile(request, env);
        else response = new Response("Method not allowed", { status: 405 });
      } else if (
        url.pathname === "/api/user/my-courses" &&
        request.method === "GET"
      )
        response = await handleGetMyCourses(request, env);
      else if (
        url.pathname === "/api/user/dashboard-data" &&
        request.method === "GET"
      )
        response = await handleGetDashboardData(request, env);
      else if (
        url.pathname === "/api/razorpay/create-credits-order" &&
        request.method === "POST"
      )
        response = await handleRazorpayCreateCreditsOrder(request, env);
      else if (
        url.pathname === "/api/razorpay/verify-credits-payment" &&
        request.method === "POST"
      )
        response = await handleRazorpayVerifyCreditsPayment(request, env);
      else if (url.pathname === "/api/credits/balance" && request.method === "GET")
        response = await handleCreditsBalance(request, env);
      else if (url.pathname === "/api/credits/ledger" && request.method === "GET")
        response = await handleCreditsLedger(request, env);
      else if (url.pathname === "/api/credits/packs" && request.method === "GET")
        response = await handleCreditPacks(request, env, false);
      else if (
        url.pathname === "/api/admin/credit-packs" ||
        url.pathname.startsWith("/api/admin/credit-packs/")
      )
        response = await handleCreditPacks(request, env, true);
      else if (url.pathname === "/api/admin/stats")
        response = await handleAdminStats(request, env);
      else if (url.pathname === "/api/admin/accounting")
        response = await handleAdminAccounting(request, env);
      else if (
        url.pathname === "/api/admin/users" ||
        url.pathname.startsWith("/api/admin/users/")
      )
        response = await handleAdminUsers(request, env);
      else if (
        url.pathname === "/api/admin/categories" ||
        url.pathname.startsWith("/api/admin/categories/")
      )
        response = await handleAdminCategories(request, env);
      else if (
        url.pathname === "/api/admin/enrollments" ||
        url.pathname.startsWith("/api/admin/enrollments/")
      )
        response = await handleAdminEnrollments(request, env);
      else if (
        url.pathname === "/api/admin/batches" ||
        url.pathname.startsWith("/api/admin/batches/")
      ) {
        // Use [^/]+ to match any batch ID format (hyphens, underscores, alphanumeric, etc.)
        const batchStudentsMatch = url.pathname.match(
          /^\/api\/admin\/batches\/([^/]+)\/students$/,
        );
        if (batchStudentsMatch) {
          // Pass both GET and POST to handleAdminBatchStudents — course_id is auto-fetched from the batch
          response = await handleAdminBatchStudents(
            request,
            env,
            decodeURIComponent(batchStudentsMatch[1]),
          );
        } else {
          response = await handleAdminBatches(request, env);
        }
      } else if (
        url.pathname === "/api/admin/form-templates" ||
        url.pathname.startsWith("/api/admin/form-templates/")
      )
        response = await handleAdminFormTemplates(request, env);
      else if (
        url.pathname === "/api/admin/form-submissions" ||
        url.pathname.startsWith("/api/admin/form-submissions/")
      )
        response = await handleAdminFormSubmissions(request, env);
      // Specific Course Sub-routes (Lessons, Live) - Check BEFORE general course routes
      else if (
        url.pathname.match(
          /^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons(\/([a-zA-Z0-9-]+))?$/,
        )
      ) {
        const match = url.pathname.match(
          /^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons(\/([a-zA-Z0-9-]+))?$/,
        );
        const courseId = match![1];
        const lessonId = match![3];

        if (request.method === "POST")
          response = await handleAdminCreateLesson(request, env, courseId, ctx);
        else if (request.method === "PUT" && lessonId)
          response = await handleAdminUpdateLesson(
            request,
            env,
            courseId,
            lessonId,
            ctx,
          );
        else if (request.method === "DELETE" && lessonId)
          response = await handleAdminDeleteLesson(
            request,
            env,
            courseId,
            lessonId,
          );
        else
          response = new Response(
            JSON.stringify({
              error: "Method not allowed or missing lesson ID",
            }),
            { status: 405 },
          );
      } else if (url.pathname === "/api/admin/merchant/settings") {
        response = await handleMerchantSettings(request, env);
      } else {
        const courseMerchantMatch = url.pathname.match(/^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/merchant$/);
        if (courseMerchantMatch) {
          response = await handleCourseMerchant(request, env, courseMerchantMatch[1]);
        } else if (
          url.pathname === "/api/admin/courses" ||
          url.pathname.match(/^\/api\/admin\/courses\/[a-zA-Z0-9-]+$/)
        ) {
          response = await handleAdminCourses(request, env);
        } else if (
          url.pathname === "/api/payments/create-order" &&
          request.method === "POST"
        )
          response = await handleCreatePaymentOrder(request, env);
        else if (
        url.pathname === "/api/payments/verify" &&
        request.method === "POST"
      )
        response = await handleVerifyPayment(request, env);
      else if (
        url.pathname === "/api/payment/webhook" &&
        request.method === "POST"
      )
        response = await handleRazorpayWebhook(request, env);
      else if (
        url.pathname.match(
          /^\/api\/admin\/subscription\/plans\/([a-zA-Z0-9-]+)\/pool$/,
        )
      ) {
        const poolPlanMatch = url.pathname.match(
          /^\/api\/admin\/subscription\/plans\/([a-zA-Z0-9-]+)\/pool$/,
        );
        response = await handleAdminPlanPool(request, env, poolPlanMatch![1]);
      } else if (
        url.pathname === "/api/admin/subscription/plans" ||
        url.pathname.startsWith("/api/admin/subscription/plans/")
      )
        response = await handleAdminSubscriptionPlans(request, env);
      else if (url.pathname === "/api/admin/emails/drafts") {
        if (request.method === "GET")
          response = await handleGetEmailDrafts(request, env);
        else if (request.method === "POST")
          response = await handleSaveEmailDraft(request, env);
        else response = new Response("Method not allowed", { status: 405 });
      } else if (url.pathname.startsWith("/api/admin/emails/drafts/")) {
        const draftIdMatch = url.pathname.match(
          /^\/api\/admin\/emails\/drafts\/([a-zA-Z0-9-]+)$/,
        );
        const draftSendMatch = url.pathname.match(
          /^\/api\/admin\/emails\/drafts\/([a-zA-Z0-9-]+)\/send$/,
        );

        if (draftSendMatch && request.method === "POST")
          response = await handleSendDraftedEmail(
            request,
            env,
            draftSendMatch[1],
          );
        else if (draftIdMatch) {
          if (request.method === "PATCH")
            response = await handleUpdateEmailDraft(
              request,
              env,
              draftIdMatch[1],
            );
          else if (request.method === "DELETE")
            response = await handleDeleteEmailDraft(
              request,
              env,
              draftIdMatch[1],
            );
          else response = new Response("Method not allowed", { status: 405 });
        } else
          response = new Response(
            JSON.stringify({ error: "Route not found" }),
            { status: 404 },
          );
      } else if (url.pathname.startsWith("/api/forms/")) {
        const slugMatch = url.pathname.match(/^\/api\/forms\/([a-zA-Z0-9-]+)$/);
        const checkMatch = url.pathname.match(
          /^\/api\/forms\/([a-zA-Z0-9-]+)\/check$/,
        );

        if (checkMatch && request.method === "GET") {
          response = await handleCheckDuplicateSubmission(
            request,
            env,
            checkMatch[1],
          );
        } else if (slugMatch) {
          if (request.method === "GET")
            response = await handleGetFormTemplate(request, env, slugMatch[1]);
          else if (request.method === "POST")
            response = await handleFormResponseSubmit(
              request,
              env,
              slugMatch[1],
            );
          else response = new Response("Method not allowed", { status: 405 });
        } else {
          response = new Response(
            JSON.stringify({ error: "Route not found" }),
            { status: 404 },
          );
        }
      } else if (url.pathname === "/api/live/signaling")
        response = await handleLiveSignaling(request, env);
      else if (url.pathname === "/api/auth/me" && request.method === "GET")
        response = await handleGetProfile(request, env);
      else if (url.pathname === "/api/auth/logout")
        response = await handleLogout(request, env);
      else if (
        url.pathname === "/api/auth/refresh" &&
        request.method === "POST"
      )
        response = await handleRefreshSession(request, env);
      else if (url.pathname === "/api/ai/history" && request.method === "GET")
        response = await handleGetChatHistory(request, env);
      else if (
        url.pathname === "/api/ai/history" &&
        request.method === "DELETE"
      )
        response = await handleDeleteChatHistory(request, env);
      else if (
        url.pathname === "/api/ai/content-helper" &&
        request.method === "POST"
      )
        response = await handleAIContentHelper(request, env);
      else if (url.pathname === "/api/subscribe" && request.method === "POST") {
        try {
          const body = (await request.json()) as { email: string };
          if (!body.email)
            response = new Response(
              JSON.stringify({ error: "Email is required" }),
              { status: 400 },
            );
          else {
            await env.DB.prepare(
              "INSERT OR IGNORE INTO Subscribers (email) VALUES (?)",
            )
              .bind(body.email)
              .run();
            response = new Response(
              JSON.stringify({
                success: true,
                message: "Subscribed successfully",
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            );
          }
        } catch (error) {
          response = await handleGlobalError(error, "Subscribe", env, request);
        }
      } else if (url.pathname === "/api/ai/token" && request.method === "GET") {
        await requireAuth(request, env);
        // Assuming user provides key in env for safety
        const geminiKey = await getSecret(env, "GEMINI_API_KEY");
        return new Response(JSON.stringify({ token: geminiKey }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else if (request.method === "POST") {
        if (url.pathname === "/api/auth/send-otp")
          response = await handleSendOTP(request, env, ctx);
        else if (url.pathname === "/api/auth/verify-otp")
          response = await handleVerifyOTP(request, env, ctx);
        else if (url.pathname === "/api/auth/register")
          response = await handleRegister(request, env, ctx);
        else if (url.pathname === "/api/notifications/read")
          response = await handleMarkNotificationRead(request, env);
        else if (url.pathname === "/api/notifications/subscribe")
          response = await handleNotificationSubscribe(request, env);
        else if (url.pathname === "/api/notifications/vapid-public-key")
          response = await handleGetVapidPublicKey(request, env);
        else if (url.pathname === "/api/notifications/unread-count")
          response = await handleGetUnreadNotificationCount(request, env);
        else if (url.pathname === "/api/dev/seed")
          response = await handleSeed(request, env);
        else if (
          url.pathname === "/api/webhooks/realtime" &&
          request.method === "POST"
        )
          response = await handleRealtimeWebhook(request, env, ctx);
        else if (url.pathname === "/api/admin/upload")
          response = await handleAdminUpload(request, env, ctx);
        else if (url.pathname === "/api/admin/generate-pdf")
          response = await handleGeneratePdf(request, env);
        else if (url.pathname === "/api/admin/send-email")
          response = await handleAdminSendEmail(request, env);
        else if (
          url.pathname === "/api/admin/broadcast" &&
          request.method === "POST"
        )
          response = await handleAdminBroadcast(request, env);
        else if (url.pathname === "/api/admin/broadcast/drafts")
          response = await handleAdminBroadcastDrafts(request, env);
        else if (
          url.pathname === "/api/report-error" &&
          request.method === "POST"
        )
          response = await handleReportError(request, env);
        else if (url.pathname === "/api/admin/actions/send-otp")
          response = await handleAdminSendActionOTP(request, env);
        else if (
          url.pathname === "/api/live/token" &&
          request.method === "POST"
        ) {
          const payload = await requireAuth(request, env);
          const { meetingId, isAI } = (await request.json()) as any;
          const user = (await env.DB.prepare(
            "SELECT full_name, role FROM Users WHERE id = ?",
          )
            .bind(payload.sub)
            .first()) as any;
          const isAdmin = user?.role === "admin" || user?.role === "teacher";

          if (!isAI && user?.role === "student") {
            const sessionResult = (await env.DB.prepare(
              "SELECT id, course_id, is_free FROM LiveSessions WHERE rtc_room_id = ?",
            )
              .bind(meetingId)
              .first()) as any;
            if (sessionResult) {
              const enrollment = (await env.DB.prepare(
                "SELECT payment_status FROM Enrollments WHERE user_id = ? AND course_id = ? AND status IN ('active', 'completed') ORDER BY purchased_at DESC LIMIT 1",
              )
                .bind(payload.sub, sessionResult.course_id)
                .first()) as any;
              const hasPaidEnrollment = enrollment?.payment_status === "paid";
              const hasSubscriptionAccess = await userHasSubscriptionCourseAccess(
                payload.sub,
                sessionResult.course_id,
                env,
              );

              if (sessionResult.is_free !== 1 && !hasPaidEnrollment && !hasSubscriptionAccess) {
                return new Response(JSON.stringify({
                  error: "COURSE_ACCESS_DENIED",
                  message: "This live session is not included in your enrollment or subscription.",
                }), {
                  status: 403,
                  headers: { "Content-Type": "application/json" },
                });
              }

              const creditGate = await chargeSelfStudyGroupClassIfNeeded(env, payload.sub, sessionResult.id);
              if (!creditGate.allowed) {
                return new Response(JSON.stringify({
                  error: "INSUFFICIENT_SELF_STUDY_CREDITS",
                  message: creditGate.message,
                  required_credits: creditGate.requiredCredits,
                  available_credits: creditGate.availableCredits,
                }), {
                  status: 402,
                  headers: { "Content-Type": "application/json" },
                });
              }
            }
          }

          const participantId = isAI ? `ai-${payload.sub}` : payload.sub;
          const participantName = isAI
            ? "Adityanveshan (AI Teacher)"
            : user?.full_name;

          const token = await getRealtimeParticipantToken(
            env,
            meetingId,
            participantId,
            participantName,
            isAdmin,
          );

          if (token && user?.role === "student") {
            const sessionResult = (await env.DB.prepare(
              "SELECT id FROM LiveSessions WHERE rtc_room_id = ?",
            )
              .bind(meetingId)
              .first()) as any;
            if (sessionResult) {
              const existing = (await env.DB.prepare(
                "SELECT id FROM Attendance WHERE session_id = ? AND user_id = ?",
              )
                .bind(sessionResult.id, payload.sub)
                .first()) as any;
              if (!existing) {
                const attId = generateCustomId("YA-ATT");
                await env.DB.prepare(
                  "INSERT OR IGNORE INTO Attendance (id, session_id, user_id) VALUES (?, ?, ?)",
                )
                  .bind(attId, sessionResult.id, payload.sub)
                  .run();
              }
            }
          }

          if (token && isAdmin) {
            // Try to fetch active recording ID for this meeting when admin joins
            ctx.waitUntil(
              (async () => {
                try {
                  const activeData = await callRealtimeAPI(
                    env,
                    `/recordings/active-recording/${meetingId}`,
                    "GET",
                    null,
                    true,
                  );
                  const recordingId =
                    (activeData as any)?.data?.id ||
                    (activeData as any)?.result?.id;
                  if (recordingId) {
                    await env.DB.prepare(
                      'UPDATE LiveSessions SET recording_id = ?, recording_status = "pending" WHERE rtc_room_id = ? AND recording_id IS NULL',
                    )
                      .bind(recordingId, meetingId)
                      .run();
                  }
                } catch (e) {
                  console.error(
                    "Failed to fetch active recording ID on join",
                    e,
                  );
                }
              })(),
            );
          }

          if (!token) {
            sendRedAlert(
              env,
              "Live Session Token Generation Failed",
              `Failed to generate a participant token for meeting ${meetingId} and user ${payload.sub}.`,
            );
            response = new Response(
              JSON.stringify({
                error: "Failed to join live session. Admin has been notified.",
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          } else {
            response = new Response(JSON.stringify({ token }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        } else if (
          url.pathname === "/api/live/leave" &&
          request.method === "POST"
        ) {
          const payload = await requireAuth(request, env);
          const { meetingId } = (await request.json()) as any;
          if (meetingId && payload.role === "student") {
            const sessionResult = (await env.DB.prepare(
              "SELECT id FROM LiveSessions WHERE rtc_room_id = ?",
            )
              .bind(meetingId)
              .first()) as any;
            if (sessionResult) {
              await env.DB.prepare(
                "UPDATE Attendance SET left_at = CURRENT_TIMESTAMP WHERE session_id = ? AND user_id = ? AND (left_at IS NULL OR left_at < CURRENT_TIMESTAMP)",
              )
                .bind(sessionResult.id, payload.sub)
                .run();
            }
          }
          response = new Response(JSON.stringify({ success: true }), {
            status: 200,
          });
        } else if (
          url.pathname === "/api/live/recording" &&
          request.method === "POST"
        )
          response = await handleRecordingAction(request, env);
        else if (url.pathname === "/api/live/end" && request.method === "POST")
          response = await handleEndLiveSession(request, env, ctx);
        else if (url.pathname === "/api/ai/chat" && request.method === "POST")
          response = await handleAIChat(request, env);
        else if (url.pathname === "/api/subscription/create")
          response = await handleCreateSubscription(request, env);
        else if (url.pathname === "/api/subscription/cancel")
          response = await handleCancelSubscription(request, env);
        else if (url.pathname === "/api/subscription/pre-select")
          response = await handleStudentPreSelect(request, env);
        else {
          const creditEnrollMatch = url.pathname.match(
            /^\/api\/courses\/([a-zA-Z0-9-]+)\/enroll-with-credits$/,
          );
          if (creditEnrollMatch)
            response = await handleEnrollWithCredits(request, env, creditEnrollMatch[1]);
          else {
            const enrollMatch = url.pathname.match(
              /^\/api\/courses\/([a-zA-Z0-9-]+)\/enroll$/,
            );
            if (enrollMatch)
              response = await handleEnroll(request, env, enrollMatch[1]);
            else {
            const progressMatch = url.pathname.match(
              /^\/api\/courses\/([a-zA-Z0-9-]+)\/progress$/,
            );
            if (progressMatch)
              response = await handleUpdateProgress(
                request,
                env,
                progressMatch[1],
              );
            else {
              const lessonCompleteMatch = url.pathname.match(
                /^\/api\/courses\/([a-zA-Z0-9-]+)\/lessons\/([a-zA-Z0-9-]+)\/complete$/,
              );
              if (lessonCompleteMatch)
                response = await handleCompleteLesson(
                  request,
                  env,
                  lessonCompleteMatch[1],
                  lessonCompleteMatch[2],
                );
              else {
                const adminLessonsMatch = url.pathname.match(
                  /^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons$/,
                );
                const adminLiveMatch = url.pathname.match(
                  /^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/live$/,
                );

                const adminLiveProcessRecordingMatch = url.pathname.match(
                  /^\/api\/admin\/live\/([a-zA-Z0-9-]+)\/process-recording$/,
                );

                if (adminLessonsMatch)
                  response = await handleAdminCreateLesson(
                    request,
                    env,
                    adminLessonsMatch[1],
                    ctx,
                  );
                else if (adminLiveMatch)
                  response = await handleAdminCreateLiveSession(
                    request,
                    env,
                    adminLiveMatch[1],
                  );
                else if (adminLiveProcessRecordingMatch)
                  response = await handleAdminProcessRecording(
                    request,
                    env,
                    adminLiveProcessRecordingMatch[1],
                    ctx,
                  );
                else if (url.pathname === "/api/admin/settings")
                  response = await handleAdminSettings(request, env);
                else
                  response = new Response(
                    JSON.stringify({ error: "Route not found" }),
                    { status: 404 },
                  );
              }
            }
          }
        }
        }
      } else if (request.method === "PUT") {
        const adminLessonPutMatch = url.pathname.match(
          /^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons\/([a-zA-Z0-9-]+)$/,
        );
        const adminLivePutMatch = url.pathname.match(
          /^\/api\/admin\/live\/([a-zA-Z0-9-]+)$/,
        );

        if (adminLessonPutMatch)
          response = await handleAdminUpdateLesson(
            request,
            env,
            adminLessonPutMatch[1],
            adminLessonPutMatch[2],
            ctx,
          );
        else if (adminLivePutMatch)
          response = await handleAdminUpdateLiveSession(
            request,
            env,
            adminLivePutMatch[1],
          );
        else
          response = new Response(
            JSON.stringify({ error: "Route not found" }),
            { status: 404 },
          );
      } else if (request.method === "DELETE") {
        const adminLessonDelMatch = url.pathname.match(
          /^\/api\/admin\/courses\/([a-zA-Z0-9-]+)\/lessons\/([a-zA-Z0-9-]+)$/,
        );
        const adminLiveDelMatch = url.pathname.match(
          /^\/api\/admin\/live\/([a-zA-Z0-9-]+)$/,
        );

        if (adminLessonDelMatch)
          response = await handleAdminDeleteLesson(
            request,
            env,
            adminLessonDelMatch[1],
            adminLessonDelMatch[2],
          );
        else if (adminLiveDelMatch)
          response = await handleAdminDeleteLiveSession(
            request,
            env,
            adminLiveDelMatch[1],
          );
        else
          response = new Response(
            JSON.stringify({ error: "Route not found" }),
            { status: 404 },
          );
      } else if (request.method === "GET" || request.method === "HEAD") {
        if (url.pathname === "/api/courses")
          response = await handleListCourses(request, env);
        else if (url.pathname === "/api/admin/broadcast/drafts")
          response = await handleAdminBroadcastDrafts(request, env);
        else if (url.pathname === "/api/live/recordings") {
          await requireAdminOrTeacher(request, env);
          response = await handleListRecordings(request, env);
        } else if (url.pathname === "/api/notifications")
          response = await handleGetNotifications(request, env);
        else if (url.pathname === "/api/payment/status")
          response = await handlePaymentStatus(request, env);
        else if (url.pathname === "/api/settings")
          response = await handleGetSettings(request, env);
        else if (url.pathname === "/api/admin/settings")
          response = await handleAdminSettings(request, env);
        else if (url.pathname === "/api/subscription/plans")
          response = await handleListSubscriptionPlans(request, env);
        else if (url.pathname === "/api/subscription/me")
          response = await handleGetUserSubscription(request, env);
        else if (url.pathname === "/api/subscription/my-selections")
          response = await handleGetMySelections(request, env);
        else if (url.pathname === "/api/subscription/ai-credits")
          response = await handleGetMyAICredits(request, env);
        else {
          const mediaMatch = url.pathname.match(/^\/api\/media\/(.+)$/);
          const lessonMatch = url.pathname.match(
            /^\/api\/lessons\/([a-zA-Z0-9-]+)$/,
          );
          if (mediaMatch)
            response = await handleServeMedia(request, env, mediaMatch[1]);
          else if (lessonMatch)
            response = await handleGetLesson(request, env, lessonMatch[1]);
          else {
            const poolMatch = url.pathname.match(
              /^\/api\/subscription\/plans\/([a-zA-Z0-9-]+)\/pool$/,
            );
            if (poolMatch)
              response = await handleStudentPlanPool(
                request,
                env,
                poolMatch[1],
              );
            else {
              const courseMatch = url.pathname.match(
                /^\/api\/courses\/([a-zA-Z0-9-]+)$/,
              );
              if (courseMatch) {
                response = await handleGetCourse(request, env, courseMatch[1]);
              } else {
                const batchesMatch = url.pathname.match(
                  /^\/api\/courses\/([a-zA-Z0-9-]+)\/batches$/,
                );
                if (batchesMatch)
                  response = await handleGetCourseBatches(
                    request,
                    env,
                    batchesMatch[1],
                  );
                else {
                  const lessonsMatch = url.pathname.match(
                    /^\/api\/courses\/([a-zA-Z0-9-]+)\/lessons$/,
                  );
                  const liveSessionsMatch = url.pathname.match(
                    /^\/api\/courses\/([a-zA-Z0-9-]+)\/live$/,
                  );

                  if (lessonsMatch)
                    response = await handleListLessons(
                      request,
                      env,
                      lessonsMatch[1],
                    );
                  else if (liveSessionsMatch)
                    response = await handleListLiveSessions(
                      request,
                      env,
                      liveSessionsMatch[1],
                    );
                  else {
                    const adminLiveDownloadRecordingMatch = url.pathname.match(
                      /^\/api\/admin\/live\/([a-zA-Z0-9-]+)\/download-recording$/,
                    );
                    if (
                      adminLiveDownloadRecordingMatch &&
                      request.method === "GET"
                    ) {
                      response = await handleAdminDownloadRecording(
                        request,
                        env,
                        adminLiveDownloadRecordingMatch[1],
                      );
                    } else {
                      response = new Response(
                        JSON.stringify({ error: "Route not found" }),
                        { status: 404 },
                      );
                    }
                  }
                }
              } // end batches else
            }
          }
        }
      } else {
        response = new Response(
          JSON.stringify({ error: "Method not allowed" }),
          { status: 405 },
        );
      }

      }

      // Final Response Security Headers
      const secureResponse = new Response(response.body, response);
      secureResponse.headers.set("X-Content-Type-Options", "nosniff");

      // Only set X-Frame-Options: DENY for HTML/main app responses, not media or iframes
      const isHtml = response.headers
        .get("Content-Type")
        ?.includes("text/html");
      if (isHtml) {
        secureResponse.headers.set("X-Frame-Options", "DENY");
      }

      secureResponse.headers.set("X-XSS-Protection", "1; mode=block");
      if (env.ENVIRONMENT === "production") {
        secureResponse.headers.set(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains; preload",
        );
      }

      return secureResponse;
    }

    // Default: Asset serving happens automatically if we don't return here
    // This allows Cloudflare Workers with Assets to serve the static frontend.
    return undefined as any;
  },
};
