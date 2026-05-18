-- Add Zapier API key to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS zapier_api_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_zapier_api_key
  ON user_profiles (zapier_api_key)
  WHERE zapier_api_key IS NOT NULL;
