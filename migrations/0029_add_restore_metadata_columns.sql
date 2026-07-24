-- Add idempotency key and checksum columns to MigrationHistory for restore safeguards.
ALTER TABLE MigrationHistory ADD COLUMN idempotency_key TEXT;
ALTER TABLE MigrationHistory ADD COLUMN checksum TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_migration_history_idempotency_key
ON MigrationHistory(idempotency_key);
