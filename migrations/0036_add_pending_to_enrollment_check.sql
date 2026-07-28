-- Migration: Add 'pending' to Enrollments.status CHECK constraint
-- The code uses status='pending' for pre-payment enrollments (checkout flow),
-- but the CHECK constraint only allowed ('active','revoked','completed','cancelled').
-- Since SQLite does not support ALTER CONSTRAINT, we recreate the table.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS Enrollments_n (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT,
  book_id TEXT,
  batch_id TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  certificate_eligible INTEGER DEFAULT 0,
  certificate_issued INTEGER DEFAULT 0,
  certificate_id TEXT,
  certificate_issued_at DATETIME,
  certificate_issued_by TEXT,
  status TEXT CHECK(status IN ('active', 'revoked', 'completed', 'cancelled', 'pending')) NOT NULL DEFAULT 'active',
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  amount_paid INTEGER DEFAULT 0,
  payment_source TEXT,
  trial_expires_at DATETIME,
  purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL
);

-- Copy existing data — INSERT OR IGNORE makes this safe on migration retry
INSERT OR IGNORE INTO Enrollments_n SELECT * FROM Enrollments;

-- Rename original table as backup, then swap
DROP TABLE IF EXISTS Enrollments_old_36;
ALTER TABLE Enrollments RENAME TO Enrollments_old_36;
ALTER TABLE Enrollments_n RENAME TO Enrollments;

-- Recreate all indexes from schema.sql
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON Enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON Enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON Enrollments(user_id, course_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_unique_user_course ON Enrollments(user_id, course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_created_at ON Enrollments(created_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch_id ON Enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch_status ON Enrollments(batch_id, status);

-- Remove backup
DROP TABLE IF EXISTS Enrollments_old_36;

PRAGMA foreign_keys = ON;
