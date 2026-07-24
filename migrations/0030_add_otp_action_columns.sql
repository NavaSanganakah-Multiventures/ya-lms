-- Add action binding and request metadata columns to OTPs for rate limiting and replay protection.
ALTER TABLE OTPs ADD COLUMN action TEXT;
ALTER TABLE OTPs ADD COLUMN action_token TEXT;
ALTER TABLE OTPs ADD COLUMN request_ip TEXT;
ALTER TABLE OTPs ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_otps_action_token ON OTPs(action_token);
CREATE INDEX IF NOT EXISTS idx_otps_created_at ON OTPs(created_at);
