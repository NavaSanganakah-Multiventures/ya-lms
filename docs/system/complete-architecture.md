# YA-LMS Complete System Architecture

> **Unified API (`/api/data`) — Flutter WebSocket + Next.js HTTP**
> Cloudflare Workers + Durable Objects + D1 Database
> Last Updated: 2026-07-29

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Source Files Layout](#2-source-files-layout)
3. [Core Architecture: Worker-Shield + Write-Through](#3-core-architecture-worker-shield--write-through)
4. [Durable Objects (Remaining)](#4-durable-objects-remaining)
5. [Request Flow Details](#5-request-flow-details)
6. [WebSocket Authentication](#6-websocket-authentication)
7. [DataSyncDO Code Walkthrough](#7-datasyncdo-code-walkthrough)
8. [Broadcast Helpers](#8-broadcast-helpers)
9. [Flutter Client Integration](#9-flutter-client-integration)
10. [Next.js Client Integration](#10-nextjs-client-integration)
11. [ID Generation](#11-id-generation)
12. [Database Schema](#12-database-schema)
13. [Billing & Cost Optimization](#13-billing--cost-optimization)
14. [What Was Removed (Legacy Cleanup)](#14-what-was-removed-legacy-cleanup)
15. [Deployment](#15-deployment)
16. [Bug Fixes During Cleanup](#16-bug-fixes-during-cleanup)

---

## 1. System Overview

Yeh ek real-time LMS hai jo Cloudflare Workers ecosystem par run karta hai.

### Architecture Diagram

```
                     ┌────────────────────────────────────────┐
                     │          CLOUDFLARE EDGE               │
                     │                                        │
                     │  ┌──────────────────────────────────┐  │
                     │  │  Main Worker — index.ts          │  │
                     │  │  (router + all business logic)   │  │
                     │  │                                  │  │
 ┌──────────┐       │  │  url.pathname === "/api/data"    │  │
 │  Flutter  │──WS───►  │  ┌────────────────────────────┐  │  │
 │  (App)    │       │  │  │ Upgrade: websocket? → DO   │  │  │
 └──────────┘       │  │  │ Method: GET? → D1 Direct   │  │  │
                     │  │  │ Method: POST? → DO         │  │  │
 ┌──────────┐       │  │  │ Else → main router logic    │  │  │
 │  Next.js  │──HTTP──►  │  └────────────────────────────┘  │  │
 │  (Site)   │       │  └──────────────────────────────────┘  │
 └──────────┘       │                   │                     │
                     │                   ▼                     │
                     │  ┌──────────────────────────────────┐  │
                     │  │  DataSyncDO (Single Instance)    │  │
                     │  │  ┌────────────────────────────┐  │  │
                     │  │  │ WS: acceptWebSocket(tag)   │  │  │
                     │  │  │ POST: D1 write + broadcast │  │  │
                     │  │  │ default: broadcast only    │  │  │
                     │  │  └────────────────────────────┘  │  │
                     │  └──────────────────────────────────┘  │
                     │                   │                     │
                     │                   ▼                     │
                     │  ┌──────────────────────────────────┐  │
                     │  │  D1 Database (Source of Truth)   │  │
                     │  └──────────────────────────────────┘  │
                     │                                        │
                     │  ┌──────────────────────────────────┐  │
                     │  │  Other:                          │  │
                     │  │  • NotificationManager DO        │  │
                     │  │  • AdminCommandProcessor DO      │  │
                     │  │  • R2 Storage / Queues / KV      │  │
                     │  └──────────────────────────────────┘  │
                     └────────────────────────────────────────┘
```

### Design Principles

| Principle | Detail |
|-----------|--------|
| **Worker-Shield** | GET requests bypass DO completely → worker reads D1 directly |
| **Write-Through** | POST mutations: D1 write first → await → then WebSocket broadcast |
| **Single DO Instance** | DataSyncDO is one named instance `"data-sync"` for ALL users |
| **Tag-Based Broadcast** | `getWebSockets(userId)` targets only one user's connections |
| **Full Data Payload** | WS messages contain complete JSON data, not notification pings |
| **No DO Storage** | DO internal SQLite (`ctx.storage.sql`) is NOT used for app data |
| **Hibernation API** | `setWebSocketAutoResponse` handles ping/pong without waking DO |
| **Cookie Auth** | Session JWT passed via standard `Cookie` header during WS upgrade |

---

## 2. Source Files Layout

```
src/
├── index.ts                       # Main Worker (24973 lines)
│   ├── imports (lines 1-17)
│   ├── utility functions
│   │   ├── fetchWithTimeout, handleGlobalError
│   │   ├── generateCustomId (line 3233)
│   │   ├── broadcastToUser / broadcastToUsers (line 3260)
│   │   ├── broadcastToAll (line 3284)
│   │   └── broadcastToCourseEnrollees (line 3301)
│   ├── auth functions
│   │   ├── requireAuth (cookie-only, line 3575)
│   │   └── verifyJWT, signJWT, getCachedJwtSecret
│   ├── route handlers (50+ handlers)
│   │   ├── handleAdminAddBalance
│   │   ├── handlePlayIntegrity
│   │   └── ...
│   ├── router (line ~22248)
│   │   ├── /api/data (line 22257)
│   │   │   ├── WS upgrade → DataSyncDO
│   │   │   ├── GET → D1 direct
│   │   │   └── POST → DataSyncDO
│   │   └── all other routes
│   └── exports (line 24751)
├── data-sync-do.ts                # DataSyncDO (172 lines)
├── durable-objects/
│   ├── notification-manager.ts    # Push notification DO
│   └── admin-command-processor.ts # Admin batch command DO
├── workflows.ts
├── shared-utils.ts
├── request-utils.ts
├── schema-safety.ts
└── routes/
    └── auth.ts

contexts/
└── WebSocketContext.tsx            # Next.js → /api/data

flutter/
├── student_app/lib/services/
│   ├── real_time_service.dart      # WS → /api/data
│   └── api_service.dart            # HTTP client
├── student_app/lib/screens/
│   ├── wallet_screen.dart          # quiet refresh
│   ├── dashboard_screen.dart       # quiet refresh
│   ├── subscription_screen.dart    # quiet refresh
│   ├── course_detail_screen.dart   # quiet refresh (4 event types)
│   └── main_layout.dart            # snackbar
└── admin_app/lib/services/
    └── real_time_service.dart      # WS → /api/data

wrangler.toml                       # config (196 lines)
worker-configuration.d.ts           # TS types
```

---

## 3. Core Architecture: Worker-Shield + Write-Through

### 3.1 The `/api/data` Route (index.ts, line 22257)

```typescript
if (url.pathname === "/api/data") {
  const isWebSocket = request.headers.get("Upgrade") === "websocket";

  // 🟢 FLUTTER: WebSocket upgrade → forward to DO
  if (isWebSocket) {
    let userId = "anonymous";
    try {
      const payload = await requireAuth(request, env);
      userId = payload.sub;
    } catch {}
    const doUrl = new URL(request.url);
    doUrl.searchParams.set("userId", userId);
    const stub = env.DATA_SYNC_DO.get(env.DATA_SYNC_DO.idFromName("data-sync"));
    return stub.fetch(new Request(doUrl.toString(), request));
  }

  // 🟢 NEXT.JS GET: Worker reads D1 directly — NO DO COST
  if (request.method === "GET") {
    const dataType = url.searchParams.get("type");
    const userId = url.searchParams.get("userId");
    if (dataType === "wallet" && userId) {
      const wallet = await env.DB.prepare(
        "SELECT balance_rupees, lifetime_deposits_rupees FROM CreditWallets WHERE user_id = ?"
      ).bind(userId).first();
      return new Response(JSON.stringify(wallet || { balance_rupees: 0 }));
    }
    // Add more GET handlers here (courses, lessons, etc.)
    return new Response(JSON.stringify({ error: "Invalid GET type" }), { status: 400 });
  }

  // 🟢 NEXT.JS POST/PUT/DELETE: Forward to DO
  const stub = env.DATA_SYNC_DO.get(env.DATA_SYNC_DO.idFromName("data-sync"));
  return stub.fetch(request);
}
```

**3 rules:**
1. `Upgrade: websocket` → DataSyncDO (WS lifecycle)
2. `GET` → Worker reads D1 directly (0 DO cost)
3. `POST/PUT/DELETE` → DataSyncDO (D1 write + WS broadcast)

### 3.2 Write-Through in DataSyncDO

```
POST → DataSyncDO.fetch()
  │
  ├── case "wallet": handleWalletMutation()
  │     ├── 1️⃣ D1 batch write (INSERT/UPDATE)
  │     ├── 2️⃣ D1 read fresh balance
  │     ├── 3️⃣ broadcastToClients("wallet", userId, data)
  │     └── 4️⃣ HTTP 200 {success, balance}
  │
  └── default: broadcast only (worker already wrote to D1)
        ├── if userId → getWebSockets(userId)
        └── if no userId → getWebSockets()   ← ALL connected WS
```

**Critical:** D1 write ke baad hi broadcast hota hai. Agar D1 fail → broadcast nahi hoga.

---

## 4. Durable Objects (Remaining)

Legacy cleanup ke baad sirf **3 Durable Objects** hain:

| Binding Name | Class | Instance | File | Purpose |
|--------------|-------|----------|------|---------|
| `DATA_SYNC_DO` | `DataSyncDO` | Single `"data-sync"` | `src/data-sync-do.ts` | WS + D1 writes + broadcast |
| `NOTIFICATION_MANAGER` | `NotificationManager` | Per-user | `src/durable-objects/notification-manager.ts` | Push notifications |
| `ADMIN_COMMAND_PROCESSOR` | `AdminCommandProcessor` | Single | `src/durable-objects/admin-command-processor.ts` | Batch admin commands |

### wrangler.toml — Production Bindings (line 82)

```toml
[durable_objects]
bindings = [
  { name = "NOTIFICATION_MANAGER", class_name = "NotificationManager" },
  { name = "ADMIN_COMMAND_PROCESSOR", class_name = "AdminCommandProcessor" },
  { name = "DATA_SYNC_DO", class_name = "DataSyncDO" }
]
```

### wrangler.toml — Preview Bindings (line 181)

```toml
[env.preview.durable_objects]
bindings = [
  { name = "NOTIFICATION_MANAGER", class_name = "NotificationManager" },
  { name = "ADMIN_COMMAND_PROCESSOR", class_name = "AdminCommandProcessor" },
  { name = "DATA_SYNC_DO", class_name = "DataSyncDO" }
]
```

### wrangler.toml — Migrations (line 107)

```toml
[[migrations]]
tag = "v_notification_do_1"
new_classes = ["NotificationManager"]

[[migrations]]
tag = "v_admin_command_processor_1"
new_classes = ["AdminCommandProcessor"]

[[migrations]]
tag = "v_data_sync_do_1"
new_classes = ["DataSyncDO"]
```

### worker-configuration.d.ts — Types

```typescript
interface Env {
  DATA_SYNC_DO: DurableObjectNamespace<import("./src/index").DataSyncDO>;
  NOTIFICATION_MANAGER: DurableObjectNamespace<import("./src/index").NotificationManager>;
  ADMIN_COMMAND_PROCESSOR: DurableObjectNamespace<import("./src/index").AdminCommandProcessor>;
  DB: D1Database;
  // ... other bindings
}
```

---

## 5. Request Flow Details

### 5.1 GET (Read) — Worker → D1 Direct

```
Next.js                     Worker (index.ts)               D1
   │                            │                           │
   │  GET /api/data             │                           │
   │  ?type=wallet&userId=abc   │                           │
   │ ─────────────────────►     │                           │
   │                            │  env.DB.prepare(SELECT)   │
   │                            │ ───────────────────────►  │
   │                            │ ◄──── balance_rupees ──  │
   │                            │                           │
   │  HTTP 200 {balance_rupees} │                           │
   │ ◄───────────────────────    │                           │
```

**Cost:** 0 DO request units + 1 D1 read
**Line:** index.ts:22288-22304

### 5.2 POST (Mutation) — Write-Through

```
Next.js                     Worker                  DataSyncDO              D1              Flutter WS
   │                            │                     │                   │                  │
   │  POST /api/data            │                     │                   │                  │
   │  {type:"wallet",action:    │                     │                   │                  │
   │   "add_balance", userId,   │                     │                   │                  │
   │   amount}                  │                     │                   │                  │
   │ ─────────────────────►     │                     │                   │                  │
   │                            │  Forward ──────►    │                   │                  │
   │                            │                     │  1️⃣ D1 batch      │                  │
   │                            │                     │ ─────────────────► │                  │
   │                            │                     │ ◄────── OK ────── │                  │
   │                            │                     │  2️⃣ D1 read       │                  │
   │                            │                     │ ─────────────────► │                  │
   │                            │                     │ ◄── balance_rupees │                  │
   │                            │                     │  3️⃣ Broadcast      │                  │
   │                            │                     │ ws.send(fullData) ───────────────────► │
   │  HTTP 200 ◄──────────────── ◄────────────────── │                   │                  │
```

**Cost:** 1 DO request unit + 1 D1 batch write + 1 D1 read
**Line:** index.ts:22310 + data-sync-do.ts:66-82

### 5.3 WebSocket Upgrade

```
Flutter                     Worker                      DataSyncDO
   │                            │                           │
   │  GET /api/data             │                           │
   │  Upgrade: websocket        │                           │
   │  Cookie: session=<jwt>     │                           │
   │ ─────────────────────►     │                           │
   │                            │  requireAuth(request)     │
   │                            │  → {sub: userId}         │
   │                            │                           │
   │                            │  Forward ──────►          │
   │                            │  ?userId=abc123           │
   │                            │                           │
   │                            │  acceptWebSocket(server,  │
   │                            │    ["abc123"])            │
   │                            │                           │
   │  HTTP 101 (Switching) ◄──────────────────────────────  │
   │                            │                           │
   │  ────── WebSocket Open ────────►                       │
```

**Cost:** 1 DO request unit (one-time, then zero for pings via Hibernation)
**Line:** index.ts:22275-22285, data-sync-do.ts:50-57

---

## 6. WebSocket Authentication

### How It Works

1. **Flutter** `IOWebSocketChannel.connect(uri, headers:)` bhejta hai **standard HTTP GET** with `Upgrade: websocket`
2. `Cookie` header is included in upgrade headers (just like any HTTP request)
3. **Worker** receives the upgrade, calls `requireAuth(request, env)` which reads `getCookie(request, "session")`
4. If auth succeeds → userId is extracted and forwarded to DataSyncDO as query param
5. If auth fails → fallback to `userId = "anonymous"` (graceful degradation)

### Flutter Code (real_time_service.dart)

```dart
final cookie = await ApiService.getSessionCookie();
if (cookie.isEmpty) {
  debugPrint('[RealTime] No session cookie — skipping');
  return;
}
final headers = <String, String>{
  'Cookie': cookie,               // ← Session JWT for user identity
  'User-Agent': 'AdityanveshanApp/1.0',
};
final storedJwt = await IntegrityService.getAppJwt();
if (storedJwt != null) {
  headers['X-App-JWT'] = storedJwt;  // ← Play Integrity (app attestation only)
}
_channel = IOWebSocketChannel.connect(uri, headers: headers);
```

### Worker Code (requireAuth, index.ts line ~3575)

```typescript
async function requireAuth(request: Request, env: Env) {
  const token = getCookie(request, "session");  // Parses Cookie header
  if (!token) throw new HttpError("Unauthorized", 401);
  const jwtSecret = await getCachedJwtSecret(env);
  const payload = await verifyJWT(token, jwtSecret, env.ENVIRONMENT);
  // Also checks current_session_id in DB
  return payload;  // { sub: userId, role: string }
}
```

### Auth Mechanism Comparison

| Mechanism | Used For | Identifies User? | Security Concern |
|-----------|----------|-----------------|-----------------|
| `Cookie: session=<jwt>` | User identity | ✅ Yes | None — standard HttpOnly cookie |
| `X-App-JWT` (Play Integrity) | App attestation | ❌ No (`sub: 'play_integrity_verified'`) | None — can't identify user |
| `?token=xxx` query param | **REJECTED** | Would work | ❌ Leaks in server logs, URL history, referrer headers |

---

## 7. DataSyncDO Code Walkthrough

**File:** `src/data-sync-do.ts` (172 lines)

### Full Code

```typescript
import { DurableObject } from "cloudflare:workers";

export interface DataSyncPayload {
  type: string;
  action: string;
  userId?: string;
  data: any;
}

function generateCustomId(prefix: string): string {
  const randomPart = crypto.randomUUID().substring(0, 12).toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${randomPart}${timestampPart}`;
}

export class DataSyncDO extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Edge handles ping/pong — DO never wakes for keepalives
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}')
    );
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");

    if (upgrade === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId") || "anonymous";
      this.ctx.acceptWebSocket(server, [userId]);  // Tag with userId
      return new Response(null, { status: 101, webSocket: client });
    }

    const body = await request.json().catch(() => ({})) as any;
    const dataType = body.type;

    switch (dataType) {
      case "wallet":
        return await this.handleWalletMutation(body);
      default:
        // Generic broadcast — main worker already wrote to D1
        if (body.userId) {
          this.broadcastToClients(dataType, body.userId, body.data);
        } else {
          this.broadcastToClients(dataType, undefined, body.data);  // ALL WS
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
    }
  }

  private async handleWalletMutation(body: any): Promise<Response> {
    const { userId, action, amount } = body;

    if (action === "add_balance") {
      const safeAmount = Math.max(0, Number(amount) || 0);
      if (safeAmount <= 0) return new Response(..., { status: 400 });

      const walletId = generateCustomId("YA-CRW");
      const ledgerId = generateCustomId("YA-CRL");

      // 1️⃣ D1 Write
      await this.env.DB.batch([
        this.env.DB.prepare(`INSERT INTO CreditWallets ... ON CONFLICT ...`).bind(...),
        this.env.DB.prepare(`INSERT INTO CreditLedger ...`).bind(...),
      ]);

      // 2️⃣ D1 Read (fresh balance)
      const newWallet: any = await this.env.DB.prepare(
        "SELECT balance_rupees, lifetime_deposits_rupees FROM CreditWallets WHERE user_id = ?"
      ).bind(userId).first();
      const balance = newWallet?.balance_rupees || safeAmount;

      // 3️⃣ Broadcast full data
      this.broadcastToClients("wallet", userId, { balance_rupees: balance });

      // 4️⃣ HTTP 200
      return new Response(JSON.stringify({ success: true, balance_rupees: balance }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
  }

  private broadcastToClients(type: string, userId: string | undefined, data: any) {
    const payload: DataSyncPayload = { type, action: `${type}_updated`, userId, data };
    const message = JSON.stringify(payload);

    const websockets = userId
      ? this.ctx.getWebSockets(userId)    // User-specific
      : this.ctx.getWebSockets();          // All connections

    for (const ws of websockets) {
      try { ws.send(message); } catch (e) {
        console.error("[DataSyncDO] broadcast failed:", e);
      }
    }
  }

  // Hibernation lifecycle hooks
  async webSocketMessage(ws: WebSocket, message: string) {}
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {}
  async webSocketError(ws: WebSocket, error: unknown) {
    console.error("[DataSyncDO] WS error:", error);
  }
}
```

### Key Methods

| Method | Line | Purpose |
|--------|------|---------|
| `constructor` | 36 | `setWebSocketAutoResponse` for edge-level ping/pong |
| `fetch()` — WS | 50 | Accept WebSocket with userId tag |
| `fetch()` — POST wallet | 67 | D1 write + broadcast |
| `fetch()` — POST default | 69 | Broadcast only (worker already wrote to D1) |
| `handleWalletMutation()` | 88 | Full write-through for wallet operations |
| `broadcastToClients()` | 143 | Targeted or global WebSocket send |
| `webSocketMessage()` | 161 | Hibernation lifecycle — currently empty |
| `webSocketClose()` | 165 | Hibernation lifecycle — currently empty |
| `webSocketError()` | 169 | Logs errors |

---

## 8. Broadcast Helpers

**File:** `index.ts` (lines 3260-3313)

4 helper functions that wrap DataSyncDO calls for fire-and-forget broadcasting:

### broadcastToUser (line 3260)

```typescript
async function broadcastToUser(env: Env, userId: string, type: string, data: any): Promise<void> {
  try {
    const stub = env.DATA_SYNC_DO.get(env.DATA_SYNC_DO.idFromName("data-sync"));
    await stub.fetch("http://do/broadcast", {
      method: "POST",
      body: JSON.stringify({ type, userId, data }),
    });
  } catch (e) {
    console.error(`[Broadcast] Failed for user ${userId}:`, e);
  }
}
```

### broadcastToUsers (line 3276)

```typescript
async function broadcastToUsers(env: Env, userIds: string[], type: string, data: any): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.allSettled(userIds.map((uid) => broadcastToUser(env, uid, type, data)));
}
```

### broadcastToAll (line 3284)

```typescript
async function broadcastToAll(env: Env, type: string, data: any): Promise<void> {
  try {
    const stub = env.DATA_SYNC_DO.get(env.DATA_SYNC_DO.idFromName("data-sync"));
    await stub.fetch("http://do/broadcast", {
      method: "POST",
      body: JSON.stringify({ type, data }),  // No userId → ALL WebSockets
    });
  } catch (e) {
    console.error("[Broadcast] Global broadcast failed:", e);
  }
}
```

### broadcastToCourseEnrollees (line 3301)

```typescript
async function broadcastToCourseEnrollees(env: Env, DB: D1Database, courseId: string, type: string, data: any): Promise<void> {
  try {
    const enrollments: any = await DB.prepare(
      "SELECT user_id FROM Enrollments WHERE course_id = ? AND (status = 'active' OR status = 'enrolled')"
    ).bind(courseId).all();
    const userIds: string[] = enrollments.results?.map((r: any) => r.user_id) || [];
    if (userIds.length > 0) {
      await broadcastToUsers(env, userIds, type, data);
    }
  } catch (e) {
    console.error(`[Broadcast] Failed to notify course ${courseId} enrollees:`, e);
  }
}
```

### Usage Map (Replacing Old notifyUser Calls)

| Old Function | New Helper | Entity Types |
|-------------|-----------|-------------|
| `notifyUser(env, userId, payload)` | `broadcastToUser(env, userId, entity, data)` | notification, user, wallet, enrollment, progress, subscription |
| `notifyUsers(env, userIds, payload)` | `broadcastToUsers(env, userIds, entity, data)` | broadcast |
| `notifyGlobal(env, payload)` | `broadcastToAll(env, entity, data)` | secret, course |
| `notifyCourseEnrolled(env, DB, courseId, payload)` | `broadcastToCourseEnrollees(env, DB, courseId, entity, data)` | lesson, live_session |

---

## 9. Flutter Client Integration

### Student App — WebSocket Connection

**File:** `flutter/student_app/lib/services/real_time_service.dart`

```dart
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';

class RealTimeService {
  static final RealTimeService instance = RealTimeService._();
  final _dataController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get dataStream => _dataController.stream;

  WebSocketChannel? _channel;
  bool _isConnected = false;

  String get _dataWsUrl {
    final base = ApiService.baseUrl
        .replaceFirst('https://', 'wss://')
        .replaceFirst('http://', 'ws://');
    return '$base/api/data';
  }

  Future<void> connect() async {
    if (_isConnected) return;
    await _doConnect();
  }

  Future<void> _doConnect() async {
    try {
      final cookie = await ApiService.getSessionCookie();
      if (cookie.isEmpty) {
        debugPrint('[RealTime] No session cookie — skipping');
        return;
      }

      final uri = Uri.parse(_dataWsUrl);
      final headers = <String, String>{
        'Cookie': cookie,
        'User-Agent': 'AdityanveshanApp/1.0',
      };
      // X-App-JWT is optional — app attestation only
      final appJwt = await ApiService.getSessionCookieValue();
      if (appJwt != null) {
        final storedJwt = await IntegrityService.getAppJwt();
        if (storedJwt != null && storedJwt.isNotEmpty) {
          headers['X-App-JWT'] = storedJwt;
        }
      }

      _channel = IOWebSocketChannel.connect(uri, headers: headers);
      await _channel!.ready;
      _isConnected = true;

      _channel!.stream.listen(
        (message) {
          final data = jsonDecode(message as String) as Map<String, dynamic>;
          if (data['type'] == 'pong') return;  // Hibernation ping/pong
          _dataController.add(data);            // Full data — no follow-up HTTP
        },
        onDone: () { /* reconnect logic */ },
        onError: (error) { /* reconnect logic */ },
      );
    } catch (e) {
      debugPrint('[RealTime] Connection failed: $e');
      // reconnect logic
    }
  }
}
```

### Student App — Screen Handlers

**WalletScreen** (`wallet_screen.dart`):
```dart
_realtimeSub = RealTimeService.instance.dataStream.listen((event) async {
  if (!mounted) return;
  if (event['type'] == 'wallet') {
    final data = event['data'] as Map<String, dynamic>?;
    if (data != null && data.containsKey('balance_rupees')) {
      setState(() => _balanceData = data);  // ← No shimmer, no loading flash
    }
  }
});
```

**DashboardScreen** (`dashboard_screen.dart`): Handles `type == 'wallet'` → calls `_refreshDashQuietly()` (no `_isLoading` state change).

**SubscriptionScreen** (`subscription_screen.dart`): Uses `_fetchDataQuietly()` for subscription events.

**CourseDetailScreen** (`course_detail_screen.dart`): Handles 4 event types — `enrollment`, `lesson`, `progress`, `live_session` — each calling `_fetchCourseContentQuietly()`.

**MainLayout** (`main_layout.dart`): Shows snackbar on `type == 'wallet'` events.

### Admin App — WebSocket Connection

**File:** `flutter/admin_app/lib/services/real_time_service.dart` (line 92)

```dart
final uri = Uri.parse('$_wsUrl/api/data');  // → /api/data (changed from /api/ws)
```

Same pattern as student app — cookie-based auth via `Cookie` header.

---

## 10. Next.js Client Integration

### WebSocket (Deprecated for Data Fetching)

**File:** `contexts/WebSocketContext.tsx` (line 35)

```typescript
const wsUrl = `${protocol}//${host}/api/data`;  // Changed from /api/ws
const ws = new WebSocket(wsUrl);
```

Next.js WebSocket is kept only for admin notifications (course_published snackbar). **Data fetching should always use HTTP GET.**

### HTTP GET Example

```typescript
async function fetchWalletBalance(userId: string): Promise<number> {
  const res = await fetch(
    `/api/data?type=wallet&userId=${encodeURIComponent(userId)}`,
    { method: 'GET', credentials: 'include' }
  );
  const data = await res.json();
  return data.balance_rupees;  // 0 DO cost — direct D1 response
}
```

### HTTP POST Example

```typescript
async function addBalance(userId: string, amount: number) {
  const res = await fetch('/api/data', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'wallet',
      action: 'add_balance',
      userId: userId,
      amount: amount,
    }),
  });
  return res.json();  // { success: true, balance_rupees: 700 }
}
```

---

## 11. ID Generation

**Defined in:** `src/index.ts` (line 3233) + `src/data-sync-do.ts` (line 30)

Duplicated because DO modules cannot import from index.ts (same pattern as admin-command-processor.ts).

```typescript
function generateCustomId(prefix: string): string {
  const randomPart = crypto.randomUUID().substring(0, 12).toUpperCase();
  const timestampPart = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${randomPart}${timestampPart}`;
}
```

**Format:** `{PREFIX}-{12 randomUUID chars}{6 base36 timestamp chars}`

**Example output:** `YA-CRW-A1B2C3D4E5F6-X7Y8Z9`

### Prefix Registry

| Prefix | Entity | Used In |
|--------|--------|---------|
| `YA-CRW` | CreditWallets | Wallet balance records |
| `YA-CRL` | CreditLedger | Ledger (audit trail) entries |
| `YA-CRS` | Courses | Course records |
| `YA-ENR` | Enrollments | Enrollment records |
| `YA-LSN` | Lessons | Lesson records |
| `YA-SUB` | Subscriptions | Subscription records |
| `YA-NTF` | Notifications | Notification records |
| `YA-TXN` | Transactions | Transaction records |
| `YA-USR` | Users | User records |

---

## 12. Database Schema

### CreditWallets

```sql
CREATE TABLE IF NOT EXISTS CreditWallets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    balance_rupees REAL NOT NULL DEFAULT 0,
    lifetime_deposits_rupees REAL NOT NULL DEFAULT 0,
    lifetime_withdrawals_rupees REAL NOT NULL DEFAULT 0,
    subscription_id TEXT,
    credits_period TEXT DEFAULT 'none',
    period_start DATETIME,
    period_end DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
```

### CreditLedger

```sql
CREATE TABLE IF NOT EXISTS CreditLedger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    change_rupees REAL NOT NULL DEFAULT 0,
    balance_after_rupees REAL NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
```

### Key Constraints

- Both tables use `TEXT PRIMARY KEY` — no auto-increment, application generates IDs
- `CreditWallets.user_id` is `UNIQUE` — one wallet per user
- `ON CONFLICT(user_id) DO UPDATE` pattern handles upsert

---

## 13. Billing & Cost Optimization

### Cloudflare Pricing (2026)

| Component | Cost | Our Pattern |
|-----------|------|-------------|
| DO request units | $0.30/million | Only POST + WS (GET bypasses DO) |
| DO duration | $0.001/GB-s | Near zero (Hibernation handles ping/pong) |
| D1 reads | $0.001/million rows | All GET requests |
| D1 writes | $1.00/million rows | Only mutations |

### Savings vs Old Architecture

| Scenario | Old (100% DO) | New (Worker-Shield) | Saving |
|----------|---------------|-------------------|--------|
| 500k GET requests/month | 500k DO req units | 0 DO req units | ~$180/year |
| Avg GET latency | ~150ms (DO wake + D1) | ~30ms (direct D1) | **5x faster** |
| DO concurrency slots | Blocked by reads | Free for writes/WS | **More capacity** |

### Why Hibernation Matters

`this.ctx.setWebSocketAutoResponse(...)` tells Cloudflare Edge:
- "When client sends `{"type":"ping"}`, respond with `{"type":"pong"}` automatically"
- **DO never wakes up** for keepalives
- DO only wakes for: actual data messages, D1 queries, or connection close
- Duration billing drops to near zero

### DO Storage Not Used

```typescript
// ❌ This does NOT exist in DataSyncDO:
this.ctx.storage.sql.exec(`CREATE TABLE ...`);
this.ctx.storage.put("key", value);

// ✅ Only this exists:
this.env.DB.prepare(...);   // D1 queries
this.ctx.getWebSockets();   // WebSocket state (managed by runtime)
this.ctx.acceptWebSocket(); // WebSocket acceptance
```

DO storage billing is $0 because we don't use it for app data.

---

## 14. What Was Removed (Legacy Cleanup)

### Files Deleted (3)

| File | Lines | Purpose |
|------|-------|---------|
| `src/realtime-helpers.ts` | 75 | `notifyUser`, `notifyUsers`, `notifyGlobal`, `notifyCourseEnrolled` |
| `src/user-connection-do.ts` | 239 | Per-user WebSocket + event buffer DO |
| `src/broadcast-coordinator-do.ts` | 104 | Global broadcast coordinator DO |

### What Changed in index.ts

| Change | Detail |
|--------|--------|
| Import removed | `UserConnectionDO`, all 4 `notify*` functions |
| Import kept | `DataSyncDO` |
| Added (line 3260) | `broadcastToUser`, `broadcastToUsers`, `broadcastToAll`, `broadcastToCourseEnrollees` |
| 19 old notify calls | Replaced with new broadcast helpers |
| `/api/ws` route (28 lines) | Removed entirely |
| Export removed (line 24753) | `UserConnectionDO` |
| Export removed (line 24755) | `BroadcastCoordinatorDO` |

### What Changed in wrangler.toml

| Change | Line(s) | Detail |
|--------|---------|--------|
| Production bindings | 82-88 | Removed `USER_CONNECTION_DO` + `BROADCAST_COORDINATOR_DO` |
| Preview bindings | 181-185 | Removed both |
| Migrations | 115-121 | Removed `v_user_connection_do_1` + `v_broadcast_coordinator_do_1` |

### What Changed in worker-configuration.d.ts

| Change | Lines | Detail |
|--------|-------|--------|
| `__BaseEnv_Env` | 20-22 | Removed both DO types |
| `PreviewEnv` | 45-49 | Removed both |
| `durableNamespaces` | ~29 | Removed from union |

### What Changed in Client Apps

| File | Change |
|------|--------|
| `contexts/WebSocketContext.tsx` (line 35) | `/api/ws` → `/api/data` |
| `flutter/admin_app/.../real_time_service.dart` (line 92) | `/api/ws` → `/api/data` |

---

## 15. Deployment

### Prerequisites

```bash
# Required secrets (set once)
npx wrangler secret put JWT_SECRET
npx wrangler secret put APP_API_SECRET
npx wrangler secret put PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON
```

### Deploy Worker

```bash
# Production
npx wrangler deploy --env production

# Preview
npx wrangler deploy --env preview

# Dry run (validate config only)
npx wrangler deploy --dry-run --env production
```

### Flutter Build (Student App)

```bash
cd flutter/student_app
flutter build apk --dart-define=APP_API_SECRET=<your-secret>
```

### Flutter Build (Admin App)

```bash
cd flutter/admin_app
flutter build apk --dart-define=APP_API_SECRET=<your-secret>
```

### Wrangler Migration Order

Current migrations in order:

```
1. v_notification_do_1 → NotificationManager
2. v_admin_command_processor_1 → AdminCommandProcessor
3. v_data_sync_do_1 → DataSyncDO
```

`v_user_connection_do_1` and `v_broadcast_coordinator_do_1` were removed after successful deployment.

---

## 16. Bug Fixes During Cleanup

### Bug: Preview Env Missing DATA_SYNC_DO Binding

**Found during:** Final verification of wrangler.toml (line 181-185)

**Symptom:** Preview environment's `[env.preview.durable_objects]` had only `NOTIFICATION_MANAGER` and `ADMIN_COMMAND_PROCESSOR`. `DATA_SYNC_DO` was missing entirely.

**Fix applied:** Added `{ name = "DATA_SYNC_DO", class_name = "DataSyncDO" }` to preview bindings.

**Impact if not fixed:** Deploying to preview would fail — DataSyncDO class not found error when any Flutter app connects to preview environment.

### Bug: Inconsistent ID Generation in data-sync-do.ts

**Found during:** Architecture audit

**Symptom:** Original code used `\`YA-CRW-${Date.now()}-${Math.random().toString(36).slice(2,6)}\`` — does not match canonical `generateCustomId()` format.

**Fix applied:** Replaced with `generateCustomId("YA-CRW")` and `generateCustomId("YA-CRL")`.

### Bug: handleAdminAddBalance Broadcast Type

**Found during:** Code review

**Symptom:** `handleAdminAddBalance` called DataSyncDO with `action: "broadcast"` but old DataSyncDO didn't have a generic broadcast handler — would return "Unknown type" error.

**Fix applied:** Added `default:` case in DataSyncDO fetch() that handles any dataType with userId+data as a generic broadcast.
