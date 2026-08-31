-- Prevent multiple open attendance records for the same student in the same session.
-- This guards against race conditions during fast rejoins/network retries.

-- Clean up any existing duplicate open rows first (multiple rows with left_at IS NULL
-- for the same session + user). Keep the most recent open row and delete the stale ones,
-- otherwise the CREATE UNIQUE INDEX below would fail on production data.
DELETE FROM Attendance
WHERE left_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM Attendance AS newer
    WHERE newer.session_id = Attendance.session_id
      AND newer.user_id = Attendance.user_id
      AND newer.left_at IS NULL
      AND (
        COALESCE(newer.joined_at, '0000-00-00 00:00:00') > COALESCE(Attendance.joined_at, '0000-00-00 00:00:00')
        OR (
          COALESCE(newer.joined_at, '0000-00-00 00:00:00') = COALESCE(Attendance.joined_at, '0000-00-00 00:00:00')
          AND newer.id > Attendance.id
        )
      )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_open_session_user
ON Attendance(session_id, user_id)
WHERE left_at IS NULL;
