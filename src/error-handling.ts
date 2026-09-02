import {
  getCookie,
  getClientIP,
  truncateText,
  truncateLongStrings,
  sha256Hex,
  generateCustomId,
  safeParseJsonValue,
  jsonResponse,
  parseRequestBody,
  sanitizeJson,
} from "./server-utils";
import type { Env } from "./server-utils";
import { HttpError, getCachedJwtSecret, verifyJWT, requireAdmin } from "./routes/auth";
import { getSecret, sendRedAlert, sendWhatsAppAlert, fetchWithTimeout } from "./email-utils";
import { generateAIContent } from "./ai-utils";

// --- Global Error Handler ---


export async function handleGlobalError(
  error: any,
  context: string,
  env: Env,
  request?: Request,
): Promise<Response> {
  console.error(`[${context}] Error:`, error);

  // Handle HttpError with explicit status code (e.g., 403 from requireAdmin)
  if (error instanceof HttpError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Do not send alerts for standard auth failures
  if (
    error?.message === "Unauthorized" ||
    error?.message === "Session Expired" ||
    error?.message === "Token expired" ||
    error?.message === "Forbidden"
  ) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error?.message === "Forbidden" ? 403 : 401,
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
        const jwtSecret = await getCachedJwtSecret(env);
        if (!jwtSecret) throw new Error("JWT_SECRET missing");
        const payload = await verifyJWT(token, jwtSecret, env.ENVIRONMENT);
        userId = payload.sub || "Unknown";
      }
    } catch (e) {
      console.error("[handleGlobalError] Failed to decode userId from token", e);
    }
  }

  // Trigger Real-time Alerts
  const errorDetails =
    error instanceof Error ? error.stack || error.message : String(error);
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  let sessionLine = "";
  let errorSessionId: string | null = null;
  let isDuplicate = false;

  try {
    const errorSession = await createErrorSessionFromPayload(env, {
      source: "worker",
      context,
      title: context,
      errorMessage,
      stackTrace: error instanceof Error ? error.stack : String(error),
      fullPayload: { url, userId, context },
      url: url !== "N/A" ? url : null,
      userId: userId !== "Guest" ? userId : null,
    });

    errorSessionId = errorSession.id;
    isDuplicate = errorSession.duplicate;

    const origin = request ? new URL(request.url).origin : "https://lms.yagyaashram.com";
    sessionLine = `Error Session: ${errorSession.id}\nAdmin Link: ${origin}/admin/error-sessions?selected=${encodeURIComponent(errorSession.id)}\nStatus: ${errorSession.duplicate ? "Duplicate captured" : "New session created, sent to Jules"}\n\n`;
  } catch (e) {
    console.error("[handleGlobalError] Failed to create error session:", e);
    sessionLine = `Status: Failed to create Error Session / send to Jules\n\n`;
  }

  const detailedMessage = `${sessionLine}URL: ${url}\nUser ID: ${userId}\nContext: ${context}\n\n${errorDetails}`;

  const tasks: Promise<any>[] = [];

  if (!isDuplicate) {
    tasks.push(sendRedAlert(env, context, detailedMessage));
    tasks.push(sendWhatsAppAlert(env, context, detailedMessage));
    if (errorSessionId) {
      tasks.push((async () => {
        try {
          await runErrorAutomation(env, errorSessionId, true);
        } catch (e) {
          console.error("[handleGlobalError] Failed to run Jules automation:", e);
        }
      })());
    }
  }

  await Promise.allSettled(tasks);

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

// In-memory rate limiting map for handleReportError (per isolate)
const reportErrorRateLimit = new Map<string, number[]>();

export async function handleReportError(
  request: Request,
  env: Env,
): Promise<Response> {
  const clientIp = getClientIP(request);
  const now = Date.now();
  const history = reportErrorRateLimit.get(clientIp) || [];
  const recentRequests = history.filter(ts => now - ts < 60000); // 1 minute window
  if (recentRequests.length >= 20) {
    return new Response(JSON.stringify({ error: "Too many error reports from this IP. Please try again later." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  recentRequests.push(now);
  reportErrorRateLimit.set(clientIp, recentRequests);

  // Memory cleanup occasionally to prevent leak
  if (reportErrorRateLimit.size > 2000) {
    const oldestKeys = Array.from(reportErrorRateLimit.keys()).slice(0, 200);
    for (const k of oldestKeys) reportErrorRateLimit.delete(k);
  }

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

    const tasks: Promise<any>[] = [];
    if (!errorSession.duplicate) {
      tasks.push(sendRedAlert(env, context, `${sessionLine}\n\n${detailedMessage}`));
      tasks.push(sendWhatsAppAlert(env, context, `${sessionLine}\n\n${detailedMessage}`));
      tasks.push(runErrorAutomation(env, errorSession.id, true));
    }
    await Promise.allSettled(tasks);

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

export async function createErrorSessionFromPayload(
  env: Env,
  input: ErrorSessionCreateInput,
): Promise<{ id: string; duplicate: boolean }> {
  // Mask dynamic numbers and UUIDs to prevent fingerprint churn
  const cleanErrorMessage = input.errorMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[UUID]")
    .replace(/\b\d+\b/g, "[NUM]");
  const normalizedMessage = truncateText(cleanErrorMessage, 4000);
  const normalizedStack = truncateText(input.stackTrace || "", 12000);

  // Use clean stack frames instead of raw trace with line numbers
  const cleanStackFrames = extractStackFiles(normalizedStack).join("|");
  const stackFingerprint = cleanStackFrames || normalizedStack.split("\n").slice(0, 8).join("\n");

  const fingerprint = await sha256Hex([
    input.source,
    input.context,
    normalizedMessage,
    stackFingerprint,
    input.url ? new URL(input.url, "https://lms.yagyaashram.com").pathname : "",
  ].join("\n---\n"));

  const existing: any = await env.DB.prepare(
    `SELECT id FROM ErrorSessions
     WHERE fingerprint = ? AND last_seen_at >= datetime('now', '-30 minutes')
     ORDER BY last_seen_at DESC LIMIT 1`,
  ).bind(fingerprint).first();

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE ErrorSessions
       SET repeat_count = COALESCE(repeat_count, 1) + 1,
           last_seen_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP,
           full_payload = ?
       WHERE id = ?`,
    ).bind(JSON.stringify(truncateLongStrings(input.fullPayload || {})), existing.id).run();
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
    JSON.stringify(truncateLongStrings(input.fullPayload || {})),
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
  const safePayload = truncateLongStrings(payload || {});
  await env.DB.prepare(
    "INSERT INTO ErrorSessionEvents (id, error_session_id, type, payload) VALUES (?, ?, ?, ?)",
  ).bind(generateCustomId("YA-EVT"), errorSessionId, type, JSON.stringify(safePayload)).run();
}

async function getErrorSessionById(env: Env, id: string): Promise<any> {
  return await env.DB.prepare("SELECT * FROM ErrorSessions WHERE id = ?").bind(id).first();
}

function buildFallbackJulesPrompt(session: any): string {
  const files = extractStackFiles(session.stack_trace || "");
  const fullPayload = session.full_payload || "No captured payload";
  return `You are Jules, working on the Yagya Ashram LMS Next.js + Cloudflare Workers repository.

Fix this production error with the smallest safe patch.

Error session: ${session.id}
Source: ${session.source}
Severity: ${session.severity}
URL: ${session.url || "N/A"}
User ID: ${session.user_id || "Guest"}
Title: ${session.title}
Email From: ${session.email_from || "N/A"}
Email Subject: ${session.email_subject || "N/A"}
Repeat Count: ${session.repeat_count || 1}
Last Seen: ${session.last_seen_at || "N/A"}

Full captured error record (do not ignore any part of this record):
--- ERROR MESSAGE START ---
${session.error_message || "N/A"}
--- ERROR MESSAGE END ---

--- STACK TRACE / DETAILS START ---
${session.stack_trace || "No stack trace"}
--- STACK TRACE / DETAILS END ---

--- FULL PAYLOAD START ---
${fullPayload}
--- FULL PAYLOAD END ---

Likely related files from stack:
${files.length ? files.map((f) => `- ${f}`).join("\n") : "- src/index.ts\n- app/**\n- components/**"}

Instructions:
1. Include the complete error context above in your investigation before changing code.
2. Identify the root cause.
3. Modify only the necessary files.
4. Preserve existing behavior and security checks.
5. Add or update tests where practical.
6. Run lint/tests and summarize results.
7. Commit the fix on the current branch.
8. At the end of your response, add a Hindi section titled "पहले क्या था और अब क्या है" that clearly explains what was wrong before and what changed now.

If the error is configuration-only, explain the missing secret/config and add safe guards where possible.`;
}

function ensurePromptHasFullErrorContext(prompt: string, fallback: string): string {
  if (prompt.includes("--- ERROR MESSAGE START ---") && prompt.includes("--- FULL PAYLOAD START ---")) {
    return prompt;
  }
  return `${prompt}

Complete captured error context from the LMS error session:
${fallback}`;
}

async function generateJulesRepairPrompt(env: Env, session: any): Promise<string> {
  const fallback = buildFallbackJulesPrompt(session);
  try {
    const aiResult = await generateAIContent([
      {
        role: "system",
        content: `You write excellent repair prompts for Jules, an autonomous coding agent. Return JSON only: {"prompt":"..."}. The prompt must be specific, safe, and actionable. Preserve the full captured error record in the prompt, including message, stack/details, and full payload. Also instruct Jules to end its response with a Hindi section named "पहले क्या था और अब क्या है" explaining the before/after.`,
      },
      {
        role: "user",
        content: fallback,
      },
    ], env, true);
    const parsed = JSON.parse(sanitizeJson(aiResult));
    return ensurePromptHasFullErrorContext(parsed.prompt || fallback, fallback);
  } catch (e) {
    console.warn("[Error Automation] AI prompt generation failed, using fallback:", e);
    return fallback;
  }
}

function parseBooleanSecret(value: string | null, fallback: boolean): boolean {
  if (value === null || value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

const JULES_CONFIG_KEYS = [
  "JULES_SOURCE_NAME",
  "JULES_STARTING_BRANCH",
  "JULES_DOMAIN_BRANCH_MAPPING",
  "JULES_AUTOMATION_MODE",
  "JULES_REQUIRE_PLAN_APPROVAL",
  "JULES_API_BASE_URL",
  "JULES_AUTO_SEND_ENABLED",
] as const;

type JulesConfigKey = typeof JULES_CONFIG_KEYS[number];

async function getJulesConfig(env: Env): Promise<Record<JulesConfigKey, string>> {
  return {
    JULES_SOURCE_NAME: (await getSecret(env, "JULES_SOURCE_NAME", false)) || "",
    JULES_STARTING_BRANCH: (await getSecret(env, "JULES_STARTING_BRANCH", false)) || "main",
    JULES_DOMAIN_BRANCH_MAPPING: (await getSecret(env, "JULES_DOMAIN_BRANCH_MAPPING", false)) || "[]",
    JULES_AUTOMATION_MODE: (await getSecret(env, "JULES_AUTOMATION_MODE", false)) || "AUTO_CREATE_PR",
    JULES_REQUIRE_PLAN_APPROVAL: (await getSecret(env, "JULES_REQUIRE_PLAN_APPROVAL", false)) || "false",
    JULES_API_BASE_URL: (await getSecret(env, "JULES_API_BASE_URL", false)) || "https://jules.googleapis.com",
    JULES_AUTO_SEND_ENABLED: (await getSecret(env, "JULES_AUTO_SEND_ENABLED", false)) || "true",
  };
}

function normalizeJulesConfigInput(body: any): Partial<Record<JulesConfigKey, string>> {
  const normalized: Partial<Record<JulesConfigKey, string>> = {};
  for (const key of JULES_CONFIG_KEYS) {
    if (body[key] !== undefined) normalized[key] = String(body[key]).trim();
  }
  if (body.sourceName !== undefined) normalized.JULES_SOURCE_NAME = String(body.sourceName).trim();
  if (body.startingBranch !== undefined) normalized.JULES_STARTING_BRANCH = String(body.startingBranch).trim() || "main";
  if (body.domainBranchMapping !== undefined) normalized.JULES_DOMAIN_BRANCH_MAPPING = String(body.domainBranchMapping).trim() || "[]";
  if (body.automationMode !== undefined) normalized.JULES_AUTOMATION_MODE = String(body.automationMode).trim() || "AUTO_CREATE_PR";
  if (body.requirePlanApproval !== undefined) normalized.JULES_REQUIRE_PLAN_APPROVAL = String(Boolean(body.requirePlanApproval));
  if (body.apiBaseUrl !== undefined) normalized.JULES_API_BASE_URL = String(body.apiBaseUrl).trim() || "https://jules.googleapis.com";
  if (body.autoSendEnabled !== undefined) normalized.JULES_AUTO_SEND_ENABLED = String(Boolean(body.autoSendEnabled));
  return normalized;
}

async function fetchJulesSources(env: Env): Promise<any> {
  const apiKey = await getSecret(env, "JULES_API_KEY", false);
  if (!apiKey) {
    return { error: "JULES_API_KEY is missing in PLATFORM_SECRETS", status: 400 };
  }

  const config = await getJulesConfig(env);
  const baseUrl = (config.JULES_API_BASE_URL || "https://jules.googleapis.com").replace(/\/$/, "");
  const sourcesByName = new Map<string, any>();
  let nextPageToken = "";
  let pageCount = 0;

  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (nextPageToken) params.set("pageToken", nextPageToken);

    const res = await fetchWithTimeout(`${baseUrl}/v1alpha/sources?${params.toString()}`, {
      headers: { "X-Goog-Api-Key": apiKey },
    }, 10000);
    const text = await res.text();
    const data = safeParseJsonValue<any>(text, { raw: text });
    if (!res.ok) return { error: "Failed to fetch Jules sources", status: res.status, details: data };

    for (const source of Array.isArray(data.sources) ? data.sources : []) {
      const sourceKey = source?.name || source?.id;
      if (sourceKey) sourcesByName.set(sourceKey, source);
    }

    nextPageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : "";
    pageCount += 1;
  } while (nextPageToken && pageCount < 100);

  return {
    sources: Array.from(sourcesByName.values()),
    nextPageToken: nextPageToken || null,
    pageCount,
  };
}

export async function handleAdminJulesConfig(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const url = new URL(request.url);
    const apiKey = await getSecret(env, "JULES_API_KEY", false);

    if (url.pathname === "/api/admin/jules/config" && request.method === "GET") {
      const config = await getJulesConfig(env);
      return jsonResponse({ config, hasApiKey: Boolean(apiKey) });
    }

    if (url.pathname === "/api/admin/jules/config" && request.method === "PUT") {
      const body = await parseRequestBody(request);
      const config = normalizeJulesConfigInput(body);
      for (const [key, value] of Object.entries(config)) {
        if (JULES_CONFIG_KEYS.includes(key as JulesConfigKey)) {
          await env.PLATFORM_SECRETS.put(key, String(value));
        }
      }
      return jsonResponse({ success: true, config: await getJulesConfig(env), hasApiKey: Boolean(apiKey) });
    }

    if (url.pathname === "/api/admin/jules/sources" && request.method === "GET") {
      const result = await fetchJulesSources(env);
      return jsonResponse(result, result.error ? (result.status || 500) : 200);
    }

    return jsonResponse({ error: "Route not found" }, 404);
  } catch (error) {
    return handleGlobalError(error, "Admin.JulesConfig", env, request);
  }
}


function encodeJulesResourcePath(resourceName: string): string {
  return resourceName.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function getJulesActivitySummary(activity: any): string {
  if (activity?.agentMessaged?.agentMessage) return String(activity.agentMessaged.agentMessage);
  if (activity?.userMessaged?.userMessage) return String(activity.userMessaged.userMessage);
  if (activity?.progressUpdated) {
    const title = activity.progressUpdated.title || "Progress updated";
    const description = activity.progressUpdated.description ? `\n${activity.progressUpdated.description}` : "";
    return `${title}${description}`;
  }
  if (activity?.planGenerated?.plan) {
    const steps = Array.isArray(activity.planGenerated.plan.steps)
      ? activity.planGenerated.plan.steps.map((step: any) => `- ${step.title || `Step ${step.index ?? ""}`}${step.description ? `: ${step.description}` : ""}`).join("\n")
      : "";
    return `Plan generated${steps ? `\n${steps}` : ""}`;
  }
  if (activity?.planApproved) return "Plan approved";
  if (activity?.sessionCompleted) return "Session completed";
  if (activity?.sessionFailed) return `Session failed${activity.sessionFailed.reason ? `: ${activity.sessionFailed.reason}` : ""}`;
  if (activity?.description) return String(activity.description);
  return JSON.stringify(activity || {});
}

async function listJulesActivities(env: Env, sessionName: string): Promise<{ activities: any[]; syncError?: any }> {
  const apiKey = await getSecret(env, "JULES_API_KEY", false);
  if (!apiKey) return { activities: [], syncError: { message: "JULES_API_KEY is missing" } };

  const config = await getJulesConfig(env);
  const baseUrl = (config.JULES_API_BASE_URL || "https://jules.googleapis.com").replace(/\/$/, "");
  const activities: any[] = [];
  let nextPageToken = "";
  let pageCount = 0;

  try {
    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (nextPageToken) params.set("pageToken", nextPageToken);
      const res = await fetchWithTimeout(`${baseUrl}/v1alpha/${encodeJulesResourcePath(sessionName)}/activities?${params.toString()}`, {
        headers: { "X-Goog-Api-Key": apiKey },
      }, 10000);
      const text = await res.text();
      const data = safeParseJsonValue<any>(text, { raw: text });
      if (!res.ok) return { activities, syncError: { status: res.status, response: data } };
      activities.push(...(Array.isArray(data.activities) ? data.activities : []));
      nextPageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : "";
      pageCount += 1;
    } while (nextPageToken && pageCount < 20);
    return { activities };
  } catch (e: any) {
    return { activities, syncError: { message: e?.message || String(e) } };
  }
}

async function syncJulesJobActivities(env: Env, job: any): Promise<{ synced: number; error?: any }> {
  const sessionName = job?.jules_session_id;
  if (!sessionName) return { synced: 0 };

  const existingEvents = await env.DB.prepare(
    "SELECT payload FROM ErrorSessionEvents WHERE error_session_id = ? AND type = 'jules_activity' LIMIT 1000",
  ).bind(job.error_session_id).all();
  const seenActivityNames = new Set<string>();
  for (const event of existingEvents.results || []) {
    const payload = safeParseJsonValue<any>((event as any).payload, {});
    const activityName = payload.julesActivityName || payload.activity?.name || payload.activity?.id;
    if (activityName) seenActivityNames.add(String(activityName));
  }

  const { activities, syncError } = await listJulesActivities(env, sessionName);
  let synced = 0;
  for (const activity of activities) {
    const activityName = activity?.name || activity?.id;
    if (!activityName || seenActivityNames.has(String(activityName))) continue;
    await appendErrorSessionEvent(env, job.error_session_id, "jules_activity", {
      jobId: job.id,
      julesSessionId: sessionName,
      julesActivityName: activityName,
      originator: activity?.originator || null,
      createTime: activity?.createTime || null,
      summary: getJulesActivitySummary(activity),
      activity,
    });
    seenActivityNames.add(String(activityName));
    synced += 1;
  }

  const existingResponse = safeParseJsonValue<any>(job.response, {});
  const jobResponsePayload = truncateLongStrings({
    ...existingResponse,
    latestActivities: activities,
    activitySyncError: syncError || null,
  });

  await env.DB.prepare(
    "UPDATE JulesJobs SET response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).bind(JSON.stringify(jobResponsePayload), job.id).run();

  return { synced, error: syncError };
}

async function syncJulesActivitiesForErrorSession(env: Env, errorSessionId: string): Promise<{ synced: number; errors: any[] }> {
  const jobs = await env.DB.prepare(
    "SELECT * FROM JulesJobs WHERE error_session_id = ? AND jules_session_id IS NOT NULL ORDER BY created_at DESC LIMIT 20",
  ).bind(errorSessionId).all();
  let synced = 0;
  const errors: any[] = [];
  for (const job of jobs.results || []) {
    const result = await syncJulesJobActivities(env, job);
    synced += result.synced;
    if (result.error) errors.push({ jobId: (job as any).id, error: result.error });
  }
  return { synced, errors };
}

async function sendPromptToJules(env: Env, errorSessionId: string, prompt: string): Promise<any> {
  const apiKey = await getSecret(env, "JULES_API_KEY", false);
  const sourceName = await getSecret(env, "JULES_SOURCE_NAME", false);
  let startingBranch = (await getSecret(env, "JULES_STARTING_BRANCH", false)) || "main";
  const automationMode = (await getSecret(env, "JULES_AUTOMATION_MODE", false)) || "AUTO_CREATE_PR";
  const requirePlanApproval = parseBooleanSecret(
    await getSecret(env, "JULES_REQUIRE_PLAN_APPROVAL", false),
    false,
  );
  const baseUrl = ((await getSecret(env, "JULES_API_BASE_URL", false)) || "https://jules.googleapis.com").replace(/\/$/, "");
  const jobId = generateCustomId("YA-JLS");

  const missingConfig = [
    !apiKey ? "JULES_API_KEY" : null,
    !sourceName ? "JULES_SOURCE_NAME" : null,
  ].filter(Boolean);

  await env.DB.prepare(
    "INSERT INTO JulesJobs (id, error_session_id, prompt, status) VALUES (?, ?, ?, ?)",
  ).bind(jobId, errorSessionId, prompt, missingConfig.length ? "awaiting_config" : "queued").run();

  if (missingConfig.length) {
    const message = `Jules API is not configured. Store ${missingConfig.join(", ")} in PLATFORM_SECRETS. Use the Jules web app Settings page for the API key and the Jules ListSources API to find the source name.`;
    await env.DB.prepare(
      "UPDATE JulesJobs SET status = ?, response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind("awaiting_config", JSON.stringify({ message, missingConfig }), jobId).run();
    await appendErrorSessionEvent(env, errorSessionId, "jules_awaiting_config", { jobId, message, missingConfig });
    return { jobId, status: "awaiting_config", message, missingConfig };
  }

  const session = await getErrorSessionById(env, errorSessionId);

  const domainMappingStr = await getSecret(env, "JULES_DOMAIN_BRANCH_MAPPING", false);
  if (domainMappingStr && session?.url) {
    try {
      const rules = JSON.parse(domainMappingStr);
      const hostname = new URL(session.url).hostname;
      for (const rule of rules) {
        if (rule.matchType === "exact" && hostname === rule.domain) {
          startingBranch = rule.branch;
          break;
        } else if (rule.matchType === "endsWith" && hostname.endsWith(rule.domain)) {
          startingBranch = rule.branch;
          break;
        }
      }
    } catch (e) {
      console.error("Failed to parse JULES_DOMAIN_BRANCH_MAPPING", e);
    }
  }
  const requestBody: any = {
    prompt,
    sourceContext: {
      source: sourceName,
      githubRepoContext: {
        startingBranch,
      },
    },
    title: `Fix LMS error: ${truncateText(session?.title || errorSessionId, 80)}`,
    requirePlanApproval,
  };

  if (automationMode && automationMode !== "AUTOMATION_MODE_UNSPECIFIED") {
    requestBody.automationMode = automationMode;
  }

  try {
    const res = await fetchWithTimeout(`${baseUrl}/v1alpha/sessions`, {
      method: "POST",
      headers: {
        "X-Goog-Api-Key": apiKey || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }, 10000);
    const responseText = await res.text();
    const responseJson = safeParseJsonValue<any>(responseText, { raw: responseText });
    const julesSessionName = responseJson.name || (responseJson.id ? `sessions/${responseJson.id}` : null);
    const status = res.ok ? "sent" : "failed";

    await env.DB.prepare(
      "UPDATE JulesJobs SET status = ?, jules_session_id = ?, response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(status, julesSessionName, JSON.stringify(truncateLongStrings({ requestBody, response: responseJson })), jobId).run();
    await appendErrorSessionEvent(env, errorSessionId, res.ok ? "jules_session_created" : "jules_failed", {
      jobId,
      status: res.status,
      requestBody,
      response: responseJson,
    });
    return {
      jobId,
      status,
      julesSessionId: julesSessionName,
      julesUrl: responseJson.url || null,
      response: responseJson,
    };
  } catch (e: any) {
    await env.DB.prepare(
      "UPDATE JulesJobs SET status = ?, response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind("failed", JSON.stringify(truncateLongStrings({ requestBody, error: e?.message || String(e) })), jobId).run();
    await appendErrorSessionEvent(env, errorSessionId, "jules_failed", { jobId, requestBody, error: e?.message || String(e) });
    return { jobId, status: "failed", error: e?.message || String(e) };
  }
}

export async function runErrorAutomation(env: Env, errorSessionId: string, forceSend = false) {
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

export async function handleAdminErrorSessions(request: Request, env: Env): Promise<Response> {
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
      await syncJulesActivitiesForErrorSession(env, id);
      const events = await env.DB.prepare(
        "SELECT * FROM ErrorSessionEvents WHERE error_session_id = ? ORDER BY created_at ASC LIMIT 300",
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

    if (request.method === "POST" && action === "sync-jules") {
      const result = await syncJulesActivitiesForErrorSession(env, id);
      await appendErrorSessionEvent(env, id, "jules_activity_sync_requested", result);
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

    if (request.method === "POST" && action === "resolve") {
      await env.DB.prepare(
        "UPDATE ErrorSessions SET status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(id).run();
      await appendErrorSessionEvent(env, id, "resolved", { by: "admin" });
      return jsonResponse({ success: true });
    }

    if (request.method === "POST" && action === "reopen") {
      await env.DB.prepare(
        "UPDATE ErrorSessions SET status = 'new', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(id).run();
      await appendErrorSessionEvent(env, id, "reopened", { by: "admin" });
      return jsonResponse({ success: true });
    }

    if (request.method === "POST" && action === "add-note") {
      const body = await parseRequestBody(request);
      const note = String(body.note || "").trim();
      if (!note) return jsonResponse({ error: "Note is required" }, 400);
      await appendErrorSessionEvent(env, id, "admin_note", { by: "admin", note });
      await env.DB.prepare(
        "UPDATE ErrorSessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(id).run();
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Route not found" }, 404);
  } catch (error) {
    return handleGlobalError(error, "Admin.ErrorSessions", env, request);
  }
}
