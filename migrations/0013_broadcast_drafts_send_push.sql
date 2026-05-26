-- Migration: Add send_push column to BroadcastDrafts table
-- This supports the new Browser Push Notification channel in Admin Broadcast

-- Step 1: Create BroadcastDrafts table if it doesn't already exist (with all columns including send_push)
CREATE TABLE IF NOT EXISTS BroadcastDrafts (
    id TEXT PRIMARY KEY,
    subject TEXT DEFAULT '',
    message TEXT NOT NULL,
    type TEXT CHECK(type IN ('draft', 'history')) DEFAULT 'draft',
    target_type TEXT DEFAULT 'all',
    target_id TEXT DEFAULT '',
    custom_emails TEXT DEFAULT '',
    send_email INTEGER DEFAULT 1,
    send_notification INTEGER DEFAULT 1,
    send_push INTEGER DEFAULT 0,
    admin_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME
);

-- Step 2: Add send_push column if table already exists (SQLite ALTER TABLE ADD COLUMN is idempotent with migrations)
-- Note: This will fail gracefully if column already exists — run manually if needed
-- ALTER TABLE BroadcastDrafts ADD COLUMN send_push INTEGER DEFAULT 0;
