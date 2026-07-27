import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VALID_SESSION_CACHE = new Map<string, number>();
const CACHE_MAX_SIZE = 5000;
const CACHE_TTL = 60_000;
const PRUNE_INTERVAL = 300_000;
let lastPrune = 0;

// JWT Secret cache — read from a build/deployment environment variable only.
// A previous implementation fetched this over an internal HTTP endpoint, which leaked
// the signing secret to anyone who discovered the path. We no longer expose JWT_SECRET
// over HTTP.
let _middlewareJwtSecret: string | null = null;
let _middlewareJwtSecretExpiry = 0;
const JWT_SECRET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function base64UrlDecodeToUint8Array(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const decoded = atob(padded);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

async function verifyJwtMiddleware(token: string, secret: Uint8Array): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    secret as Uint8Array<ArrayBuffer>,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecodeToUint8Array(encodedSignature) as Uint8Array<ArrayBuffer>,
    encoder.encode(dataToSign) as Uint8Array<ArrayBuffer>,
  );
  if (!isValid) throw new Error('Invalid signature');

  const payload = JSON.parse(
    new TextDecoder().decode(base64UrlDecodeToUint8Array(encodedPayload)),
  );
  return payload;
}

function pruneSessionCache() {
  const now = Date.now();
  for (const [key, expiry] of VALID_SESSION_CACHE) {
    if (expiry <= now) VALID_SESSION_CACHE.delete(key);
  }
  // If still over capacity, evict oldest entries. Map iteration order is insertion order.
  while (VALID_SESSION_CACHE.size > CACHE_MAX_SIZE) {
    const oldestKey = VALID_SESSION_CACHE.keys().next().value;
    if (oldestKey) VALID_SESSION_CACHE.delete(oldestKey);
  }
  lastPrune = now;
}

async function isSessionRevoked(
  sessionId: string,
  baseUrl: string,
): Promise<boolean> {
  const expiry = VALID_SESSION_CACHE.get(sessionId);
  if (expiry && expiry > Date.now()) return false;
  // Expired entry—delete to free memory
  if (expiry) VALID_SESSION_CACHE.delete(sessionId);

  try {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 10000);
    const res = await fetch(
      new URL(`/api/auth/validate-session?id=${encodeURIComponent(sessionId)}`, baseUrl).toString(),
      { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: ac.signal },
    );
    clearTimeout(timeout);
    const body = await res.json().catch(() => ({ valid: false })) as { valid?: boolean };
    if (res.ok && body.valid) {
      VALID_SESSION_CACHE.set(sessionId, Date.now() + CACHE_TTL);
      return false;
    }
    return true;
  } catch {
    // Fail closed for protected routes so transient backend issues do not silently
    // allow revoked or invalid sessions through.
    return true;
  }
}

export async function middleware(request: NextRequest) {
  // Prune stale/over-large session cache periodically
  const now = Date.now();
  if (now - lastPrune > PRUNE_INTERVAL) {
    pruneSessionCache();
  }

  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Fetch JWT_SECRET from deployment environment variables only.
  // The previous internal HTTP endpoint that returned this value has been removed
  // because it leaked the signing secret to unauthenticated callers.
  async function fetchJwtSecret(): Promise<string | undefined> {
    const now = Date.now();
    if (_middlewareJwtSecret && now < _middlewareJwtSecretExpiry) return _middlewareJwtSecret;

    const fallback = process.env.JWT_SECRET;
    if (fallback) {
      _middlewareJwtSecret = fallback;
      _middlewareJwtSecretExpiry = now + JWT_SECRET_CACHE_TTL;
    }
    return fallback;
  }

  // If already authenticated and trying to access auth pages, redirect to dashboard/admin
  if (session && pathname.startsWith('/auth/')) {
    try {
      const jwtSecretEnv = await fetchJwtSecret();
      if (jwtSecretEnv) {
        const secret = new TextEncoder().encode(jwtSecretEnv);
        const payload = await verifyJwtMiddleware(session.value, secret);

        if (payload.role === 'admin' || payload.role === 'teacher') {
          return NextResponse.redirect(new URL('/admin', request.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }
    } catch (e) {
      console.error("Middleware JWT verification failed on auth route", e);
    }
  }

  // Protect /dashboard, /admin and their sub-routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const jwtSecretEnv = await fetchJwtSecret();
      if (!jwtSecretEnv) {
        console.error("Middleware JWT verification failed: JWT_SECRET not found in KV or env.");
        const loginUrl = new URL('/auth/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      const secret = new TextEncoder().encode(jwtSecretEnv);
      const payload = await verifyJwtMiddleware(session.value, secret);

      // Validate iat — reject tokens issued in the future
      if (payload.iat && payload.iat > Math.floor(Date.now() / 1000) + 30) {
        const loginUrl = new URL('/auth/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Validate sessionId against backend to catch revoked sessions
      if (payload.sessionId && typeof payload.sessionId === 'string') {
        const revoked = await isSessionRevoked(
          payload.sessionId as string,
          request.nextUrl.origin,
        );
        if (revoked) {
          const loginUrl = new URL('/auth/login', request.url);
          return NextResponse.redirect(loginUrl);
        }
      }

      if (pathname.startsWith('/admin')) {
        if (payload.role !== 'admin' && payload.role !== 'teacher') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }
    } catch (e) {
      console.error("Middleware JWT verification failed", e);
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/auth/:path*'],
};
