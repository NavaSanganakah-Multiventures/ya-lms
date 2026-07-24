import { DurableObject } from "cloudflare:workers";

/**
 * Manages Web Push subscriptions for users.
 * Stores subscriptions in Durable Object storage with "sub:" prefix.
 */
export class NotificationManager extends DurableObject {
  state: DurableObjectState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
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
