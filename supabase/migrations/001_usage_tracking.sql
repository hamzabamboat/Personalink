-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  feature text not null,
  used_count integer not null default 0,
  reset_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  UNIQUE(user_id, feature, reset_at)
);

CREATE INDEX IF NOT EXISTS usage_tracking_user_feature_idx
  ON usage_tracking(user_id, feature, reset_at);

CREATE TABLE IF NOT EXISTS limit_violations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  feature text not null,
  attempted_at timestamptz default now(),
  plan text not null
);

CREATE INDEX IF NOT EXISTS limit_violations_user_idx
  ON limit_violations(user_id, attempted_at);
