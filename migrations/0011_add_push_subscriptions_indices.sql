CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_id ON PushSubscriptions(device_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm_token ON PushSubscriptions(fcm_token);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON PushSubscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON PushSubscriptions(user_id);
