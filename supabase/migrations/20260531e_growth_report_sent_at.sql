-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 3 (Sustain)
-- Weekly growth-report idempotency marker (mirrors user_profiles.day7_stats_sent_at).
-- Lets the growth-report cron skip a user already emailed within the last 7 days.
-- ─────────────────────────────────────────────────────────────────────────────

alter table user_profiles add column if not exists growth_report_sent_at timestamptz;
