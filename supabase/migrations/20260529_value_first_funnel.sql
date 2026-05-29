-- Value-first onboarding funnel: magic-link auth + email-signup metadata.

-- 1. Magic-link tokens. We store only a sha256 hash of the raw token, never the
--    raw value. Single-use (used_at) + short expiry (expires_at).
create table if not exists magic_link_tokens (
  id uuid default gen_random_uuid() primary key,
  token_hash text not null unique,
  email text not null,
  voice_report_token uuid,                 -- links the analyzer fingerprint to claim
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists magic_link_tokens_hash_idx on magic_link_tokens(token_hash);
create index if not exists magic_link_tokens_email_recent_idx
  on magic_link_tokens(email, created_at desc);

-- 2. How the account was created. Existing rows default to 'linkedin'.
alter table users add column if not exists signup_source text not null default 'linkedin';

-- Email-magic-link users have no LinkedIn yet; allow a null linkedin_id.
-- (Postgres UNIQUE permits multiple NULLs, so the existing unique index is unaffected.)
alter table users alter column linkedin_id drop not null;

-- 3. Inline refinement progress (0..5) and the day-2 PostHog dedupe flag.
alter table user_profiles add column if not exists refinement_step int not null default 0;
alter table user_profiles add column if not exists day2_event_fired boolean not null default false;

-- 4. Throttle columns for the new cron emails (mirror last_pipeline_reminder_sent_at).
alter table user_profiles add column if not exists day2_nudge_sent_at timestamptz;
alter table user_profiles add column if not exists day7_stats_sent_at timestamptz;
