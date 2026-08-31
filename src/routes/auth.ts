import { z } from "zod";
import type { Env } from "../server-utils";
import {
  getCookie,
  timingSafeEqual,
  uint8ArrayToBase64Url,
  base64UrlDecodeToUint8Array,
  base64UrlDecodeToString,
} from "../server-utils";


// ─────────────────────────────────────────────────────
// Zod Schemas for Validation
// ─────────────────────────────────────────────────────
export const registerSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters long").max(15, "Phone number too long").optional().nullable(),
  otp: z.string().min(4, "OTP is required"),
  birth_date: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  grand_father_name: z.string().optional(),
  district: z.string().optional().nullable(),
  state: z.string().optional(),
  country: z.string().optional().nullable(),
  pincode: z.string().optional(),
  role: z.enum(["student", "teacher", "admin"]).default("student"),
});

/**
 * Validates registration request body against registerSchema.
 * Returns { success: true, data } or { success: false, response } (400).
 */
export async function validateRegistrationRequest(request: Request): Promise<
  { success: true; data: z.infer<typeof registerSchema> }
  | { success: false; response: Response }
> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  const result = registerSchema.safeParse(rawBody);

  if (!result.success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: "Validation failed",
          details: result.error.format(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    };
  }

  return { success: true, data: result.data };
}

/** Throw an error with an HTTP status code. */
export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

// Fixed-window rate limiter backed by D1. Returns remaining time in ms when blocked.
export async function checkRateLimit(
  db: D1Database,
  keyBase: string,
  maxAllowed: number,
  windowMinutes: number,
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const now = new Date();
  const minutes = Math.floor(now.getUTCMinutes() / windowMinutes) * windowMinutes;
  const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), minutes, 0, 0));
  const windowKey = `${keyBase}:${windowStart.toISOString()}`;
  const windowStartStr = windowStart.toISOString();

  const result: any = await db.prepare(
    `INSERT INTO RateLimits (user_id, service, window_start, window_used, rate_limit) VALUES (?, 'rate_limit', ?, 1, ?)
     ON CONFLICT(user_id, service) DO UPDATE SET window_used = window_used + 1
     RETURNING window_used`
  ).bind(windowKey, windowStartStr, maxAllowed).first();

  const windowUsed: number = (result && (result as any).window_used) ?? 1;
  if (windowUsed > maxAllowed) {
    const windowMs = windowMinutes * 60 * 1000;
    const elapsedMs = now.getTime() % windowMs;
    return { allowed: false, retryAfterMs: windowMs - elapsedMs };
  }
  return { allowed: true };
}

export async function signJWT(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };

  const encodedHeader = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(payload)));
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
  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));

  return `${dataToSign}.${encodedSignature}`;
}

export async function verifyJWT(token: string, secret: string, expectedEnv?: string): Promise<any> {
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

  const signature = base64UrlDecodeToUint8Array(encodedSignature);

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    encoder.encode(dataToSign),
  );
  if (!isValid) throw new Error("Invalid signature");

  const payload = JSON.parse(base64UrlDecodeToString(encodedPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
    throw new Error("Token expired");
  if (payload.iat && payload.iat > Math.floor(Date.now() / 1000) + 30)
    throw new Error("Token issued in the future");
  if (expectedEnv && payload.env && payload.env !== expectedEnv)
    throw new Error("Token issued for a different environment");
  return payload;
}

// --- JWT Secret Cache ---
// Cloudflare Workers isolate state persists across requests within same isolate.
// This avoids a KV read on every authenticated request (requireAuth, requireAdmin, etc.)
let _jwtSecretCache: string | null = null;
let _jwtSecretCacheExpiry = 0;
const JWT_SECRET_CACHE_TTL = 30 * 1000; // 30 seconds — shorter window to limit auth bypass risk on rotation

export async function getCachedJwtSecret(env: Env): Promise<string | null> {
  const now = Date.now();
  if (_jwtSecretCache && now < _jwtSecretCacheExpiry) return _jwtSecretCache;
  const secret = await env.PLATFORM_SECRETS.get("JWT_SECRET");
  if (secret) {
    _jwtSecretCache = secret;
    _jwtSecretCacheExpiry = now + JWT_SECRET_CACHE_TTL;
  }
  return secret;
}

export function generateSecureOTP(): string {
  const array = new Uint32Array(1);
  const maxValid = Math.floor(0xFFFFFFFF / 900000) * 900000;
  do {
    crypto.getRandomValues(array);
  } while (array[0] >= maxValid);
  return (array[0] % 900000 + 100000).toString();
}

/**
 * Centralized logic to verify and consume an OTP.
 * Returns null if successful, otherwise returns a Response with the error.
 */
export async function consumeOtp(env: Env, email: string, otp: string): Promise<Response | null> {
  const record: any = await env.DB.prepare(
    "SELECT otp, expires_at FROM OTPs WHERE email = ?",
  )
    .bind(email)
    .first();

  if (!record) {
    return new Response(JSON.stringify({ error: "Verification failed. Please request a new OTP." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const otpMatch = timingSafeEqual(String(record.otp), String(otp));
  const otpExpired = new Date(record.expires_at) < new Date();

  if (otpExpired) {
    await env.DB.prepare("DELETE FROM OTPs WHERE email = ?").bind(email).run();
    return new Response(JSON.stringify({ error: "OTP has expired. Please request a new OTP." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!otpMatch) {
    let updated: any = null;
    try {
      updated = await env.DB.prepare(
        "UPDATE OTPs SET attempts = attempts + 1 WHERE email = ? RETURNING attempts"
      ).bind(email).first();
    } catch (e: any) {
      if (e.message && e.message.includes("no column named attempts")) {
        // SECURITY FALLBACK: Delete the OTP immediately to prevent infinite brute-force guesses
        await env.DB.prepare("DELETE FROM OTPs WHERE email = ?").bind(email).run();
        return new Response(JSON.stringify({ error: "Invalid OTP. Please request a new OTP." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        throw e;
      }
    }

    if (updated && updated.attempts >= 3) {
      await env.DB.prepare("DELETE FROM OTPs WHERE email = ?").bind(email).run();
      return new Response(JSON.stringify({ error: "Too many failed attempts. Please request a new OTP." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: `Invalid OTP. You have ${3 - Number(updated?.attempts ?? 0)} attempt(s) remaining.` }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  await env.DB.prepare("DELETE FROM OTPs WHERE email = ?").bind(email).run();
  return null;
}

export async function requireAuth(
  request: Request,
  env: Env,
): Promise<{ sub: string; role: string }> {
  const token = getCookie(request, "session");
  if (!token) throw new HttpError("Unauthorized", 401);
  const jwtSecret = await getCachedJwtSecret(env);
  if (!jwtSecret) throw new HttpError("JWT_SECRET missing", 500);
  let payload: any;
  try {
    payload = await verifyJWT(token, jwtSecret, env.ENVIRONMENT);
  } catch {
    throw new HttpError("Unauthorized", 401);
  }

  if (!payload.sessionId) throw new HttpError("Session Expired", 401);
  const user: any = await env.DB.prepare(
    "SELECT current_session_id FROM Users WHERE id = ?",
  )
    .bind(payload.sub)
    .first();
  if (!user || user.current_session_id !== payload.sessionId) {
    throw new HttpError("Session Expired", 401);
  }

  return payload;
}

export async function requireAdmin(request: Request, env: Env): Promise<string> {
  const token = getCookie(request, "session");
  if (!token) throw new HttpError("Unauthorized", 401);
  const jwtSecret = await getCachedJwtSecret(env);
  if (!jwtSecret) throw new HttpError("JWT_SECRET missing", 500);
  let payload: any;
  try {
    payload = await verifyJWT(token, jwtSecret, env.ENVIRONMENT);
  } catch {
    throw new HttpError("Unauthorized", 401);
  }
  if (payload.role !== "admin") throw new HttpError("Forbidden", 403);

  // Validate session ID against DB to prevent use of invalidated/stolen tokens
  if (!payload.sessionId) throw new HttpError("Session Expired", 401);
  const user: any = await env.DB.prepare(
    "SELECT current_session_id FROM Users WHERE id = ?",
  )
    .bind(payload.sub)
    .first();
  if (!user || user.current_session_id !== payload.sessionId) {
    throw new HttpError("Session Expired", 401);
  }

  return payload.sub; // Returns admin's user ID
}

export async function requireAdminOrTeacher(
  request: Request,
  env: Env,
): Promise<{ id: string; role: string; email: string }> {
  const token = getCookie(request, "session");
  if (!token) throw new HttpError("Unauthorized", 401);
  const jwtSecret = await getCachedJwtSecret(env);
  if (!jwtSecret) throw new HttpError("JWT_SECRET missing", 500);
  let payload: any;
  try {
    payload = await verifyJWT(token, jwtSecret, env.ENVIRONMENT);
  } catch {
    throw new HttpError("Unauthorized", 401);
  }
  if (payload.role !== "admin" && payload.role !== "teacher")
    throw new HttpError("Forbidden", 403);

  // Validate session ID against DB to prevent use of invalidated/stolen tokens
  const user: any = await env.DB.prepare(
    "SELECT current_session_id, email FROM Users WHERE id = ?",
  )
    .bind(payload.sub)
    .first();

  if (!payload.sessionId) throw new HttpError("Session Expired", 401);
  if (!user || user.current_session_id !== payload.sessionId) {
    throw new HttpError("Session Expired", 401);
  }

  return { id: payload.sub, role: payload.role as string, email: user?.email || "" };
}
