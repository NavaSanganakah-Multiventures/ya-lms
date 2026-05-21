-- Migration: 001_batch_schema_fix.sql
-- Date: 2026-05-20
-- Fixes: BUG-01 (book_id FK missing), BUG-02 (missing columns), BUG-18 (missing index)

-- BUG-02: Batches table mein bilingual aur description columns add karo
ALTER TABLE Batches ADD COLUMN name_hi TEXT;
ALTER TABLE Batches ADD COLUMN description_en TEXT;
ALTER TABLE Batches ADD COLUMN description_hi TEXT;

-- BUG-18: book_id pe index add karo (course_id jaisa)
CREATE INDEX IF NOT EXISTS idx_batches_book ON Batches(book_id);

-- NOTE (BUG-01): SQLite mein ALTER TABLE se existing table mein FOREIGN KEY add nahi hoti.
-- book_id FK enforce karne ke liye fresh schema (schema.sql) update kar diya gaya hai.
-- Existing data ke liye application-level validation use karo (API mein book existence check).
-- Fresh deployments mein updated schema.sql se correct FK create hogi.
