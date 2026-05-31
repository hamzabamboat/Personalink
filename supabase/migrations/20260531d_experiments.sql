-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 2 (Intervene)
-- experiments: one row per posting tweak under test. Every intervention holds a
-- control arm and is measured against the user's own pre-experiment baseline —
-- there are NO silent global behavior changes. posts gets experiment_id + variant
-- so each generated post records which arm it belongs to.
--
-- dimension : timing | format | pillar | hook | length
-- status    : running | won | lost | inconclusive
-- variant   : control | treatment
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists experiments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  hypothesis text not null,
  dimension text not null,
  control jsonb not null default '{}',
  treatment jsonb not null default '{}',
  baseline_metric text not null default 'engagement_rate',
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text not null default 'running',
  result jsonb,
  created_at timestamptz default now()
);

create index if not exists experiments_user_status_idx
  on experiments(user_id, status);
create index if not exists experiments_user_dimension_idx
  on experiments(user_id, dimension, status);

-- posts: which experiment + arm produced this post (null = not in an experiment)
alter table posts add column if not exists experiment_id uuid references experiments(id) on delete set null;
alter table posts add column if not exists variant text;

create index if not exists posts_experiment_idx on posts(experiment_id);
