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
| **Database** | Cloudflare D1 (SQLite) — single source of truth in `src/lib/schema.ts` |
| **Storage** | Cloudflare R2 — media/files |
| **Auth** | Custom JWT (HS256) + HttpOnly Secure cookies + Web Crypto API |
| **Payments** | Razorpay |
| **AI** | Google Gemini via Cloudflare AI Gateway |
| **Real-time** | Cloudflare RealtimeKit (`@cloudflare/realtimekit-react`) |
| **Email** | Cloudflare Email Workers |
| **Push** | Web Push API (`web-push`) |

## Quick Commands

```bash
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

### 3. Database Schema — Single Source of Truth
**NEVER write raw SQL migration files. NEVER manually alter the database.**

All schema is defined in ONE place: **`src/lib/schema.ts`** → `TABLE_SCHEMAS`

| Action | How |
|--------|-----|
| **New table** | Add entry in `TABLE_SCHEMAS` with `createSql`, `columns[]`, `indexes[]` |
| **New column** | Add entry in existing table's `columns[]` array |
| **New index** | Add SQL string to `indexes[]` array |
| **Remove column** | Delete from `columns[]` (DROP not auto-handled) |

On every Worker startup, `initDbAndSeed()` → `runAutoMigration()`:
1. `CREATE TABLE IF NOT EXISTS` for all tables
2. `PRAGMA table_info()` → compare → `ALTER TABLE ADD COLUMN` for each missing column
3. `CREATE INDEX IF NOT EXISTS` for all indexes

**Will NOT auto-handle**: `DROP COLUMN`, `ALTER COLUMN`, column type/constraint changes, foreign key changes. These require manual migration.

**ColumnDef format**: `{ name: string; type: string; nullable?: boolean; defaultSql?: string }`

### 4. Secrets
ALL secrets stored in Cloudflare KV (`PLATFORM_SECRETS`). Access via `getSecret(env, key, isCritical)`.

Required secrets: `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `APP_URL`, `ADMIN_CONTACT_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `JULES_API_KEY`.

**Firebase FCM Secrets (Push Notifications):**
- `FCM_SERVICE_ACCOUNT` — Full Firebase service account JSON (used server-side for OAuth2 JWT)
- `FCM_PROJECT_ID` — Firebase project ID (also used as `projectId` in client config)
- `FIREBASE_API_KEY` — Firebase Web API key (from Project Settings > General > Web API Key)
- `FIREBASE_MESSAGING_SENDER_ID` — Firebase sender ID (from Cloud Messaging settings)
- `FIREBASE_APP_ID` — Firebase App ID (from Project Settings > General > App ID)

> **Setup**: Firebase Console → Project Settings → Service Accounts → Generate private key for `FCM_SERVICE_ACCOUNT`. Web API Key / App ID from Project Settings → General.

**Push Architecture**: Unified FCM-based system using HTTP v1 API (no Firebase Admin SDK on backend). All platforms (web, Flutter Android, Flutter iOS) use the same `PushSubscriptions` table with `fcm_token` column. Web frontend uses Firebase Web SDK (`firebase/messaging`) to get FCM tokens. Backend sends via `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send` with OAuth2 bearer token.

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
| `src/lib/schema.ts` | **Single source of truth** for DB schema (TABLE_SCHEMAS) |
| `src/lib/db-schema-migrate.ts` | Auto-migration engine |
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

### `migrations/` — SQL Migration Files (legacy — prefer TABLE_SCHEMAS in schema.ts)
Contains 18 migration files for historical reference. Only use if specifically instructed.

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
