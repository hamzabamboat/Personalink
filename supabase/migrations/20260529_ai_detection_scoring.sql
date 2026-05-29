-- ──────────────────────────────────────────────────────────────────────
-- AI-detection scoring on posts
-- Stores the structural-AI-detector score and the patterns that fired,
-- captured at the moment the draft was saved (after up to 2 rewrite
-- attempts via cleanThroughAIGate).
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_detection_score   INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_detection_patterns JSONB  DEFAULT '[]'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_rewrite_attempts  INTEGER DEFAULT 0;

-- Admin analytic queries scan recent rows and aggregate ai_detection_score;
-- a created_at index already exists, so this is the only extra index we need.
CREATE INDEX IF NOT EXISTS idx_posts_ai_detection_score
  ON posts (ai_detection_score DESC);
