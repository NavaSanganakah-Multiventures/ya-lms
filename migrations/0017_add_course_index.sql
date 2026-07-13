-- Migration number: 0017
-- Add index on Courses teacher_id for faster admin queries

CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON Courses(teacher_id);
