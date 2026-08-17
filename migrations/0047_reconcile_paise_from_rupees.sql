-- Migration 0047: Reconcile paise columns from rupees for all non-wallet tables.
-- For CreditWallets/CreditLedger/PendingCharges, paise is the source of truth (#700, reconciled by 0045).
-- For every other money-bearing table, rupees was the historically-maintained value while the matching
-- *_paise column (added by 0043/0046) was only backfilled at deploy time and then went stale on edits.
-- Now that the application dual-writes *_paise (source) + derives *_rupees, we re-derive paise from rupees
-- ONCE so the two stay in lockstep going forward.

UPDATE Courses SET
  price_paise = COALESCE(ROUND(price_rupees * 100), 0),
  wallet_paise = COALESCE(ROUND(wallet_rupees * 100), 0),
  individual_class_cost_paise = COALESCE(ROUND(individual_class_cost_rupees * 100), 0),
  trial_upgrade_price_paise = COALESCE(ROUND(trial_upgrade_price_rupees * 100), 0);

UPDATE Books SET
  price_paise = COALESCE(ROUND(price_rupees * 100), 0),
  wallet_paise = COALESCE(ROUND(wallet_rupees * 100), 0);

UPDATE Batches SET
  cost_per_class_paise = COALESCE(ROUND(cost_per_class_rupees * 100), 0),
  live_class_cost_per_minute_paise = COALESCE(ROUND(live_class_cost_per_minute_rupees * 100), 0),
  no_show_charge_paise = COALESCE(ROUND(no_show_charge_rupees * 100), 0);

UPDATE SubscriptionPlans SET
  amount_paise = COALESCE(ROUND(amount_rupees * 100), 0),
  wallet_amount_paise = COALESCE(ROUND(wallet_amount_rupees * 100), 0),
  live_class_amount_paise = COALESCE(ROUND(live_class_amount_rupees * 100), 0),
  lifetime_price_paise = COALESCE(ROUND(lifetime_price_rupees * 100), 0);

UPDATE Subscriptions SET
  live_class_amount_paise = COALESCE(ROUND(live_class_amount_rupees * 100), 0);

UPDATE CreditPacks SET
  amount_paise = COALESCE(ROUND(amount_rupees * 100), 0);

UPDATE Transactions SET
  amount_paise = COALESCE(ROUND(amount_rupees * 100), 0);

UPDATE IndividualBookings SET
  amount_charged_paise = COALESCE(ROUND(amount_charged_rupees * 100), 0),
  amount_refunded_paise = COALESCE(ROUND(amount_refunded_rupees * 100), 0);
