# Fix Plan: Dead HMAC Code & Gemini WebSocket Key Leak

## Bug #1: Remove Dead HMAC Code from Flutter

### Problem
`flutter/student_app/lib/services/api_service.dart` lines 56-64 send `X-App-Timestamp` and `X-App-Signature` headers via HMAC-SHA256, but the server (`src/index.ts`) never validates them. This is dead code that provides no security and could break the app if `APP_API_SECRET` is set at build time.

### Changes

1. **`flutter/student_app/lib/services/api_service.dart`**
   - Remove `import 'package:crypto/crypto.dart';` (line 2)
   - Remove `_appSecret` constant (lines 18-21)
   - Remove HMAC computation block (lines 56-64) from `getHeaders()`
   - Change `getHeaders(String method, String path)` → `getHeaders()` since `method` and `path` are no longer needed
   - Update all call sites to remove the `method` and `path` arguments

2. **Call sites to update** (remove second+third args from `await getHeaders(...)`):
   - `sendOtp` (line 86): `getHeaders('POST', '/api/auth/send-otp')` → `getHeaders()`
   - `leaveLiveClass` (line 97): same pattern
   - `verifyOtp` (line 107): same
   - `getProfile` (line 118): same (GET variant)
   - `logout` (line 128): same (GET variant)
   - `getDashboardData` (line 140): same
   - `updateProgress` (line 149): same
   - `getBooks` (line 159): same
   - `getCourses` (line 168): same
   - `getCourseLessons` (line 178): same
   - `getLiveSessions` (line 187): same
   - `getLiveClassToken` (line 207): same
   - `createRazorpayOrder` (line 221): same
   - `verifyRazorpayPayment` (line 235): same
   - `notification_service.dart` line 271: `ApiService.getHeaders('POST', path)` → `ApiService.getHeaders()`

### Validation
- `cd flutter/student_app && flutter analyze` — no errors
- `cd flutter/student_app && flutter build apk --debug` — builds successfully

---

## Bug #2: Gemini API Key Leak in WebSocket URL

### Problem
`src/index.ts` line 20068 passes the Gemini API key as a URL query parameter:
```
wss://generativelanguage.googleapis.com/ws/...?key=${geminiKey}
```
This URL appears in Worker runtime logs, error messages, and Cloudflare access logs.

### Solution: Server-side WebSocket Proxy

Replace the direct `fetch(geminiUrl, request)` proxy with a server-side relay that keeps the API key internal.

### Architecture

```
Client ──WebSocket──▶ Worker ──WebSocket (w/ key in URL)──▶ Gemini
                          │
                          ▼
                    handleGlobalError (on failure)
                          │
                          ▼
                    Admin Email Alert
```

### Changes

1. **`src/index.ts`** — Replace `/api/ai/ws` handler (lines 20062-20069)

   New flow:
   ```typescript
   else if (url.pathname === "/api/ai/ws" && request.method === "GET") {
     await requireAdminOrTeacher(request, env);
     if (request.headers.get("Upgrade") !== "websocket") {
       return new Response("Expected Upgrade: websocket", { status: 426 });
     }

     const geminiKey = await getSecret(env, "GEMINI_API_KEY");
     if (!geminiKey) {
       return new Response(
         JSON.stringify({ error: "AI service not configured" }),
         { status: 500, headers: { "Content-Type": "application/json" } }
       );
     }

     // Create WebSocket pair: [0] client-facing, [1] server-internal
     const pair = new WebSocketPair();
     const [client, internal] = [pair[0], pair[1]];

     try {
       const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${geminiKey}`;

       // Connect to Gemini using fetch (reliable in Workers runtime)
       const geminiResponse = await fetch(geminiUrl, {
         headers: { "User-Agent": "Cloudflare-Worker" }
       });
       const geminiWs = geminiResponse.webSocket;

       if (!geminiWs) {
         throw new Error("Failed to establish WebSocket connection to Gemini");
       }

       internal.accept();
       geminiWs.accept();

       // Relay: Client → Gemini
       internal.addEventListener("message", (event) => {
         try { geminiWs.send(event.data); } catch (_) {}
       });

       // Relay: Gemini → Client
       geminiWs.addEventListener("message", (event) => {
         try { internal.send(event.data); } catch (_) {}
       });

       // Cleanup: Close one when the other closes
       internal.addEventListener("close", () => geminiWs.close());
       geminiWs.addEventListener("close", () => internal.close());
       geminiWs.addEventListener("error", () => internal.close(1011));

       return new Response(null, { status: 101, webSocket: client });
     } catch (error) {
       // Close the internal pair end so client WebSocket gets an error too
       try { internal.close(1011); } catch (_) {}
       // Admin alert via existing error handling system
       return handleGlobalError(error, "AI.WebSocketProxy", env, request);
     }
   }
   ```

### Error Handling
- Gemini API key missing → 500 response, `handleGlobalError` not needed (no admin alert for config)
- WebSocket/network error → `handleGlobalError` called → admin email alert via `sendRedAlert` + WhatsApp
- Client disconnect → Gemini connection closed gracefully
- Gemini disconnect → Client WebSocket closed with code 1011

### Edge Cases
- **Concurrent connections**: Each `/api/ai/ws` request creates an independent relay pair. Worker runtime handles this natively.
- **Binary messages**: If Gemini sends binary frames, the relay uses `event.data` which works for both text and binary in Workers.
- **Backpressure**: Workers WebSocket implementation handles buffering internally. No additional handling needed for typical AI chat workloads.
- **Partial/fragmented messages**: `event.data` contains the complete message; no fragmentation handling needed.

### Risks & Mitigations
- **Worker CPU time**: WebSocket relay keeps the Worker alive for the duration of the connection. Each connection consumes memory. Mitigation: acceptable for admin/teacher-only access.
- **`new WebSocket()` vs `fetch()`**: Using `fetch()` for outbound WebSocket is the most reliable approach in Workers. Fallback: if `fetch()` fails to upgrade, the error handler triggers.

### Validation
- `npm run lint` — no TypeScript/ESLint errors
- Deploy to preview environment with `wrangler deploy`
- Open browser → login as admin → navigate to AI teacher feature → WebSocket connects
- Check Cloudflare logs: API key should NOT appear in any log line
- Test failure: delete GEMINI_API_KEY from KV → verify 500 response + admin email
