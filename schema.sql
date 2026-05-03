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
    description TEXT,
    category_id TEXT,
    teacher_id TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0, -- Legacy price
    price_inr INTEGER DEFAULT 0,
    price_usd INTEGER DEFAULT 0,
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
    status TEXT CHECK(status IN ('upcoming', 'ongoing', 'completed')) DEFAULT 'upcoming',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS Lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    chapter_title TEXT DEFAULT 'General',
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('video', 'pdf', 'live', 'image')) NOT NULL,
    content_url TEXT, -- R2 Object Key or URL
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE
);

-- Enrollments Table
CREATE TABLE IF NOT EXISTS Enrollments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    batch_id TEXT, -- Optional for legacy or direct course enrollment
    progress INTEGER NOT NULL DEFAULT 0,
    status TEXT CHECK(status IN ('active', 'revoked', 'completed')) NOT NULL DEFAULT 'active',
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

-- Exams Table
CREATE TABLE IF NOT EXISTS Exams (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT NOT NULL,
    passing_score INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON Enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_livesessions_course ON LiveSessions(course_id);
CREATE INDEX IF NOT EXISTS idx_livesessions_batch ON LiveSessions(batch_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch ON Enrollments(batch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON Notifications(user_id);
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
