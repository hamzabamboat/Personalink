-- Voice corpus: a growing store of the user's REAL (human-authored) writing.
-- Used as few-shot exemplars on generation and to re-distill the voice fingerprint.
-- Only human text goes here (edits, writing samples, voice-note transcripts) —
-- never unedited AI output, to avoid reinforcing AI style.
create table if not exists voice_samples (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  text text not null,
  source text not null default 'manual', -- onboarding | manual | edit | voice_note
  weight real not null default 1,
  char_count integer,
  created_at timestamptz default now()
);

create index if not exists voice_samples_user_idx on voice_samples(user_id, created_at desc);
create index if not exists voice_samples_user_weight_idx on voice_samples(user_id, weight desc, created_at desc);
