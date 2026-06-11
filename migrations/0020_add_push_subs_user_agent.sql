-- Add user_agent column to PushSubscriptions

ALTER TABLE PushSubscriptions ADD COLUMN user_agent TEXT;
