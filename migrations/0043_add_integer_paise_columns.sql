-- Migration: 0043_add_integer_paise_columns (FIXED for data recovery)
-- FIX: Removed ALL ALTER TABLE ADD COLUMN statements. The paise columns are
-- added by checkMigrations() from schema.sql (with DEFAULT 0). This file now
-- ONLY backfills paise values from the legacy rupee columns.
--
-- ROOT CAUSE OF DATA LOSS: Previously ADD COLUMN + UPDATE were in one db.batch().
-- checkMigrations() runs FIRST and adds the paise columns from schema.sql (DEFAULT 0).
-- Then 0043's first "ALTER TABLE ADD COLUMN balance_paise" fails with
-- "duplicate column name" -> the ENTIRE batch is rolled back -> the backfill
-- UPDATE never runs -> paise stays 0. Then 0045 overwrites rupees with paise/100=0,
-- and 0049 drops the rupee columns -> ALL BALANCE DATA LOST.
--
-- FIX: checkMigrations() adds columns; this migration ONLY backfills from rupees.

UPDATE CreditWallets SET
  balance_paise = COALESCE(ROUND(balance_rupees * 100), 0),
  lifetime_deposits_paise = COALESCE(ROUND(lifetime_deposits_rupees * 100), 0),
  lifetime_withdrawals_paise = COALESCE(ROUND(lifetime_withdrawals_rupees * 100), 0);

UPDATE CreditLedger SET
  change_paise = COALESCE(ROUND(change_rupees * 100), 0),
  balance_after_paise = COALESCE(ROUND(balance_after_rupees * 100), 0);

UPDATE Batches SET
  cost_per_class_paise = COALESCE(ROUND(cost_per_class_rupees * 100), 0),
  live_class_cost_per_minute_paise = COALESCE(ROUND(live_class_cost_per_minute_rupees * 100), 0),
  no_show_charge_paise = COALESCE(ROUND(no_show_charge_rupees * 100), 200);

UPDATE Courses SET
  wallet_paise = COALESCE(ROUND(wallet_rupees * 100), 0),
  individual_class_cost_paise = COALESCE(ROUND(individual_class_cost_rupees * 100), 0);

UPDATE Books SET
  wallet_paise = COALESCE(ROUND(wallet_rupees * 100), 0);

UPDATE Subscriptions SET
  live_class_amount_paise = COALESCE(ROUND(live_class_amount_rupees * 100), 0);

UPDATE SubscriptionPlans SET
  wallet_amount_paise = COALESCE(ROUND(wallet_amount_rupees * 100), 0),
  live_class_amount_paise = COALESCE(ROUND(live_class_amount_rupees * 100), 0);

UPDATE PendingCharges SET
  amount_paise = COALESCE(ROUND(amount_rupees * 100), 200);
