-- Companion to 20260527b: the prior migration only widened the CHECK on
-- linkedin_accounts.plan. user_profiles and access_codes had their own
-- plan CHECK constraints (created elsewhere, not in this repo's migrations
-- folder) that still excluded 'free' and 'agency' — which broke onboarding
-- for any new user whose first write set plan='free'.

BEGIN;

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_plan_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_plan_check
  CHECK (plan IS NULL OR plan IN ('free', 'starter', 'standard', 'pro', 'agency'));

ALTER TABLE access_codes DROP CONSTRAINT IF EXISTS access_codes_plan_check;
ALTER TABLE access_codes
  ADD CONSTRAINT access_codes_plan_check
  CHECK (plan IN ('free', 'starter', 'standard', 'pro', 'agency'));

COMMIT;
