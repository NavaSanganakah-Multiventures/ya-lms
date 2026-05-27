# Push Notification Audit + Implementation Plan

## Current status (quick audit)

### ✅ What is already implemented
- Browser push service worker exists at `public/sw.js` and handles `push` + `notificationclick`.
- Backend stores notification records in `Notifications` and push subscriptions in `PushSubscriptions`.
- Backend sends push for each user subscription from `createNotification(...)` via `sendWebPush(...)`.
- VAPID public/private keys are fetched from `PLATFORM_SECRETS`, and auto-generated if missing.
- Frontend prompt (`components/NotificationPrompt.tsx`) requests browser permission and subscribes using `/api/notifications/vapid-public-key` + `/api/notifications/subscribe`.

### ⚠️ Gaps / risks found
1. `subscribeUser()` always calls `pushManager.subscribe(...)` without checking existing subscription first.
   - This can throw `InvalidStateError` in some browsers when a subscription already exists.
2. No explicit guards for unsupported environments in prompt flow:
   - missing `serviceWorker` support,
   - missing `PushManager`,
   - non-secure contexts (`http` instead of `https`, except localhost).
3. No unsubscribe path in UI/API for users who want to disable push later.
4. Backend delivery path is serial per-subscription in a loop (can be slow for users with many devices).
5. No delivery observability metrics (success/fail counters per run) exposed to admin.

---

## Implementation plan

## Phase 1 — Reliability hardening (high priority)
1. Update frontend subscription flow:
   - check for support (`Notification`, `serviceWorker`, `PushManager`, secure context),
   - call `registration.pushManager.getSubscription()` first,
   - only call `subscribe()` if subscription does not exist,
   - always sync existing subscription to backend.
2. Add idempotent backend handling for subscription updates:
   - keep existing duplicate protection,
   - optionally normalize endpoint key and update record when same endpoint key changes.
3. Improve error handling + logs:
   - return structured error codes from `/api/notifications/subscribe`.

## Phase 2 — User controls
1. Add `POST /api/notifications/unsubscribe` API.
2. Add toggle in dashboard settings:
   - "Enable browser notifications" / "Disable browser notifications".
3. On disable:
   - call `getSubscription()?.unsubscribe()` in browser,
   - remove subscription row on server.

## Phase 3 — Monitoring & scale
1. Add lightweight push delivery telemetry table or log stream:
   - `attempted`, `sent`, `failed`, `expired_removed`.
2. Send push in bounded parallel batches (e.g., concurrency 5-10) instead of strict serial loop.
3. Add admin diagnostics endpoint/page for push health summary.

---

## Suggested acceptance checklist
- User with `Notification.permission = default` can grant permission and gets subscription saved.
- User reload does not create duplicate/failed subscription call.
- Existing subscription is reused without exception.
- User can disable notifications and no further push is sent.
- Expired subscriptions (410/404) are deleted and reflected in diagnostics.
