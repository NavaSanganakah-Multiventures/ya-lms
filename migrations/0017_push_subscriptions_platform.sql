-- Add platform column to PushSubscriptions
ALTER TABLE PushSubscriptions ADD COLUMN platform TEXT CHECK(platform IN ('web', 'flutter_android', 'flutter_ios', 'flutter_web')) NOT NULL DEFAULT 'web';
