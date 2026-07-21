-- Migration 0025: Add student_id column to Users table
-- This allows logging in with student ID (which is stored in both id and student_id columns)

ALTER TABLE Users ADD COLUMN student_id TEXT;

-- Populate student_id from existing id column for all student users only
UPDATE Users SET student_id = id WHERE role = 'student' AND student_id IS NULL;

-- Non-student roles (admin, teacher) retain NULL student_id since the column
-- is semantically meant for formatted student identifiers (e.g. YA25IN07XX0001D).
-- Downstream code queries student_id only for student ID-based login lookups.
