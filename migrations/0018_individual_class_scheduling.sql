-- Individual class scheduling system
-- Per-minute rate for 1-to-1 live classes
ALTER TABLE Courses ADD COLUMN individual_class_cost_rupees REAL DEFAULT 0;

-- Copy existing wallet_rupees as per-minute rate (backward compat)
-- If wallet_rupees was 50 (old unlock price), set per-minute rate ~2
UPDATE Courses SET individual_class_cost_rupees = ROUND(CAST(wallet_rupees AS REAL) / 30.0, 2) WHERE individual_class_cost_rupees = 0 AND wallet_rupees > 0;

-- Teachers working hours for availability
ALTER TABLE Users ADD COLUMN teacher_work_start TEXT DEFAULT '09:00';
ALTER TABLE Users ADD COLUMN teacher_work_end TEXT DEFAULT '18:00';
ALTER TABLE Users ADD COLUMN teacher_work_days TEXT DEFAULT '1,2,3,4,5,6';
ALTER TABLE Users ADD COLUMN teacher_timezone TEXT DEFAULT 'Asia/Kolkata';
