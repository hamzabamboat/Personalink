-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 1 (Understand)
-- growth_scores: per-user composite Growth Score history. Mirrors linkedin_scores
-- (score int + breakdown jsonb). Additive — does NOT replace linkedin_scores.
-- Also adds posts.format so per-format insights have a real column to read.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists growth_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  score integer not null,
  breakdown jsonb not null default '{}',
  captured_at timestamptz default now()
);

create index if not exists growth_scores_user_captured_idx
  on growth_scores(user_id, captured_at desc);

-- Post format (text|image|video|document|poll|article). Nullable; treated as
-- 'unknown' by insight aggregation when absent.
alter table posts add column if not exists format text;
