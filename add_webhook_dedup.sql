CREATE TABLE IF NOT EXISTS ProcessedWebhookEvents (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    razorpay_entity_id TEXT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_processed_at ON ProcessedWebhookEvents(processed_at);
