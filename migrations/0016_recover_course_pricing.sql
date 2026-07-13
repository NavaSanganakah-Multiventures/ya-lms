-- Migration number: 0016
-- Recover Courses.price_rupees from the old price column
-- Some courses have price_rupees = 0 because they were created before
-- price_rupees was the standard column. This migration copies any
-- remaining values from the legacy price column.

-- 1. Copy price → price_rupees where price_rupees is 0 but price has a value
UPDATE Courses 
SET price_rupees = price 
WHERE price > 0 AND (price_rupees = 0 OR price_rupees IS NULL);

-- 2. Drop the legacy price column if it still exists
-- SQLite does not support DROP COLUMN IF EXISTS; error safe to ignore if already dropped
ALTER TABLE Courses DROP COLUMN price;
