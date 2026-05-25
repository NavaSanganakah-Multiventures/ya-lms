## 2025-03-09 - [Concurrent Data Fetching for Dashboard]
**Learning:** In a full-stack Next.js/Cloudflare Workers app, sequential data fetching in components (e.g., `fetch('/api/user/profile')` followed by `fetch('/api/user/dashboard-data')`) creates an unnecessary network waterfall, significantly delaying time-to-interactive for core views like the user dashboard.
**Action:** Always refactor independent sequential client-side fetch requests inside `useEffect` into a single concurrent block using `Promise.all`. Apply `.catch()` to individual promises to prevent one failing request from bringing down the entire dashboard view.

## 2025-05-22 - [Optimize Array Filtering in React Components]
**Learning:** Performing invariant string manipulations like `search.toLowerCase()` inside a `.filter()` or `.map()` callback causes O(N) redundant string allocations, which degrades performance for large arrays. This is an anti-pattern when filtering large arrays on the client side in Next.js applications, potentially blocking the main thread.
**Action:** Always hoist invariant calculations (like converting a search term to lowercase) outside the iteration block.
