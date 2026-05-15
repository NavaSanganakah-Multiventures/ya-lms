-- Migration: Add SiteSettings table and initial branding
CREATE TABLE IF NOT EXISTS SiteSettings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO SiteSettings (key, value) VALUES 
('site_name', 'NS LMS'),
('dashboard_name', 'NS LMS Portal'),
('founder_name', 'Director Navasanganakah'),
('founder_google_panel', 'https://share.google/fXfpcS0k8xu8YvEYh'),
('founder_social_handle', '@navasanganakah'),
('ns_lms_social_handle', '@navasanganakah'),
('navasanganakah_social_handle', '@navasanganakah'),
('founder_website', 'https://navasanganakah.com'),
('ns_lms_website', 'https://navasanganakah.com'),
('navasanganakah_website', 'https://navasanganakah.com'),
('parent_company', 'NavaSanganakah Group'),
('child_company', 'NavaSanganakah LMS');
