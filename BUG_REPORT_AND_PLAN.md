# LMS Codebase — Bug Report & Implementation Plan
**Date:** 20 May 2026  
**Project:** Adityanveshan LMS (Next.js 15 + Cloudflare Workers + D1)

---

## SECTION 1 — BUGS (Priority Order)

---

### 🔴 CRITICAL (Production-Breaking)

---

#### BUG-01 — `Batches` table mein `book_id` ka Foreign Key missing hai
**File:** `schema.sql` — Batches table  
**Problem:**  
```sql
-- Yeh line hai:
book_id TEXT,
-- Lekin yeh line NAHI hai:
FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE
```
`Courses` table ka FK hai, `Books` ka nahi. Iska matlab agar koi Book delete ho, toh usse linked Batches orphan ho jaate hain — DB mein dangling references rahenge.  
**Fix:** Schema migration mein `FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE SET NULL` add karo. Saath mein `idx_batches_book` index bhi add karo.

---

#### BUG-02 — `Batches` table mein `name_hi`, `description_en`, `description_hi` columns nahi hain
**File:** `schema.sql` vs `app/admin/batches/page.tsx`  
**Problem:**  
Frontend `Batch` interface mein yeh fields hain:
```typescript
name_hi: string | null
description_en: string | null
description_hi: string | null
```
Aur form bhi inhe submit karta hai. Lekin `schema.sql` ke `Batches` table mein yeh columns define nahi hain. Yeh data silently drop ho raha hai ya API error de raha hai.  
**Fix:** Migration file banao:
```sql
ALTER TABLE Batches ADD COLUMN name_hi TEXT;
ALTER TABLE Batches ADD COLUMN description_en TEXT;
ALTER TABLE Batches ADD COLUMN description_hi TEXT;
```

---

#### BUG-03 — `handleSubmit` mein error handling nahi hai (Batches page)
**File:** `app/admin/batches/page.tsx` — `handleSubmit` function  
**Problem:**  
```typescript
if (res.ok) {
  setIsModalOpen(false);
  // ...
}
// ← koi else branch nahi! API fail ho toh user ko pata hi nahi chalega
```
Agar API 400/500 return kare, modal band nahi hoga, koi error message nahi aayega, user confuse ho jaayega.  
**Fix:**
```typescript
if (res.ok) {
  // success logic
} else {
  const data = await res.json().catch(() => ({}));
  alert(data.error || "Batch save karne mein error aaya");
}
```

---

#### BUG-04 — `handleDelete` mein error feedback nahi (Batches page)
**File:** `app/admin/batches/page.tsx` — `handleDelete` function  
**Problem:**  
```typescript
const res = await fetch(`/api/admin/batches/${id}`, { method: 'DELETE' });
if (res.ok) fetchData();
// ← delete fail ho toh kuch nahi hoga, user ko pata nahi chalega
```
**Fix:** `else { alert("Batch delete karne mein error aaya"); }` add karo.

---

#### BUG-05 — `useSessionGuard` mein stale closure bug
**File:** `hooks/useSessionGuard.tsx` — `useEffect` (line ~90)  
**Problem:**  
```typescript
useEffect(() => {
  // ...
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```
`pingServer` aur `resetInactivityTimer` callbacks effect ke andar use ho rahe hain lekin dependency array mein nahi hain. `logout` function `router` capture karta hai jo stale ho sakta hai. Yeh session expiry ke baad wrong page pe redirect kar sakta hai.  
**Fix:** `useCallback` ke saath proper dependencies use karo, ya `useRef` mein latest callbacks store karo:
```typescript
const pingServerRef = useRef(pingServer);
const resetTimerRef = useRef(resetInactivityTimer);
useEffect(() => {
  pingServerRef.current = pingServer;
  resetTimerRef.current = resetInactivityTimer;
});
```

---

#### BUG-06 — Login page mein unmounted component pe `router.replace()` call
**File:** `app/auth/login/page.tsx` — `redirectForRole` function  
**Problem:**  
```typescript
const redirectForRole = useCallback((role?: string | null) => {
  const target = role === 'admin' || role === 'teacher' ? '/admin' : '/dashboard';
  router.replace(target);  // ← isMounted check nahi hai
  router.refresh();
}, [router]);
```
Component unmount ho jaaye (user navigate kar le) toh bhi yeh call hoga. React 19 mein yeh warning ya unexpected navigation cause kar sakta hai.  
**Fix:** `isMounted` ref se guard karo:
```typescript
if (isMounted.current) {
  router.replace(target);
  router.refresh();
}
```

---

### 🟡 MEDIUM (UX/Logic Issues)

---

#### BUG-07 — `creditType` state use nahi hota (Users page)
**File:** `app/admin/users/page.tsx`  
**Problem:**  
```typescript
const [creditType, setCreditType] = useState('self_study');
```
Credit modal mein `creditType` select karne ka koi UI element nahi hai. Hamesha `'self_study'` hi jaata hai. Admin group class credits ya koi aur type add nahi kar sakta.  
**Fix:** Credit modal mein `<select>` add karo:
```tsx
<select value={creditType} onChange={e => setCreditType(e.target.value)}>
  <option value="self_study">Self Study Credits</option>
  <option value="group_class">Group Class Credits</option>
  <option value="ai">AI Credits</option>
</select>
```

---

#### BUG-08 — `fetchUsers` aur `reloadUsers` duplicate logic
**File:** `app/admin/users/page.tsx`  
**Problem:**  
Ek hi fetch logic do jagah likha hai — `useEffect` ke andar `fetchUsers()` aur bahar `reloadUsers()`. Dono identical hain. Agar ek mein change karo toh doosre mein bhi karna padega.  
**Fix:** Ek `useCallback` mein extract karo:
```typescript
const fetchUsers = useCallback(() => {
  setIsLoading(true);
  fetch('/api/admin/users')
    .then(/* ... */)
}, [router]);

useEffect(() => { fetchUsers(); }, [fetchUsers]);
// reloadUsers = fetchUsers
```

---

#### BUG-09 — External API calls browser se bina AbortController ke (Users page)
**File:** `app/admin/users/page.tsx`  
**Problem:**  
```typescript
useEffect(() => {
  fetch('https://restcountries.com/v3.1/all?fields=name,cca2')
    .then(res => res.json())
    .then(data => setCountriesList(...))
    // ← koi cleanup nahi, component unmount ho toh memory leak
}, []);

useEffect(() => {
  fetch('https://countriesnow.space/api/v0.1/countries/states', { method: 'POST', ... })
    .then(/* ... */)
    // ← koi AbortController nahi
}, [newUser.country, countriesList]);
```
Dono third-party APIs hain — agar down ho jaayein toh form silently break ho jaata hai. Koi fallback nahi.  
**Fix:**
```typescript
useEffect(() => {
  const controller = new AbortController();
  fetch('https://restcountries.com/...', { signal: controller.signal })
    .then(/* ... */)
    .catch(err => { if (err.name !== 'AbortError') console.error(err); });
  return () => controller.abort();
}, []);
```

---

#### BUG-10 — `Books` API non-RESTful URL pattern
**File:** `app/admin/books/page.tsx`  
**Problem:**  
```typescript
// PUT/DELETE ke liye query param use ho raha hai:
const url = editingBook ? `/api/admin/books?bookId=${editingBook.id}` : "/api/admin/books";
const res = await fetch(`/api/admin/books?bookId=${id}`, { method: "DELETE" });
```
Baaki saare resources (`/api/admin/courses/:id`, `/api/admin/batches/:id`) path param use karte hain. Books akela inconsistent hai.  
**Fix:** Backend mein `/api/admin/books/:id` route add karo aur frontend update karo:
```typescript
const url = editingBook ? `/api/admin/books/${editingBook.id}` : "/api/admin/books";
```

---

#### BUG-11 — `(batch as any).book_id` type cast — Batch interface incomplete
**File:** `app/admin/batches/page.tsx`  
**Problem:**  
```typescript
setScopeType((batch as any).book_id ? 'book' : 'course');
// aur
const titleMatch = (b as any).book_title || b.course_title || "";
```
`Batch` interface mein `book_id` aur `book_title` fields nahi hain, isliye `as any` cast karna pad raha hai. TypeScript protection kaam nahi kar raha.  
**Fix:** Interface update karo:
```typescript
interface Batch {
  // ...existing fields...
  book_id: string | null;
  book_title: string | null;
}
```

---

#### BUG-12 — `alert()` ka overuse — 15+ jagah native browser alert
**Files:** `batches/page.tsx`, `courses/page.tsx`, `users/page.tsx`, `books/page.tsx`, etc.  
**Problem:**  
Native `alert()` blocking hai, unstyled hai, aur mobile pe bahut bura dikhta hai. Poore admin panel mein 15+ jagah use ho raha hai.  
**Fix:** Ek simple `toast` utility component banao ya `react-hot-toast` use karo. Ek centralized `useToast` hook se replace karo.

---

#### BUG-13 — Koi pagination nahi admin list pages pe
**Files:** `users/page.tsx`, `courses/page.tsx`, `batches/page.tsx`  
**Problem:**  
Saare admin pages poori table fetch karte hain bina kisi limit ke. 1000+ users/courses hone pe:
- Slow API response
- High memory usage
- Browser freeze  
**Fix:** API mein `?page=1&limit=50` support add karo. Frontend mein pagination component add karo.

---

#### BUG-14 — `Promise.resolve().then()` unnecessary wrapper
**File:** `app/admin/batches/page.tsx`  
**Problem:**  
```typescript
useEffect(() => {
  Promise.resolve().then(() => {
    fetchData();
  });
}, [fetchData]);
```
Yeh pattern confusing hai aur unnecessary hai. `fetchData()` directly call karna kaafi hai.  
**Fix:**
```typescript
useEffect(() => {
  fetchData();
}, [fetchData]);
```

---

#### BUG-15 — `GraduationCap as GradIcon` unused import
**File:** `app/admin/layout.tsx` — line 1  
**Problem:**  
```typescript
import { ..., GraduationCap as GradIcon} from 'lucide-react';
```
`GradIcon` import hai lekin kabhi use nahi hota. `GraduationCap` alag se bhi import hai jo use hota hai.  
**Fix:** `GraduationCap as GradIcon` import remove karo.

---

### 🟢 LOW (Code Quality)

---

#### BUG-16 — `any` types ka overuse admin pages mein
**Files:** `courses/page.tsx`, `users/page.tsx`, `batches/page.tsx`  
**Problem:**  
```typescript
const [courses, setCourses] = useState<any[]>([]);
const [editingCourse, setEditingCourse] = useState<any>(null);
```
TypeScript ka koi benefit nahi mil raha. Runtime errors TypeScript catch nahi kar sakta.  
**Fix:** Proper interfaces define karo (jaise `Batch` interface already hai, waise `Course`, `User` bhi banao).

---

#### BUG-17 — `formatCurrency` utility stub hai
**File:** `lib/utils.ts`  
**Problem:**  
```typescript
export const formatCurrency = (amount: number, currency = 'INR') => {
  return `${amount} ${currency}`;  // ← koi formatting nahi, ₹ symbol nahi
};
```
`₹1000` ki jagah `1000 INR` dikhata hai. Actual formatting `hooks/useCurrency.tsx` mein hai.  
**Fix:**
```typescript
export const formatCurrency = (amount: number, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};
```

---

#### BUG-18 — `Batches` table mein `book_id` index missing
**File:** `schema.sql`  
**Problem:**  
`course_id` pe index hai lekin `book_id` pe nahi, jabki book batches bhi first-class feature hai.  
**Fix:**
```sql
CREATE INDEX IF NOT EXISTS idx_batches_book ON Batches(book_id);
```

---

#### BUG-19 — JWT_SECRET sync issue between middleware aur Worker
**Files:** `middleware.ts` vs `src/index.ts`  
**Problem:**  
- `middleware.ts` (Next.js Edge): `process.env.JWT_SECRET` se padhta hai  
- `src/index.ts` (Cloudflare Worker): `getSecret(env, "JWT_SECRET")` se KV se padhta hai  

Agar dono mein alag values ho jaayein toh middleware valid tokens accept karega jo Worker reject karega (ya vice versa). Koi sync mechanism nahi hai.  
**Fix:** Document karo ki dono jagah same value honi chahiye. Ideally ek hi source of truth use karo.

---

#### BUG-20 — `createImageBitmap` SSR-unsafe usage
**File:** `app/admin/courses/page.tsx` — `compressMerchantImage` function  
**Problem:**  
`createImageBitmap` browser-only API hai. Agar yeh code SSR context mein run ho toh crash karega.  
**Fix:**
```typescript
if (typeof createImageBitmap === 'undefined') return file; // SSR guard
```

---

## SECTION 2 — IMPLEMENTATION PLAN

---

### PHASE 1 — Database Fixes (Pehle karo — foundation)

**Task 1.1 — Migration file banao**
```
File: migrations/001_batch_schema_fix.sql
```
- `Batches` table mein `name_hi`, `description_en`, `description_hi` columns add karo
- `book_id` Foreign Key add karo
- `idx_batches_book` index add karo

**Task 1.2 — Schema.sql update karo**
- `schema.sql` mein Batches table definition update karo taaki future fresh deployments correct hon

---

### PHASE 2 — Critical Bug Fixes (High priority)

**Task 2.1 — Batches page error handling**
- `handleSubmit` mein `else` branch add karo (BUG-03)
- `handleDelete` mein error feedback add karo (BUG-04)

**Task 2.2 — Batch interface fix**
- `Batch` interface mein `book_id` aur `book_title` add karo (BUG-11)
- `(batch as any)` casts remove karo

**Task 2.3 — useSessionGuard stale closure fix**
- `useRef` pattern use karo latest callbacks ke liye (BUG-05)
- `eslint-disable` comment remove karo

**Task 2.4 — Login page unmount guard**
- `redirectForRole` mein `isMounted.current` check add karo (BUG-06)

---

### PHASE 3 — UX Improvements

**Task 3.1 — Toast notification system**
- `components/Toast.tsx` banao (ya `react-hot-toast` install karo)
- Saare `alert()` calls replace karo (BUG-12)
- Files: `batches/page.tsx`, `courses/page.tsx`, `users/page.tsx`, `books/page.tsx`

**Task 3.2 — Users page refactor**
- `fetchUsers` aur `reloadUsers` merge karo `useCallback` mein (BUG-08)
- `creditType` ke liye UI add karo (BUG-07)
- AbortController add karo external API calls mein (BUG-09)

**Task 3.3 — Books API RESTful banao**
- Backend: `/api/admin/books/:id` route add karo
- Frontend: query param se path param pe migrate karo (BUG-10)

---

### PHASE 4 — Performance

**Task 4.1 — Pagination implement karo**
- Backend API mein `?page` aur `?limit` query params support add karo
- Frontend mein `Pagination` component banao
- Users, Courses, Batches pages pe apply karo (BUG-13)

**Task 4.2 — Code cleanup**
- `Promise.resolve().then()` wrappers remove karo (BUG-14)
- Unused `GradIcon` import remove karo (BUG-15)
- `formatCurrency` fix karo (BUG-17)
- `createImageBitmap` SSR guard add karo (BUG-20)

---

### PHASE 5 — TypeScript Improvements

**Task 5.1 — Proper interfaces banao**
- `Course` interface define karo `courses/page.tsx` mein
- `User` interface define karo `users/page.tsx` mein
- `any[]` states replace karo typed states se (BUG-16)

---

## SECTION 3 — SUMMARY TABLE

| Bug ID | Severity | File | Issue | Fix Effort |
|--------|----------|------|-------|------------|
| BUG-01 | 🔴 Critical | schema.sql | Batches.book_id FK missing | 15 min |
| BUG-02 | 🔴 Critical | schema.sql | Batches columns missing | 15 min |
| BUG-03 | 🔴 Critical | batches/page.tsx | No error handling in handleSubmit | 10 min |
| BUG-04 | 🔴 Critical | batches/page.tsx | No error feedback in handleDelete | 5 min |
| BUG-05 | 🔴 Critical | useSessionGuard.tsx | Stale closure in useEffect | 30 min |
| BUG-06 | 🔴 Critical | auth/login/page.tsx | router.replace without isMounted guard | 10 min |
| BUG-07 | 🟡 Medium | users/page.tsx | creditType state unused in UI | 20 min |
| BUG-08 | 🟡 Medium | users/page.tsx | fetchUsers/reloadUsers duplicate | 15 min |
| BUG-09 | 🟡 Medium | users/page.tsx | No AbortController on external APIs | 20 min |
| BUG-10 | 🟡 Medium | books/page.tsx | Non-RESTful URL for PUT/DELETE | 30 min |
| BUG-11 | 🟡 Medium | batches/page.tsx | Batch interface incomplete | 10 min |
| BUG-12 | 🟡 Medium | Multiple files | alert() overuse (15+ places) | 2 hrs |
| BUG-13 | 🟡 Medium | Multiple files | No pagination on list pages | 4 hrs |
| BUG-14 | 🟢 Low | batches/page.tsx | Unnecessary Promise.resolve wrapper | 5 min |
| BUG-15 | 🟢 Low | admin/layout.tsx | Unused GradIcon import | 2 min |
| BUG-16 | 🟢 Low | Multiple files | any[] types everywhere | 3 hrs |
| BUG-17 | 🟢 Low | lib/utils.ts | formatCurrency is a stub | 10 min |
| BUG-18 | 🟢 Low | schema.sql | Missing idx_batches_book index | 5 min |
| BUG-19 | 🟢 Low | middleware.ts | JWT_SECRET sync risk | Document only |
| BUG-20 | 🟢 Low | courses/page.tsx | createImageBitmap SSR-unsafe | 5 min |

---

**Total Critical Bugs:** 6  
**Total Medium Bugs:** 7  
**Total Low Bugs:** 7  
**Estimated Fix Time:** ~12-15 hours (phased approach)

---

*Report generated by Kiro AI — 20 May 2026*
