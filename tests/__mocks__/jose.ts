function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value: string) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function keyToString(key: Uint8Array) {
  return Buffer.from(key).toString('base64url');
}

export class SignJWT {
  private payload: Record<string, unknown>;
  private exp?: string;

  constructor(payload: Record<string, unknown>) {
    this.payload = payload;
  }

  setProtectedHeader() {
    return this;
  }

  setExpirationTime(exp: string) {
    this.exp = exp;
    return this;
  }

  async sign(key: Uint8Array) {
    return encode({ payload: this.payload, exp: this.exp, key: keyToString(key) });
  }
}

export async function jwtVerify(token: string, key: Uint8Array) {
  const decoded = decode(token);
  if (decoded.key !== keyToString(key)) {
    throw new Error('Invalid signature');
  }
  if (decoded.exp === '-1h') {
    throw new Error('Token expired');
  }
  return { payload: decoded.payload };
}
