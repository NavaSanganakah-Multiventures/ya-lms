-- Migration number: 0015
-- Migrate Courses.price to Courses.price_rupees and drop old column

-- 1. Copy data from price to price_rupees where price_rupees is 0 or null
UPDATE Courses 
SET price_rupees = price 
WHERE price > 0 AND (price_rupees = 0 OR price_rupees IS NULL);

-- 2. Drop the old price column now that data is migrated
ALTER TABLE Courses DROP COLUMN price;
