-- Migration: Add Official Email Details to SiteSettings
INSERT OR IGNORE INTO SiteSettings (key, value, description) VALUES 
('lms_email', 'om@lms.navasanganakah.com', 'Email for LMS related queries'),
('official_email', 'support@navasanganakah.com', 'Official ashram email'),
('founder_email', 'info@navasanganakah.com', 'Director Navasanganakah official email'),
('parent_company_email', 'info@navasanganakah.com', 'Parent company official email');
