-- ──────────────────────────────────────────────────────────────────────
-- Brand kit Phase 2 — multiple named kits per user (agency multi-client).
--
-- A user can now own many brand_kits. Exactly one has is_default = true — the
-- "active" kit that every generation (graphics, carousels, banner) renders
-- with. `name` labels each kit so an agency can keep one per client.
-- Additive + idempotent; safe to re-run.
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS name text;

-- Give any pre-existing kit a friendly default label.
UPDATE brand_kits SET name = 'My brand' WHERE name IS NULL OR name = '';
