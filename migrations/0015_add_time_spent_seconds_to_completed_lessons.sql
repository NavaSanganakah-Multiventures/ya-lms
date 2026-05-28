-- Add time_spent_seconds to CompletedLessons to resolve D1_ERROR: no such column
ALTER TABLE CompletedLessons ADD COLUMN time_spent_seconds INTEGER DEFAULT 0;
