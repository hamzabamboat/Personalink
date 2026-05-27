-- Rollback for 20260527b_update_tier_limits.sql.
-- Restores pre-migration plan + posts_limit values from the snapshot table,
-- drops voice_fingerprint_limit, and restores the original CHECK constraint.

BEGIN;

-- 1. Restore plan + posts_limit per the snapshot.
UPDATE user_profiles up
SET plan = s.plan,
    posts_limit = s.posts_limit,
    updated_at = now()
FROM _tier_migration_20260527_snapshot s
WHERE up.user_id = s.user_id;

-- 2. Drop the new column.
ALTER TABLE user_profiles DROP COLUMN IF EXISTS voice_fingerprint_limit;

-- 3. Re-narrow linkedin_accounts CHECK to the original three values.
--    Note: this fails if any row currently has plan='free' or 'agency' —
--    that data must be reconciled first.
ALTER TABLE linkedin_accounts DROP CONSTRAINT IF EXISTS linkedin_accounts_plan_check;
ALTER TABLE linkedin_accounts
  ADD CONSTRAINT linkedin_accounts_plan_check
  CHECK (plan IS NULL OR plan IN ('starter', 'standard', 'pro'));

-- 4. Drop the snapshot.
DROP TABLE IF EXISTS _tier_migration_20260527_snapshot;

COMMIT;
