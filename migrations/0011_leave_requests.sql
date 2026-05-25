-- Migration 0011: Add LeaveRequests table for student leave management
CREATE TABLE IF NOT EXISTS LeaveRequests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    course_id TEXT,
    batch_id TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    type TEXT CHECK(type IN ('sick', 'personal', 'other')) DEFAULT 'other',
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_by TEXT,
    reviewed_at TEXT,
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES Courses(id) ON DELETE SET NULL,
    FOREIGN KEY (batch_id) REFERENCES Batches(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES Users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_leave_student ON LeaveRequests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON LeaveRequests(status);
CREATE INDEX IF NOT EXISTS idx_leave_course ON LeaveRequests(course_id);
CREATE INDEX IF NOT EXISTS idx_leave_batch ON LeaveRequests(batch_id);
