-- Users Table
CREATE TABLE IF NOT EXISTS Users (
    id TEXT PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'teacher', 'student')) NOT NULL DEFAULT 'student',
    phone TEXT,
    district TEXT,
    state TEXT,
    country TEXT DEFAULT 'IN',
    birth_date TEXT,
    father_name TEXT,
    mother_name TEXT,
    grand_father_name TEXT,
    pincode TEXT,
    gender TEXT,
    bio TEXT,
    birth_place TEXT,
    ai_credits INTEGER DEFAULT 0, -- NEW: AI credits for content generation
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- OTPs Table for Passwordless Login
CREATE TABLE IF NOT EXISTS OTPs (
    email TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Categories Table
CREATE TABLE IF NOT EXISTS Categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE IF NOT EXISTS Courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    title_hi TEXT,
    description TEXT,
    description_hi TEXT,
    category_id TEXT,
    teacher_id TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0, -- Legacy price
    price_inr INTEGER DEFAULT 0,
    price_usd INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    merchant_default_image_url TEXT,
    self_study_enabled INTEGER DEFAULT 0,
    self_study_credit_cost INTEGER DEFAULT 0,
    self_study_only INTEGER DEFAULT 0,
    individual_class_booking_enabled INTEGER DEFAULT 0,
    individual_class_credit_cost INTEGER DEFAULT 0,
    individual_class_duration_minutes INTEGER DEFAULT 30,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Batches Table
CREATE TABLE IF NOT EXISTS Batches (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date DATETIME,
    end_date DATETIME,
    class_start_time TEXT, -- NEW
    class_end_time TEXT, -- NEW
    class_days TEXT, -- NEW: e.g. "Mon,Wed,Fri"
    self_study_group_enabled INTEGER DEFAULT 1,
    group_class_credit_cost INTEGER DEFAULT 0,
    group_class_credit_unit TEXT DEFAULT 'class',
    credit_deduction_timing TEXT DEFAULT 'on_join',
    status TEXT CHECK(status IN ('upcoming', 'ongoing', 'completed')) DEFAULT 'upcoming',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS Lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    batch_id TEXT,
    chapter_title TEXT DEFAULT 'General',
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image', 'article', 'recording')) NOT NULL,
    content_url TEXT, -- R2 Object Key or URL
    recording_url TEXT, -- RealtimeKit download URL
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    text_content TEXT,
    is_free INTEGER DEFAULT 0,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL
);

-- Enrollments Table
CREATE TABLE IF NOT EXISTS Enrollments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    batch_id TEXT, -- Optional for legacy or direct course enrollment
    progress INTEGER NOT NULL DEFAULT 0,
    certificate_eligible INTEGER DEFAULT 0,
    certificate_issued INTEGER DEFAULT 0,
    certificate_id TEXT,
    certificate_issued_at DATETIME,
    certificate_issued_by TEXT,
    status TEXT CHECK(status IN ('active', 'revoked', 'completed')) NOT NULL DEFAULT 'active',
    payment_id TEXT,
    payment_status TEXT DEFAULT 'pending',
    amount_paid INTEGER DEFAULT 0,
    payment_source TEXT,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL
);

-- LiveSessions Table
CREATE TABLE IF NOT EXISTS LiveSessions (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    batch_id TEXT,
    teacher_id TEXT NOT NULL,
    title TEXT,
    start_time DATETIME NOT NULL,
    rtc_room_id TEXT NOT NULL UNIQUE,
    status TEXT CHECK(status IN ('scheduled', 'live', 'ended')) DEFAULT 'scheduled',
    recording_id TEXT,
    recording_status TEXT DEFAULT 'pending',
    is_free INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- LiveSignaling Table
CREATE TABLE IF NOT EXISTS LiveSignaling (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS Attendance (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Exams / Quizzes Table
CREATE TABLE IF NOT EXISTS Exams (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    batch_id TEXT,
    teacher_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    passing_score INTEGER NOT NULL DEFAULT 50,
    duration_minutes INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 0,
    total_marks INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ExamQuestions (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    question_text TEXT NOT NULL,
    options_json TEXT NOT NULL,
    correct_option_index INTEGER NOT NULL DEFAULT 0,
    marks INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ExamAttempts (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    score_percent INTEGER NOT NULL DEFAULT 0,
    total_marks INTEGER NOT NULL DEFAULT 0,
    passed INTEGER DEFAULT 0,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES Exams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- CompletedLessons Table
CREATE TABLE IF NOT EXISTS CompletedLessons (
    user_id TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES Lessons(id) ON DELETE CASCADE
);

-- Certificates issued by admins after OTP verification
CREATE TABLE IF NOT EXISTS Certificates (
    id TEXT PRIMARY KEY,
    enrollment_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    issued_by TEXT NOT NULL,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (enrollment_id) REFERENCES Enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES Users(id) ON DELETE SET NULL
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ChatHistory Table
CREATE TABLE IF NOT EXISTS ChatHistory (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    session_id TEXT, -- To group messages
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON Courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON Lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_course ON Exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_batch ON Exams(batch_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON ExamQuestions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_exam ON ExamAttempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON Enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_livesessions_course ON LiveSessions(course_id);
CREATE INDEX IF NOT EXISTS idx_livesessions_batch ON LiveSessions(batch_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch ON Enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON Certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON Certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_category ON Courses(category_id);
CREATE INDEX IF NOT EXISTS idx_batches_course ON Batches(course_id);

-- Form Templates for dynamic admissions/contact forms
CREATE TABLE IF NOT EXISTS FormTemplates (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    fields_json TEXT NOT NULL, -- JSON array of field definitions
    seo_json TEXT, -- JSON for SEO tags: {title, description, keywords}
    theme_json TEXT,
    confirmation_email_body TEXT,
    linked_course_id TEXT,
    linked_batch_id TEXT,
    auto_enroll INTEGER DEFAULT 0,
    eligibility_criteria TEXT,
    teacher_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- Submissions for the dynamic forms
CREATE TABLE IF NOT EXISTS FormSubmissions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    user_id TEXT, -- Optional, for logged in users
    email TEXT, -- For guest submissions
    data_json TEXT NOT NULL, -- JSON of form responses
    status TEXT DEFAULT 'pending', -- pending, reviewed, accepted, rejected
    ai_analysis TEXT, -- AI feedback on the application
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES FormTemplates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON FormTemplates(slug);
CREATE INDEX IF NOT EXISTS idx_form_submissions_template ON FormSubmissions(template_id);

-- Error automation sessions and Jules job tracking
CREATE TABLE IF NOT EXISTS ErrorSessions (
    id TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT DEFAULT 'new',
    severity TEXT DEFAULT 'medium',
    title TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    full_payload TEXT,
    ai_prompt TEXT,
    url TEXT,
    user_id TEXT,
    device_info TEXT,
    email_from TEXT,
    email_to TEXT,
    email_subject TEXT,
    repeat_count INTEGER DEFAULT 1,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_sessions_fingerprint ON ErrorSessions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_sessions_status ON ErrorSessions(status);
CREATE INDEX IF NOT EXISTS idx_error_sessions_updated ON ErrorSessions(updated_at);

CREATE TABLE IF NOT EXISTS ErrorSessionEvents (
    id TEXT PRIMARY KEY,
    error_session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (error_session_id) REFERENCES ErrorSessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_error_session_events_session ON ErrorSessionEvents(error_session_id);

CREATE TABLE IF NOT EXISTS JulesJobs (
    id TEXT PRIMARY KEY,
    error_session_id TEXT NOT NULL,
    jules_session_id TEXT,
    prompt TEXT NOT NULL,
    status TEXT DEFAULT 'queued',
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (error_session_id) REFERENCES ErrorSessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jules_jobs_session ON JulesJobs(error_session_id);
CREATE INDEX IF NOT EXISTS idx_jules_jobs_status ON JulesJobs(status);

-- Email Drafts for Admin Review
CREATE TABLE IF NOT EXISTS EmailDrafts (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_html INTEGER DEFAULT 1,
    status TEXT CHECK(status IN ('draft', 'sent', 'cancelled')) DEFAULT 'draft',
    admin_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME,
    FOREIGN KEY (admin_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_admin ON EmailDrafts(admin_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON EmailDrafts(status);

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS Subscribers (
    email TEXT PRIMARY KEY,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active'
);

-- Platform & Site Settings (Dynamic Branding/SEO)
CREATE TABLE IF NOT EXISTS SiteSettings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User AI Credits Table
CREATE TABLE IF NOT EXISTS UserAICredits (
    user_id TEXT PRIMARY KEY,
    subscription_id TEXT,
    base_credits_total INTEGER DEFAULT 0,
    base_credits_used INTEGER DEFAULT 0,
    bonus_credits_total INTEGER DEFAULT 0,
    bonus_credits_used INTEGER DEFAULT 0,
    credits_period TEXT DEFAULT 'none',
    period_start DATETIME,
    period_end DATETIME,
    hour_window_start DATETIME,
    hour_window_used INTEGER DEFAULT 0,
    rate_limit_per_hour INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Transactions Table for Razorpay
CREATE TABLE IF NOT EXISTS Transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER, -- Legacy, now nullable
    amount_paise INTEGER,
    amount_inr INTEGER,
    currency TEXT DEFAULT 'INR',
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    payment_source TEXT DEFAULT 'razorpay',
    related_id TEXT,
    credits_added INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON Transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON Transactions(razorpay_order_id);

-- Credit Plans Table
CREATE TABLE IF NOT EXISTS CreditPlans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_inr INTEGER NOT NULL, -- in paise (e.g., 50000 for ₹500)
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Master Site Settings (Auto-populated on fresh schema apply)
INSERT OR REPLACE INTO SiteSettings (key, value, description) VALUES
('site_name', 'NS LMS', 'Main website name'),
('dashboard_name', 'NS LMS Portal', 'LMS portal name'),
('founder_name', 'Director Navasanganakah', 'Founder of the institution'),
('founder_google_panel', 'https://share.google/fXfpcS0k8xu8YvEYh', 'Google Knowledge Panel URL'),
('founder_social_handle', '@navasanganakah', 'Founder''s social media handle'),
('ns_lms_social_handle', '@navasanganakah', 'Ashram''s social media handle'),
('navasanganakah_social_handle', '@navasanganakah', 'Parent company social media handle'),
('founder_website', 'https://navasanganakah.com', 'Founder''s personal website'),
('ns_lms_website', 'https://navasanganakah.com', 'Ashram''s official website'),
('navasanganakah_website', 'https://navasanganakah.com', 'Parent company website'),
('parent_company', 'NavaSanganakah Group', 'Full legal name of the parent company'),
('child_company', 'NavaSanganakah LMS', 'Institutional brand name'),
('contact_phone', '+919669509960', 'Primary contact phone number'),
('founder_phone', '+919669509952', 'Direct contact for Director Navasanganakah'),
('site_address', 'NavaSanganakah LMS, Gindorhat, Suthaliya District Rajgarh MP 465677 India', 'Physical address of the institution'),
('lms_email', 'om@lms.navasanganakah.com', 'Email for LMS related queries'),
('official_email', 'support@navasanganakah.com', 'Official ashram email'),
('founder_email', 'info@navasanganakah.com', 'Director Navasanganakah official email'),
('parent_company_email', 'info@navasanganakah.com', 'Parent company official email'),
('ai_featured_pack_amount_inr', '101', 'AI credits featured pack amount in INR'),
('ai_featured_pack_credits', '1000', 'AI credits awarded for featured pack'),
('ai_credits_per_inr', '10', 'AI credits awarded per INR for custom purchases'),
('ai_credit_deduction_per_request', '2', 'AI credits deducted per AI request');

-- Coupons and Central Checkout
CREATE TABLE IF NOT EXISTS Coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT,
    discount_type TEXT CHECK(discount_type IN ('percent','fixed')) NOT NULL DEFAULT 'percent',
    discount_value INTEGER NOT NULL DEFAULT 0,
    max_discount_paise INTEGER DEFAULT 0,
    min_order_paise INTEGER DEFAULT 0,
    applies_to_json TEXT DEFAULT '["all"]',
    target_ids_json TEXT DEFAULT '[]',
    allowed_emails_json TEXT DEFAULT '[]',
    excluded_emails_json TEXT DEFAULT '[]',
    usage_limit INTEGER,
    per_user_limit INTEGER DEFAULT 1,
    starts_at DATETIME,
    ends_at DATETIME,
    is_active INTEGER DEFAULT 1,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS CouponRedemptions (
    id TEXT PRIMARY KEY,
    coupon_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT,
    transaction_id TEXT,
    discount_paise INTEGER DEFAULT 0,
    status TEXT DEFAULT 'created',
    redeemed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES Coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS BillingAddresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    transaction_id TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    line1 TEXT,
    line2 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    country TEXT DEFAULT 'India',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON Coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_user ON CouponRedemptions(coupon_id, user_id);
CREATE INDEX IF NOT EXISTS idx_billing_addresses_user ON BillingAddresses(user_id);
