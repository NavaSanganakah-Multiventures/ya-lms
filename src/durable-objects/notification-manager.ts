import { DurableObject } from "cloudflare:workers";

function base64UrlDecodeToUint8Array(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? 0 : 4 - (base64.length % 4);
  return Uint8Array.from(atob(base64 + "=".repeat(padding)), (c) => c.charCodeAt(0));
}

function base64UrlDecodeToString(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? 0 : 4 - (base64.length % 4);
  return new TextDecoder().decode(
    Uint8Array.from(atob(base64 + "=".repeat(padding)), (c) => c.charCodeAt(0))
  );
}

async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signature = base64UrlDecodeToUint8Array(encodedSignature);
  const isValid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(dataToSign));
  if (!isValid) throw new Error("Invalid signature");

  const payload = JSON.parse(base64UrlDecodeToString(encodedPayload));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
    throw new Error("Token expired");
  return payload;
}

/**
 * Manages Web Push subscriptions for users.
 * Stores subscriptions in Durable Object storage with "sub:" prefix.
 */
export class NotificationManager extends DurableObject {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
    this.env = env;
  }

  private async verifyRequest(request: Request): Promise<{ user_id: string } | null> {
    const url = new URL(request.url);

    // Try session cookie
    const cookie = request.headers.get("Cookie") || "";
    const cookieMatch = cookie.match(/session=([^;]+)/);
    if (cookieMatch) {
      try {
        const jwtSecret = await this.env.PLATFORM_SECRETS?.get("JWT_SECRET");
        if (jwtSecret) {
          const payload = await verifyJWT(cookieMatch[1], jwtSecret);
          if (payload?.sub) return { user_id: payload.sub };
        }
      } catch { /* auth failed */ }
    }

    // Try Authorization header (Bearer token)
    const auth = request.headers.get("Authorization") || "";
    if (auth.startsWith("Bearer ")) {
      try {
        const jwtSecret = await this.env.PLATFORM_SECRETS?.get("JWT_SECRET");
        if (jwtSecret) {
          const payload = await verifyJWT(auth.slice(7), jwtSecret);
          if (payload?.sub) return { user_id: payload.sub };
        }
      } catch { /* auth failed */ }
    }

    // Try admin API key
    const apiKey = request.headers.get("X-Admin-Key");
    if (apiKey) {
      try {
        const storedKey = await this.env.PLATFORM_SECRETS?.get("ADMIN_API_KEY");
        if (apiKey === storedKey) return { user_id: "admin" };
      } catch { /* fall through */ }
    }

    return null;
  }

  async fetch(request: Request): Promise<Response> {
    const session = await this.verifyRequest(request);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/subscribe") {
      try {
        const { subscription } = await request.json() as any;
        if (!subscription || !subscription.endpoint) {
          return new Response("Invalid subscription", { status: 400 });
        }

        await this.state.storage.put(`sub:${subscription.endpoint}`, subscription);
        return new Response("Subscribed successfully", { status: 200 });
      } catch (err) {
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    if (request.method === "POST" && url.pathname === "/delete-subscription") {
      try {
        const { endpoint } = await request.json() as any;
        await this.state.storage.delete(`sub:${endpoint}`);
        return new Response("Deleted", { status: 200 });
      } catch (err) {
        return new Response("Error", { status: 500 });
      }
    }

    if (request.method === "GET" && url.pathname === "/get-subscriptions") {
      try {
        const subscriptions: any[] = [];
        let startAfter: string | undefined = undefined;
        let hasMore = true;

        while (hasMore) {
          const options: any = { prefix: "sub:", limit: 1000 };
          if (startAfter) options.startAfter = startAfter;

          const list: any = await this.state.storage.list(options);

          if (list.size === 0) {
            hasMore = false;
            break;
          }

          let lastKey: string | undefined = undefined;
          for (const [key, value] of list) {
            subscriptions.push(value);
            lastKey = key;
          }

          if (list.size < 1000) {
            hasMore = false;
          } else {
            startAfter = lastKey;
          }
        }

        return new Response(JSON.stringify(subscriptions), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response("Error", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
}
