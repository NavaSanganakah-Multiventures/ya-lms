-- Migration: 0014_add_google_event_id.sql
-- Date: 2026-05-26
-- Description: Add google_event_id column to Batches, LiveSessions, Exams, and LeaveRequests tables

ALTER TABLE Batches ADD COLUMN google_event_id TEXT;
ALTER TABLE LiveSessions ADD COLUMN google_event_id TEXT;
ALTER TABLE Exams ADD COLUMN google_event_id TEXT;
ALTER TABLE LeaveRequests ADD COLUMN google_event_id TEXT;
