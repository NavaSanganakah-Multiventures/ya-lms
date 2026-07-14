import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const VALID_SESSION_CACHE = new Map<string, number>();
const CACHE_MAX_SIZE = 5000;
const CACHE_TTL = 60_000;
const PRUNE_INTERVAL = 300_000;
let lastPrune = 0;

// JWT Secret cache — avoids fetching from KV on every request
let _middlewareJwtSecret: string | null = null;
let _middlewareJwtSecretExpiry = 0;
const JWT_SECRET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function pruneSessionCache() {
  const now = Date.now();
  for (const [key, expiry] of VALID_SESSION_CACHE) {
    if (expiry <= now) VALID_SESSION_CACHE.delete(key);
  }
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
    const res = await fetch(
      new URL(`/api/auth/validate-session?id=${encodeURIComponent(sessionId)}`, baseUrl).toString(),
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    const body = await res.json().catch(() => ({ valid: false })) as { valid?: boolean };
    if (res.ok && body.valid) {
      // Evict oldest entry if at capacity (no iteration deletion race)
      if (VALID_SESSION_CACHE.size >= CACHE_MAX_SIZE) {
        const oldestKey = VALID_SESSION_CACHE.keys().next().value;
        if (oldestKey) VALID_SESSION_CACHE.delete(oldestKey);
      }
      VALID_SESSION_CACHE.set(sessionId, Date.now() + CACHE_TTL);
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Fetch JWT_SECRET from KV via internal endpoint (cached)
  async function fetchJwtSecret(): Promise<string | undefined> {
    const now = Date.now();
    if (_middlewareJwtSecret && now < _middlewareJwtSecretExpiry) return _middlewareJwtSecret;

    try {
      const res = await fetch(new URL('/api/kv/jwt-secret', request.nextUrl.origin).toString(), { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        const body = await res.json() as { secret?: string };
        if (body.secret) {
          _middlewareJwtSecret = body.secret;
          _middlewareJwtSecretExpiry = now + JWT_SECRET_CACHE_TTL;
          return body.secret;
        }
      }
    } catch (e) {
      console.error('[Middleware] KV fetch failed, falling back to env', e);
    }
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
        const { payload } = await jwtVerify(session.value, secret, { algorithms: ['HS256'] });

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
      const { payload } = await jwtVerify(session.value, secret, { algorithms: ['HS256'] });

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
