import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type SessionPayload = {
  role?: string;
  exp?: number;
  [key: string]: unknown;
};

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL('/auth/login', request.url));
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

async function verifySessionToken(token: string, secretValue: string): Promise<SessionPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(base64UrlDecode(encodedHeader)) as { alg?: string };
  if (header.alg !== 'HS256') throw new Error('Unsupported token algorithm');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretValue),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signatureString = base64UrlDecode(encodedSignature);
  const signature = new Uint8Array(signatureString.length);
  for (let i = 0; i < signatureString.length; i += 1) {
    signature[i] = signatureString.charCodeAt(i);
  }

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    encoder.encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!isValid) throw new Error('Invalid signature');

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  const { pathname } = request.nextUrl;
  const isProtectedPath = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  if (!session) {
    return redirectToLogin(request);
  }

  const jwtSecretEnv = process.env.JWT_SECRET;
  if (!jwtSecretEnv) {
    console.error('Middleware JWT verification failed: JWT_SECRET environment variable is missing.');
    return redirectToLogin(request);
  }

  let payload: SessionPayload;
  try {
    payload = await verifySessionToken(session.value, jwtSecretEnv);
  } catch (error) {
    console.error('Middleware JWT verification failed', error);
    return redirectToLogin(request);
  }

  if (pathname.startsWith('/admin') && payload.role !== 'admin' && payload.role !== 'teacher') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/auth/:path*'],
};
