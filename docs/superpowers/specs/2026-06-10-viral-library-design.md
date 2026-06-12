# Viral / Inspiration Library — Design Spec (legit version)

**Date:** 2026-06-10
**Status:** Direction approved (sourcing + surface locked); implementation details to refine.
**Why:** Only true feature gap vs Dynal/Taplio. `lib/competitor-data.ts` currently concedes *"Public viral-post inspiration library"* as ⚠️ vs ✅. Built the legal way, it also becomes an SEO acquisition engine + a data moat.

---

## 1. TL;DR

A LinkedIn inspiration library built **without scraping**, on three sources:
1. **First-party corpus** — top-performing posts published *through* PersonaLink (`post_analytics`), surfaced with **consent**, anonymized by default.
2. **Curated seed** — human-written **transformative** pattern breakdowns (hook/format analysis), *not* republished post text. Solves cold-start.
3. **Community swipe file** — users **save** posts they admire (opt-in; Chrome extension later).

Surface = **public, SEO-indexed (freemium)** for traffic + signups; **"remix in my voice"** gated behind login (reuses the voice-fingerprint engine).

## 2. Why not scraping (decision record)

Rejected. Scraping public LinkedIn is a **ToS/contract breach** (hiQ *lost* the contract claim), carries **copyright/PII/DPDP** exposure, and — fatally — risks **revocation of our LinkedIn OAuth app**, which would kill the core publishing product. Hiding the source or paywalling makes it *worse* (plagiarism + commercial-use weighs against fair use). **Legit-only.**

## 3. Sourcing

- **A. First-party.** `post_analytics` already captures impressions/reactions/etc. Eligible = published posts above an engagement threshold whose author **opted in** ("contribute my top posts to the library"). Store **transformative metadata** (hook type, format, structure, pillar, why-it-works) — anonymized unless the user allows attribution.
- **B. Curated seed.** Admin tool to add human-written **pattern breakdowns** of public examples (analysis/templates, never verbatim text + identity).
- **C. Community swipe file.** "Save to library" button → user's private swipe file + opt-in public contribution. Phase 3: Chrome extension to save inline on LinkedIn.

## 4. Public SEO surface (freemium)

- **`/library`** (or `/inspiration`) — browsable, filterable by **niche / format / hook-type / engagement tier**.
- Each entry is a **transformative card**: the hook pattern + why it works + a **reusable template** — **not** the original verbatim post or author PII.
- Public + indexable (schema.org `CreativeWork`/`Article`). Drives organic search → signups (Taplio's #1 traffic engine, done legally).
- **Gated (login):** "**Remix in my voice**" → feeds the pattern into the existing voice-fingerprint engine to draft a post in the user's voice; save to collections; full depth.

## 5. Data model

```
library_items (new)
  id uuid pk, source text,            -- 'first_party' | 'curated' | 'community'
  niche text, format text, hook_type text,
  pattern_summary text,               -- transformative analysis
  template_text text,                 -- reusable, fill-in template
  engagement_tier text,               -- 'high' | 'top' (no raw scraped metrics published)
  contributed_by uuid null, attributed boolean default false,
  is_public boolean default false, created_at

swipe_saves (new)
  user_id, library_item_id (fk), notes, created_at

user_profiles
  + contribute_to_library boolean default false
```
Migration: `supabase/migrations/2026XXXX_viral_library.sql`.

## 6. Ingestion

- Cron scans `post_analytics` for opted-in users' posts above the threshold → Claude (Haiku) extracts the **transformative pattern** → insert `library_item` (`source='first_party'`, anonymized unless attribution allowed). Mirror the `lib/trends.ts` cache+Claude pattern.
- Curated entries added via an admin route.

## 7. Tiers / gating

- **Browse public library:** free / anonymous (SEO).
- **Remix in my voice:** Starter+ (counts against `posts_generated` or a small new quota).
- **Save to swipe file:** any logged-in user.

## 8. Legal guardrails

- **Never** publish verbatim third-party post text + author identity on public pages.
- First-party contributions require **explicit opt-in**; **anonymized by default**.
- DPDP lawful basis: consent (first-party) / transformative analysis (curated).

## 9. Rollout

- **Phase 1:** first-party ingestion + private swipe saves + curated seed (admin). Internal value, no public/legal surface yet.
- **Phase 2:** public `/library` SEO surface (freemium) + remix-in-voice.
- **Phase 3:** Chrome extension "save to swipe file" inline on LinkedIn.

## 10. Open questions

1. Engagement threshold for first-party eligibility.
2. Anonymization vs opt-in attribution UX.
3. Public IA/URL (`/library` vs `/inspiration` vs `/swipe-file`).
4. Depends on fixing site indexation (per SEO notes, site is barely indexed today).

## 11. Out of scope

Scraping (rejected). Verbatim repost galleries. Paywalled third-party content.
