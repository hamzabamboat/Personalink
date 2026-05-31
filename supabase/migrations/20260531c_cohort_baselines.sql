-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 1 (Understand)
-- cohort_baselines: periodic rollup of cohort-median sub-scores. Feeds cold-start
-- partial pooling (w_self = n/(n+K)) in lib/growth-score.ts. Global cohort in v1
-- (cohort_key = 'global'); segmentation deferred to the calibration task.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists cohort_baselines (
  id uuid default gen_random_uuid() primary key,
  cohort_key text not null default 'global',
  reach_median numeric,
  audience_median numeric,
  resonance_median numeric,
  authority_median numeric,
  n_users integer not null default 0,
  computed_at timestamptz default now()
);

create index if not exists cohort_baselines_key_computed_idx
  on cohort_baselines(cohort_key, computed_at desc);
