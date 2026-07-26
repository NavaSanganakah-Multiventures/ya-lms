-- Rate-limits table for IP and email based throttling
CREATE TABLE IF NOT EXISTS RateLimits (
    key TEXT PRIMARY KEY NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON RateLimits(window_start);
