-- supabase/migrations/20260528d_affiliate_program.sql
-- DIY affiliate program: 27.5% recurring MRR commission for 12 months from first
-- paid event. Four tables:
--
--   affiliates           — one row per approved partner (unique user_id)
--   affiliate_referrals  — one row per referred user  (unique user_id)
--   affiliate_commissions— one row per credited payment event (idempotent on
--                          payment_provider + payment_ref)
--   affiliate_payouts    — one row per payout batch
--
-- RLS is enabled on every table with no public policies — only the service role
-- (used by API routes and webhooks) can read or write. The /affiliate/dashboard
-- page reads via API routes that scope queries to the requesting user.

/* ────────── affiliates ────────── */
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  ref_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','approved','rejected','suspended'
  )),
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.275,
  commission_duration_months INT NOT NULL DEFAULT 12,
  -- apply form fields
  audience_size TEXT,
  audience_description TEXT,
  promotion_channels TEXT[],
  website_url TEXT,
  linkedin_url TEXT,
  -- payout
  payout_method TEXT,
  payout_details JSONB,
  -- meta
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejected_reason TEXT,
  admin_notes TEXT,
  CONSTRAINT affiliates_user_unique UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliates_ref_code ON affiliates(ref_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_applied ON affiliates(applied_at DESC);

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
-- No public policies. Only service role can read/write.


/* ────────── affiliate_referrals ────────── */
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_paid_at TIMESTAMPTZ,
  commission_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'signed_up' CHECK (status IN (
    'signed_up','trialing','paying','expired','churned'
  )),
  attribution_source TEXT,         -- e.g. 'direct_link', 'landing_redirect'
  attribution_landing_path TEXT,   -- first page they landed on with ?ref=
  CONSTRAINT affiliate_referrals_user_unique UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON affiliate_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON affiliate_referrals(status);

ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
-- No public policies. Only service role can read/write.


/* ────────── affiliate_commissions ────────── */
-- One row per credited payment event. The (payment_provider, payment_ref) unique
-- constraint is the idempotency guarantee — re-delivered webhooks cannot
-- double-credit.
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) NOT NULL,
  referral_id UUID REFERENCES affiliate_referrals(id) NOT NULL,
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('dodo','razorpay')),
  payment_ref TEXT NOT NULL,
  payment_amount NUMERIC(12,2) NOT NULL,
  payment_currency TEXT NOT NULL,
  payment_inr_equivalent NUMERIC(12,2) NOT NULL,
  commission_amount_inr NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','approved','paid','clawback','void'
  )),
  payout_id UUID,                  -- set when included in an affiliate_payouts batch
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  CONSTRAINT commissions_payment_unique UNIQUE(payment_provider, payment_ref)
);

CREATE INDEX IF NOT EXISTS idx_commissions_affiliate ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_payout ON affiliate_commissions(payout_id);

ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
-- No public policies. Only service role can read/write.


/* ────────── affiliate_payouts ────────── */
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliates(id) NOT NULL,
  total_amount_inr NUMERIC(12,2) NOT NULL,
  payout_method TEXT NOT NULL,
  payout_ref TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested','processing','paid','failed','cancelled'
  )),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON affiliate_payouts(status);

ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
-- No public policies. Only service role can read/write.
