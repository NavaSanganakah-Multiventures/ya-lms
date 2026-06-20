# Fix Plan: Remaining Bugs After HMAC/Gemini Fix

## Bug #1: Razorpay Credentials Missing Null Check

### Problem
`getOrCreateRazorpayCustomer()` at `src/index.ts:16541` fetches `rzpKey` and `rzpSecret` via `getSecret()` but never validates them before use. If either is missing, `btoa("null:null")` produces a broken auth header, causing a cryptic Razorpay API error. Every other Razorpay function in the codebase **does** check for null (lines 15048, 15712, 15821, 16330, 16462, 16613).

### Changes
1. **`src/index.ts`** — Add null check in `getOrCreateRazorpayCustomer()` after line 16542:
   ```typescript
   if (!rzpKey || !rzpSecret) {
     throw new Error("Razorpay not configured: Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
   }
   ```
   **Validation**: `npm run lint` — no errors

### Edge Cases
- If only one secret is missing, users get a clear error instead of silent auth failure
- Other Razorpay functions already handle this, so this makes the codebase consistent

---

## Bug #2: `fetchAIStream()` Missing Null Check on Cloudflare Credentials

### Problem
`fetchAIStream()` at `src/index.ts:17184` fetches `accountId`, `cfToken`, `aigToken` via `getSecret()` but never validates them. If missing, the gateway URL becomes `https://gateway.ai.cloudflare.com/v1/null/vertexai/...` and auth header becomes `Bearer null`. The sibling function `generateAIContent()` (line 17107) **does** properly check:
```typescript
if (!accountId || !aigToken || aigToken === "null") {
  throw new Error("AI Setup Incomplete: Missing Cloudflare Credentials.");
}
```

### Changes
1. **`src/index.ts`** — Add the same null check in `fetchAIStream()` after line 17188:
   ```typescript
   if (!accountId || !aigToken || aigToken === "null") {
     throw new Error("AI Setup Incomplete: Missing Cloudflare Credentials.");
   }
   ```
   **Validation**: `npm run lint` — no errors

---

## Bug #3: DB Results Direct Indexing Without Bounds Check

### Problem
Three locations in `src/index.ts` access `results[N]` directly without checking if the array has enough elements:
- **Line 3124**: `results[0].results[0]` through `results[3].results[0]` — double indexing, could crash if DB returns fewer result sets
- **Line 5598**: `results[0] as any` through `results[2] as any`
- **Line 5725**: `results[0] as any` through `results[4] as any`

### Changes
1. **`src/index.ts:3124`** — Replace:
   ```typescript
   const users = results[0].results[0] as any;
   const courses = results[1].results[0] as any;
   const enrollments = results[2].results[0] as any;
   const revenue = results[3].results[0] as any;
   ```
   With safe access using optional chaining + fallback:
   ```typescript
   const safeResult = (i: number) => results[i]?.results?.[0];
   const users = safeResult(0);
   const courses = safeResult(1);
   const enrollments = safeResult(2);
   const revenue = safeResult(3);
   ```

2. **`src/index.ts:5598`** — Replace:
   ```typescript
   const r0 = results[0] as any;
   const r1 = results[1] as any;
   const r2 = results[2] as any;
   ```
   With:
   ```typescript
   const r0 = results[0] as any || {};
   const r1 = results[1] as any || {};
   const r2 = results[2] as any || {};
   ```

3. **`src/index.ts:5725`** — Replace:
   ```typescript
   const r0 = results[0] as any;
   const r1 = results[1] as any;
   const r2 = results[2] as any;
   const r3 = results[3] as any;
   const r4 = results[4] as any;
   ```
   With:
   ```typescript
   const r0 = results[0] as any || {};
   const r1 = results[1] as any || {};
   const r2 = results[2] as any || {};
   const r3 = results[3] as any || {};
   const r4 = results[4] as any || {};
   ```

   **Validation**: `npm run lint` — no errors

### Risks & Mitigations
- These are defensive guards. The DB queries are hardcoded and always return the same structure, but the guard prevents crashes if DB schema changes or migration runs mid-query.

---

## Bug #4: `imageUrl!` Non-Null Assertion Risk

### Problem
`src/index.ts:8468` uses `imageUrl!` to assert non-null, but `imageUrl` (line 8464) can be null if `buildPublicAssetUrl()` returns falsy. This passes `null`/`undefined` downstream into `buildMerchantProductInput`.

### Changes
1. **`src/index.ts:8468`** — Replace:
   ```typescript
   const productInput = buildMerchantProductInput(course, listing, landingUrl, imageUrl!);
   ```
   With proper null handling:
   ```typescript
   const productInput = buildMerchantProductInput(course, listing, landingUrl, imageUrl || "");
   ```

   **Validation**: `npm run lint` — no errors

---

## Bug #5: Flutter HTTP Calls Missing Timeout

### Problem
All 14 `http.get()`/`http.post()` calls in `api_service.dart` lack `.timeout()`. On slow networks these can hang indefinitely. Only `notification_service.dart:274` correctly uses `.timeout(Duration(seconds: 10))`.

### Changes
1. **`flutter/student_app/lib/services/api_service.dart`** — Add timeout to every HTTP call. Create a helper:
   ```typescript
   // Not applicable — this is Dart
   ```
   Instead, add `.timeout(const Duration(seconds: 15))` to each `http.get()` and `http.post()` call. For brevity, a wrapper method would be cleanest, but adding inline is safer for existing call sites.

   Files to modify: `api_service.dart` (14 calls)

   Pattern for each call:
   ```dart
   final response = await http.post(url, headers: await getHeaders(), body: body)
       .timeout(const Duration(seconds: 15));
   ```

   **Validation**: `cd flutter/student_app && flutter analyze` — no errors

---

## Bug #6: Flutter `catchError` Return-Type Mismatch

### Problem
`course_detail_screen.dart:427,432` uses `.catchError((_) => null as dynamic)` on `updateProgress()` which returns `Future<http.Response>`. In null-safe Dart 3, returning `null` for a non-nullable type causes a runtime type error.

### Changes
1. **`flutter/student_app/lib/screens/course_detail_screen.dart:427`** — Replace:
   ```dart
   ApiService.updateProgress(widget.courseId!, 100).catchError((_) => null as dynamic);
   ```
   With empty catch (void return):
   ```dart
   ApiService.updateProgress(widget.courseId!, 100).catchError((_) {});
   ```

2. **`flutter/student_app/lib/screens/course_detail_screen.dart:432`** — Same fix.

   **Validation**: `cd flutter/student_app && flutter analyze` — no errors

---

## Bug #7: Flutter Fire-and-Forget Futures

### Problem
Two locations have un-awaited Futures causing unhandled rejections:
- `notification_service.dart:189` — `_registerDevice()` not awaited inside stream listener
- `profile_screen.dart:57` — `auth.logout()` not awaited before navigation

### Changes
1. **`notification_service.dart:189`** — Replace:
   ```dart
   _messaging!.onTokenRefresh.listen((newToken) {
     _fcmToken = newToken;
     _registerDevice();
   });
   ```
   With:
   ```dart
   _messaging!.onTokenRefresh.listen((newToken) async {
     _fcmToken = newToken;
     await _registerDevice();
   });
   ```

2. **`profile_screen.dart:57`** — Replace:
   ```dart
   auth.logout();
   Navigator.of(context).popUntil((route) => route.isFirst);
   ```
   With:
   ```dart
   await auth.logout();
   if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
   ```

   **Validation**: `cd flutter/student_app && flutter analyze` — no errors

---

## Bug #8: Post-Payment Email Failure Silent Swallow

### Problem
`src/index.ts:15203` catches email send errors with only `console.error`, never surfacing the failure. User gets `{ success: true }` even when critical post-payment notifications fail.

### Changes
1. **`src/index.ts:15203`** — Replace:
   ```typescript
   } catch (e) { console.error("Post-payment email error:", e); }
   ```
   With:
   ```typescript
   } catch (e) {
     console.error("Post-payment email error:", e);
     await sendRedAlert(env, `Post-payment notification failed: ${e instanceof Error ? e.message : e}`, "Payment.Notification");
   }
   ```

   **Validation**: `npm run lint` — no errors

---

## Bug #9: Dead `crypto` Dependency

### Problem
`flutter/student_app/pubspec.yaml:52` lists `crypto: ^3.0.7` but no Dart file imports it anymore (HMAC code was removed).

### Changes
1. **`flutter/student_app/pubspec.yaml:52`** — Remove the line:
   ```yaml
   crypto: ^3.0.7
   ```

   **Validation**: `cd flutter/student_app && flutter pub get` — no errors

---

## Bug #10: Duplicate API Base URL

### Problem
`notification_service.dart:32-35` defines its own `_apiBaseUrl` duplicating `ApiService.baseUrl`. If the base URL ever changes, both must be updated.

### Changes
1. **`flutter/student_app/lib/services/notification_service.dart`** — Replace `_apiBaseUrl` usage with `ApiService.baseUrl`:
   - Remove lines 32-35 (the `_apiBaseUrl` constant declaration)
   - Replace `$_apiBaseUrl` on line 270 with `${ApiService.baseUrl}`
   - Remove the associated comment if any

   **Validation**: `cd flutter/student_app && flutter analyze` — no errors

---

## Bug #11: Unused `import 'dart:async'`

### Problem
`notification_service.dart:1` imports `dart:async` but never uses any symbol from it (Future/Stream are implicitly available via `dart:core`).

### Changes
1. **`flutter/student_app/lib/services/notification_service.dart:1`** — Remove the line:
   ```dart
   import 'dart:async';
   ```

   **Validation**: `cd flutter/student_app && flutter analyze` — no errors

---

## Summary of All Changes

| # | Severity | File | Type | Change |
|---|----------|------|------|--------|
| 1 | High | `src/index.ts:16541` | TypeScript | Add null check for Razorpay credentials |
| 2 | High | `src/index.ts:17184` | TypeScript | Add null check for Cloudflare credentials |
| 3 | Medium | `src/index.ts:3124,5598,5725` | TypeScript | Safe DB result indexing with fallbacks |
| 4 | Medium | `src/index.ts:8468` | TypeScript | Replace `imageUrl!` with `imageUrl \|\| ""` |
| 5 | Medium | `api_service.dart` (14 calls) | Dart | Add `.timeout(15s)` to all HTTP calls |
| 6 | Medium | `course_detail_screen.dart:427,432` | Dart | Fix `catchError` return type |
| 7 | Medium | `notification_service.dart:189`, `profile_screen.dart:57` | Dart | Await fire-and-forget Futures |
| 8 | Low | `src/index.ts:15203` | TypeScript | Surface post-payment email failures via `sendRedAlert` |
| 9 | Low | `pubspec.yaml:52` | YAML | Remove dead `crypto` dependency |
| 10 | Low | `notification_service.dart:32-35` | Dart | Use `ApiService.baseUrl` instead of duplicate |
| 11 | Low | `notification_service.dart:1` | Dart | Remove unused `import 'dart:async'` |

## Validation Steps
- `npm run lint` — zero TypeScript/ESLint errors related to these changes
- `cd flutter/student_app && flutter analyze` — zero Dart analysis errors
- `cd flutter/student_app && flutter pub get` — successful (after removing `crypto`)
- Verify each change manually with code review
