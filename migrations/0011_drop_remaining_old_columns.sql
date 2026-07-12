-- Drop old credit/_inr columns now that backend code uses new columns exclusively

-- CreditPacks
ALTER TABLE CreditPacks DROP COLUMN amount_inr;
ALTER TABLE CreditPacks DROP COLUMN credits;

-- Transactions
ALTER TABLE Transactions DROP COLUMN amount;
ALTER TABLE Transactions DROP COLUMN amount_paise;
ALTER TABLE Transactions DROP COLUMN amount_inr;
ALTER TABLE Transactions DROP COLUMN credits_added;
ALTER TABLE Transactions DROP COLUMN credit_type;

-- Courses
ALTER TABLE Courses DROP COLUMN price_inr;
ALTER TABLE Courses DROP COLUMN self_study_credit_cost;
ALTER TABLE Courses DROP COLUMN individual_class_credit_cost;
ALTER TABLE Courses DROP COLUMN trial_upgrade_price_inr;

-- Books
ALTER TABLE Books DROP COLUMN price_inr;
ALTER TABLE Books DROP COLUMN self_study_credit_cost;

-- Batches
ALTER TABLE Batches DROP COLUMN live_class_credit_cost;

-- Subscriptions
ALTER TABLE Subscriptions DROP COLUMN live_class_credits;

-- SubscriptionPlans
ALTER TABLE SubscriptionPlans DROP COLUMN amount_inr;
ALTER TABLE SubscriptionPlans DROP COLUMN live_class_credits;
ALTER TABLE SubscriptionPlans DROP COLUMN lifetime_price_inr;

-- IndividualBookings
ALTER TABLE IndividualBookings DROP COLUMN credits_charged;
ALTER TABLE IndividualBookings DROP COLUMN credits_refunded;
