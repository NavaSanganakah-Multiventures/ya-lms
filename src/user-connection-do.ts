import { DurableObject } from "cloudflare:workers";

export interface NotifyPayload {
  type: string;
  channel: string;
  action?: string;
  entity?: string;
  data?: any;
}

export class UserConnectionDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/notify" && request.method === "POST") {
      const body = (await request.json()) as NotifyPayload;
      const message = JSON.stringify(body);
      const websockets = this.ctx.getWebSockets();
      for (const ws of websockets) {
        try {
          ws.send(message);
        } catch (_) {}
      }
      return new Response("OK");
    }

    return new Response("Not Found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    try {
      const msg = JSON.parse(message);
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch {}
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {}
}
