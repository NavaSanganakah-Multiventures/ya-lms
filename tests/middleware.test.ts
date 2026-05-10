import { middleware } from '../middleware';
import { NextRequest, NextResponse } from 'next/server';
import { jest } from '@jest/globals';

describe('Middleware Secure Role Check', () => {
  const secretString = 'fallback_dev_secret_do_not_use_in_prod';
  const secret = secretString;
  const wrongSecret = 'wrong_secret';


  beforeAll(() => {
    process.env.JWT_SECRET = secretString;
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  const createMockRequest = (pathname: string, sessionCookie?: string) => {
    const url = new URL(`http://localhost${pathname}`);
    const req = new NextRequest(url);
    if (sessionCookie) {
      req.cookies.set('session', sessionCookie);
    }
    return req;
  };

  const base64UrlEncode = (value: object | ArrayBuffer) => {
    const buffer = value instanceof ArrayBuffer
      ? Buffer.from(value)
      : Buffer.from(JSON.stringify(value));
    return buffer.toString('base64url');
  };

  const createToken = async (role: string, signKey: string, exp?: string) => {
    const now = Math.floor(Date.now() / 1000);
    const payload: { role: string; exp?: number } = { role };
    if (exp === '-1h') payload.exp = now - 60 * 60;

    const encodedHeader = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
    const encodedPayload = base64UrlEncode(payload);
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(signKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataToSign));
    return `${dataToSign}.${base64UrlEncode(signature)}`;
  };

  test('Redirects to login if no session is present', async () => {
    const req = createMockRequest('/admin');
    const res = await middleware(req) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/auth/login');
  });

  test('Valid admin token allows access to /admin', async () => {
    const validToken = await createToken('admin', secret);
    const req = createMockRequest('/admin', validToken);
    const res = await middleware(req) as NextResponse;

    expect(res.headers.get('x-middleware-rewrite') || res.headers.get('location')).toBeNull();
  });

  test('Invalid signature / Tampered token redirects to login', async () => {
    const tamperedToken = await createToken('admin', wrongSecret);
    const req = createMockRequest('/admin', tamperedToken);
    const res = await middleware(req) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/auth/login');
  });

  test('Expired token redirects to login', async () => {
    // Expiration set in the past
    const expiredToken = await createToken('admin', secret, '-1h');
    const req = createMockRequest('/admin', expiredToken);
    const res = await middleware(req) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/auth/login');
  });

  test('Student token trying to access /admin redirects to /dashboard', async () => {
    const studentToken = await createToken('student', secret);
    const req = createMockRequest('/admin', studentToken);
    const res = await middleware(req) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/dashboard');
  });

  test('Missing JWT_SECRET redirects to login', async () => {
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const validToken = await createToken('admin', secret);
    const req = createMockRequest('/admin', validToken);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await middleware(req) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/auth/login');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET environment variable is missing'));

    consoleSpy.mockRestore();

    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    }
  });

});