# Image Generation & Carousels — Design Spec

**Date:** 2026-06-10
**Status:** Approved for implementation (all decisions locked via brainstorming)
**Competitive trigger:** Dynal.AI (and Taplio/Kleo) lead with image gen + carousels; PersonaLink's image gen is a bare MVP. This closes the gap and flips the wedge.

**Touch points in current code:**
- `app/api/images/ai-generate/route.ts` — current single-image route (OpenAI `gpt-image-1`)
- `lib/anthropic.ts` → `craftDallePrompt()`, `analyseImageForPost()`
- `components/image-selector.tsx`, `components/ai-image-button.tsx` — entry UI (used in `/dashboard/generate`, `/dashboard/posts`, `/dashboard/calendar`)
- `app/api/og/voice-report/route.tsx` — existing `next/og` `ImageResponse` template render (the pattern we extend)
- `lib/pricing-config.ts` — tier limits & quotas
- `sharp` already a dependency; `next/og` already in use

---

## 1. TL;DR

Turn a one-style, square-only, single-output MVP into a **two-class visual engine**:

- **AI photo images** (`gpt-image-1.5`) — *metered*. Photographic/illustrative visuals.
- **Branded template graphics** (`next/og` `ImageResponse`) — *near-free, "unlimited"*. Quote / stat / title / list / myth cards.
- **Carousels** — Claude writes structured slides → template-rendered → stitched to PDF with `pdf-lib`. **No per-slide AI cost.**

Sold on three wedges Dynal fails on, all verified in our current code/positioning: **no watermark · no charge on failed renders · no credit anxiety (legible quotas).**

## 2. Goals / Non-goals

**Goals**
- Match & beat Dynal's 8 visual styles, carousels, and image quality.
- Make the UX impossible to misread (see R1/R2).
- Keep image COGS ≈5–6% of revenue; make template graphics effectively free so we can be generous.
- Preserve and surface the no-watermark / no-failed-charge advantages.

**Non-goals (out of scope for this spec)**
- Video / GIF generation, freeform Canva-style editor, non-LinkedIn formats, AI background on *every* carousel slide.

## 3. UX requirements (locked — do not soften)

- **R1 — Zero-confusion entry point.** After a post is generated, the image action reads in plain words — **"Add image to this post"** (not a bare ✨ icon). What happens next is obvious before the click.
- **R2 — "Add images to post", two modes.** A prominent button opening: **(a) per-post** ("generate N for *this* post") and **(b) bulk** ("type a number → generate for *all* eligible posts"). Bulk respects quota, shows **"X of Y left"** live, never silently fails or charges for failures. Eligible = scheduled/draft posts without an image.

## 4. Two-class image model

| Class | Engine | Cost to us | Quota treatment |
|---|---|---|---|
| **AI photo image** | OpenAI `gpt-image-1.5` | ~$0.07 | Metered: `ai_image_generations` |
| **Branded template graphic** | `next/og` `ImageResponse` + `sharp` | ~$0.003 | "Unlimited" (fair-use soft cap) |

Marketed honestly as: **"Unlimited branded graphics + N AI photo images."** (Never blend into one inflated count — that recreates Dynal's credit-drain complaint and breaks R1.)

## 5. Single-image engine (Phase 1)

Extend `components/image-selector.tsx` AI tab in place (no new page):
- **Style presets (8+):** photographic ones → `gpt-image-1.5`; text-based ones (Quote, Stat, Title, List, Myth/Reality) → template render. Names map to a `STYLE_PRESETS` config.
- **Aspect ratios:** 1080×1350 (portrait, default for feed), 1080×1080, 1.91:1 (1200×627). AI output cropped to exact ratio via `sharp`; templates render natively.
- **Variations:** generate 2–4 to choose from. **Cost control:** draft variations with `gpt-image-1-mini` (~$0.01); only full-render (`gpt-image-1.5`) the chosen one. (Alternative: count each variation against quota — config flag `VARIATION_STRATEGY`.)
- **Quality:** `medium` default; **`high` reserved for Pro.**
- **Prompt retune:** rewrite `craftDallePrompt()` for `gpt-image-1.5` conventions (it currently says "DALL-E 3"); 1.5 follows instructions and renders text better.
- **Preserve:** quota incremented only on success (already true in current route — keep); never stamp a watermark.

## 6. Branded template graphics (Phase 1)

- New renderer `app/api/og/card/route.tsx` (mirrors `og/voice-report`) — JSX/CSS → PNG via Satori.
- New `app/api/images/template/route.ts` — Claude (Haiku) extracts the hook/stat/title/list from post text → fills a template + theme → renders → stores in `post_images` with `kind='template'`.
- Card types v1: **Quote, Stat callout, Title/cover, List/tips, Myth-vs-Reality.**
- Footer is branded to the **user** (name/handle/avatar) — never "Made with PersonaLink".
- Reference mockups: `/tmp/pl-templates/marketing/*.png` (rendered via the throwaway `render2.js`; production reimplements these as `ImageResponse` JSX).

## 7. Carousel engine (Phase 2)

- New surface: **`/dashboard/carousel`** builder (reachable from `/dashboard/generate` "make this a carousel" and the post editor). Slide reorder, per-slide copy edit, theme picker, live preview, export.
- Pipeline: `POST /api/carousels/generate` → Claude returns structured slides `[{kind:'cover'|'body'|'cta', headline, body}]` → each slide rendered by `ImageResponse` from the chosen theme → `pdf-lib` stitches a multi-page **PDF** (1080×1350) + per-slide PNGs → stored.
- v1: **template-only body slides + optional AI cover image** (controls cost/quality). No AI background per slide.
- 3–4 carousel **themes** for v1 (Midnight / Mist / Ink + one more). Full brand kit = Phase 3.

## 8. Themes & brand kit

Because template graphics are HTML/CSS, the user's brand is just injected variables — trivial to apply across every card + carousel.

- **v1 theme presets:** Midnight (dark), Mist (light), Ink (premium) + one. Used when no brand kit is set.
- **Brand-lite (Phase 1):** **accent/primary color picker** (→ CSS variables) + **logo upload** (→ composited via Satori `<img>` / `sharp` overlay, in the card footer/corner). Applied to all template graphics + carousels. Makes "your brand, never ours" literally true.
- **Full brand kit (Phase 2):** **custom fonts** (Google Font pick or uploaded `.ttf`/`.woff`, loaded into Satori) + **multiple saved kits**, including **per agency client** (pairs with existing per-client voice fingerprints).
- **AI-photo limitation (be honest in UI):** brand colors/fonts can't be enforced *inside* a `gpt-image` photo; only a **logo overlay** (via `sharp`) is possible there. Precise brand control is a template/carousel capability — another reason templates beat AI-per-slide.

## 9. Data model changes

```
posts
  + format            text default 'single'   -- 'single' | 'carousel'

post_images
  + kind              text default 'ai_photo' -- 'ai_photo' | 'template'
  + template_type     text                    -- 'quote' | 'stat' | 'title' | 'list' | 'myth' | null
  + theme             text                    -- 'midnight' | 'mist' | 'ink' | ...
  + aspect_ratio      text                    -- '1080x1350' | '1080x1080' | '1200x627'

carousels (new)
  id uuid pk, user_id, post_id (fk, nullable),
  theme text, slides jsonb,                   -- [{kind, headline, body, image_url?}]
  pdf_url text, png_urls text[],
  status text,                                -- 'draft' | 'rendering' | 'ready' | 'failed'
  created_at, updated_at

brand_kits (new — color+logo in Phase 1; fonts+multi-brand in Phase 2)
  id uuid pk, user_id, agency_client_id null,   -- multiple kits per agency client
  primary_color, accent_color, logo_url,
  font_family null, font_url null,              -- Phase 2
  is_default boolean default true, created_at, updated_at

usage_tracking
  + carousels             int default 0
  + template_graphics     int default 0       -- tracked for analytics; gated only by soft fair-use cap
```
New migration: `supabase/migrations/20260610_image_engine.sql`.

## 10. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/images/ai-generate` | POST | **Modify:** accept `stylePreset`, `aspectRatio`, `variations`, `quality`; migrate to `gpt-image-1.5`; route text styles to template path |
| `/api/images/template` | POST | **New:** render a branded template card (cheap path) |
| `/api/og/card` | GET | **New:** `ImageResponse` renderer for cards |
| `/api/images/bulk` | POST | **New (R2):** generate N images across all eligible posts; quota-aware, streamed progress |
| `/api/carousels/generate` | POST | **New:** Claude slides → render → PDF |
| `/api/carousels/[id]` | GET/PATCH | **New:** fetch/edit/reorder/re-render |
| `/api/carousels/[id]/pdf` | GET | **New:** download the PDF |
| `/api/tools/card-generator` | POST | **New (Phase 3):** public, no-login, rate-limited free card tool (lead magnet) |

## 11. Tiering & quota (locked)

`lib/pricing-config.ts` → `TIER_LIMITS[*].perFeature`:

| | Free | Starter | Standard | Pro | Agency |
|---|---|---|---|---|---|
| `ai_image_generations` | 0 | **5** | **25** | **50** | 99999 |
| `carousels` (new) | 0 | 0 | **10** | **25** | 99999 |
| `template_graphics` (new) | 10 | 50 | 9999* | 9999* | 99999 |

\* "Unlimited" = high soft cap + per-minute rate limit to prevent abuse. `features.carousel` flag already true for Standard/Pro/Agency — no change needed. `quality:'high'` + AI carousel covers = Pro only.

## 12. Cost model (verified against live rates, 2026-06-10)

- AI photo (`gpt-image-1.5` medium) ≈ **$0.07**; high ≈ ~$0.19. Claude prompt+analysis (Haiku 4.5, $1/$5 per Mtok) ≈ **$0.005**. Template render (Satori) ≈ free.
- **Per AI photo ≈ $0.075 · per template card ≈ $0.003 · per template carousel ≈ $0.02–0.03 · carousel w/ AI cover ≈ $0.09.**
- Full-burn COGS: Standard 25×$0.075 + 10 carousels ≈ **$2.15 (~7%)**; Pro 50×$0.075 + 25 carousels ≈ **$4.50 (~7.5%)**.
- **Migration to `gpt-image-1.5`/`-mini` cuts per-image cost ~30–50%** — headroom to either lower COGS or raise generosity.

## 13. LinkedIn publishing constraint

- **Single images:** already auto-publish via existing flow (`image_urls` attach to the ugc post). No change.
- **Carousels (PDF / document posts):** the LinkedIn document-post API is access-restricted. **v1 fallback: generate → one-tap download PDF → user uploads as a LinkedIn document post.** Investigate official document-post access for auto-publish in Phase 3. Design both paths; never block the feature on the API.

## 14. Rollout

- **Phase 1 (ship fast):** single-image upgrades (presets, ratios, variations, `gpt-image-1.5` migration) + branded template cards + **brand-lite (accent color + logo upload)**, all in `image-selector.tsx`. Flip `/vs/*` rows from ⚠️→✅.
- **Phase 2:** carousel builder + PDF export + download-and-upload flow + **full brand kit (fonts + multiple per-client kits)**.
- **Phase 3:** public free card-generator lead magnet, carousel auto-publish (if API allows).

## 15. Open questions (resolve during impl)

1. LinkedIn document-post API access level for the connected OAuth app (gates carousel auto-publish).
2. Exact `gpt-image-1.5` size params + `sharp` crop pipeline to 1080×1350.
3. Variation strategy: mini-draft-then-upscale vs. count-each-against-quota (`VARIATION_STRATEGY` flag).
4. `template_graphics` fair-use threshold + rate-limit window.

## 16. Dependencies to add

- `pdf-lib` (carousel PDF assembly). `sharp` ✓ present. `next/og` ✓ present.
- OpenAI model migration `gpt-image-1` → `gpt-image-1.5`; add `gpt-image-1-mini` for variation drafts. (Note: `gpt-image-1` deprecates 2026-10-23 — migration is also a longevity fix.)
