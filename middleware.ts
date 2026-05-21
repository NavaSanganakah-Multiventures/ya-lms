import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const VALID_SESSION_CACHE = new Map<string, number>();

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
    if (res.ok) {
      VALID_SESSION_CACHE.set(sessionId, Date.now() + 60_000);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // If already authenticated and trying to access auth pages, redirect to dashboard/admin
  if (session && pathname.startsWith('/auth/')) {
    try {
      const jwtSecretEnv = process.env.JWT_SECRET;
      if (jwtSecretEnv) {
        const secret = new TextEncoder().encode(jwtSecretEnv);
        const { payload } = await jwtVerify(session.value, secret);

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
      const jwtSecretEnv = process.env.JWT_SECRET;
      if (!jwtSecretEnv) {
        console.error("Middleware JWT verification failed: JWT_SECRET environment variable is missing.");
        const loginUrl = new URL('/auth/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      const secret = new TextEncoder().encode(jwtSecretEnv);
      const { payload } = await jwtVerify(session.value, secret);

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
      } else if (pathname.startsWith('/dashboard')) {
        if (payload.role === 'admin' || payload.role === 'teacher') {
          return NextResponse.redirect(new URL('/admin', request.url));
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
