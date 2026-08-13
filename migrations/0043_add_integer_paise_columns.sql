-- Migration: 0043_add_integer_paise_columns
-- Adds INTEGER paise columns alongside existing REAL rupee columns for all
-- wallet and live-class amounts. Data is back-filled from rupee columns.

-- CreditWallets
ALTER TABLE CreditWallets ADD COLUMN balance_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN lifetime_deposits_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN lifetime_withdrawals_paise INTEGER NOT NULL DEFAULT 0;

UPDATE CreditWallets SET
  balance_paise = COALESCE(ROUND(balance_rupees * 100), 0),
  lifetime_deposits_paise = COALESCE(ROUND(lifetime_deposits_rupees * 100), 0),
  lifetime_withdrawals_paise = COALESCE(ROUND(lifetime_withdrawals_rupees * 100), 0);

-- CreditLedger
ALTER TABLE CreditLedger ADD COLUMN change_paise INTEGER NOT NULL DEFAULT 0;
ALTER TABLE CreditLedger ADD COLUMN balance_after_paise INTEGER NOT NULL DEFAULT 0;

UPDATE CreditLedger SET
  change_paise = COALESCE(ROUND(change_rupees * 100), 0),
  balance_after_paise = COALESCE(ROUND(balance_after_rupees * 100), 0);

-- Batches
ALTER TABLE Batches ADD COLUMN cost_per_class_paise INTEGER DEFAULT 0;
ALTER TABLE Batches ADD COLUMN live_class_cost_per_minute_paise INTEGER DEFAULT 0;
ALTER TABLE Batches ADD COLUMN no_show_charge_paise INTEGER DEFAULT 200;

UPDATE Batches SET
  cost_per_class_paise = COALESCE(ROUND(cost_per_class_rupees * 100), 0),
  live_class_cost_per_minute_paise = COALESCE(ROUND(live_class_cost_per_minute_rupees * 100), 0),
  no_show_charge_paise = COALESCE(ROUND(no_show_charge_rupees * 100), 200);

-- Courses
ALTER TABLE Courses ADD COLUMN wallet_paise INTEGER DEFAULT 0;
ALTER TABLE Courses ADD COLUMN individual_class_cost_paise INTEGER DEFAULT 0;

UPDATE Courses SET
  wallet_paise = COALESCE(ROUND(wallet_rupees * 100), 0),
  individual_class_cost_paise = COALESCE(ROUND(individual_class_cost_rupees * 100), 0);

-- Books
ALTER TABLE Books ADD COLUMN wallet_paise INTEGER DEFAULT 0;
UPDATE Books SET wallet_paise = COALESCE(ROUND(wallet_rupees * 100), 0);

-- Subscriptions
ALTER TABLE Subscriptions ADD COLUMN live_class_amount_paise INTEGER DEFAULT 0;
UPDATE Subscriptions SET live_class_amount_paise = COALESCE(ROUND(live_class_amount_rupees * 100), 0);

-- SubscriptionPlans
ALTER TABLE SubscriptionPlans ADD COLUMN wallet_amount_paise INTEGER DEFAULT 0;
ALTER TABLE SubscriptionPlans ADD COLUMN live_class_amount_paise INTEGER DEFAULT 0;

UPDATE SubscriptionPlans SET
  wallet_amount_paise = COALESCE(ROUND(wallet_amount_rupees * 100), 0),
  live_class_amount_paise = COALESCE(ROUND(live_class_amount_rupees * 100), 0);

-- PendingCharges
ALTER TABLE PendingCharges ADD COLUMN amount_paise INTEGER NOT NULL DEFAULT 200;
UPDATE PendingCharges SET amount_paise = COALESCE(ROUND(amount_rupees * 100), 200);
