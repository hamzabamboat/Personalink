-- supabase/migrations/20260528c_agency_inquiries.sql
-- Agency inquiries from the /for-agencies funnel.

CREATE TABLE IF NOT EXISTS agency_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_role TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  client_count TEXT NOT NULL,
  current_tools TEXT[],
  primary_problem TEXT,
  preferred_currency TEXT,
  timeline TEXT,
  source TEXT,
  ip TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new','contacted','demo_scheduled','demo_done','proposal_sent','closed_won','closed_lost'
  )),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_agency_inquiries_status ON agency_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_agency_inquiries_submitted ON agency_inquiries(submitted_at DESC);

ALTER TABLE agency_inquiries ENABLE ROW LEVEL SECURITY;
-- No public policies. Only service role can read/write.
