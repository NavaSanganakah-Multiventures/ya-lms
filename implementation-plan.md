# Implementation Plan — Adityanveshan LMS Fixes

> Last updated: 26 May 2026
> Total: 15 tasks | ✅ 15 completed | ⏳ 0 in progress | ❌ 0 pending

---

## 🔴 PHASE 1: Critical Issues (7 items)

| # | Task | Files | Status |
|---|------|-------|--------|
| 1.1 | **Expand student batch API** — `handleGetCourseBatches` mein saare fields add karo (name_hi, description_en/hi, class timings, days, credit cost, book_id, book_title) | `src/index.ts:11108` | ✅ Done |
| 1.2a | **Book batches API** — `GET /api/books/:id/batches` naya endpoint (course se independent, book_id based) | `src/index.ts` | ✅ Done |
| 1.2b | **Book batch enrollment** — `POST /api/books/:id/batches/:batchId/enroll` credit-based enrollment | `src/index.ts` | ✅ Done |
| 1.2c | **Book detail page — Available Batches** — Frontend section with batch info + Join button | `app/dashboard/book/page.tsx` | ✅ Done |
| 1.2d | **Book learn page — Batch Recordings tab** — Recordings grouped by batch in sidebar | `app/dashboard/book/learn/page.tsx` | ✅ Done |
| 1.3 | **Public books listing** — `GET /api/books` endpoint + dashboard enrolled books query expand | `src/index.ts`, `handleGetDashboardData` | ✅ Done |
| 1.4 | **Live recordings batch-wise** — `order_index=999` fix + course/book learn pages mein batch grouping | `src/index.ts:9279`, `app/dashboard/*/learn/page.tsx` | ✅ Done |
| 1.5 | **Certificates list API** — `GET /api/user/certificates` list all certificates | `src/index.ts` | ✅ Done |
| 1.6 | **Remove orphaned `price` column** — Schema + queries cleanup, `price` → `price_inr`/`price_usd` | `schema.sql:49`, `src/index.ts` (5 queries), `migrations/0012` | ✅ Done |

---

## 🟡 PHASE 2: Moderate Issues (7 items)

| # | Task | Files | Status |
|---|------|-------|--------|
| 2.1 | **Student Forms page** — `/dashboard/forms` + `GET /api/user/forms` + `GET /api/user/form-submissions` | `app/dashboard/forms/` (new), `src/index.ts` | ✅ Done |
| 2.2 | **Leave — reviewer info** — `handleMyLeaves` mein `LEFT JOIN Users` add karo | `src/index.ts:5196-5225` | ✅ Done |
| 2.3 | **Leave — student stats** — `GET /api/leave/stats` for monthly/yearly breakdown | `src/index.ts` (naya), `app/dashboard/leave/page.tsx` | ✅ Done |
| 2.4 | **Duplicate pincode/pin_code** — Normalize to `pin_code` only | `src/index.ts:5529-5530` | ✅ Done |
| 2.5 | **Enrollment payment validation** — Admin enrollment `amount_paid=0` par warning | `app/admin/enrollments/page.tsx`, `src/index.ts` | ✅ Done |
| 2.6 | **Student self-cancel enrollment** — `POST /api/enrollments/:id/cancel` | `src/index.ts`, `app/dashboard/my-courses/page.tsx` | ✅ Done |
| 2.7 | **Category browser** — Category filter dropdown on courses page | `app/courses/page.tsx` | ✅ Done |

---

## 🟠 PHASE 3: Orphaned Fields (1 item)

| # | Task | Files | Status |
|---|------|-------|--------|
| 3.1 | **Batch announcement fields** — Backend `send_announcement_email` etc ka koi UI nahi hai. Option A: hata do. Option B: UI add karo. | `app/admin/batches/page.tsx`, `src/index.ts:4657-4661` | ✅ Done |

---

## ✅ COMPLETED SUMMARY

### Backend (`src/index.ts`)
- `handleGetCourseBatches()` — expanded to 15+ fields with book_title JOIN
- `handleGetBookBatches()` — new: book-linked batches (course_id=NULL, book_id=bookId)
- `handleEnrollBookBatch()` — new: credit-based enrollment in book batches
- `handleListPublicBooks()` — new: public books catalog
- `handleListCertificates()` — new: list all user certificates
- Router: `/api/books` → public listing, `/api/books/:id/batches` → batch listing, `/api/books/:id/batches/:batchId/enroll` → enroll, `/api/user/certificates` → cert list
- Dashboard query #5 (enrolled books) — expanded to include `price_inr`, `thumbnail_url`, `self_study_credit_cost`, etc.
- Removed `c.price` from 5 SQL queries across the file
- Fixed course INSERT queries: removed `price` column + adjusted bindings

### Frontend
- `app/dashboard/book/page.tsx` — Added "Available Batches" section with batch details, schedule, timing, credit cost, and "Join Batch" button
- Added `Users`, `Calendar`, `CreditCard` icons

### Database
- `schema.sql` — Removed `price INTEGER NOT NULL DEFAULT 0` from Courses
- `migrations/0012_drop_courses_price.sql` — New migration to DROP COLUMN price

### Files Created
- `implementation-plan.md` — This plan file
- `migrations/0012_drop_courses_price.sql` — Price column migration
