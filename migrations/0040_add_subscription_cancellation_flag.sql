-- Migration number: 0040	2026-08-01
-- Add cancellation_requested flag to Subscriptions.
-- Allows us to record a cancel request while keeping status='active' until
-- Razorpay sends the subscription.cancelled webhook at period end.

ALTER TABLE Subscriptions ADD COLUMN cancellation_requested INTEGER DEFAULT 0;
