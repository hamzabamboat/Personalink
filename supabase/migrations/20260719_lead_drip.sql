-- Durable list of emails captured via the voice-analyzer magic-link box.
-- One row per email; template_index cycles through LEAD_DRIP_TEMPLATES.
create table if not exists leads (
  email text primary key,
  source text not null,
  voice_report_token uuid,
  unsubscribe_token text not null unique,
  template_index int not null default 0,
  last_sent_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists leads_due_idx on leads(unsubscribed_at, last_sent_at);
create index if not exists leads_unsubscribe_token_idx on leads(unsubscribe_token);

-- Service role key bypasses RLS, so all API routes (which use supabaseAdmin)
-- are unaffected. No anon/authenticated policies = blocks any direct client
-- access to captured emails and unsubscribe tokens via the public anon key.
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
