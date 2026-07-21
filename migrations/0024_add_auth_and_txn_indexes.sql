-- Indexes for auth lookup (sendOTP, verifyOTP, admin queries)
CREATE INDEX IF NOT EXISTS idx_users_role ON Users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);

-- Indexes for transaction queries (admin dashboard, accounting)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON Transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON Transactions(created_at);

-- Index for admin stats date-range queries
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON Courses(created_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_created_at ON Enrollments(created_at);
