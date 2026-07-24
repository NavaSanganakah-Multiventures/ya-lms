-- Migration for UserEvents used in DO D1 Sync
CREATE TABLE IF NOT EXISTS UserEvents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_userevents_user_id ON UserEvents(user_id);
