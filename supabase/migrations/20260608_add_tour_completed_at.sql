-- First-run feature tour: track when a user finished or skipped the tour.
-- NULL = never seen (eligible for auto-start). Non-NULL = don't auto-start.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;
