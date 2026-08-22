-- Step 1: Add wallet_amount_rupees to SubscriptionPlans (REAL supports fractional values)
ALTER TABLE SubscriptionPlans ADD COLUMN wallet_amount_rupees REAL DEFAULT 0;

-- Step 2: Copy existing ai_credits values to wallet_amount_rupees (ai_credits was already in rupees)
UPDATE SubscriptionPlans SET wallet_amount_rupees = ai_credits WHERE ai_credits > 0;

-- Step 3: Drop AI credits columns from SubscriptionPlans
ALTER TABLE SubscriptionPlans DROP COLUMN ai_credits;
ALTER TABLE SubscriptionPlans DROP COLUMN ai_credits_period;
ALTER TABLE SubscriptionPlans DROP COLUMN ai_rate_limit_per_hour;

-- Step 4: Drop bonus_ai_credits from PlanContentPool
ALTER TABLE PlanContentPool DROP COLUMN bonus_ai_credits;
