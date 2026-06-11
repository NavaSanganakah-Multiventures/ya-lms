-- Add last_active_at column to PushSubscriptions and AnonymousUsers

ALTER TABLE PushSubscriptions ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE AnonymousUsers ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_anon_last_active ON AnonymousUsers(last_active_at);
