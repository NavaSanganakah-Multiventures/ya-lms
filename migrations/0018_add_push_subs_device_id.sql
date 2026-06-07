-- Add device_id column to PushSubscriptions
ALTER TABLE PushSubscriptions ADD COLUMN device_id TEXT;
