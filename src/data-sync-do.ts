import { DurableObject } from "cloudflare:workers";

export interface DataSyncPayload {
  type: string;
  action: string;
  userId?: string;
  data: any;
}

/**
 * DataSyncDO — Unified mutation + broadcast Durable Object.
 *
 * WRITE-THROUGH ARCHITECTURE:
 *   1. Worker (index.ts) forwards ONLY POST + WebSocket upgrades here
 *   2. Worker handles GET queries directly to D1 (no DO cost)
 *   3. DO executes Raw SQL against D1
 *   4. Awaits D1 success
 *   5. Broadcasts FULL data to connected WebSocket clients
 *   6. Returns HTTP 200 to caller
 *
 * NO DO internal storage is used for application data.
 * DO is ONLY for WebSocket state + D1 query execution.
 */

/**
 * Canonical ID generator — matches the pattern in index.ts:generateCustomId().
 * Duplicated here since DO modules cannot import from index.ts.
 * Format: {PREFIX}-{12 chars randomUUID uppercase}{6 chars base-36 timestamp uppercase}
 */
function generateCustomId(prefix: string): string {
  const randomPart = crypto.randomUUID().substring(0, 12).toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${randomPart}${timestampPart}`;
}
export class DataSyncDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Edge-level ping/pong — Hibernation API
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}')
    );
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");

    // ================================================================
    // 🟢 WEBSOCKET — Flutter app connects here
    // ================================================================
    if (upgrade === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId") || "anonymous";

      this.ctx.acceptWebSocket(server, [userId]);
      return new Response(null, { status: 101, webSocket: client });
    }

    // ================================================================
    // 🔵 POST / PUT / DELETE — Next.js mutation
    // ================================================================
    const body = await request.json().catch(() => ({})) as any;
    const dataType = body.type;

    switch (dataType) {
      case "wallet":
        return await this.handleWalletMutation(body);
      default:
        // Generic broadcast — main worker already did D1 write.
        // Used by broadcastToUser / broadcastToAll helpers in index.ts.
        if (body.userId) {
          this.broadcastToClients(dataType, body.userId, body.data);
        } else {
          // No userId → broadcast to ALL connected WebSockets
          this.broadcastToClients(dataType, undefined, body.data);
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
    }
  }

  // ================================================================
  // WALLET MUTATION — Write-Through Raw SQL
  // ================================================================
  private async handleWalletMutation(body: any): Promise<Response> {
    const { userId, action, amount } = body;

    if (action === "add_balance") {
      const safeAmount = Math.max(0, Number(amount) || 0);
      if (safeAmount <= 0) {
        return new Response(JSON.stringify({ error: "Invalid amount" }), {
          status: 400, headers: { "Content-Type": "application/json" }
        });
      }

      const walletId = generateCustomId("YA-CRW");
      const ledgerId = generateCustomId("YA-CRL");

      // ── 1️⃣ RAW SQL: D1 Write ─────────────────────────────
      await this.env.DB.batch([
        this.env.DB.prepare(
          `INSERT INTO CreditWallets (id, user_id, balance_rupees, lifetime_deposits_rupees, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id) DO UPDATE SET
             balance_rupees = ROUND(balance_rupees + ?, 2),
             lifetime_deposits_rupees = ROUND(lifetime_deposits_rupees + ?, 2),
             updated_at = CURRENT_TIMESTAMP`
        ).bind(walletId, userId, safeAmount, safeAmount, safeAmount, safeAmount),
        this.env.DB.prepare(
          `INSERT INTO CreditLedger (id, user_id, change_rupees, balance_after_rupees, reason, reference_type, reference_id)
           SELECT ?, ?, ?, (SELECT balance_rupees FROM CreditWallets WHERE user_id = ?), 'admin_granted', 'admin_action', ?
           LIMIT 1`
        ).bind(ledgerId, userId, safeAmount, userId, body.adminId || null),
      ]);

      // ── 2️⃣ Read fresh balance from D1 ─────────────────────
      const newWallet: any = await this.env.DB.prepare(
        "SELECT balance_rupees FROM CreditWallets WHERE user_id = ?"
      ).bind(userId).first();
      const balance = newWallet?.balance_rupees || safeAmount;

      // ── 3️⃣ BROADCAST: Full data to Flutter WebSockets ────
      this.broadcastToClients("wallet", userId, { balance_rupees: balance });

      // ── 4️⃣ Return HTTP 200 to Next.js ────────────────────
      return new Response(JSON.stringify({ success: true, balance_rupees: balance }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  // ================================================================
  // BROADCAST: Full data payload to WebSocket clients
  // ================================================================
  private broadcastToClients(type: string, userId: string | undefined, data: any) {
    const payload: DataSyncPayload = { type, action: `${type}_updated`, userId, data };
    const message = JSON.stringify(payload);

    const websockets = userId
      ? this.ctx.getWebSockets(userId)
      : this.ctx.getWebSockets();

    for (const ws of websockets) {
      try { ws.send(message); } catch (e) {
        console.error("[DataSyncDO] broadcast failed:", e);
      }
    }
  }

  // ================================================================
  // HIBERNATION LIFECYCLE (no DO storage used)
  // ================================================================
  async webSocketMessage(ws: WebSocket, message: string) {
    // Flutter can send subscribe/unsubscribe here if needed
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Cleanup if needed
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error("[DataSyncDO] WS error:", error);
  }
}
