# Multi-Balance Credit Wallet Implementation Plan

## Goal
Implement separate credit balances (ai, live_class, self_study) while maintaining backward compatibility with existing `balance` column.

## Key Decisions
1. **Schema**: Add `ai_balance`, `live_class_balance`, `self_study_balance` (INTEGER DEFAULT 0) to `CreditWallets`; add `credit_type` (TEXT) to `CreditLedger`
2. **Migration**: Copy `balance` → `ai_balance`, keep original `balance` unchanged; backfill `CreditLedger.credit_type` using existing data or default to 'ai'
3. **API**: Default missing `creditType` to 'ai' for backward compatibility
4. **Testing**: E2E tests for credit flow
5. **Rollback**: No rollback support (one-way migration)

## Tasks
1. Update `schema.sql` - add new columns
2. Create migration script in `db-migrate.ts`
3. Update `src/index.ts` - modify `addCreditsToWallet`, `deductCreditsFromWallet` with `creditType` parameter
4. Update API routes to extract/pass `creditType`
5. Update `contexts/CreditsContext.tsx` - track three balances
6. Update `hooks/useCreditWallet.ts` - add selectors
7. Update UI components: `BuyCreditsModal`, `DashboardNav/*`
8. Update Flutter `student_app/`

## Validation
- Run migration against test database
- E2E tests pass
- Manual verification of all three balances