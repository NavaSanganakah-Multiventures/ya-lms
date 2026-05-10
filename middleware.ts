import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

async function verifySession(sessionValue: string) {
  const jwtSecretEnv = process.env.JWT_SECRET;
  if (!jwtSecretEnv) {
    throw new Error('JWT_SECRET environment variable is missing.');
  }

  const secret = new TextEncoder().encode(jwtSecretEnv);
  return jwtVerify(sessionValue, secret);
}

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  // Protect /dashboard, /admin and their sub-routes.
  // Both areas require a valid, non-expired JWT instead of only checking that a
  // cookie exists; /admin additionally requires privileged roles.
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!session) {
      return redirectTo(request, '/auth/login');
    }

    try {
      const { payload } = await verifySession(session.value);

      if (
        pathname.startsWith('/admin') &&
        payload.role !== 'admin' &&
        payload.role !== 'teacher'
      ) {
        return redirectTo(request, '/dashboard');
      }
    } catch (e) {
      console.error('Middleware JWT verification failed', e);
      const response = redirectTo(request, '/auth/login');
      response.cookies.delete('session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/auth/:path*'],
};
