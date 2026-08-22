-- Migration: 0042_add_per_minute_live_credit_rate
-- Add a per-minute live class credit rate to Batches so "per_minute" billing
-- can use a dedicated rate instead of reusing cost_per_class_rupees.

ALTER TABLE Batches ADD COLUMN live_class_cost_per_minute_rupees REAL DEFAULT 0;
