-- Migration: 0046_add_remaining_paise_columns (FIXED for data recovery)
-- FIX: Removed ALL ALTER TABLE ADD COLUMN statements (same root cause as 0043).
-- checkMigrations() adds these columns from schema.sql. This file now ONLY
-- backfills paise from the legacy rupee columns.

UPDATE Courses SET
  price_paise = COALESCE(ROUND(price_rupees * 100), 0),
  trial_upgrade_price_paise = COALESCE(ROUND(trial_upgrade_price_rupees * 100), 0);

UPDATE Books SET
  price_paise = COALESCE(ROUND(price_rupees * 100), 0);

UPDATE CreditPacks SET
  amount_paise = COALESCE(ROUND(amount_rupees * 100), 0);

UPDATE Transactions SET
  amount_paise = COALESCE(ROUND(amount_rupees * 100), 0);

UPDATE IndividualBookings SET
  amount_charged_paise = COALESCE(ROUND(amount_charged_rupees * 100), 0),
  amount_refunded_paise = COALESCE(ROUND(amount_refunded_rupees * 100), 0);

UPDATE SubscriptionPlans SET
  amount_paise = COALESCE(ROUND(amount_rupees * 100), 0),
  lifetime_price_paise = COALESCE(ROUND(lifetime_price_rupees * 100), 0);
