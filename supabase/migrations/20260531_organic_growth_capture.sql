-- ──────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 0 capture foundation
--
-- Source-abstracted analytics capture. Adds attributed "latest" metrics to
-- posts, activates+extends post_analytics as a velocity time series, and adds
-- daily follower_snapshots + profile_analytics. users.linkedin_scopes lets the
-- adapter pick creator_api vs public_fallback per user.
--
-- metric source enum (text): 'creator_api' | 'public_fallback' | 'manual'
-- ──────────────────────────────────────────────────────────────────────

-- users: which scopes the member granted (drives source selection)
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_scopes text[];

-- posts: extend the "latest" attributed-metrics cache
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reshares                integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS saves                   integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_clicks             integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS members_reached         integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS followers_gained        integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS profile_views_from_post integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_source           text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS metrics_synced_at       timestamptz;

-- post_analytics: activate as a velocity time series (table already exists with
-- id, post_id, user_id, impressions, reactions, captured_at)
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS age_minutes     integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS comments        integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS reshares        integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS saves           integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS link_clicks     integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS members_reached integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS source          text;

CREATE INDEX IF NOT EXISTS post_analytics_post_id_idx
  ON post_analytics(post_id, captured_at);
CREATE INDEX IF NOT EXISTS post_analytics_user_id_idx
  ON post_analytics(user_id, captured_at);

-- follower_snapshots: daily audience growth (backfilled on connect)
CREATE TABLE IF NOT EXISTS follower_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  snapshot_date date not null,
  follower_count integer not null,
  source text default 'creator_api',
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS follower_snapshots_user_id_idx
  ON follower_snapshots(user_id, snapshot_date);

-- profile_analytics: daily authority signals
CREATE TABLE IF NOT EXISTS profile_analytics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  snapshot_date date not null,
  profile_views integer,
  search_appearances integer,
  source text default 'creator_api',
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS profile_analytics_user_id_idx
  ON profile_analytics(user_id, snapshot_date);
