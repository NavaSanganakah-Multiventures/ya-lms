-- Add student_id index to prevent full table scan timeouts
CREATE INDEX IF NOT EXISTS idx_users_student_id ON Users(student_id COLLATE NOCASE);
