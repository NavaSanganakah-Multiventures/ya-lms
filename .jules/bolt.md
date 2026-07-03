## 2024-05-24 - [Avoid Promise.all for Independent State Updates]
**Learning:** In React components, wrapping independent, non-awaited `fetch` calls in `Promise.all` or `Promise.allSettled` to update independent state variables can degrade performance if partial/progressive UI updates are acceptable. While it appears to "batch" requests, the original un-awaited `fetch` calls were already executing concurrently. `Promise.all` forces React to wait for the *slowest* request before updating *any* state, delaying Time-to-Interactive for faster components.
**Action:** Do not group independent `fetch` calls in `Promise.all` if they update separate pieces of state and progressive rendering is desired. However, `Promise.all` remains the correct choice when you need atomic completion (all data must arrive before rendering), when the fetched data points are codependent, or in Server-Side Rendering (SSR) contexts where you must await all data.

## 2024-05-24 - [Optimize Derived State in Render Body]
**Learning:** In complex dashboard components, doing heavy data grouping (like `.reduce` to create `chapters`), filtering, and nested conditionals on every render cycle blocks the main thread. By wrapping these in a top-level `useMemo` block, the app skips these heavy iterations on minor state changes (like UI toggles), noticeably improving render speeds on large datasets. Care must be taken to ensure the `useMemo` sits above any conditional early returns to obey React hook rules.
**Action:** Identify expensive data manipulations (grouping, filtering) in render bodies of data-heavy components and extract them using `useMemo`.

## 2024-05-25 - [Optimize Iterations Over Maps/Lists]
**Learning:** O(N) operations in `reduce` inside a React render function without useMemo cause re-evaluations. Single-pass native for loops can reduce calculation overhead significantly compared to chained `.filter` and `.reduce` methods.
**Action:** Extract list computations into `useMemo` blocks to avoid rendering blockages. Favor single passes where multiple mutations map/filter/reduce are chained on large data arrays.

## 2024-07-03 - [Avoid Inline Filtering and Sorting inside Render Loops]
**Learning:** Performing filtering, grouping, and `.sort()` operations inside conditional render blocks (e.g., using IIFEs within the JSX return) causes performance degradation in React. This is because these operations represent O(N) and O(M log M) operations running synchronously on the main thread during every single re-render cycle (such as when marking a lesson complete or clicking play).
**Action:** Always extract expensive list operations (filtering, grouping, mapping, and sorting) out of the render loop and wrap them inside `useMemo` hooks. This ensures these operations are only recalculated when their dependencies (like the underlying `lessons` array or `activeTab`) actually change, preserving responsiveness for UI updates and video player controls.
