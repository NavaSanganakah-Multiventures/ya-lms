import { test, expect, describe } from "bun:test";
import worker from "./src/index";

describe("handleGetVapidPublicKey", () => {
  test("returns 404 when VAPID_PUBLIC_KEY is not set", async () => {
    const env = {
      PLATFORM_SECRETS: {
        get: async (key: string) => {
          if (key === "VAPID_PUBLIC_KEY") return null;
          return null;
        }
      }
    };

    const request = new Request("http://localhost/api/notifications/vapid-public-key");
    const response = await worker.fetch(request, env as any, { waitUntil: () => {} } as any);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "VAPID keys not configured on server" });
  });

  test("returns 200 and key when VAPID_PUBLIC_KEY is set", async () => {
    const env = {
      PLATFORM_SECRETS: {
        get: async (key: string) => {
          if (key === "VAPID_PUBLIC_KEY") return "test_public_key";
          return null;
        }
      }
    };

    const request = new Request("http://localhost/api/notifications/vapid-public-key");
    const response = await worker.fetch(request, env as any, { waitUntil: () => {} } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ publicKey: "test_public_key" });
  });
});
