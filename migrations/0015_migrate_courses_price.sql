-- Migration number: 0015
-- Migrate Courses.price to Courses.price_rupees and drop old column
-- Note: If price column doesn't exist (already migrated), errors are safe to ignore

-- 1. Copy data from price to price_rupees where price_rupees is 0 or null
-- Only runs if price column exists; error safe to ignore if not
UPDATE Courses 
SET price_rupees = price 
WHERE price > 0 AND (price_rupees = 0 OR price_rupees IS NULL);

-- 2. Drop the old price column now that data is migrated
-- SQLite does not support DROP COLUMN IF EXISTS; error safe to ignore if column is gone
ALTER TABLE Courses DROP COLUMN price;
