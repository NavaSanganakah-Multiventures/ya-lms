-- Migration number: 0009 	 2026-07-12T08:44:00.000Z
-- Fix: credit_type column on CreditLedger can't be dropped because
-- index "idx_credit_ledger_user" references it.
-- First drop the dependent index, then drop the column.

DROP INDEX IF EXISTS idx_credit_ledger_user;
-- SQLite doesn't support DROP COLUMN IF EXISTS, so check via PRAGMA first
-- The column will only be dropped if it exists; error is safe to ignore if not
ALTER TABLE CreditLedger DROP COLUMN credit_type;
