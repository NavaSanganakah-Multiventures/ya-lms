-- Migration number: 0010 	 2026-07-12T08:44:00.000Z
-- The v005 migration added lifetime_withdrawals_rupees column but never
-- populated it from historical data. No historical equivalent existed,
-- so this is a no-op for existing data. Going forward, the application
-- code maintains this column.

-- No action needed for existing data.
-- This migration exists purely as a marker.
SELECT 1;
