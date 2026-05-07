-- Migration: Add Official Email Details to SiteSettings
INSERT OR IGNORE INTO SiteSettings (key, value, description) VALUES 
('lms_email', 'om@lms.yagyaashram.com', 'Email for LMS related queries'),
('official_email', 'om@yagyaashram.com', 'Official ashram email'),
('founder_email', 'info@acharypdt.com', 'Acharya Pandit Dheerendra Tripathi official email'),
('parent_company_email', 'info@navasanganakah.com', 'Parent company official email');
