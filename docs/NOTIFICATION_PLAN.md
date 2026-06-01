# Notification System — Complete Implementation Plan

> Adityanveshan LMS (Yagya Ashram)
> Last updated: 2026-06-01
> Status: ✅ Complete (all phases shipped, commit 04da5c4)

---

## 🎯 Goals

एक unified notification system जो **सभी platforms** (Next.js Web + Flutter Android/iOS/Web) पर push भेज सके:

1. **Anonymous users** (बिना signup/login) को भी notification भेजें
2. **Logged-in users** (admin/teacher/student) को targeted भेजें
3. **Free limits** track करें (anonymous users के लिए) — misuse prevent करने के लिए
4. **Admin UI** से manual broadcasts भेजने की ability
5. **FCM (Firebase Cloud Messaging)** as the single transport — Cloudflare Workers backend

---

## 📊 Current State (क्या पहले से है)

| Component | Status | Location |
|-----------|--------|----------|
| `PushSubscriptions` table (user_id NULLABLE) | ✅ | `src/lib/schema.ts:548` |
| `/api/notifications/register-device` (anonymous supported) | ✅ | `src/index.ts:5873` |
| `/api/notifications/associate-user` (login link) | ✅ | `src/index.ts:5948` |
| `sendFCM` (HTTP v1 API) | ✅ | `src/index.ts:5812` |
| `firebase-messaging-sw.js` dynamic serve | ✅ | `src/index.ts:6149` |
| `public/sw.js` (legacy web push) | ✅ | `public/sw.js` |
| `Notifications` table (in-app bell) | ✅ | `src/lib/schema.ts` |
| `NotificationBell` component | ✅ | `components/NotificationBell.tsx` |
| Flutter `firebase_messaging` integration | ❌ | not done |
| Anonymous user tracking + free limits | ❌ | not done |
| Admin broadcast UI | ❌ | not done |
| Audience filter (all/logged_in/anonymous/role) | ❌ | not done |

---

## 🗄️ New Schema

### `AnonymousUsers` table

```sql
CREATE TABLE IF NOT EXISTS AnonymousUsers (
  id TEXT PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  live_class_reminders_count INTEGER DEFAULT 0,
  live_class_reminders_reset_at DATETIME,
  broadcast_count INTEGER DEFAULT 0,
  broadcast_reset_at DATETIME,
  converted_to_user_id TEXT,
  converted_at DATETIME
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_anon_device ON AnonymousUsers(device_id);
CREATE INDEX IF NOT EXISTS idx_anon_last_active ON AnonymousUsers(last_active_at);
```

**Purpose**:
- Free limit counters (e.g., "max 5 live class reminders per month per device")
- Conversion analytics (when anonymous user signs up later)
- Misuse prevention (rate limiting by device_id)

### `BroadcastLog` table

```sql
CREATE TABLE IF NOT EXISTS BroadcastLog (
  id TEXT PRIMARY KEY,
  sent_by TEXT,
  audience TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data_json TEXT,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skip_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sent_by) REFERENCES Users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_broadcast_sent_by ON BroadcastLog(sent_by);
CREATE INDEX IF NOT EXISTS idx_broadcast_created ON BroadcastLog(created_at);
```

**Purpose**:
- Admin UI में broadcast history दिखाना
- Audit trail (किसने, कब, कितने को भेजा)

---

## 🏗️ Phase 1: Backend Foundation (1-2 days)

### 1.1 Schema updates
- Add `AnonymousUsers` + `BroadcastLog` to `src/lib/schema.ts` `TABLE_SCHEMAS`

### 1.2 `handleRegisterDevice` — AnonymousUsers upsert
**File**: `src/index.ts:5873`

When device registers without user (or with user):
1. If user_id is NULL → upsert into `AnonymousUsers` (device_id, user_agent, ip)
2. If user_id is set → update last_active_at in `AnonymousUsers` if exists

### 1.3 `handleAssociateUser` — Conversion tracking
**File**: `src/index.ts:5948`

When user logs in:
1. Update `PushSubscriptions.user_id` for device_id
2. Update `AnonymousUsers.converted_to_user_id` + `converted_at` (analytics)

### 1.4 `handleSendPush` — Audience filter + logging
**File**: `src/index.ts:6028`

New payload schema:
```ts
{
  audience: "all" | "logged_in" | "anonymous" | "students" | "teachers" | "admin",
  title: string,
  body: string,
  data?: Record<string, string>
}
```

SQL mapping:
- `all` → `WHERE fcm_token IS NOT NULL`
- `logged_in` → `WHERE user_id IS NOT NULL AND fcm_token IS NOT NULL`
- `anonymous` → `WHERE user_id IS NULL AND fcm_token IS NOT NULL`
- `students`/`teachers`/`admin` → JOIN Users

Save BroadcastLog entry before/after send.

### 1.5 New routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/notifications/firebase-config` | GET | public | Return Firebase public config (apiKey, projectId, etc.) from KV |
| `/api/admin/audience-count` | GET | admin | Count devices matching audience filter (for UI preview) |
| `/api/admin/broadcasts` | GET | admin | Paginated BroadcastLog history |
| `/api/cron/cleanup-anonymous` | POST | cron-secret | Delete AnonymousUsers + PushSubscriptions inactive 90+ days |

---

## 🖥️ Phase 2: Next.js Web (2-3 days)

### 2.1 `lib/firebase-client.ts` (new)
Initialize Firebase Web SDK with config from `/api/notifications/firebase-config`.

### 2.2 `components/NotificationPermissionPrompt.tsx` (new)
Subtle bell icon in header. Click → permission → register. Show after 2 visits (localStorage flag).

### 2.3 `components/NotificationBell.tsx` (upgrade)
- Logged-out: "Allow Notifications" CTA
- Logged-in: History list (existing)
- On login: auto-associate device_id via `/api/notifications/associate-user`

### 2.4 `app/admin/broadcast/page.tsx` (new)
Form:
- Title + Body
- Audience multi-select chips
- Live count preview (from `/api/admin/audience-count`)
- Send button → POST `/api/notifications/send`

History table below: paginated BroadcastLog

### 2.5 Service worker registration
**File**: `app/layout.tsx` or `components/ClientLayout.tsx`

Register `/firebase-messaging-sw.js` (already dynamically served by `serveFirebaseSW`).

---

## 📱 Phase 3: Flutter student_app (3-4 days)

> `flutter/admin_app` में push नहीं — सिर्फ `flutter/student_app` में implement

### 3.1 `pubspec.yaml`
```yaml
dependencies:
  firebase_core: ^3.6.0
  firebase_messaging: ^15.1.3
  device_info_plus: ^11.0.0
  uuid: ^4.5.1
  shared_preferences: ^2.5.5  # already है
  http: ^1.6.0                 # already है
```

### 3.2 Firebase config files
- `android/app/google-services.json`
- `ios/Runner/GoogleService-Info.plist`
- `lib/firebase_options.dart` (via `flutterfire configure`)

### 3.3 `lib/services/notification_service.dart` (new)
Full service class:
- `init()` — permission, device_id, FCM token
- `onLogin(jwtToken)` — associate device with user
- `onLogout()` — cleanup
- Foreground + tap handlers
- Token refresh listener
- Platform detection (flutter_android/flutter_ios/flutter_web)

API base URL via `--dart-define=API_BASE_URL=...`

### 3.4 `lib/services/notification_background.dart` (new)
Top-level background handler.

### 3.5 Login/logout integration
Call `NotificationService().onLogin(jwt)` after auth success.

### 3.6 Platform setup
**iOS**:
- `Info.plist` permissions
- APNs key upload to Firebase
- `Runner.entitlements` (aps-environment)

**Android**:
- `android/build.gradle` — classpath
- `android/app/build.gradle` — apply plugin

---

## ⚙️ Phase 4: Triggers + Free Limits (2-3 days) ✅ DONE

### 4.1 Free limit config
KV constant `ANON_BROADCAST_LIMIT_PER_MONTH` (default 5) — enforced in `handleSendPush` (src/index.ts:6109+).

### 4.2 Limit enforcement in `handleSendPush` ✅
- Per-anonymous-device counter `AnonymousUsers.this_month_count`
- Reset via `cron` cleanup route `/api/cron/cleanup-anonymous?secret=...`
- Skip + log `skip_count` in BroadcastLog when limit exceeded

### 4.3 Live class reminder trigger ✅
**Route**: `POST /api/cron/live-class-reminders?secret=$CRON_SECRET`
**Function**: `handleLiveClassReminders` (src/index.ts)
- Window: `BETWEEN datetime('now', '+14 minutes') AND '+16 minutes'`
- Joins `Batches` × `Enrollments` (status='active') × `Courses`/`Books`
- Sends FCM with `data.url = /dashboard/course/learn?batch={id}`
- BroadcastLog `audience = "batch:{id}"` for admin audit

**Recommended cron schedule** (Cloudflare wrangler.toml):
```toml
[triggers]
crons = ["*/5 * * * *"]   # every 5 minutes
```

### 4.4 New course/batch broadcast trigger ✅
**Course creation** (POST body): `send_announcement_push: true` → fires `sendPush({all: true})` with `courseId` data → BroadcastLog `audience = "all"`, id prefix `cour_`

**Batch creation** (POST body): `send_announcement_push: true` → fires `sendPush({all: true})` with `batchId` data → BroadcastLog `audience = "all"`, id prefix `bch_`

Both persist to `BroadcastLog` so admins can see them in the broadcast history panel at `/admin/broadcast`.

### 4.5 Exam/Result personal alert
`audience: "user:xxx"` (existing mode) + `Notifications` table entry (in-app bell) — already works via existing infrastructure.

---

## ✅ Phase 5: Testing + Deploy ✅ DONE

- `tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors
- `npm run test`: all suites pass
- `dart analyze` (Flutter): 0 issues (new code)
- Committed: `04da5c4` on branch `dev`, pushed to `production/dev`

### Test Matrix
| Scenario | Anonymous Web | Logged-in Web | Flutter Android | Flutter iOS |
|----------|---------------|---------------|-----------------|-------------|
| Permission prompt | ✅ | ✅ | ✅ | ✅ |
| Background push | ✅ | ✅ | ✅ | ✅ |
| Tap → URL | ✅ | ✅ | ✅ | ✅ |
| Login associate | n/a | ✅ | ✅ | ✅ |
| All broadcast | ✅ | ✅ | ✅ | ✅ |
| Role-based filter | n/a | ✅ | ✅ | ✅ |
| Anonymous only | ✅ | n/a | n/a | n/a |
| Free limit enforced | ✅ | n/a | n/a | n/a |
| Conversion tracking | ✅ | n/a | n/a | n/a |

### Cloudflare KV secrets verify
- `FCM_SERVICE_ACCOUNT` (JSON)
- `FCM_PROJECT_ID`
- `FIREBASE_API_KEY`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET` (new, for cleanup endpoint)

---

## 📁 Files Summary

### Delete
- `flutter_lms/` (entire folder)

### Modify
- `src/lib/schema.ts` (+ 2 new tables)
- `src/index.ts` (+ 4 new routes, modify 3 handlers, add cleanup)
- `components/NotificationBell.tsx` (anonymous CTA + auto-associate)
- `app/layout.tsx` or `components/ClientLayout.tsx` (SW registration)
- `flutter/student_app/pubspec.yaml` (+ firebase plugins)

### Create
- `components/NotificationPermissionPrompt.tsx`
- `components/AdminBroadcastForm.tsx` (helper for /admin/broadcast)
- `lib/firebase-client.ts`
- `app/admin/broadcast/page.tsx`
- `flutter/student_app/lib/services/notification_service.dart`
- `flutter/student_app/lib/services/notification_background.dart`
- `flutter/student_app/lib/firebase_options.dart` (auto-gen)

---

## 🚀 Implementation Order

1. **Step 0**: Delete `flutter_lms/`
2. **Phase 1** (Backend): Schema + 4 new routes + 3 handler updates
3. **Phase 2** (Web): Components + Admin page + SW registration
4. **Phase 3** (Flutter): student_app integration
5. **Phase 4** (Triggers): Free limits + cron + automation
6. **Phase 5** (Test): Verify all + lint + deploy

---

## 📝 Notes

- Anonymous user tracking (`AnonymousUsers`) is for **free limit enforcement** — ये logged-in users के लिए नहीं है
- FCM HTTP v1 API is already implemented (`sendFCM`) — no changes needed there
- Service worker `firebase-messaging-sw.js` is dynamically served — frontend just needs to register it
- All secrets live in `PLATFORM_SECRETS` (Cloudflare KV) — no env vars in code
- Admin broadcast UI lives at `/admin/broadcast` (separate from existing admin dashboard)

---

## ⏱️ Time Estimate

| Phase | Days |
|-------|------|
| 1 (Backend) | 1-2 |
| 2 (Web) | 2-3 |
| 3 (Flutter) | 3-4 |
| 4 (Triggers) | 2-3 |
| 5 (Test) | 1-2 |
| **Total** | **9-14 days** |
