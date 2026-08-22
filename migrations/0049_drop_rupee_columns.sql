-- Migration 0049: Drop legacy *_rupees money columns.
-- Paise (*_paise) columns are now the SOLE source of truth for all money values.
-- Reads already use ROUND(*_paise / 100.0, 2) AS *_rupees aliases; writes are paise-only (PRs #707, #720 and preceding #675 stages).
-- No index / view / trigger references any *_rupee column (verified).
-- PREREQUISITE: All paise-only writes and paise-derived reads (PRs #707, #720 and preceding #675 stages) MUST be merged & deployed FIRST,
-- else INSERT/UPDATE statements still referencing these columns would fail at runtime.

ALTER TABLE Courses DROP COLUMN price_rupees;
ALTER TABLE Courses DROP COLUMN wallet_rupees;
ALTER TABLE Courses DROP COLUMN individual_class_cost_rupees;
ALTER TABLE Courses DROP COLUMN trial_upgrade_price_rupees;
ALTER TABLE Batches DROP COLUMN cost_per_class_rupees;
ALTER TABLE Batches DROP COLUMN live_class_cost_per_minute_rupees;
ALTER TABLE Batches DROP COLUMN no_show_charge_rupees;
ALTER TABLE IndividualBookings DROP COLUMN amount_charged_rupees;
ALTER TABLE IndividualBookings DROP COLUMN amount_refunded_rupees;
ALTER TABLE CreditWallets DROP COLUMN balance_rupees;
ALTER TABLE CreditWallets DROP COLUMN lifetime_deposits_rupees;
ALTER TABLE CreditWallets DROP COLUMN lifetime_withdrawals_rupees;
ALTER TABLE CreditLedger DROP COLUMN change_rupees;
ALTER TABLE CreditLedger DROP COLUMN balance_after_rupees;
ALTER TABLE Transactions DROP COLUMN amount_rupees;
ALTER TABLE Books DROP COLUMN price_rupees;
ALTER TABLE Books DROP COLUMN wallet_rupees;
ALTER TABLE PendingCharges DROP COLUMN amount_rupees;
ALTER TABLE CreditPacks DROP COLUMN amount_rupees;
ALTER TABLE Subscriptions DROP COLUMN live_class_amount_rupees;
ALTER TABLE SubscriptionPlans DROP COLUMN amount_rupees;
ALTER TABLE SubscriptionPlans DROP COLUMN wallet_amount_rupees;
ALTER TABLE SubscriptionPlans DROP COLUMN live_class_amount_rupees;
ALTER TABLE SubscriptionPlans DROP COLUMN lifetime_price_rupees;
