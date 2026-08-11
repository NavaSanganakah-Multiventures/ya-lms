-- Migration: 0042_add_live_class_credit_unit_index
CREATE INDEX IF NOT EXISTS idx_batches_live_class_credit_unit ON Batches(live_class_credit_unit);
