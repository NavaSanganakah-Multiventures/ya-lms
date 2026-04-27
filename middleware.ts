import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Protect /dashboard and its sub-routes
  if (pathname.startsWith('/dashboard')) {
    if (!session) {
      const loginUrl = new URL('/auth/login', request.url);
      // Optional: Add the current path as a redirect parameter
      // loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname.startsWith('/auth')) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
};
