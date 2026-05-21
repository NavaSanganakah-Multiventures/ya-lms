-- Prepaid Time Bank table for group class credit tracking
CREATE TABLE IF NOT EXISTS PrepaidTimeBank (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    seconds_paid INTEGER NOT NULL DEFAULT 0,
    seconds_used INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES LiveSessions(id) ON DELETE CASCADE
);

-- Individual Bookings table
CREATE TABLE IF NOT EXISTS IndividualBookings (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('scheduled', 'live', 'completed', 'cancelled')) NOT NULL DEFAULT 'scheduled',
    scheduled_at DATETIME NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    duration_minutes INTEGER DEFAULT 30,
    credits_charged INTEGER DEFAULT 0,
    credits_refunded INTEGER DEFAULT 0,
    live_session_id TEXT,
    google_event_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Index for prepaid lookups
CREATE INDEX IF NOT EXISTS idx_prepaid_user_session ON PrepaidTimeBank(user_id, session_id);

-- Index for student booking lookups
CREATE INDEX IF NOT EXISTS idx_individual_bookings_student ON IndividualBookings(student_id);
