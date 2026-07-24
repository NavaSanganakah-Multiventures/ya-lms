-- Unique index for no-show charge idempotency.
-- Prevents double-charge on concurrent/retry calls when assessing no-show penalties.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_charges_dedup
ON PendingCharges(user_id, reference_type, reference_id, reason);
