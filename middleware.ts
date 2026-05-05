import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Protect /dashboard, /admin and their sub-routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!session) {
      const loginUrl = new URL('/auth/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Note: We don't redirect away from /auth here because we need to check the role
  // via an API call on the client side to decide between /admin and /dashboard.

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/auth/:path*'],
};
