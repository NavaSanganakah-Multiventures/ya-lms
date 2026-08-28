-- Prevent multiple open attendance records for the same student in the same session.
-- This guards against race conditions during fast rejoins/network retries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_open_session_user
ON Attendance(session_id, user_id)
WHERE left_at IS NULL;
