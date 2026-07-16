-- Composite index for Notifications to speed up user notification queries
-- Covers: WHERE user_id = ? AND is_read = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON Notifications(user_id, is_read, created_at DESC);
