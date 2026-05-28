-- Outreach view: every free-tier user with an email, in a single flat row.
-- Use `SELECT * FROM free_users` from any client (Supabase Studio, psql, the
-- /api/admin/free-users-export CSV endpoint, or a Resend Audiences sync job).
--
-- Plain view, not materialized — always reflects current state. List size
-- stays small (free users), query is O(profiles) with the existing index
-- on user_profiles(user_id).

DROP VIEW IF EXISTS free_users;

CREATE VIEW free_users AS
SELECT
  u.id                                      AS user_id,
  u.email                                   AS email,
  COALESCE(NULLIF(p.name, ''), u.linkedin_name) AS name,
  u.linkedin_name                           AS linkedin_name,
  u.linkedin_headline                       AS linkedin_headline,
  p.linkedin_url                            AS linkedin_url,
  p.role                                    AS role,
  p.industry                                AS industry,
  p.company                                 AS company,
  p.timezone                                AS timezone,
  COALESCE(p.posts_used_this_month, 0)      AS posts_used_this_month,
  p.onboarding_completed_at                 AS onboarding_completed_at,
  u.created_at                              AS signed_up_at,
  u.updated_at                              AS last_active,
  EXTRACT(DAY FROM (now() - u.created_at))::INT AS days_since_signup,
  EXTRACT(DAY FROM (now() - u.updated_at))::INT AS days_since_active
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE
  p.plan = 'free'
  AND u.email IS NOT NULL
  AND u.email <> '';

COMMENT ON VIEW free_users IS
  'Free-tier users with email — built for marketing outreach. Refreshes live.';
