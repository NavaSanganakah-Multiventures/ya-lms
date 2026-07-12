CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON Attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON Attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_livesessions_rtc_room_id ON LiveSessions(rtc_room_id);
CREATE INDEX IF NOT EXISTS idx_individualbookings_live_session_id ON IndividualBookings(live_session_id);
CREATE INDEX IF NOT EXISTS idx_individualbookings_student_id ON IndividualBookings(student_id);
