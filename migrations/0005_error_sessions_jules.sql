-- Error automation sessions and Jules job tracking
CREATE TABLE IF NOT EXISTS ErrorSessions (
    id TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    severity TEXT DEFAULT 'medium',
    title TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    full_payload TEXT,
    ai_prompt TEXT,
    url TEXT,
    user_id TEXT,
    device_info TEXT,
    email_from TEXT,
    email_to TEXT,
    email_subject TEXT,
    repeat_count INTEGER DEFAULT 1,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_sessions_fingerprint ON ErrorSessions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_sessions_status ON ErrorSessions(status);
CREATE INDEX IF NOT EXISTS idx_error_sessions_updated ON ErrorSessions(updated_at);

CREATE TABLE IF NOT EXISTS ErrorSessionEvents (
    id TEXT PRIMARY KEY,
    error_session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (error_session_id) REFERENCES ErrorSessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_error_session_events_session ON ErrorSessionEvents(error_session_id);

CREATE TABLE IF NOT EXISTS JulesJobs (
    id TEXT PRIMARY KEY,
    error_session_id TEXT NOT NULL,
    jules_session_id TEXT,
    prompt TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (error_session_id) REFERENCES ErrorSessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jules_jobs_session ON JulesJobs(error_session_id);
CREATE INDEX IF NOT EXISTS idx_jules_jobs_status ON JulesJobs(status);
