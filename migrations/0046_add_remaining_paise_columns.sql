-- Migration: 0046_add_remaining_paise_columns
-- Stage 2 of #675: integer paise becomes the source of truth for ALL monetary columns.
-- Adds *_paise INTEGER columns alongside the remaining REAL *_rupees columns and
-- back-fills them from rupees. Write paths switch to paise incrementally; the legacy
-- *_rupees columns stay (derived) until a final DROP migration once every reader uses paise.

-- Courses
ALTER TABLE Courses ADD COLUMN price_paise INTEGER DEFAULT 0;
ALTER TABLE Courses ADD COLUMN trial_upgrade_price_paise INTEGER DEFAULT 0;
UPDATE Courses SET
  price_paise = COALESCE(ROUND(price_rupees * 100), 0),
  trial_upgrade_price_paise = COALESCE(ROUND(trial_upgrade_price_rupees * 100), 0);

-- Books
ALTER TABLE Books ADD COLUMN price_paise INTEGER DEFAULT 0;
UPDATE Books SET price_paise = COALESCE(ROUND(price_rupees * 100), 0);

-- CreditPacks
ALTER TABLE CreditPacks ADD COLUMN amount_paise INTEGER DEFAULT 0;
UPDATE CreditPacks SET amount_paise = COALESCE(ROUND(amount_rupees * 100), 0);

-- Transactions
ALTER TABLE Transactions ADD COLUMN amount_paise INTEGER DEFAULT 0;
UPDATE Transactions SET amount_paise = COALESCE(ROUND(amount_rupees * 100), 0);

-- IndividualBookings (0044 was empty - these paise columns never existed before)
ALTER TABLE IndividualBookings ADD COLUMN amount_charged_paise INTEGER DEFAULT 0;
ALTER TABLE IndividualBookings ADD COLUMN amount_refunded_paise INTEGER DEFAULT 0;
UPDATE IndividualBookings SET
  amount_charged_paise = COALESCE(ROUND(amount_charged_rupees * 100), 0),
  amount_refunded_paise = COALESCE(ROUND(amount_refunded_rupees * 100), 0);

-- SubscriptionPlans
ALTER TABLE SubscriptionPlans ADD COLUMN amount_paise INTEGER DEFAULT 0;
ALTER TABLE SubscriptionPlans ADD COLUMN lifetime_price_paise INTEGER DEFAULT 0;
UPDATE SubscriptionPlans SET
  amount_paise = COALESCE(ROUND(amount_rupees * 100), 0),
  lifetime_price_paise = COALESCE(ROUND(lifetime_price_rupees * 100), 0);
