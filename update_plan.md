1. **Fix `fetch(downloadUrl)` in `processRecordingToR2`**:
   - Update `processRecordingToR2` in `src/index.ts` to retrieve `CLOUDFLARE_API_TOKEN` (or `CF_API_TOKEN`) using `getSecret()`.
   - Update the `fetch(downloadUrl)` call to include the `Authorization` header with the Bearer token.
2. **Fix `fetch(downloadUrl)` in `handleRealtimeWebhook`**:
   - Update `handleRealtimeWebhook` in `src/index.ts` to retrieve `CLOUDFLARE_API_TOKEN` (or `CF_API_TOKEN`) using `getSecret()`.
   - Update the `fetch(downloadUrl)` call to include the `Authorization` header with the Bearer token.
3. **Add `batch_id` to `Lessons` table**:
   - The user mentioned saving the recording using `course_id`, `batch_id`, `recording`, `session_id`, and `meeting_id`.
   - The current `INSERT INTO Lessons` code in `src/index.ts` attempts to insert `batch_id`, but `schema.sql` and the table creation query in `src/index.ts` don't define a `batch_id` column for the `Lessons` table.
   - I need to add `batch_id TEXT` to the `CREATE TABLE IF NOT EXISTS Lessons` definition in `schema.sql`.
   - I need to add `batch_id TEXT` to the `CREATE TABLE IF NOT EXISTS Lessons` definition in `src/index.ts` (around line 3821).
   - I need to add an `ALTER TABLE Lessons ADD COLUMN batch_id TEXT;` migration block in `handleSeed` in `src/index.ts` to upgrade existing tables.
4. **Pre-commit step**:
   - Ensure proper testing, verification, review, and reflection are done before committing.
5. **Submit**:
   - Submit the changes with an appropriate commit message.
