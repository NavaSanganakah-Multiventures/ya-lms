## 2024-05-18 - Prevent Sensitive Data Exposure from Users Table
**Vulnerability:** Several queries in `src/index.ts` use `SELECT * FROM Users`, which fetches all columns, including sensitive fields. Some endpoints (like profile fetch) attempt to delete sensitive fields (`password_hash`, `salt`) in application logic after fetching everything.
**Learning:** This approach is fragile and error-prone. In D1 database environments, if new sensitive columns are added or old schemas still exist, they could be leaked if the developer forgets to delete them explicitly in every `SELECT *` location.
**Prevention:** Always explicitly define the exact columns needed in the `SELECT` query (e.g., `SELECT id, full_name, email, role, phone... FROM Users`) instead of relying on `SELECT *` and application-level filtering.
## 2024-05-18 - Ensure Exact Column Queries in Cloudflare D1
**Vulnerability:** Replacing `SELECT *` with explicit columns might inadvertently omit required fields if the dependent UI or application logic is not fully analyzed.
**Learning:** When addressing `SELECT *` vulnerabilities, explicitly verify the downstream usage of the fetched object (e.g., verifying `full_name`, `email`, `role`, `phone`, `birth_date` usage in `src/index.ts`) to avoid subtle regressions. Also, ensure `.jules/sentinel.md` is appended to rather than overwritten.
**Prevention:** Verify complete data requirements in frontend and backend dependencies before stripping columns, and always use `>>` to append to the journal.
