import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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
      // Invalid session for auth pages - just let them proceed to login
      console.error("Middleware JWT verification failed on auth route", e);
    }
  }

  // Protect /dashboard, /admin and their sub-routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith('/admin')) {
      try {
        const jwtSecretEnv = process.env.JWT_SECRET;
        if (!jwtSecretEnv) {
          console.error("Middleware JWT verification failed: JWT_SECRET environment variable is missing.");
          const loginUrl = new URL('/auth/login', request.url);
          return NextResponse.redirect(loginUrl);
        }

        const secret = new TextEncoder().encode(jwtSecretEnv);
        const { payload } = await jwtVerify(session.value, secret);

        if (payload.role !== 'admin' && payload.role !== 'teacher') {
          const dashboardUrl = new URL('/dashboard', request.url);
          return NextResponse.redirect(dashboardUrl);
        }
      } catch (e) {
        console.error("Middleware JWT verification failed", e);
        const loginUrl = new URL('/auth/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/auth/:path*'],
};
