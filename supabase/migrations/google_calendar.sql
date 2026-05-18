-- Google Calendar integration
-- Run in Supabase SQL editor

-- Add Google Calendar token columns to users table
alter table users
  add column if not exists google_calendar_access_token  text,
  add column if not exists google_calendar_refresh_token text,
  add column if not exists google_calendar_token_expires_at timestamptz;

-- Add Google Calendar event ID to posts table so we can update/delete events
alter table posts
  add column if not exists google_calendar_event_id text;
