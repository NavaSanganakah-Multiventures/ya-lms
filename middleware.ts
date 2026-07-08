import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const VALID_SESSION_CACHE = new Map<string, number>();
const CACHE_MAX_SIZE = 5000;

function pruneSessionCache() {
  const now = Date.now();
  let expiredCount = 0;
  for (const [key, expiry] of VALID_SESSION_CACHE) {
    if (expiry <= now) {
      VALID_SESSION_CACHE.delete(key);
      expiredCount++;
    }
  }
  if (expiredCount > 0) {
    console.debug(`[SessionCache] Pruned ${expiredCount} expired entries, size=${VALID_SESSION_CACHE.size}`);
  }
}

async function isSessionRevoked(
  sessionId: string,
  baseUrl: string,
): Promise<boolean> {
  const cached = VALID_SESSION_CACHE.get(sessionId);
  if (cached && cached > Date.now()) return false;

  try {
    const res = await fetch(
      new URL(`/api/auth/validate-session?id=${encodeURIComponent(sessionId)}`, baseUrl).toString(),
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
    );
    const body = await res.json().catch(() => ({ valid: false })) as { valid?: boolean };
    if (res.ok && body.valid) {
      VALID_SESSION_CACHE.set(sessionId, Date.now() + 60_000);
      if (VALID_SESSION_CACHE.size > CACHE_MAX_SIZE) {
        pruneSessionCache();
      }
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

  // Fetch JWT_SECRET from KV via internal endpoint
  async function fetchJwtSecret(): Promise<string | undefined> {
    try {
      const res = await fetch(new URL('/api/kv/jwt-secret', request.nextUrl.origin).toString(), { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        const body = await res.json() as { secret?: string };
        if (body.secret) return body.secret;
      }
    } catch {}
    return process.env.JWT_SECRET;
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
