CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_unique_user_course ON Enrollments(user_id, course_id) WHERE course_id IS NOT NULL;
