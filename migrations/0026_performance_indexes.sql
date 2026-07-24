-- Add indexes for commonly queried patterns that lack them

CREATE INDEX IF NOT EXISTS idx_completed_lessons_user ON CompletedLessons(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch_status ON Enrollments(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_lessons_course_batch ON Lessons(course_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_examattempts_user ON ExamAttempts(user_id);
