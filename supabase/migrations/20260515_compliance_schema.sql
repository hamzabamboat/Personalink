-- Compliance schema additions for PersonaLink
-- Run these in Supabase SQL editor (each ALTER is idempotent via IF NOT EXISTS)

-- ──────────────────────────────────────────────────────────────────────
-- 1. Posts table: new compliance score columns
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS spam_score          INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS humanity_score      INTEGER DEFAULT 100;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hook_similarity_score INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS originality_score   INTEGER DEFAULT 100;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS similarity_score    INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT FALSE;

-- Index for finding high-spam posts quickly
CREATE INDEX IF NOT EXISTS idx_posts_spam_score ON posts (spam_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_requires_review ON posts (requires_manual_review) WHERE requires_manual_review = TRUE;

-- ──────────────────────────────────────────────────────────────────────
-- 2. user_profiles: trust & compliance fields
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS trust_score       INTEGER DEFAULT 50;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS risk_score        INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS flagged_count     INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS autopilot_eligible BOOLEAN DEFAULT FALSE;

-- Index for finding high-risk users
CREATE INDEX IF NOT EXISTS idx_user_profiles_risk_score ON user_profiles (risk_score DESC);

-- ──────────────────────────────────────────────────────────────────────
-- 3. compliance_events: audit log table
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_events (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID REFERENCES posts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity   TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  details    JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_events_user_id    ON compliance_events (user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_events_event_type ON compliance_events (event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_events_severity   ON compliance_events (severity);
CREATE INDEX IF NOT EXISTS idx_compliance_events_created_at ON compliance_events (created_at DESC);

-- Row-level security: only service-role can read/write compliance events
ALTER TABLE compliance_events ENABLE ROW LEVEL SECURITY;

-- Service role bypass (already default in Supabase)
-- Users cannot read their own compliance events directly
CREATE POLICY IF NOT EXISTS "compliance_events_service_only"
  ON compliance_events FOR ALL
  USING (auth.role() = 'service_role');
