ALTER TABLE Lessons ADD COLUMN processing_status TEXT DEFAULT 'pending';
ALTER TABLE Lessons ADD COLUMN processing_error TEXT;
CREATE INDEX IF NOT EXISTS idx_lessons_processing_status ON Lessons(processing_status);
