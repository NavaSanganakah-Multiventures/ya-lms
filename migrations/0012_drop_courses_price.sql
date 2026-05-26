-- Drop the orphaned `price` column from Courses.
-- Use `price_inr` and `price_usd` instead.
ALTER TABLE Courses DROP COLUMN price;
