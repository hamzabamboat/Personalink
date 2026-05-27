-- Public voice analyzer reports. Anyone can hit /voice-analyzer without an
-- account, paste 3 writing samples, and get a shareable fingerprint report.
-- Storage is per-report (one row per analysis), keyed by a public uuid token
-- used in the shareable results URL. We hash the IP to support rate-limit
-- and abuse review without storing PII.
create table if not exists voice_reports (
  id uuid default gen_random_uuid() primary key,
  token uuid default gen_random_uuid() unique not null, -- public share key
  ip_hash text,                                          -- sha256(ip + salt), for rate-limit / abuse review
  samples jsonb not null,                                -- string[] of the 3 pasted samples (truncated)
  fingerprint jsonb not null,                            -- { scores, signature_phrases, avoidances, summary }
  email text,                                            -- captured at conversion gate, nullable
  -- users.id is text in production (LinkedIn-derived) despite schema.sql claiming uuid.
  -- Match the actual production type so the FK constraint applies cleanly.
  converted_user_id text references users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists voice_reports_token_idx on voice_reports(token);
create index if not exists voice_reports_created_idx on voice_reports(created_at desc);
create index if not exists voice_reports_ip_recent_idx on voice_reports(ip_hash, created_at desc)
  where ip_hash is not null;
