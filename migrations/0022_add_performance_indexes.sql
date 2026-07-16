-- Performance indexes to reduce D1 table scan overhead
-- ScheduledNotifications: cron queries filter by status + next_run_at
CREATE INDEX IF NOT EXISTS idx_sched_notif_status_next ON ScheduledNotifications(status, next_run_at);

-- Notifications: user notification list queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON Notifications(user_id);

-- CreditLedger: heavily queried by user_id + reference_type + reference_id in charge functions
CREATE INDEX IF NOT EXISTS idx_creditledger_user_ref ON CreditLedger(user_id, reference_type, reference_id);

-- Enrollments: batch_id lookups for live class reminders
CREATE INDEX IF NOT EXISTS idx_enrollments_batch_id ON Enrollments(batch_id);

-- PendingCharges: already has idx_pending_charges_user but add session lookup
CREATE INDEX IF NOT EXISTS idx_pending_charges_session ON PendingCharges(reference_id, reason);
