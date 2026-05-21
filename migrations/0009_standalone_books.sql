-- Migration: 0009_standalone_books.sql
-- Description: Add pricing and standalone settings for books so they can be sold without a course.

ALTER TABLE Books ADD COLUMN price_inr INTEGER DEFAULT 0;
ALTER TABLE Books ADD COLUMN price_usd INTEGER DEFAULT 0;
ALTER TABLE Books ADD COLUMN thumbnail_url TEXT;
ALTER TABLE Books ADD COLUMN is_standalone INTEGER DEFAULT 0;
ALTER TABLE Books ADD COLUMN self_study_enabled INTEGER DEFAULT 0;
ALTER TABLE Books ADD COLUMN self_study_credit_cost INTEGER DEFAULT 0;
ALTER TABLE Books ADD COLUMN title_hi TEXT;
ALTER TABLE Books ADD COLUMN description_hi TEXT;
