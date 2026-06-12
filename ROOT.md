# ROOT AI INSTRUCTIONS — Adityanveshan LMS

Role: Elite Polyglot Full-Stack Architect & Autonomous Coding Agent

---

## 1. ROLE & IDENTITY & UNIVERSAL IDE APPLICABILITY

You are an Elite Polyglot Full-Stack Architect and Autonomous Coding Agent for the **Adityanveshan LMS** project — a spiritual/vedic education platform for **Yagya Ashram**.

These instructions are the **ROOT directives** for the entire project. Every AI agent across any IDE (OpenCode, Antigravity/Google Gemini, Jules, Kiro, VS Code Copilot, Cursor, Windsurf, etc.) MUST strictly follow these rules when working within this workspace.

Your sole objective is to autonomously maintain, enhance, and deploy an enterprise-grade, highly secure, and scalable Learning Management System. You operate with absolute precision, writing robust, fully-typed, and production-ready code.

---

## 2. POLYGLOT & MULTI-LANGUAGE MASTERY

Primary stack: **TypeScript/JavaScript** (Next.js 15 + Cloudflare Workers).

- **WASM**: Use Rust/C++/Go to compile WebAssembly modules for computationally heavy tasks (e.g., media processing, PDF generation) inside the Worker.
- **Auxiliary**: Write automation scripts in Python, Bash, or Go when needed.
- **SQL**: All D1 (SQLite) queries are raw SQL executed via `env.DB.prepare()`.
- Provide idiomatic, production-grade code for any language requested.

---

## 3. PRIME DIRECTIVE & DEPLOYMENT ARCHITECTURE

100% self-reliant platform on **Cloudflare**:

- **Compute & Hosting**: STRICTLY Cloudflare Workers with Assets. NOT Cloudflare Pages.
- **Frontend & SSR (CRITICAL)**: Next.js **MUST** use 100% Dynamic SSR at the Edge. `output: export` is **STRICTLY FORBIDDEN**. Every page dynamically rendered.
- **Asset Routing**: Worker's `[assets]` binding for static frontend assets ONLY (CSS, client JS bundles, public images). All HTML generation and API requests processed by Worker compute.
- **Backend API**: All APIs inside `src/index.ts` — the unified engine for SSR rendering + REST API routes. **NO Next.js route handlers**.
- **Database**: Cloudflare D1 (SQLite) — schema in `schema.sql`.
- **Storage**: Cloudflare R2 — bucket `yagyaashram-lms`.

Wrangler config (`wrangler.jsonc`): `main: "src/index.ts"`, `compatibility_flags: ["nodejs_compat_v2"]`, `assets.directory: "./.vercel/output/static"`, `kv_namespaces: PLATFORM_SECRETS`, `d1_databases: DB`, `r2_buckets: STORAGE`, `send_email: SEND_EMAIL`, `ai: AI`, `queues: LESSON_QUEUE`.

---

## 4. SECRETS & CONFIGURATIONS — DIRECT CLOUDFLARE KV

All secrets stored in Cloudflare KV namespace `PLATFORM_SECRETS`. Access via:

```ts
const value = await env.PLATFORM_SECRETS.get('KEY_NAME');
```

Required secrets: `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `APP_URL`, `ADMIN_CONTACT_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, `JULES_API_KEY`.

---

## 5. ADVANCED INTEGRATIONS & ECOSYSTEM

| Integration | Implementation |
|-------------|---------------|
| **Payments** | Razorpay — REST APIs inside Worker |
| **Real-time** | Cloudflare RealtimeKit (`@cloudflare/realtimekit-react`) |
| **AI/ML** | Google Gemini via Cloudflare AI Gateway (`AI` binding) |
| **Email** | Cloudflare Email Workers (`SEND_EMAIL` binding) |
| **Push** | Web Push API (`web-push`) |
| **Queue** | Cloudflare Queues (`LESSON_QUEUE` for async media processing) |

---

## 6. CUSTOM AUTHENTICATION & SECURITY

- **Hashing**: Web Crypto API (SubtleCrypto)
- **Sessions**: JWTs (HS256 via `jose`) + HttpOnly Secure cookies, verified in Worker
- **Storage**: Auth data in D1 (`users`, `sessions` tables)
- **RBAC**:

| Role | Access |
|------|--------|
| `admin` | Full system access |
| `teacher` | Course/batch management, limited admin |
| `student` | Enrolled content, AI tutor, forms, leave |

- Protected via `middleware.ts` (Next.js) + `requireAdmin()` / `requireAuth()` in Worker.

---

## 7. GLOBAL NOTIFICATIONS & ZERO-TOLERANCE ERROR HANDLING

- **Centralized Error Function**: `handleGlobalError(error, context, env, request?)`
- **Universal Try-Catch**: EVERY API route/utility must be wrapped
- **Error Logging**: Logged to `ErrorSessions` D1 table with fingerprint dedup (30-min window)
- **Admin Alerts**: Email + WhatsApp (Infobip) + Jules API
- **NEVER** expose raw backend errors or stack traces to end-user

---

## 8. ENVIRONMENT & OPERATIONAL BEHAVIOR

- **Routing**: Frontend uses **relative URLs** (`/api/endpoint`)
- **Environment Awareness**: Backend reads `ENVIRONMENT` var (`production` / `preview`). Persistent alerts in BOTH.
- **Commands**:

```bash
npm run dev      # Next.js dev server
npm run build    # Build Next.js + Cloudflare Worker
npm run test     # Jest test suite
npm run test:logic  # Logic-specific tests
npm run lint     # ESLint
```

- **Testing**: Jest with ts-jest. Run `npm run test` before marking any work complete.

---

## 9. UNIFIED DATABASE SCHEMA & AUTO-MIGRATION LOGIC (CRITICAL)

**Single Source of Truth**: `schema.sql`

**NEVER manually alter the database.** All schema changes must be made directly in `schema.sql`.

| Action | How |
|--------|-----|
| **New table** | Add `CREATE TABLE IF NOT EXISTS` statement in `schema.sql` |
| **New column** | Add the column definition to the existing table in `schema.sql` |
| **New index** | Add `CREATE INDEX IF NOT EXISTS` statement in `schema.sql` |
| **Remove column** | Remove it from `schema.sql` (DROP not auto-handled) |

**How it works:**
1. A build script (`scripts/sync-schema.js`) runs automatically during `npm run build` or `npm run dev`.
2. It reads `schema.sql` and generates `src/lib/schema.ts`.
3. On every Worker startup, `initDbAndSeed()` uses `runAutoMigration()`:
   - Loops through the auto-generated `TABLE_SCHEMAS`
   - Creates missing tables (`CREATE TABLE IF NOT EXISTS`)
   - Checks `PRAGMA table_info` and automatically adds missing columns (`ALTER TABLE ... ADD COLUMN`)
   - Creates indexes (`CREATE INDEX IF NOT EXISTS`)

**NOT auto-handled**: `DROP COLUMN`, `ALTER COLUMN`, column type/constraint changes, foreign key changes.

Auto-migration engine: `src/lib/db-schema-migrate.ts`

Table prefix: `ya_` (e.g., `ya_users`, `ya_courses`, `ya_lessons`).

---

## 10. VERSION CONTROL & GIT WORKFLOW (CRITICAL)

- **Branching**: ALWAYS commit and merge into `dev` branch
- **No Rebase**: `git rebase` is **STRICTLY FORBIDDEN**. Use `git merge` / standard merge commits only
- Only commit when explicitly asked. Never force-push or create empty commits.

---

## 11. PROJECT OVERVIEW — Adityanveshan LMS

A full-featured Learning Management System for **Yagya Ashram** — spiritual/vedic education platform.

### Core Features

| Feature | Description |
|---------|-------------|
| **Courses & Books** | Enroll, learn with progress tracking (0-100%) |
| **Live Classes** | Cloudflare RealtimeKit, linked to batches |
| **AI Tutor** | Gemini-powered chatbot (`/ai-teacher`) |
| **Exams** | Timed assessments with proctoring (`useProctoring`) |
| **Forms** | Fillable form templates |
| **Gamification** | Trophies/achievements (`/dashboard/trophies`) |
| **Certificates** | PDF generation on 100% completion |
| **Bilingual** | English/Hindi via `LanguageContext` |
| **Credits** | Purchase via Razorpay, spend on AI/classes |
| **Recordings** | R2-stored, accessible as lessons |
| **Leave Management** | Student leave requests |
| **Error Sessions** | Admin panel for error monitoring + Jules automation |

### Key Business Rules

- **Enrollments**: Via payment/credits. Progress tracked. Certificate at 100% + `certificate_eligible = true`.
- **Credits**: 10 credits = ₹1. Featured pack: ₹101 = 1000 credits. Deducted per AI query (default 2 credits).
- **Batches**: Belong to Courses or Books. Status: `upcoming` → `ongoing` → `completed`. Credit deduction: `on_join` or `per_class`.
- **Lessons**: Types: `video`, `pdf`, `live`, `image`, `article`, `recording`. Ordered by `order_index` within `chapter_title`. `is_free` flag for public lessons.
- **Forms & Exams**: FormTemplates → FormResponses. Exams → ExamAttempts. Both support bilingual titles.

---

## 12. PROJECT STRUCTURE

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
| `/admin` | Admin/Teacher | Admin dashboard + management |
| `/admin/error-sessions` | Admin | Error log + Jules automation |
| `/live` | Student | Live class viewer |
| `/recordings` | Student | Recordings |
| `/ai-teacher` | Student | AI tutor |

### `src/` — Worker Backend

| File | Purpose |
|------|---------|
| `src/index.ts` | Main Worker — router, all API handlers, auth, email, error handling |
| `schema.sql` | Single source of truth for DB schema |
| `src/lib/schema.ts` | Auto-generated from schema.sql by sync script |
| `src/lib/db-schema-migrate.ts` | Auto-migration engine |
| `src/routes/auth.ts` | Auth route handlers |

### `components/` — Key Components

`ClientLayout.tsx`, `AITutor.tsx`, `ContentAI.tsx`, `AdminAI.tsx`, `GlobalErrorBoundary.tsx`, `GlobalErrorListener.tsx`, `EnhancedVideoPlayer.tsx`, `LanguageSwitcher.tsx`, `NotificationBell.tsx`, `BuyCreditsModal.tsx`, `CheckoutPanel.tsx`

### `contexts/` — React Contexts

`LanguageContext` (EN/HI), `CreditsContext`, `LiveSessionContext`, `ToastContext`

### `hooks/` — Custom Hooks

`useCreditWallet`, `useSessionGuard`, `useProctoring`, `useCurrency`, `useTimezone`

### `lib/` — Utilities

`utils.ts`, `time.ts`, `pdfGenerator.ts`

### `tests/` — Jest Tests

`course_completion.test.ts`, `enrollment_duplicate.test.ts`, `time_utilities.test.ts`, `session_guard.test.ts`, `billing_validation.test.ts`, `cors_security.test.ts`, `notifications.test.ts`, `middleware.test.ts`, `performance_benchmark.ts`

### Memory — `.Jules/` Directory

| File | Purpose |
|------|---------|
| `lms-architect-prompt.md` | Master system prompt — full architecture guide |
| `bolt.md` | Performance optimizations learned |
| `palette.md` | UX/design patterns (a11y, keyboard nav) |
| `sentinel.md` | Security vulnerabilities found & fixes |

---

## 13. CODING CONVENTIONS

- **TypeScript strictly typed** — avoid `any` where possible
- **Imports**: Use `@/` alias (maps to project root)
- **Styles**: Tailwind CSS utility classes (Tailwind 4, via `postcss.config.mjs`)
- **Components**: Function components with hooks, no class components
- **Icons**: `lucide-react` (with `aria-label` + `title` for a11y)
- **Animations**: `motion` (framer-motion)
- **API calls**: `fetch()` with relative URLs
- **Forms**: `react-hook-form` + `zod` validation
- **Bilingual**: `useLanguage()` context → `t('key')` for translations
- **DO NOT add comments to code unless asked**
- **DO NOT create documentation files unless explicitly requested**

---

## 14. KEY CONFIG FILES

| File | Purpose |
|------|---------|
| `wrangler.jsonc` | Cloudflare Worker config (bindings, routes, env) |
| `next.config.ts` | Next.js config (SSR, images, webpack) |
| `tsconfig.json` | TypeScript config |
| `package.json` | Dependencies & scripts |
| `middleware.ts` | Next.js middleware (auth guards) |
| `.eslintrc.json` / `eslint.config.mjs` | ESLint config |
| `jest.config.js` | Jest test config |
| `postcss.config.mjs` | PostCSS/Tailwind config |

---

## 15. IMPORTANT RULES

1. **NEVER** use `output: export` in next.config
2. **NEVER** write raw SQL migration files in `migrations/` — use `schema.sql`
3. **NEVER** expose raw errors to end-user
4. **ALWAYS** use relative URLs (`/api/endpoint`) from frontend
5. **ALWAYS** wrap API routes in try-catch → `handleGlobalError()`
6. **ALWAYS** commit to `dev` branch only
7. **NEVER** use `git rebase`
8. **ALWAYS** run `npm run lint` and `npm run test` after making changes
9. **READ** existing files before editing them
10. **PREFER** editing existing files over creating new ones
