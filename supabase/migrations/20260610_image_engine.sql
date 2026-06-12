-- ──────────────────────────────────────────────────────────────────────
-- Image engine — Phase 1
--
-- Two-class image model:
--   • AI photos        (gpt-image-1.5)  → post_images.kind = 'ai_photo'
--   • Branded graphics (next/og render) → post_images.kind = 'template'
-- Plus brand kits (color/logo now; fonts + multi-brand in Phase 2) and
-- carousels (multi-slide → PDF). usage_tracking is generic (feature/used_count),
-- so the new 'carousels' / 'template_graphics' counters need no schema change.
-- ──────────────────────────────────────────────────────────────────────

-- posts: single vs carousel (Post type already expects `format`)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS format text DEFAULT 'single';

-- post_images: distinguish AI photos from template graphics + render metadata
ALTER TABLE post_images ADD COLUMN IF NOT EXISTS kind          text DEFAULT 'ai_photo'; -- 'ai_photo' | 'template'
ALTER TABLE post_images ADD COLUMN IF NOT EXISTS template_type text;                    -- 'quote' | 'stat' | 'title' | 'list' | 'myth'
ALTER TABLE post_images ADD COLUMN IF NOT EXISTS theme         text;                    -- 'midnight' | 'mist' | 'ink'
ALTER TABLE post_images ADD COLUMN IF NOT EXISTS aspect_ratio  text;                    -- '1080x1350' | '1080x1080' | '1200x627'

-- brand_kits: per-user (and per agency client) visual identity
CREATE TABLE IF NOT EXISTS brand_kits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  agency_client_id uuid,                  -- nullable; multiple kits per agency client (Phase 2)
  primary_color text,
  accent_color text,
  logo_url text,
  font_family text,                       -- Phase 2
  font_url text,                          -- Phase 2 (uploaded font file)
  is_default boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS brand_kits_user_id_idx ON brand_kits(user_id);

-- carousels: multi-slide documents rendered to PDF
CREATE TABLE IF NOT EXISTS carousels (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  post_id uuid references posts(id) on delete set null,
  theme text default 'midnight',
  slides jsonb not null default '[]'::jsonb,   -- [{kind, headline, body, image_url?}]
  pdf_url text,
  png_urls text[],
  status text default 'draft',                 -- 'draft' | 'rendering' | 'ready' | 'failed'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX IF NOT EXISTS carousels_user_id_idx ON carousels(user_id, created_at);
CREATE INDEX IF NOT EXISTS carousels_post_id_idx ON carousels(post_id);
