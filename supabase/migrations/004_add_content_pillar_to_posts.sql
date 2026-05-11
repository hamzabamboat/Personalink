-- Add content_pillar column to posts (singular — one pillar per post)
-- content_pillars (plural) was mistakenly added by a previous migration; this is the correct column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_pillar text;
