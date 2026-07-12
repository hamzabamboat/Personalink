-- ──────────────────────────────────────────────────────────────────────
-- Brand Stories / Case-Study Library
--
-- Curated brands (auto-researched weekly, citation-enforced, no human gate)
-- + private user-uploaded companies. Users write LinkedIn posts around a
-- discrete "angle" (a takeaway about a company). Angles lock per-(company)
-- for ~35 days so two people never post the same thing at the same time;
-- a locked angle is invisible to everyone but its claimant.
--
-- Distinct from library_items (post-pattern templates) and story_bank
-- (a user's own anecdotes). Additive + idempotent.
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS brand_companies (
  id uuid default gen_random_uuid() primary key,
  slug text unique,                                 -- stable key; curated idempotency
  name text not null,
  sector text,                                      -- 'food-delivery' | 'fintech' | 'saas' | ...
  summary text,                                     -- AI-researched growth story / notable facts
  facts jsonb default '[]'::jsonb,                  -- [{ claim, source_url, fetched_at }] — every claim cited
  source text not null default 'curated',           -- 'curated' | 'user'
  owner_id uuid references users(id) on delete cascade,  -- null for curated; the user for private uploads
  logo_url text,                                    -- user-supplied only (never scraped)
  status text not null default 'draft',             -- 'draft' | 'live' | 'retired'
  discovered_via text default 'roster',             -- 'roster' | 'weekly-discovery' | 'user'
  created_at timestamptz default now(),
  refreshed_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS brand_companies_browse_idx ON brand_companies(status, source, sector);
CREATE INDEX IF NOT EXISTS brand_companies_owner_idx ON brand_companies(owner_id);

-- The lockable unit: a discrete takeaway about a company.
CREATE TABLE IF NOT EXISTS brand_angles (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null references brand_companies(id) on delete cascade,
  title text not null,                              -- short angle label
  summary text,                                     -- talking points for the post
  source text not null default 'curated',           -- 'curated' (seed) | 'ai' (expanded)
  fingerprint text not null,                        -- normalized token signature (see lib/brand-fingerprint)
  created_by uuid references users(id) on delete set null,  -- user who generated an AI angle; null for seed
  created_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS brand_angles_company_idx ON brand_angles(company_id, source);

-- Who claimed which angle, and when it frees.
CREATE TABLE IF NOT EXISTS angle_locks (
  id uuid default gen_random_uuid() primary key,
  angle_id uuid not null references brand_angles(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  post_id uuid references posts(id) on delete set null,   -- the draft created from the claim
  locked_at timestamptz default now(),
  cooldown_until timestamptz not null,              -- locked_at + ~35 days
  released_at timestamptz                           -- set when claimant deletes the draft (frees early)
);
CREATE INDEX IF NOT EXISTS angle_locks_angle_idx ON angle_locks(angle_id);
CREATE INDEX IF NOT EXISTS angle_locks_user_idx ON angle_locks(user_id);

-- At most one ACTIVE lock per angle. Active = not released AND still on cooldown.
-- The predicate can't reference now(), so we enforce "one un-released lock per
-- angle" here and treat an expired-but-un-released row as free at read time
-- (a fresh claim after expiry first releases the stale row — see lib/brand-stories).
CREATE UNIQUE INDEX IF NOT EXISTS angle_locks_one_active_idx
  ON angle_locks(angle_id) WHERE released_at IS NULL;
