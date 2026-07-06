ALTER TABLE Enrollments ADD COLUMN payment_id TEXT;
ALTER TABLE Enrollments ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE Enrollments ADD COLUMN payment_source TEXT;
