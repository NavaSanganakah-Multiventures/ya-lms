-- Migration: 0045_reconcile_rupees_from_paise
-- With integer paise now the source of truth for wallet/live-class amounts (#675),
-- re-derive the legacy REAL *_rupees columns from *_paise so the two stay in sync
-- and any pre-existing floating-point drift between them is removed.

UPDATE CreditWallets SET
  balance_rupees = ROUND(balance_paise / 100.0, 2),
  lifetime_deposits_rupees = ROUND(lifetime_deposits_paise / 100.0, 2),
  lifetime_withdrawals_rupees = ROUND(lifetime_withdrawals_paise / 100.0, 2);

UPDATE CreditLedger SET
  change_rupees = ROUND(change_paise / 100.0, 2),
  balance_after_rupees = ROUND(balance_after_paise / 100.0, 2);

UPDATE PendingCharges SET amount_rupees = ROUND(amount_paise / 100.0, 2) WHERE amount_paise IS NOT NULL;
