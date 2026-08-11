-- Migration: 0042_add_live_class_credit_unit_index
-- Supports the new per_minute live class credit unit by adding an index
-- on the existing Batches.live_class_credit_unit column.

CREATE INDEX IF NOT EXISTS idx_batches_live_class_credit_unit ON Batches(live_class_credit_unit);
