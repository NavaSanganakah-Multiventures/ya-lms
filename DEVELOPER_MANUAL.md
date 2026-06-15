# Adityanveshan LMS — AI Agent Guide

## Project Overview
A full-featured Learning Management System (LMS) for **Yagya Ashram** — spiritual/vedic education platform with live classes, AI tutor, courses, books, exams, gamification, and multilingual (EN/HI) support.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) — 100% Dynamic SSR at Edge |
| **Runtime** | Cloudflare Workers (with `nodejs_compat_v2`) |
| **Frontend** | React 19, Tailwind CSS 4, motion, lucide-react |
| **Backend** | Cloudflare Worker entry: `src/index.ts` (~18K lines) |
| **Database** | Cloudflare D1 (SQLite) — schema in `schema.sql` |
| **Storage** | Cloudflare R2 — media/files |
| **Auth** | Custom JWT (HS256) + HttpOnly Secure cookies + Web Crypto API |
| **Payments** | Razorpay |
| **AI** | Google Gemini via Cloudflare AI Gateway |
| **Real-time** | Cloudflare RealtimeKit (`@cloudflare/realtimekit-react`) |
| **Email** | Cloudflare Email Workers |
| **Push** | Web Push API (`web-push`) |

## Quick Commands

bash
npm run dev         # Next.js dev server
npm run build       # Build Next.js + Cloudflare Worker
npm run test        # Run Jest test suite
npm run test:logic  # Run specific logic tests
npm run lint        # ESLint
```

## Architecture Rules (CRITICAL)

### 1. NEVER use `output: export` in next.config
All pages must be dynamically SSR-rendered at the Cloudflare Edge.

### 2. API Routes
All backend APIs live inside the Worker (`src/index.ts`), NOT as Next.js route handlers. Frontend calls relative URLs (`/api/endpoint`).

### 3. Database Schema & Migration Logic (CRITICAL)

**Single Source of Truth**: The root **`schema.sql`** file.

**Migration Engine**: The root **`db-migrate.ts`** script.

The project uses a simple, file-based migration strategy. The complete and current schema for the entire database is defined in `schema.sql`.

**How it works:**
The `db-migrate.ts` script is responsible for ensuring the live D1 database matches the schema defined in `schema.sql`. It reads the `.sql` file and executes the statements to create and update the database structure.

#### How to make schema changes:

1.  **Edit the Schema**: Directly modify the `schema.sql` file.
    *   **New Table**: Add a new `CREATE TABLE ...` statement.
    *   **New Column/Index**: Directly add the new column or index inside the corresponding `CREATE TABLE` statement definition.
    *   **No Manual ALTER TABLE**: Do **NOT** add manual `ALTER TABLE` statements to `schema.sql`. The migration engine (`db-migrate.ts`) parses only `CREATE TABLE` statements and automatically generates and runs the required `ALTER TABLE ADD COLUMN` statements by comparing the definitions with the database.

2.  **Run the Migration Script**: Execute the `db-migrate.ts` script to apply the changes.

**IMPORTANT RULES:**

*   **ALWAYS** define your schema in `schema.sql`. It is the definitive source of truth.
*   **DO NOT** directly alter the database through the Cloudflare dashboard or other manual means. All changes must go through the `schema.sql` file.
*   The old documentation mentioning `src/lib/schema.ts` is **INCORRECT**. The migration system has been simplified to use `schema.sql` and `db-migrate.ts` at the root level.

### 4. Secrets
ALL secrets stored in Cloudflare KV (`PLATFORM_SECRETS`). Access via `getSecret(env, key, isCritical)`.

Required secrets: `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `APP_URL`, `ADMIN_CONTACT_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `JULES_API_KEY`.

**Firebase FCM Secrets (Push Notifications — store in PLATFORM_SECRETS KV):**

| KV Key | Source |
|--------|--------|
| `FCM_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service Accounts → Generate new private key (full JSON) |
| `FCM_PROJECT_ID` | Firebase Console → Project Settings → General → Project ID |
| `FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Web API Key |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Cloud Messaging → Sender ID |
| `FIREBASE_APP_ID` | Firebase Console → Project Settings → General → App ID |

> **Important**: These KV secrets are consumed by the `/api/firebase/config` endpoint which returns `apiKey`, `projectId`, `messagingSenderId`, `appId` to browser clients. The `FCM_SERVICE_ACCOUNT` is used server-side only to mint OAuth2 tokens for the FCM HTTP v1 API.

**Push Architecture**: Unified FCM-based system using HTTP v1 API (no Firebase Admin SDK on backend). All platforms (web, Flutter Android, Flutter iOS) use the same `PushSubscriptions` table with `fcm_token` column. Web frontend uses Firebase Web SDK (`firebase/messaging`) to get FCM tokens. Backend sends via `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send` with OAuth2 bearer token.

### FCM Setup by Platform

#### Web (Next.js / Firebase Web SDK)
1. Create `public/firebase-messaging-sw.js` — imports Firebase compat SDKs, initializes Firebase, handles `onBackgroundMessage` and notification clicks.
2. In `components/FirebaseInit.tsx`, call `getToken(messaging, { vapidKey, serviceWorkerRegistration })` to obtain an FCM token, then POST to `/api/notifications/register-device`.
3. Use `onMessage(messaging, callback)` to handle foreground notifications (shown as toast via `ToastContext`).
4. `components/NotificationPrompt.tsx` presents the permission banner and falls back to legacy PushManager if FCM is unavailable.

#### Flutter Android
1. Place `google-services.json` (from Firebase Console) at `android/app/google-services.json` for each app.
2. Project-level `android/build.gradle.kts`: add `classpath("com.google.gms:google-services:4.4.2")` to `buildscript.dependencies`.
3. App-level `android/app/build.gradle.kts`: apply `id("com.google.gms.google-services")` plugin.
4. `AndroidManifest.xml` must include `POST_NOTIFICATIONS`, `WAKE_LOCK`, and `RECEIVE_BOOT_COMPLETED` permissions.
5. `pubspec.yaml`: add `firebase_core`, `firebase_messaging`, `flutter_local_notifications`, `uuid`.

#### Flutter iOS
1. Run `flutter create --platforms=ios .` from the app directory to generate the iOS platform folder.
2. Place `GoogleService-Info.plist` (from Firebase Console) at `ios/Runner/GoogleService-Info.plist`.
3. In `ios/Runner/Info.plist`, add `UIBackgroundModes` array with `remote-notification`.
4. Enable Push Notifications capability in Xcode (or via `ios/Runner.entitlements`).
5. The `firebase_options.dart` `iosBundleId` must match the iOS bundle ID registered in Firebase.

#### FlutterFire CLI Commands
```bash
# Activate flutterfire_cli
dart pub global activate flutterfire_cli

# Configure student app (run from flutter/student_app/)
flutterfire configure --project=YOUR_FIREBASE_PROJECT_ID \
  --out=lib/firebase_options.dart \
  --android-package-name=com.yagyaashram.lms \
  --ios-bundle-id=com.yagyaashram.lms

# Configure admin app (run from flutter/admin_app/)
flutterfire configure --project=YOUR_FIREBASE_PROJECT_ID \
  --out=lib/firebase_options.dart \
  --android-package-name=com.yagyaashram.lms.admin \
  --ios-bundle-id=com.yagyaashram.lms.admin
```

> **Note**: The generated `firebase_options.dart` contains the Firebase config values inline. In this project, the `DefaultFirebaseOptions` class reads values from `String.fromEnvironment(...)` so they can be injected via `--dart-define`. Adjust the generated file accordingly.

### End-to-End Notification Flow

```
Client (Web/Flutter)
  │
  ├─ 1. Request notification permission
  ├─ 2. Get FCM token via Firebase SDK
  ├─ 3. POST /api/notifications/register-device
  │      { fcm_token, platform, device_id, user_agent }
  │
  ▼
Backend (Cloudflare Worker)
  │
  ├─ 4. Store in PushSubscriptions table
  │      INSERT ... (device_id, fcm_token, platform, user_id)
  │
  ├─ 5. When notification is triggered (broadcast, reminder, etc):
  │      Query PushSubscriptions → get devices
  │      For each device: POST https://fcm.googleapis.com/v1/projects/{id}/messages:send
  │      With OAuth2 Bearer token (auto-minted from FCM_SERVICE_ACCOUNT)
  │
  ├─ 6. On permanent error (404/UNREGISTERED):
  │      DELETE FROM PushSubscriptions WHERE id = ?
  │      (transient errors like 500/503/429 are skipped — no deletion)
  │
  ▼
FCM Servers → Deliver to device (APNs for iOS, FCM SDK for Android)
  │
  ├─ Background: system tray notification (handled by OS / Firebase SDK)
  ├─ Foreground (Flutter): onMessage callback → local notification via flutter_local_notifications
  └─ Foreground (Web): onMessage callback → ToastContext toast
```

### Token Lifecycle
- **Registration**: On app startup, after `Firebase.initializeApp()`, the app calls `getToken()` and registers with the backend.
- **Refresh**: `onTokenRefresh` listener automatically re-registers when FCM rotates the token.
- **Cleanup**: The backend only deletes subscriptions when FCM responds with permanent errors (`UNREGISTERED`, `INVALID_REGISTRATION`, `NOT_REGISTERED` / HTTP 404). Transient errors (500, 503, 429) are logged but do not trigger deletion.
- **Login/Logout**: `onLogin()` re-registers the device to associate it with the authenticated user. `onLogout()` re-registers to demote to anonymous.

### Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `FCM_PROJECT_ID not configured` | Missing KV secret | Set `FCM_PROJECT_ID` in PLATFORM_SECRETS |
| `FCM access token not available` | Missing or invalid `FCM_SERVICE_ACCOUNT` | Regenerate service account JSON in Firebase Console |
| `403 Forbidden` on FCM send | Wrong project ID or expired token | Check FCM_PROJECT_ID matches the service account's project |
| `404 UNREGISTERED` | Token stale or device uninstalled | Backend auto-deletes on permanent error; client re-registers on next launch |
| `NOT_REGISTERED` | Similar to above | Auto-cleaned by backend |
| iOS not receiving notifications | Missing APNs cert or `apns-push-type` header | Backend now sets `apns-push-type: alert` and `apns-priority: 10` |
| Android 13+ no notification | Missing `POST_NOTIFICATIONS` permission | Add `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` to manifest |
| Web FCM token empty | VAPID key not configured on server | Ensure VAPID_PUBLIC_KEY is set in PLATFORM_SECRETS |
| `getToken()` throws in service worker | Wrong Firebase SDK import | Use compat SDKs: `firebase-app-compat.js` and `firebase-messaging-compat.js` |
| Duplicate device registrations | Token refresh without cleanup | Backend query handles duplicates; `device_id` prevents duplicates in registration |

### 5. RBAC

| Role | Access |
|------|--------|
| `admin` | Full system access |
| `teacher` | Course/batch management, limited admin |
| `student` | Enrolled content, AI tutor, forms, leave |

Protected via `middleware.ts` (Next.js) + `requireAdmin()`/`requireAuth()` in Worker.

### 6. Error Handling
- Every API route wrapped in try-catch → `handleGlobalError(error, context, env, request?)`
- Errors logged to `ErrorSessions` D1 table with fingerprint dedup (30-min window)
- Alerts sent via Email + WhatsApp (Infobip) + Jules API
- **NEVER expose raw errors to end-user**

## Project Structure

### `app/` — Next.js Pages (App Router)

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Public | Landing page |
| `/auth/login`, `/auth/register` | Public | Auth |
| `/courses` | Public | Course catalog |
| `/course/{id}` | Public | Course detail |
| `/book` | Public | Book catalog |
| `/about`, `/contact` | Public | Static pages |
| `/dashboard` | Student | Dashboard |
| `/dashboard/my-courses` | Student | Enrolled courses |
| `/dashboard/course/learn` | Student | Course lesson player |
| `/dashboard/book/learn` | Student | Book lesson player |
| `/dashboard/leave` | Student | Leave requests |
| `/dashboard/forms` | Student | Fillable forms |
| `/dashboard/exams` | Student | Exams |
| `/dashboard/trophies` | Student | Achievements |
| `/admin` | Admin/Teacher | Admin dashboard + all management |
| `/admin/error-sessions` | Admin | Error log + Jules automation |
| `/live` | Student | Live class viewer |
| `/recordings` | Student | Recordings |
| `/ai-teacher` | Student | AI tutor |

### `src/` — Worker Backend

| File | Purpose |
|------|---------|
| `src/index.ts` | **Main Worker** — router, all API handlers, auth, email, error handling, Jules automation |
| `src/routes/auth.ts` | Auth route handlers |

### `components/` — React Components

| Component | Purpose |
|-----------|---------|
| `ClientLayout.tsx` | Root client wrapper with providers |
| `AITutor.tsx` | AI tutor chat interface |
| `ContentAI.tsx` | Content generation AI |
| `AdminAI.tsx` | Admin AI assistant |
| `GlobalErrorBoundary.tsx` | Frontend error boundary |
| `GlobalErrorListener.tsx` | Frontend error reporter → `/api/report-error` |
| `EnhancedVideoPlayer.tsx` | Video player for lessons |
| `LanguageSwitcher.tsx` | EN/HI toggle |
| `NotificationBell.tsx` | Push notification UI |
| `BuyCreditsModal.tsx` | Credit purchase modal |
| `CheckoutPanel.tsx` | Razorpay checkout integration |

### `contexts/` — React Contexts
- `LanguageContext.tsx` — Bilingual (EN/HI)
- `CreditsContext.tsx` — AI credits balance
- `LiveSessionContext.tsx` — Live class state
- `ToastContext.tsx` — Toast notifications

### `hooks/` — Custom Hooks
- `useCreditWallet.ts` — Credit operations
- `useSessionGuard.tsx` — Session validation
- `useProctoring.ts` — Exam proctoring
- `useCurrency.tsx` — Currency formatting
- `useTimezone.ts` — Timezone handling
- `sessionGuardPolicy.ts` — Session guard policy config

### `lib/` — Utility Functions
- `utils.ts` — General utilities
- `time.ts` — Time/date helpers
- `pdfGenerator.ts` — Certificate PDF generation

### `tests/` — Jest Tests
- `course_completion.test.ts`
- `enrollment_duplicate.test.ts`
- `time_utilities.test.ts`
- `session_guard.test.ts`
- `billing_validation.test.ts`
- `cors_security.test.ts`
- `notifications.test.ts`
- `middleware.test.ts`
- `performance_benchmark.ts`

### `.Jules/` — AI Agent Memory

| File | Purpose |
|------|---------|
| `lms-architect-prompt.md` | **Master system prompt** — full architecture guide |
| `bolt.md` | Performance optimizations learned |
| `palette.md` | UX/design patterns (a11y, keyboard nav) |
| `sentinel.md` | Security vulnerabilities found & fixes |

## Key Business Rules

### Enrollments
- Students enroll in courses/books via payment or credits
- Progress tracked as percentage (0-100%)
- Certificates issued when progress = 100% and `certificate_eligible = true`

### Credits
- Purchased via Razorpay (default 10 credits = ₹1)
- Featured pack: ₹101 = 1000 credits
- Deducted per AI tutor query (default 2 credits)
- Also used for individual class bookings

### Batches
- Belong to Courses or Books (book batches have `course_id = NULL`)
- Status: `upcoming` → `ongoing` → `completed`
- Credit deduction: `on_join` or `per_class`
- Linked to Google Calendar events via `google_event_id`

### Lessons
- Types: `video`, `pdf`, `live`, `image`, `article`, `recording`
- Ordered by `order_index` within chapter (`chapter_title`)
- Processing queue for async media processing
- `is_free` flag for publicly accessible lessons

### Forms & Exams
- FormTemplates → FormResponses (user submissions)
- Exams → ExamAttempts (user attempts, scores)
- Both support bilingual (EN/HI) titles

### Live Sessions
- Powered by Cloudflare RealtimeKit
- Linked to Batches via `batch_id`
- Recordings stored in R2, accessible as lessons with `type = '''recording'''`

## Coding Conventions

- **TypeScript strictly typed** — avoid `any` where possible
- **Imports**: Use `@/` alias (maps to project root)
- **Styles**: Tailwind CSS utility classes
- **Components**: Function components with hooks, no class components
- **Icons**: `lucide-react` (with `aria-label` + `title` for a11y)
- **Animations**: `motion` (framer-motion)
- **API calls**: `fetch()` with relative URLs
- **Forms**: `react-hook-form` + `zod` validation
- **Bilingual**: `useLanguage()` context → `t('key')` for translations

## Key Config Files

- `wrangler.jsonc` — Cloudflare Worker config (bindings, routes, env)
- `next.config.ts` — Next.js config (SSR, images, webpack)
- `tsconfig.json` — TypeScript config
- `tailwind.config.ts` — Tailwind config (via postcss.config.mjs)
- `package.json` — Dependencies & scripts
