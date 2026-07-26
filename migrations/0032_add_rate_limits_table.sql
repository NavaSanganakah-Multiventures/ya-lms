-- Rate-limits table for IP, email, and user-based throttling
CREATE TABLE IF NOT EXISTS RateLimits (
    user_id TEXT NOT NULL,
    service TEXT NOT NULL DEFAULT 'ai',
    window_start DATETIME,
    window_used INTEGER DEFAULT 0,
    rate_limit INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, service)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON RateLimits(window_start);
