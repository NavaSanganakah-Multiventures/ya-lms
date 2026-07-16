-- Add missing Users columns for session-based auth and Razorpay customer caching
-- These columns are used in src/index.ts but were never added via schema or migration

ALTER TABLE Users ADD COLUMN current_session_id TEXT;
ALTER TABLE Users ADD COLUMN razorpay_customer_id TEXT;

-- Add missing Lessons column for Hindi text content
-- Used in 32 places in src/index.ts for Hindi lesson content
ALTER TABLE Lessons ADD COLUMN text_content_hi TEXT;
