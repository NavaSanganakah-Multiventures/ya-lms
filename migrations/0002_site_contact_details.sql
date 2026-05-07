-- Migration: Add Contact Details to SiteSettings
CREATE TABLE IF NOT EXISTS SiteSettings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO SiteSettings (key, value, description) VALUES 
('contact_phone', '+919669509960', 'Primary contact phone number'),
('founder_phone', '+919669509952', 'Direct contact for Acharya Pandit Dheerendra Tripathi'),
('site_address', 'Yagya Ashram, Gindorhat, Suthaliya District Rajgarh MP 465677 India', 'Physical address of the institution');
