# Worker-Shield + Write-Through Architecture

> **Unified API (`/api/data`) — Flutter WebSocket + Next.js HTTP**
> Cloudflare Workers + Durable Objects + D1 Database

---

## Table of Contents

1. [Architecture Diagram](#1-architecture-diagram)
2. [Why Worker-Shield?](#2-why-worker-shield)
3. [File-by-File Breakdown](#3-file-by-file-breakdown)
   - [3.1 src/index.ts — Main Worker Router](#31-srcindexts--main-worker-router)
   - [3.2 src/data-sync-do.ts — DataSync Durable Object](#32-srcdata-sync-dots--datasync-durable-object)
4. [Request Flow](#4-request-flow)
   - [4.1 GET (Read) — No DO Invocation](#41-get-read--no-do-invocation)
   - [4.2 POST (Write/Mutate) — Write-Through to D1 + Broadcast](#42-post-writemutate--write-through-to-d1--broadcast)
   - [4.3 WebSocket Upgrade — Flutter Real-Time](#43-websocket-upgrade--flutter-real-time)
5. [WebSocket Authentication](#5-websocket-authentication)
6. [Full Data Broadcast (No Pings)](#6-full-data-broadcast-no-pings)
7. [Billing Impact](#7-billing-impact)
8. [Migration Notes](#8-migration-notes)
9. [Adding New Entity Types](#9-adding-new-entity-types)

---

## 1. Architecture Diagram

```
                      ┌──────────────────────────────────────┐
                      │          Cloudflare Edge             │
                      │                                      │
                      │    ┌──────────────────────────────┐  │
                      │    │    Main Worker (index.ts)     │  │
                      │    │                              │  │
  ┌──────────┐       │    │  ┌────────────────────────┐ │  │
  │ Flutter  │──────WebSocket──► │  /api/data            │ │  │
  │  (App)   │       │    │  │                        │ │  │
  └──────────┘       │    │  │  Upgrade: websocket?    │ │  │
                      │    │  │    → YES → DataSyncDO  │ │  │
                      │    │  │  Method: GET?          │ │  │
  ┌──────────┐       │    │  │    → YES → D1 Direct   │ │  │
  │ Next.js  │──HTTP───►  │  │  Method: POST/PUT/DEL? │ │  │
  │ (Website)│       │    │  │    → YES → DataSyncDO  │ │  │
  └──────────┘       │    │  └────────────────────────┘ │  │
                      │    └──────────┬───────────────────┘  │
                      │               │                      │
                      │               ▼                      │
                      │    ┌──────────────────────────────┐  │
                      │    │         DataSyncDO            │  │
                      │    │   (Single Named Instance)    │  │
                      │    │                              │  │
                      │    │  ┌────────────────────────┐ │  │
                      │    │  │  POST Handler           │ │  │
                      │    │  │  1. Raw SQL → D1        │ │  │
                      │    │  │  2. Await D1 success    │ │  │
                      │    │  │  3. getWebSockets(userId)│ │  │
                      │    │  │  4. ws.send(fullData)   │ │  │
                      │    │  │  5. HTTP 200 to caller  │ │  │
                      │    │  └────────────────────────┘ │  │
                      │    │                              │  │
                      │    │  ┌────────────────────────┐ │  │
                      │    │  │  WS Handler             │ │  │
                      │    │  │  acceptWebSocket(tag)  │ │  │
                      │    │  │  Hibernation lifecycle  │ │  │
                      │    │  └────────────────────────┘ │  │
                      │    └──────────┬───────────────────┘  │
                      │               │                      │
                      │               ▼                      │
                      │    ┌──────────────────────────────┐  │
                      │    │      D1 Database              │  │
                      │    │  (Source of Truth)           │  │
                      │    └──────────────────────────────┘  │
                      └──────────────────────────────────────┘
```

---

## 2. Why Worker-Shield?

### Problem (Before)

| Request Type | Before (Old) | Cost |
|-------------|-------------|------|
| **GET** wallet balance | Worker → **Durable Object (wakeup)** → D1 query | 1 DO request unit + 50-200ms latency |
| **POST** add_balance | Worker → DO (wakeup) → D1 write → WS broadcast | 1 DO request unit (necessary) |
| **WS** connect | Worker → DO (wakeup) → accept WS | 1 DO request unit (necessary) |

**Problem:** GET requests don't need a Durable Object. They are simple read queries. But the old code sent ALL requests through the DO, wasting request quota and adding latency.

### Solution (After)

| Request Type | After (New) | Cost |
|-------------|------------|------|
| **GET** wallet balance | Worker → **D1 Direct** (no DO) | ₹0 DO cost, faster response |
| **POST** add_balance | Worker → DO → D1 write → WS broadcast | 1 DO request unit (necessary) |
| **WS** connect | Worker → DO → accept WS | 1 DO request unit (necessary) |

**Benefit:** Every GET request saves one DO invocation. DO slots remain free for actual mutations and WebSocket connections.

---

## 3. File-by-File Breakdown

### 3.1 `src/index.ts` — Main Worker Router

**File path:** `src/index.ts` (lines 22321–22387)

```typescript
// ================================================================
// 🛡️ WORKER-SHIELD PATTERN: /api/data
// ================================================================
// Rules:
//   GET  → Worker directly queries D1 (NO DO invocation)
//   POST → Worker forwards to DO (DO does D1 write + WS broadcast)
//   WS   → Worker forwards to DO (DO manages WebSocket lifecycle)
// ================================================================
if (url.pathname === "/api/data") {
  const isWebSocket = request.headers.get("Upgrade") === "websocket";

  // 🟢 FLUTTER: WebSocket upgrade → forward to DO
  //
  // Auth: Flutter sends session cookie via WebSocket upgrade headers
  //   (see real_time_service.dart lines 86-97 — 'Cookie' header is set
  //    using stored session cookie from ApiService.getSessionCookie()).
  //   requireAuth() reads "Cookie: session=<jwt>" — this works natively
  //   in Cloudflare Workers because Upgrade requests carry full HTTP
  //   headers, including cookies.
  //
  //   X-App-JWT header (Play Integrity) is NOT used for user identity
  //   — its payload has sub:'play_integrity_verified', not userId.
  //
  //   Query param auth (e.g. ?token=xxx) is REJECTED by policy:
  //   it leaks credentials in server access logs and URL history.
  //
  if (isWebSocket) {
    let userId = "anonymous";
    try {
       const payload = await requireAuth(request, env);
       userId = payload.sub;
    } catch {}
    const doUrl = new URL(request.url);
    doUrl.searchParams.set("userId", userId);
    const doId = env.DATA_SYNC_DO.idFromName("data-sync");
    const stub = env.DATA_SYNC_DO.get(doId);
    return stub.fetch(new Request(doUrl.toString(), request));
  }

  // 🟢 NEXT.JS GET: Worker reads D1 directly — NO DO COST
  if (request.method === "GET") {
    const dataType = url.searchParams.get("type");
    const userId = url.searchParams.get("userId");

    if (dataType === "wallet" && userId) {
      const wallet: any = await env.DB.prepare(
        "SELECT balance_rupees, lifetime_deposits_rupees FROM CreditWallets WHERE user_id = ?"
      ).bind(userId).first();
      return new Response(JSON.stringify(wallet || { balance_rupees: 0 }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Add more GET handlers here as needed (courses, lessons, etc.)
    // Always query D1 directly — DO ko mat jagao

    return new Response(JSON.stringify({ error: "Invalid GET type" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  // 🟢 NEXT.JS POST/PUT/DELETE: Forward to DO
  // DO D1 write karega + WebSocket broadcast karega
  const doId = env.DATA_SYNC_DO.idFromName("data-sync");
  const stub = env.DATA_SYNC_DO.get(doId);
  return stub.fetch(request);
}
```

**Key Decisions:**

1. **Upgrade check FIRST** (line 22330): WebSocket detected before method check — Flutter connects via WS, not HTTP
2. **GET returns directly** (line 22360): No DO call at all — `env.DB.prepare()` runs in worker context
3. **POST falls through to end** (line 22382): Only POST/PUT/DELETE reach this point — forwarded to DO

### 3.2 `src/data-sync-do.ts` — DataSync Durable Object

**File path:** `src/data-sync-do.ts` (165 lines)

```typescript
import { DurableObject } from "cloudflare:workers";

export interface DataSyncPayload {
  type: string;
  action: string;
  userId?: string;
  data: any;
}

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

    // 🟢 WEBSOCKET — Flutter app
    if (upgrade === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId") || "anonymous";
      this.ctx.acceptWebSocket(server, [userId]);
      return new Response(null, { status: 101, webSocket: client });
    }

    // 🔵 POST / PUT / DELETE — Next.js mutation
    const body = await request.json().catch(() => ({})) as any;
    const dataType = body.type;

    switch (dataType) {
      case "wallet":
        return await this.handleWalletMutation(body);
      // Add more types here as needed...
      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${dataType}` }), {
          status: 400,
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
```

---

## 4. Request Flow

### 4.1 GET (Read) — No DO Invocation

```
Next.js                    Main Worker                    D1
   │                           │                          │
   │  GET /api/data?type=wallet│                          │
   │  &userId=abc123           │                          │
   │ ─────────────────────►    │                          │
   │                           │  ┌────────────────────┐  │
   │                           │  │ Worker detects GET │  │
   │                           │  │ No DO call!        │  │
   │                           │  │ env.DB.prepare()   │  │
   │                           │  └─────────┬──────────┘  │
   │                           │            │             │
   │                           │  SELECT ──────────────►  │
   │                           │  ◄────── balance_rupees  │
   │                           │                          │
   │  HTTP 200 {balance: 500}  │                          │
   │ ◄─────────────────────    │                          │
```

**Cost:** 0 DO request units + 1 D1 query

### 4.2 POST (Write/Mutate) — Write-Through to D1 + Broadcast

```
Next.js                    Main Worker           DataSyncDO              D1              Flutter WS
   │                           │                     │                   │                  │
   │  POST /api/data           │                     │                   │                  │
   │  {type:"wallet",          │                     │                   │                  │
   │   action:"add_balance",   │                     │                   │                  │
   │   userId:"abc",           │                     │                   │                  │
   │   amount:500}             │                     │                   │                  │
   │ ─────────────────────►    │                     │                   │                  │
   │                           │  Forward to DO ──►  │                   │                  │
   │                           │                     │  1️⃣ D1 Write      │                  │
   │                           │                     │  INSERT batch ──►  │                  │
   │                           │                     │  ◄────── ok ────  │                  │
   │                           │                     │                   │                  │
   │                           │                     │  2️⃣ D1 Read       │                  │
   │                           │                     │  SELECT ────────►  │                  │
   │                           │                     │  ◄── balance 500  │                  │
   │                           │                     │                   │                  │
   │                           │                     │  3️⃣ Broadcast     │                  │
   │                           │                     │  ws.send(fullData) ──────────────────► │
   │                           │                     │                   │                  │
   │  HTTP 200 ◄───────────────┘ ◄────────────────── │                   │                  │
   │  {success:true,           │                     │                   │                  │
   │   balance_rupees:500}     │                     │                   │                  │
```

**Cost:** 1 DO request unit + 1 D1 batch query + 1 D1 read query

### 4.3 WebSocket Upgrade — Flutter Real-Time

```
Flutter App                Main Worker           DataSyncDO              D1
   │                           │                     │                   │
   │  GET /api/data            │                     │                   │
   │  Upgrade: websocket       │                     │                   │
   │ ─────────────────────►    │                     │                   │
   │                           │  Auth check         │                   │
   │                           │  (requireAuth)      │                   │
   │                           │                     │                   │
   │                           │  Forward to DO ──►  │                   │
   │                           │  ?userId=abc123     │                   │
   │                           │                     │  acceptWebSocket  │
   │                           │                     │  tag: "abc123"    │
   │                           │                     │                   │
   │  HTTP 101 (Upgraded) ◄───────────────────────── │                   │
   │                           │                     │                   │
   │  ────── WebSocket Open ────────►                │                   │
```

---

## 5. WebSocket Authentication

### 5.1 How Cookies Pass Through WebSocket Upgrade

Flutter uses `IOWebSocketChannel.connect(uri, headers: headers)` which sends a standard HTTP GET with `Upgrade: websocket` header. **All HTTP headers, including `Cookie`, are sent with the upgrade request.**

Cloudflare Workers receive these headers normally — `request.headers.get("Cookie")` works the same for WebSocket upgrades as for regular HTTP.

**Flutter side (real_time_service.dart lines 86-97):**

```dart
final cookie = await ApiService.getSessionCookie();
final headers = <String, String>{
  'Cookie': cookie,
  'User-Agent': 'AdityanveshanApp/1.0',
};
// X-App-JWT is sent but NOT used for user identity
final storedJwt = await IntegrityService.getAppJwt();
if (storedJwt != null && storedJwt.isNotEmpty) {
  headers['X-App-JWT'] = storedJwt;
}
_channel = IOWebSocketChannel.connect(uri, headers: headers);
```

**Worker side (index.ts lines 3513-3539) — `requireAuth()`:**

```typescript
async function requireAuth(request: Request, env: Env) {
  const token = getCookie(request, "session"); // Reads Cookie header
  if (!token) throw new HttpError("Unauthorized", 401);
  // JWT verify + current_session_id check...
  return { sub: userId, role: userRole };
}
```

### 5.2 Auth Mechanisms — Comparison

| Mechanism | How Flutter Sends It | Works for WS? | Identifies User? | Security |
|-----------|---------------------|---------------|------------------|----------|
| **Cookie: session=\<jwt\>** | Via `IOWebSocketChannel` headers | ✅ Yes | ✅ Yes (`sub` = userId) | ✅ HttpOnly, Secure, SameSite |
| **X-App-JWT** (Play Integrity) | Via headers | ✅ Yes | ❌ No (`sub: 'play_integrity_verified'`) | ✅ App attestation only |
| **?token=xxx** query param | URL parameter | ✅ Would work | ✅ Possible | ❌ **REJECTED** — leaks in logs/URL history |

### 5.3 Auth Flow Diagram

```
Flutter App                          Worker (index.ts)
    │                                      │
    │  GET /api/data                       │
    │  Upgrade: websocket                  │
    │  Cookie: session=<jwt>               │
    │  X-App-JWT: <integrity_token>        │
    │ ──────────────────────────────────►  │
    │                                      │
    │               requireAuth(request)   │
    │               ├── getCookie("session")│
    │               ├── verifyJWT()         │
    │               ├── check current_session_id in DB
    │               └── return {sub: userId}│
    │                                      │
    │  Fallback: if auth fails → anonymous│
    │                                      │
    │  Forward to DataSyncDO               │
    │  ?userId=<extracted_id>              │
    │ ──────────────────────────────────►  │
```

### 5.4 Anonymous Fallback

If `requireAuth()` throws (no cookie, expired session, DB error), the Worker catches the error and sets `userId = "anonymous"`:

```typescript
let userId = "anonymous";
try {
  const payload = await requireAuth(request, env);
  userId = payload.sub;
} catch {} // ← Anonymous fallback
```

This ensures:
- Users without session can still connect (receive global broadcasts if any)
- Authenticated users receive targeted broadcasts based on their real userId tag
- The DO handles both cases transparently via `getWebSockets(tag)`

---

## 6. Full Data Broadcast (No Pings)

The DO never sends just a "notification ping." Every broadcast contains the **full JSON payload** that Flutter needs.

**Broadcast format:**
```json
{
  "type": "wallet",
  "action": "wallet_updated",
  "userId": "abc123",
  "data": {
    "balance_rupees": 500
  }
}
```

**Flutter handling (wallet_screen.dart):**
```dart
_realtimeSub = RealTimeService.instance.dataStream.listen((event) async {
  if (event['type'] == 'wallet') {
    final data = event['data'] as Map<String, dynamic>?;
    if (data != null && data.containsKey('balance_rupees')) {
      setState(() {
        _balanceData = data;  // ← Full data, no follow-up HTTP
      });
    }
  }
});
```

**Why this matters:**
- Flutter gets the data directly in the WebSocket message
- No additional HTTP GET request needed
- No loading spinners or blinking UI
- Saves 1 extra D1 query per broadcast

---

## 7. Billing Impact

### Durable Object Pricing (Cloudflare)

| Component | Cost |
|-----------|------|
| DO request units | $0.30/million requests |
| DO duration | $0.001/GB-s (Hibernation = near zero) |
| D1 reads | $0.001/million rows read |
| D1 writes | $1.00/million rows written |

### Savings Calculation

| Scenario | Old (all through DO) | New (Worker-Shield) | Savings |
|---------|---------------------|-------------------|---------|
| 100k GET requests/month | 100k DO req units | 0 DO req units | $0.03/month |
| 10k POST requests/month | 10k DO req units | 10k DO req units | Same |
| Avg latency per GET | ~150ms (DO wake-up + D1) | ~30ms (direct D1) | **120ms faster** |

### Key Insight

The primary savings is **not monetary** (DOs are cheap). The primary benefit is:
1. **Lower latency** for GET requests (no DO wake-up)
2. **More DO concurrency slots** available for mutations and WebSockets
3. **Simpler architecture** — no caching logic, no cache invalidation bugs

---

## 8. Migration Notes

### What Was Removed from DO

- ❌ `ctx.storage.sql.exec()` — DO internal SQLite cache
- ❌ `EXPIRE_CACHE` constants
- ❌ GET handler (moved to main Worker)
- ❌ `d1Query()` caching helper
- ❌ Any in-memory cache maps

### What Remains in DO

- ✅ `this.env.DB.prepare()` — Raw SQL queries to D1
- ✅ `this.env.DB.batch()` — D1 batch writes
- ✅ `setWebSocketAutoResponse()` — Hibernation ping/pong
- ✅ `acceptWebSocket()` — WebSocket connection management
- ✅ `getWebSockets(tag)` — Targeted broadcasts
- ✅ Hibernation lifecycle hooks (`webSocketMessage`, `webSocketClose`, `webSocketError`)

### DO is Now Pure State + Query

```
┌─────────────────────────────┐
│         DataSyncDO          │
│                             │
│  Storage: NOTHING           │
│  (no cache, no app data)    │
│                             │
│  State: WebSocket tags      │
│  (managed by Hibernation)   │
│                             │
│  Queries: Direct D1 SQL     │
│  (env.DB.prepare/batch)     │
└─────────────────────────────┘
```

---

## 9. Adding New Entity Types

To add a new entity (e.g., `course`), you need changes in TWO places:

### Step 1: `src/index.ts` — GET handler (line 22360)

```typescript
// Add new GET case BEFORE the fallback error
if (dataType === "course" && userId) {
  const courses: any = await env.DB.prepare(
    "SELECT * FROM Courses WHERE instructor_id = ?"
  ).bind(userId).all();
  return new Response(JSON.stringify(courses.results || []), {
    headers: { "Content-Type": "application/json" }
  });
}
```

### Step 2: `src/data-sync-do.ts` — POST handler (line 55-63)

```typescript
switch (dataType) {
  case "wallet":
    return await this.handleWalletMutation(body);
  case "course":
    return await this.handleCourseMutation(body);
  // Add more types here...
  default:
    return new Response(JSON.stringify({ error: `Unknown type: ${dataType}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
}
```

### Step 3: `src/data-sync-do.ts` — Create mutation handler

```typescript
private async handleCourseMutation(body: any): Promise<Response> {
  const { userId, action, courseData } = body;

  if (action === "create") {
    // 1️⃣ Raw SQL write
    await this.env.DB.prepare(
      `INSERT INTO Courses (id, title, instructor_id, ...) VALUES (?, ?, ?, ...)`
    ).bind(uuid, courseData.title, userId, ...).run();

    // 2️⃣ Read fresh data
    const fresh: any = await this.env.DB.prepare(
      "SELECT * FROM Courses WHERE instructor_id = ?"
    ).bind(userId).all();

    // 3️⃣ Broadcast full data
    this.broadcastToClients("course", userId, fresh.results);

    // 4️⃣ Return 200
    return new Response(JSON.stringify({ success: true, data: fresh.results }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
    status: 400, headers: { "Content-Type": "application/json" }
  });
}
```

---

## Appendices

### A. Required Bindings (`wrangler.toml`)

```toml
[[durable_objects.bindings]]
name = "DATA_SYNC_DO"
class_name = "DataSyncDO"

[[migrations]]
tag = "v_data_sync_do_1"
new_classes = ["DataSyncDO"]
```

### B. TypeScript Types (`worker-configuration.d.ts`)

```typescript
interface Env {
  DATA_SYNC_DO: DurableObjectNamespace;
  DB: D1Database;
}
```

### C. Flutter WebSocket URL (`real_time_service.dart`)

```dart
String get _dataWsUrl {
  final base = ApiService.baseUrl.replaceFirst('https://', 'wss://');
  return '$base/api/data';
}
```
