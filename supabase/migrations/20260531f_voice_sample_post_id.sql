-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 3 (Sustain)
-- Link voice samples to the post they were drawn from, so re-distillation can
-- weight by that post's measured performance. Nullable: onboarding/analyzer/
-- voice-note samples have no originating post and fall back to recency-only.
-- ─────────────────────────────────────────────────────────────────────────────

alter table voice_samples add column if not exists post_id uuid references posts(id) on delete set null;
create index if not exists voice_samples_post_id_idx on voice_samples(post_id);
