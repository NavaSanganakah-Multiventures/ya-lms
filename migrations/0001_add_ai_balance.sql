-- Migration to add ai_balance and other credit wallet split columns

-- 1. Add columns to CreditWallets if they don't exist
ALTER TABLE CreditWallets ADD COLUMN ai_balance INTEGER DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN live_class_balance INTEGER DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN self_study_balance INTEGER DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN lifetime_ai_credits INTEGER DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN lifetime_live_class_credits INTEGER DEFAULT 0;
ALTER TABLE CreditWallets ADD COLUMN lifetime_self_study_credits INTEGER DEFAULT 0;

-- 2. Migrate existing balance data to ai_balance
UPDATE CreditWallets SET ai_balance = balance, lifetime_ai_credits = lifetime_credits;

-- 3. CreditLedger - add credit_type column
ALTER TABLE CreditLedger ADD COLUMN credit_type TEXT;
