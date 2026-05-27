-- Reshape post quotas + fingerprint limits across all tiers.
-- New ladder: free (3/1) / starter (12/1) / standard (22/3) / pro (50/∞) / agency (∞/∞).
-- Access-code users get grandfathered to Pro.
-- voice_fingerprint_limit is a new column; NULL means unlimited.

BEGIN;

-- 1. Expand the linkedin_accounts.plan CHECK to allow 'free' and 'agency'.
ALTER TABLE linkedin_accounts DROP CONSTRAINT IF EXISTS linkedin_accounts_plan_check;
ALTER TABLE linkedin_accounts
  ADD CONSTRAINT linkedin_accounts_plan_check
  CHECK (plan IS NULL OR plan IN ('free', 'starter', 'standard', 'pro', 'agency'));

-- 2. New column: NULL = unlimited.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS voice_fingerprint_limit INT;

-- 3. Snapshot pre-migration state so the rollback can restore exact values.
CREATE TABLE IF NOT EXISTS _tier_migration_20260527_snapshot AS
SELECT user_id, plan, posts_limit, NULL::INT AS voice_fingerprint_limit_before
FROM user_profiles;

-- 4. Anyone without a plan becomes 'free' (was implicit via the 3-post trial guard).
UPDATE user_profiles SET plan = 'free' WHERE plan IS NULL OR plan = '';

-- 5. Backfill quotas by current plan.
UPDATE user_profiles SET posts_limit = 3,    voice_fingerprint_limit = 1    WHERE plan = 'free';
UPDATE user_profiles SET posts_limit = 12,   voice_fingerprint_limit = 1    WHERE plan = 'starter';
UPDATE user_profiles SET posts_limit = 22,   voice_fingerprint_limit = 3    WHERE plan = 'standard';
UPDATE user_profiles SET posts_limit = 50,   voice_fingerprint_limit = NULL WHERE plan = 'pro';
UPDATE user_profiles SET posts_limit = NULL, voice_fingerprint_limit = NULL WHERE plan = 'agency';

-- 6. Grandfather access-code users on free/starter to Pro.
UPDATE user_profiles up
SET plan = 'pro', posts_limit = 50, voice_fingerprint_limit = NULL, updated_at = now()
FROM users u
WHERE up.user_id = u.id
  AND u.subscription_status = 'access_code'
  AND up.plan IN ('free', 'starter');

-- 7. Mirror the new posts_limit values on linkedin_accounts (per-account billing table).
UPDATE linkedin_accounts SET posts_limit = 3,  updated_at = now() WHERE plan = 'free';
UPDATE linkedin_accounts SET posts_limit = 12, updated_at = now() WHERE plan = 'starter';
UPDATE linkedin_accounts SET posts_limit = 22, updated_at = now() WHERE plan = 'standard';
UPDATE linkedin_accounts SET posts_limit = 50, updated_at = now() WHERE plan = 'pro';

COMMIT;
