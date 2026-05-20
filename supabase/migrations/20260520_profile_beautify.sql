-- Store LinkedIn headline fetched from OAuth userinfo
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_headline TEXT;

-- Current profile fields for beautification input (user-provided or fetched from LinkedIn)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_about TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_skills TEXT[];

-- Profile beautifications: stores AI-generated profile rewrites with before/after scores
CREATE TABLE IF NOT EXISTS profile_beautifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Input snapshot at time of generation
  input_headline TEXT,
  input_about TEXT,
  input_skills TEXT[],

  -- Scores (0-100) before and after
  score_before INTEGER,
  score_after INTEGER,
  breakdown_before JSONB DEFAULT '{}',
  breakdown_after JSONB DEFAULT '{}',

  -- Generated output
  new_headline TEXT NOT NULL,
  new_about TEXT NOT NULL,
  suggested_skills TEXT[],
  profile_photo_brief TEXT,
  banner_brief TEXT,
  improvement_notes TEXT[]
);

CREATE INDEX IF NOT EXISTS profile_beautifications_user_id_idx ON profile_beautifications(user_id);
CREATE INDEX IF NOT EXISTS profile_beautifications_created_at_idx ON profile_beautifications(user_id, created_at DESC);
