-- Migration: 0045_reconcile_rupees_from_paise (FIXED for data recovery)
-- FIX: Added "WHERE ... > 0" guards. Previously, if 0043's backfill was skipped
-- (paise = 0 from checkMigrations default), this UPDATE would OVERWRITE the real
-- rupee balances with 0/100 = 0, destroying data BEFORE 0049 drops the rupee columns.
-- Now only syncs rupees where paise has a real backfilled value (> 0).

UPDATE CreditWallets SET
  balance_rupees = ROUND(balance_paise / 100.0, 2),
  lifetime_deposits_rupees = ROUND(lifetime_deposits_paise / 100.0, 2),
  lifetime_withdrawals_rupees = ROUND(lifetime_withdrawals_paise / 100.0, 2)
WHERE balance_paise > 0
  OR lifetime_deposits_paise > 0
  OR lifetime_withdrawals_paise > 0;

UPDATE CreditLedger SET
  change_rupees = ROUND(change_paise / 100.0, 2),
  balance_after_rupees = ROUND(balance_after_paise / 100.0, 2)
WHERE change_paise > 0 OR balance_after_paise > 0;

UPDATE PendingCharges SET amount_rupees = ROUND(amount_paise / 100.0, 2) WHERE amount_paise > 0;
