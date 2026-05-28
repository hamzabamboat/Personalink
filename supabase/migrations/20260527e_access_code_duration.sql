-- Time-limited access codes: a code can grant Pro (or any tier) for a
-- finite number of days. On redemption, the user's plan_expires_at is
-- set to now() + duration_days. A daily cron downgrades expired users
-- back to 'free'.

BEGIN;

ALTER TABLE access_codes
  ADD COLUMN IF NOT EXISTS duration_days INT;

COMMENT ON COLUMN access_codes.duration_days IS
  'NULL = lifetime grant (default). Positive integer = number of days the redeeming user keeps the granted plan before auto-revert to free.';

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.plan_expires_at IS
  'Set when a time-limited access code is redeemed. Cron job /api/cron/expire-plans downgrades the user to free when this passes.';

CREATE INDEX IF NOT EXISTS idx_user_profiles_plan_expires_at
  ON user_profiles(plan_expires_at)
  WHERE plan_expires_at IS NOT NULL;

COMMIT;
