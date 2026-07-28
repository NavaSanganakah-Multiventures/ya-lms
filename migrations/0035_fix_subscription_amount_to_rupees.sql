-- Convert SubscriptionPlans.amount_rupees from paise to rupees for consistency
-- Previously the admin panel stored ×100 (paise) but column name says "rupees"
-- Migration: divide all existing values by 100, round to nearest integer
UPDATE SubscriptionPlans SET amount_rupees = ROUND(amount_rupees / 100.0) WHERE amount_rupees IS NOT NULL;
