-- Migration number: 0002 	 2024-06-23T12:00:00.000Z
CREATE TABLE IF NOT EXISTS BlockedIPs (
    ip_address TEXT PRIMARY KEY,
    reason TEXT,
    blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    email_sent BOOLEAN DEFAULT 0
);
