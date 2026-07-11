## 2026-07-11 - Over-fetching Sensitive User Data

**Vulnerability:** Several endpoints in `src/index.ts` used `SELECT * FROM Users` to fetch user records. For example, `handleGetProfile` relied on fetching all columns and manually attempting to delete `password_hash` and `salt`.
**Learning:** Over-exposing database columns in raw SQL queries, especially on sensitive tables like `Users`, is a security vulnerability because it leaks legacy or newly added sensitive fields (like password hashes or internal identifiers) in intermediate variables, which can accidentally bleed into client responses if not perfectly scrubbed.
**Prevention:** Never use `SELECT *` in database queries. Always explicitly project the required columns in the `SELECT` statement (e.g., `SELECT id, email, full_name, role FROM Users WHERE id = ?`) rather than fetching all and scrubbing later.
