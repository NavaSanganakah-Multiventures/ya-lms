-- Migration: Add SiteSettings table and initial branding
CREATE TABLE IF NOT EXISTS SiteSettings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO SiteSettings (key, value) VALUES 
('site_name', 'Adityanveshan'),
('dashboard_name', 'Adityanveshan Swadhyaya Vedika'),
('founder_name', 'Acharya Pandit Dheerendra Tripathi'),
('founder_google_panel', 'https://share.google/fXfpcS0k8xu8YvEYh'),
('founder_social_handle', '@acharypdt'),
('yagya_ashram_social_handle', '@yagyaashram'),
('navasanganakah_social_handle', '@navasanganakah'),
('founder_website', 'https://acharypdt.com'),
('yagya_ashram_website', 'https://yagyaashram.com'),
('navasanganakah_website', 'https://navasanganakah.com'),
('parent_company', 'NavaSanganakah Multiventures'),
('child_company', 'Yagya Ashram');
