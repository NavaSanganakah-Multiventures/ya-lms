-- SQLite doesn't easily support altering CHECK constraints. 
-- However, we can just add the exam_id column. The CHECK constraint won't be strictly enforced to block 'quiz' inserts natively via ALTER, but D1 ignores CHECK in some cases or we can recreate the table.
-- db-migrate.ts will recreate the table to enforce the new CHECK constraint because we changed the schema.sql DDL!
-- So we only need to add the column if it doesn't exist, OR rely on db-migrate.ts's recreateTableFromSchema.
-- Actually, db-migrate.ts automatically recreates the table if the DDL changes! Let's just add the column for safety, or we don't need to if db-migrate recreates it.
-- Let's just add the column using ALTER TABLE ADD COLUMN.

ALTER TABLE Lessons ADD COLUMN exam_id TEXT REFERENCES Exams(id) ON DELETE SET NULL;
ALTER TABLE Courses ADD COLUMN sequential_unlock INTEGER DEFAULT 1;
