-- Migration 0025: Backfill student_id for existing student users
-- The ALTER TABLE ADD COLUMN is handled automatically by checkMigrations()
-- (db-migrate.ts compares schema.sql with the live DB and adds missing columns).
-- This SQL file only needs the data backfill.

-- Populate student_id from existing id column for all student users only
UPDATE Users SET student_id = id WHERE role = 'student' AND student_id IS NULL;

-- Non-student roles (admin, teacher) retain NULL student_id since the column
-- is semantically meant for formatted student identifiers (e.g. YA25IN07XX0001D).
-- Downstream code queries student_id only for student ID-based login lookups.
