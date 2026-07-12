# Brand Stories / Case-Study Library — Design

**Date:** 2026-07-12
**Status:** Approved, in build
**Branch:** `feat/brand-stories-library`

## Problem

A common, high-performing LinkedIn move is to take a real company/brand — local or
global — and write a post around a key takeaway from how it grew, a sector it plays
in, or something notable about one of its operations, paired with a branded image.

We want a **library of brand stories / case studies** users can hand-pick from (or
upload their own company into), with one hard guarantee: **no two people end up
posting the same thing at the same time.**

## Non-goals

- Not a replacement for `library_items` (reusable *post-pattern* templates) or
  `story_bank` (the user's *own* personal anecdotes). This is a distinct subsystem:
  third-party *brands* as source material.
- No scraping of Google Images or third-party photos/logos.
- No human approval step in the curation pipeline (explicit product decision).

## Locked decisions

1. **Uniqueness** is enforced at the *angle* level (a specific takeaway about a
   specific company), with a **~35-day cooldown**. After cooldown the angle frees up.
2. **Angles are hybrid**: curated *seed* angles (created by the pipeline) + user-
   generated *AI-expanded* angles, deduped by fingerprint.
3. **A locked angle is invisible** to everyone except its claimant — not greyed out,
   not shown as "taken." It quietly reappears when its cooldown expires.
4. **Uploaded companies are private** to the uploader (`source='user'`), never enter
   the global lock space, deduped only against that user's own posts.
5. **Curation is fully automated** — no human approval. A weekly cron researches a
   **seed roster (config) + AI-discovered trending brands**, auto-publishes, and
   **re-fetches weekly**.
6. **Citation enforcement replaces human fact-checking**: every fact must carry a
   resolvable source URL or it is dropped; a company with too few cited facts does not
   go live. Upholds the no-fabricated-data brand rule without a person in the loop.
7. **Imagery**: a generated branded card (Satori/next-og, cost-neutral) + an optional
   user-supplied logo/photo upload. No auto-fetch.

## Data model

Three new tables. Additive + idempotent, following the `viral_library` migration style.

### `brand_companies`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `slug` | text unique | stable key; curated idempotency |
| `name` | text | |
| `sector` | text | e.g. `food-delivery`, `fintech`, `saas` |
| `summary` | text | AI-researched growth story / notable facts |
| `facts` | jsonb | array of `{ claim, source_url, fetched_at }` — every claim cited |
| `source` | text | `'curated'` \| `'user'` |
| `owner_id` | uuid null | null for curated; the user for private uploads |
| `logo_url` | text null | user-supplied only |
| `status` | text | `'draft'` \| `'live'` \| `'retired'` (curated lifecycle) |
| `discovered_via` | text | `'roster'` \| `'weekly-discovery'` \| `'user'` |
| `created_at` / `refreshed_at` | timestamptz | |

Index: `(status, source, sector)` for browse.

### `brand_angles` — the lockable unit
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `company_id` | uuid fk → brand_companies | |
| `title` | text | short angle label |
| `summary` | text | talking points for the post |
| `source` | text | `'curated'` (seed) \| `'ai'` (expanded) |
| `fingerprint` | text | normalized token signature (see below) |
| `created_by` | uuid null | user who generated an AI angle; null for seed |
| `created_at` | timestamptz | |

Index: `(company_id, source)`.

### `angle_locks` — who claimed what, and when it frees
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `angle_id` | uuid fk → brand_angles | |
| `user_id` | uuid fk → users | |
| `post_id` | uuid null | the draft created from the claim |
| `locked_at` | timestamptz | |
| `cooldown_until` | timestamptz | `locked_at + interval '35 days'` |
| `released_at` | timestamptz null | set when claimant deletes the draft |

**Active lock** = `released_at IS NULL AND cooldown_until > now()`.
**Partial unique index** on `angle_id` where the lock is active → one active lock per
angle, DB-enforced. Simultaneous grabs: one wins, the other retries.

## The uniqueness mechanism

- An angle is **Available** iff it has **no active lock**. Pure read-time comparison —
  no reaper cron required (an optional cleanup job may hard-delete long-expired locks).
- **Claiming a seed angle** inserts an `angle_locks` row (cooldown = +35d). It vanishes
  from every other user's browse until cooldown expires.
- **Generating a fresh AI angle**:
  1. Model drafts a candidate `{ title, summary }` grounded in the company's cited facts.
  2. Compute `fingerprint` = sorted token-set of `title + summary`, using the same
     tokenizer as `lib/similarity.ts` (lowercase, strip punctuation, drop words ≤3).
  3. Jaccard-compare against fingerprints of all **actively-locked** angles for that
     company. If similarity ≥ threshold → collision → regenerate (up to N retries).
  4. If unique → persist a `brand_angles` row (`source='ai'`) + insert the lock.
  5. If still colliding after N retries → return "this company is well-covered right
     now — try another or check back later."
- **Cooldown expiry** frees the angle; it re-enters browse and is re-lockable.
- **Private uploads** never touch this space — no cross-user lock; the existing
  same-user `similarity.ts` check is the only dedup.

## User flows

### Flow A — post from a curated company
1. Browse `/dashboard/brand-stories`: grid of `live` companies, sector filter.
2. Open a company → cited `summary` + facts + **currently-free** seed angles + an
   always-present **Generate a fresh angle** button.
3. Claim a seed angle (locks ~35d) **or** generate a fresh AI angle (dedupe + lock).
4. Generate a single unscheduled draft (matches the single-post-generation pattern),
   pre-filled with the angle's talking points + the company's cited facts. The existing
   same-user `similarity.ts` guard still runs.
5. Composer imagery: generated branded card (name + a key cited stat + user brand
   colors, via the existing image engine) **+ optional upload logo/photo**.
6. Schedule / publish as normal.

### Flow B — upload your own company
- Add a private company (name, sector, typed facts, optional logo). `source='user'`,
  `owner_id=self`. Never curated, never globally locked; own-post dedup only.

### Lock-release nicety
- Deleting the draft that a claim created sets `released_at = now()`, freeing the angle
  immediately rather than after 35 days.

## Weekly curation pipeline — `/api/cron/brand-stories`

- **Roster** = `config/brand-roster.ts` seed list **+** a few AI-discovered trending
  brands each run.
- Per company: web-search + fetch reputable sources → extract facts, **each with its
  source URL** → generate `summary` + a few fingerprinted seed angles.
- **Citation enforcement (no human review):**
  - a fact with no resolvable source URL is dropped;
  - a company with fewer than `MIN_CITED_FACTS` verified facts stays `draft` (not live);
  - re-fetch retires facts whose sources no longer resolve; a company that falls below
    the threshold flips to `retired`.
- **Idempotent** per slug. Weekly re-fetch updates `facts` / `summary` / `refreshed_at`.
- Scheduled Mondays alongside the existing SEO crons. Respects the graphics-cost and
  no-fabricated-data rules (research calls are curation-time and cached, not per-user).

## Edge cases

- **All seed angles locked** → company still usable via Generate-a-fresh-angle.
- **Simultaneous grabs** → partial unique index; loser retries or is told to pick another.
- **AI can't find a unique angle** → graceful "well-covered right now" message.
- **Abandoned draft** → lock releases on draft delete.
- **Source rot** → weekly re-fetch prunes dead-cited facts; under-threshold → retired.

## Components (isolation)

- `lib/brand-fingerprint.ts` — tokenize + fingerprint + collision check (pure, unit-tested).
- `lib/brand-stories.ts` — browse queries, claim/lock, generate-fresh-angle, release.
- `lib/brand-research.ts` — weekly research + citation enforcement (Anthropic + web).
- `config/brand-roster.ts` — the seed roster.
- `app/api/brand-stories/*` — browse, claim, generate-angle, release.
- `app/api/cron/brand-stories/route.ts` — the weekly pipeline.
- `app/dashboard/brand-stories/page.tsx` — the browse + compose surface.

## Testing

- Unit: fingerprint stability, Jaccard collision at/around threshold, active-lock
  predicate, cooldown boundary.
- Integration: claim → lock visible-to-none → release path; generate-angle dedupe retry.
- Pipeline: citation-enforcement drops uncited facts; under-threshold company stays draft.
