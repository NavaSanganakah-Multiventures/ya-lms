-- Add missing SEO columns flagged during schema review
-- SQLite does not support ALTER TABLE...ADD COLUMN IF NOT EXISTS.
-- The runner detects 'duplicate column name' as an idempotent non-failure,
-- so plain ADD COLUMN is safe regardless of whether the column already exists.
ALTER TABLE Courses ADD COLUMN seo_title_en TEXT;
ALTER TABLE Courses ADD COLUMN seo_title_hi TEXT;
ALTER TABLE Courses ADD COLUMN seo_description_en TEXT;
ALTER TABLE Courses ADD COLUMN seo_description_hi TEXT;
ALTER TABLE Courses ADD COLUMN seo_keywords_en TEXT;
ALTER TABLE Courses ADD COLUMN seo_keywords_hi TEXT;

ALTER TABLE Books ADD COLUMN seo_title_en TEXT;
ALTER TABLE Books ADD COLUMN seo_title_hi TEXT;
ALTER TABLE Books ADD COLUMN seo_description_en TEXT;
ALTER TABLE Books ADD COLUMN seo_description_hi TEXT;
ALTER TABLE Books ADD COLUMN seo_keywords_en TEXT;
ALTER TABLE Books ADD COLUMN seo_keywords_hi TEXT;
