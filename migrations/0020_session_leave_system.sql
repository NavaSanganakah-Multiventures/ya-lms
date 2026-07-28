CREATE TABLE IF NOT EXISTS SessionLeaves (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('active', 'cancelled')) DEFAULT 'active',
  is_free INTEGER DEFAULT 1,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cancelled_at DATETIME,
  FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
  UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_session_leaves_student ON SessionLeaves(student_id);
CREATE INDEX IF NOT EXISTS idx_session_leaves_session ON SessionLeaves(session_id);
CREATE INDEX IF NOT EXISTS idx_session_leaves_active ON SessionLeaves(session_id, status);

CREATE TABLE IF NOT EXISTS MonthlyFreeLeaves (
    student_id TEXT NOT NULL,
    year_month TEXT NOT NULL,
    used_count INTEGER DEFAULT 0,
    PRIMARY KEY(student_id, year_month),
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS PendingCharges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_rupees REAL NOT NULL DEFAULT 2,
  reason TEXT NOT NULL DEFAULT 'no_show_charge',
  reference_type TEXT,
  reference_id TEXT,
  status TEXT CHECK(status IN ('pending', 'deducted', 'waived')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deducted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pending_charges_user ON PendingCharges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_charges_pending ON PendingCharges(user_id) WHERE status = 'pending';

ALTER TABLE Batches ADD COLUMN no_show_charge_rupees REAL DEFAULT 2;
