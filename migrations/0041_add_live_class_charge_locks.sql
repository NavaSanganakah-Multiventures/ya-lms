-- Migration: 0041_add_live_class_charge_locks
-- Add a lightweight distributed lock table for live-class charging.
-- Prevents concurrent leave/end-session requests from double-charging a student.

CREATE TABLE IF NOT EXISTS CreditChargeLocks (
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  locked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, user_id),
  FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_credit_charge_locks_locked_at ON CreditChargeLocks(locked_at);
