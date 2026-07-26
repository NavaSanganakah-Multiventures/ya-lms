-- Add missing SEO columns flagged during schema review
ALTER TABLE Courses ADD COLUMN IF NOT EXISTS seo_title_en TEXT;
ALTER TABLE Courses ADD COLUMN IF NOT EXISTS seo_title_hi TEXT;
ALTER TABLE Courses ADD COLUMN IF NOT EXISTS seo_description_en TEXT;
ALTER TABLE Courses ADD COLUMN IF NOT EXISTS seo_description_hi TEXT;
ALTER TABLE Courses ADD COLUMN IF NOT EXISTS seo_keywords_en TEXT;
ALTER TABLE Courses ADD COLUMN IF NOT EXISTS seo_keywords_hi TEXT;

ALTER TABLE Books ADD COLUMN IF NOT EXISTS seo_title_en TEXT;
ALTER TABLE Books ADD COLUMN IF NOT EXISTS seo_title_hi TEXT;
ALTER TABLE Books ADD COLUMN IF NOT EXISTS seo_description_en TEXT;
ALTER TABLE Books ADD COLUMN IF NOT EXISTS seo_description_hi TEXT;
ALTER TABLE Books ADD COLUMN IF NOT EXISTS seo_keywords_en TEXT;
ALTER TABLE Books ADD COLUMN IF NOT EXISTS seo_keywords_hi TEXT;
