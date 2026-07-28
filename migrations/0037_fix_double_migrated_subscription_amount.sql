-- Fix SubscriptionPlans.amount_rupees that were divided twice
-- Migration 0035 converted paise→rupees (÷100). If it ran again on already-
-- converted values, they became too small (e.g. ₹501 → ROUND(501/100) = ₹5).
--
-- Detect and correct: any amount_rupees ≤ 10 is unreasonably low for a
-- subscription plan (even the cheapest trial ≥ ₹20). Multiply back by 100
-- to restore the correct rupee value (the ÷1 loss from ROUND is negligible).
UPDATE SubscriptionPlans
SET amount_rupees = ROUND(amount_rupees * 100)
WHERE amount_rupees <= 10 AND amount_rupees > 0;

-- Also fix live_class_amount_rupees with the same logic
UPDATE SubscriptionPlans
SET live_class_amount_rupees = ROUND(live_class_amount_rupees * 100)
WHERE live_class_amount_rupees <= 10 AND live_class_amount_rupees > 0;
