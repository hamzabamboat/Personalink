# Phase 1 — Understand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver read-only growth insight for each user — a per-user, baseline-relative **Growth Score (0–100)** with an always-visible breakdown, plus per-pillar/format/time-slot performance, engagement-velocity classification, and content→growth attribution — all computed from the Phase 0 time-series and surfaced on the analytics dashboard.

**Architecture:** Pure math lives in three new server libs (`lib/growth-score.ts`, `lib/insights.ts`, `lib/cohort-baselines.ts`) as side-effect-free functions that take plain fixtures and return scored objects; thin DB wrappers fetch the rolling windows from Supabase and persist into a new `growth_scores` table (mirroring `lib/scoring.ts` → `linkedin_scores`). A daily cron rolls cohort-median sub-scores into a new `cohort_baselines` table that feeds cold-start partial pooling. The analytics page gains a Growth Score ring + a "How this is calculated" panel and per-pillar / best-time insight cards, fed by a new read API route.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres), TypeScript, Vitest, Recharts

---

## Cross-Phase Dependency Assumption (Plan 0 — assume EXISTS, do NOT re-create)

This plan **depends on Phase 0 already being delivered**. The following are assumed to exist and are read, never created, here:

- **`post_analytics`** time series (one row per snapshot per post): `id, post_id, user_id, captured_at, age_minutes int, impressions, reactions, comments, reshares, saves, link_clicks, members_reached, source`. Written on a ~1h/6h/24h/3d/7d cadence after publish.
- **`follower_snapshots`**: `id, user_id, snapshot_date date, follower_count int, source`, `unique(user_id, snapshot_date)`.
- **`profile_analytics`**: `id, user_id, snapshot_date date, profile_views int, search_appearances int, source`, `unique(user_id, snapshot_date)`.
- **`posts` attributed columns** (latest cache): `reshares, saves, link_clicks, members_reached, followers_gained, profile_views_from_post` (all `integer`, nullable), plus `metric_source text` and `metrics_synced_at timestamptz`. `posts.content_pillar text` and `posts.published_at timestamptz` already exist (in current `schema.sql`).
- The **`source`/`metric_source` enum value** is one of `'creator_api' | 'public_fallback' | 'manual'`.

The `source` column may be NULL in early/legacy rows; pure functions treat NULL as `'manual'` for provenance reporting but never throw on it.

> **`posts.format` does NOT exist yet.** This plan adds a `format text` column to `posts` in Task 3 (the migration that creates `growth_scores`) so per-format insights in Task 6 have a real column to read. If Phase 0 already added it, the `add column if not exists` is a no-op.

---

## File Structure

**New files:**
- `supabase/migrations/20260531_growth_scores.sql` — `growth_scores` table, `posts.format` column.
- `supabase/migrations/20260531b_cohort_baselines.sql` — `cohort_baselines` table.
- `lib/growth-score.ts` — pure `computeGrowthScore(input)` + thin `persistGrowthScore(userId)`.
- `lib/__tests__/growth-score.test.ts` — pure unit tests for the score math.
- `lib/insights.ts` — pure aggregation helpers (pillar/format/time-slot/velocity/attribution) + thin fetch wrappers.
- `lib/__tests__/insights.test.ts` — pure unit tests for the insight math.
- `lib/cohort-baselines.ts` — pure `computeCohortBaselines(rows)` + thin fetch/persist wrappers.
- `lib/__tests__/cohort-baselines.test.ts` — pure unit tests for the median rollup.
- `app/api/cron/cohort-baselines/route.ts` — daily cron that persists the cohort medians (copies the day7-stats `cron_locks` guard).
- `app/api/growth/route.ts` — GET: returns `{ growthScore, insights }` for the signed-in user (feeds the dashboard).

**Modified files:**
- `supabase/schema.sql` — append `growth_scores` + `cohort_baselines` definitions and the `posts.format` column (keep schema.sql authoritative, mirroring each migration).
- `lib/supabase.ts` — add `GrowthScore`, `CohortBaseline`, `GrowthBreakdown` types; extend `Post` and `PostAnalytics` with the Phase 0 columns this plan reads.
- `app/dashboard/analytics/page.tsx` — add the Growth Score ring, the always-visible "How this is calculated" breakdown panel, and per-pillar / best-time insight cards.
- `vercel.json` — register the `cohort-baselines` cron.

---

## Conventions every task follows

- Server libs import the DB client as `import { supabaseAdmin } from '@/lib/supabase-admin'`. Types live in `lib/supabase.ts`.
- **Pure functions take fixtures and return values — no `supabaseAdmin`, no `Date.now()`, no I/O.** Anything time-relative takes an explicit `now: Date` (or pre-windowed rows) as an argument. This is what makes them unit-testable without a live DB.
- Tests: Vitest at `lib/__tests__/<name>.test.ts`, `import { describe, it, expect } from 'vitest'`. The runner (`vitest.config.ts`) stubs `server-only` and `./supabase-admin`, so importing a lib that contains thin DB wrappers is fine **as long as the test only calls the pure exports**.
- Single test run: `npx vitest run lib/__tests__/<name>.test.ts`.
- Migrations: `supabase/migrations/YYYYMMDD_<name>.sql`, box-comment header, `create table if not exists`; also append to `supabase/schema.sql`.
- Commit after every green step. Branch is `feat/organic-growth-engine`.

---

## The Growth Score formula (authoritative — implement EXACTLY)

From the spec. Four sub-scores, each **0–100, measured vs the user's own prior 28-day baseline**, then weighted:

| Sub-score | Weight (v1) | Signal | Source metrics |
|---|---|---|---|
| **reach** | 0.30 | more people seeing them | `impressions`, `members_reached` |
| **audience** | 0.30 | building a following | follower-count delta + `followers_gained` (`FOLLOWER_GAINED_FROM_CONTENT`) |
| **resonance** | 0.25 | content landing | engagement rate = (`reactions`+`comments`+`reshares`+`saves`) / `impressions` |
| **authority** | 0.15 | converting to opportunity | `profile_views_from_post` (`PROFILE_VIEW_FROM_CONTENT`) + search appearances |

**Sub-score mechanic (ratio-vs-baseline, clamped):** for a current-window metric `c` and the prior-28-day baseline `b`, the improvement score is `clamp01(c / b) * 100` when `b > 0`. A flat result (`c == b`) maps to **100** — the score rewards *holding or beating* the user's own baseline (consistency is success; the score never punishes a steady creator). When `b == 0` (no prior signal at all) the metric contributes `null` and is excluded from that sub-score's mean; if every metric in a sub-score is `null`, the sub-score itself is `null` and pooling falls **fully** to the cohort.

**Combining metrics inside a sub-score:** simple mean of the non-null per-metric improvement scores (reach = mean(impr, members_reached); resonance = single engagement-rate ratio; authority = mean(profile_views, search_appearances); audience = mean(follower_delta_ratio, followers_gained_ratio)).

**Cold-start cohort pooling (partial pooling):** blend the user's own sub-score toward the cohort median:
```
w_self = n / (n + K)          // v1 K = 10
pooled = w_self * self + (1 - w_self) * cohort_median
```
where `n` = number of the user's posts inside the current window (`n_posts`). If `self` is `null`, `pooled = cohort_median`. If `cohort_median` is also missing (bootstrap, no cohort yet), `pooled = self ?? 50` (neutral 50 floor so a brand-new product with no cohort still renders a score).

**Final score:** `round(clamp0_100(Σ weight_i * pooled_i))`. Weights sum to 1.0.

**`breakdown` jsonb** (exact keys the UI renders):
```
{ reach, audience, resonance, authority,   // pooled 0–100 sub-scores
  weights: { reach:0.30, audience:0.30, resonance:0.25, authority:0.15 },
  baseline_window: 28,
  n_posts,
  w_self,
  source }                                  // dominant metric_source across the window
```

---

## Tasks

### Task 1: Migration + types for `growth_scores` (+ `posts.format`)

**Files:**
- Create: `supabase/migrations/20260531_growth_scores.sql`
- Modify: `supabase/schema.sql`
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260531_growth_scores.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 1 (Understand)
-- growth_scores: per-user composite Growth Score history. Mirrors linkedin_scores
-- (score int + breakdown jsonb). Additive — does NOT replace linkedin_scores.
-- Also adds posts.format so per-format insights have a real column to read.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists growth_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  score integer not null,
  breakdown jsonb not null default '{}',
  captured_at timestamptz default now()
);

create index if not exists growth_scores_user_captured_idx
  on growth_scores(user_id, captured_at desc);

-- Post format (text|image|video|document|poll|article). Nullable; treated as
-- 'unknown' by insight aggregation when absent.
alter table posts add column if not exists format text;
```

- [ ] **Step 2: Run the migration check (lint only — no live DB needed)**

Run: `grep -c "create table if not exists growth_scores" supabase/migrations/20260531_growth_scores.sql`
Expected output: `1`

- [ ] **Step 3: Mirror into schema.sql**

In `supabase/schema.sql`, immediately after the `linkedin_scores` table block (ends at the line `);` following `recorded_at timestamptz default now()`), insert:

```sql

create table if not exists growth_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  score integer not null,
  breakdown jsonb not null default '{}',
  captured_at timestamptz default now()
);

alter table posts add column if not exists format text;
```

- [ ] **Step 4: Add types to `lib/supabase.ts`**

In `lib/supabase.ts`, immediately after the `LinkedInScore` type block (ends with `recorded_at: string\n}`), add:

```ts
export type MetricSource = 'creator_api' | 'public_fallback' | 'manual'

export type GrowthBreakdown = {
  reach: number
  audience: number
  resonance: number
  authority: number
  weights: { reach: number; audience: number; resonance: number; authority: number }
  baseline_window: number
  n_posts: number
  w_self: number
  source: MetricSource
}

export type GrowthScore = {
  id: string
  user_id: string
  score: number
  breakdown: GrowthBreakdown
  captured_at: string
}
```

- [ ] **Step 5: Extend `Post` and `PostAnalytics` types (Phase 0 columns this plan reads)**

In `lib/supabase.ts`, inside the existing `Post` type, after the line `comments: number | null`, add:

```ts
  reshares: number | null
  saves: number | null
  link_clicks: number | null
  members_reached: number | null
  followers_gained: number | null
  profile_views_from_post: number | null
  metric_source: MetricSource | null
  metrics_synced_at: string | null
  format: string | null
```

Then replace the existing `PostAnalytics` type entirely with:

```ts
export type PostAnalytics = {
  id: string
  post_id: string
  user_id: string
  captured_at: string
  age_minutes: number | null
  impressions: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
  link_clicks: number | null
  members_reached: number | null
  source: MetricSource | null
}

export type FollowerSnapshot = {
  id: string
  user_id: string
  snapshot_date: string
  follower_count: number | null
  source: MetricSource | null
}

export type ProfileAnalytics = {
  id: string
  user_id: string
  snapshot_date: string
  profile_views: number | null
  search_appearances: number | null
  source: MetricSource | null
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected output: no errors (exit 0).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260531_growth_scores.sql supabase/schema.sql lib/supabase.ts
git commit -m "feat(growth): growth_scores table + posts.format + Phase 0 read types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `computeGrowthScore` — pure helpers (clamps + ratio score)

Build the score bottom-up. This task delivers only the leaf math so its failure modes are tiny and isolated.

**Files:**
- Create: `lib/growth-score.ts`
- Create: `lib/__tests__/growth-score.test.ts`

- [ ] **Step 1: Write the failing test for the leaf helpers**

Create `lib/__tests__/growth-score.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { clamp0_100, ratioScore, GROWTH_WEIGHTS, GROWTH_K } from '../growth-score'

describe('growth-score leaf helpers', () => {
  it('clamps to the 0–100 band', () => {
    expect(clamp0_100(-5)).toBe(0)
    expect(clamp0_100(0)).toBe(0)
    expect(clamp0_100(57.4)).toBe(57.4)
    expect(clamp0_100(100)).toBe(100)
    expect(clamp0_100(140)).toBe(100)
  })

  it('ratioScore maps current/baseline to a clamped 0–100, flat = 100', () => {
    expect(ratioScore(50, 50)).toBe(100) // holding baseline = full credit
    expect(ratioScore(100, 50)).toBe(100) // doubling clamps at 100
    expect(ratioScore(25, 50)).toBe(50) // half the baseline = 50
    expect(ratioScore(0, 50)).toBe(0)
  })

  it('ratioScore returns null when the baseline is zero/absent', () => {
    expect(ratioScore(10, 0)).toBeNull()
    expect(ratioScore(10, null)).toBeNull()
    expect(ratioScore(null, 50)).toBe(0) // had a baseline, produced nothing → 0
  })

  it('exposes the v1 constants', () => {
    expect(GROWTH_K).toBe(10)
    expect(GROWTH_WEIGHTS).toEqual({ reach: 0.3, audience: 0.3, resonance: 0.25, authority: 0.15 })
    const sum = Object.values(GROWTH_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 10)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/growth-score.test.ts`
Expected output: fails to resolve `../growth-score` (`Failed to load url ../growth-score` / "Cannot find module"). 0 passed.

- [ ] **Step 3: Minimal implementation of the leaf helpers**

Create `lib/growth-score.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { MetricSource } from '@/lib/supabase'

/** v1 pooling strength. Calibrated in Task 11. */
export const GROWTH_K = 10

/** v1 sub-score weights (sum to 1.0). Calibrated in Task 11. */
export const GROWTH_WEIGHTS = {
  reach: 0.3,
  audience: 0.3,
  resonance: 0.25,
  authority: 0.15,
} as const

/** The user's rolling baseline length, in days. */
export const BASELINE_WINDOW_DAYS = 28

export function clamp0_100(x: number): number {
  if (x < 0) return 0
  if (x > 100) return 100
  return x
}

/**
 * Improvement of a current metric vs the user's own prior baseline, 0–100.
 * - baseline absent/zero → null (no signal to measure against; excluded from the mean)
 * - holding the baseline (current == baseline) → 100
 * - beating it clamps at 100; falling short scales down to 0
 */
export function ratioScore(current: number | null, baseline: number | null): number | null {
  if (baseline == null || baseline <= 0) return null
  const c = current ?? 0
  return clamp0_100((c / baseline) * 100)
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/growth-score.test.ts`
Expected output: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/growth-score.ts lib/__tests__/growth-score.test.ts
git commit -m "feat(growth): score leaf helpers (clamp, ratioScore, v1 constants)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `meanOrNull` + `poolSubScore` (cold-start partial pooling)

**Files:**
- Modify: `lib/growth-score.ts`
- Modify: `lib/__tests__/growth-score.test.ts`

- [ ] **Step 1: Add the failing tests**

In `lib/__tests__/growth-score.test.ts`, update the import line to:

```ts
import { clamp0_100, ratioScore, meanOrNull, poolSubScore, GROWTH_WEIGHTS, GROWTH_K } from '../growth-score'
```

Then append:

```ts
describe('meanOrNull', () => {
  it('averages only non-null entries', () => {
    expect(meanOrNull([100, 50])).toBe(75)
    expect(meanOrNull([null, 50])).toBe(50)
    expect(meanOrNull([80, null, 40])).toBe(60)
  })
  it('returns null when every entry is null/empty', () => {
    expect(meanOrNull([null, null])).toBeNull()
    expect(meanOrNull([])).toBeNull()
  })
})

describe('poolSubScore (w_self = n/(n+K))', () => {
  it('blends self toward the cohort median by n', () => {
    // n=10, K=10 → w_self = 0.5 → halfway between 80 and 40
    expect(poolSubScore({ self: 80, cohortMedian: 40, n: 10, k: 10 })).toBe(60)
  })
  it('a high-n user trusts their own number', () => {
    // n=90, K=10 → w_self = 0.9 → 0.9*80 + 0.1*40 = 76
    expect(poolSubScore({ self: 80, cohortMedian: 40, n: 90, k: 10 })).toBeCloseTo(76, 10)
  })
  it('falls fully to cohort when self is null', () => {
    expect(poolSubScore({ self: null, cohortMedian: 42, n: 5, k: 10 })).toBe(42)
  })
  it('falls to self (or neutral 50) when no cohort exists', () => {
    expect(poolSubScore({ self: 70, cohortMedian: null, n: 5, k: 10 })).toBe(70)
    expect(poolSubScore({ self: null, cohortMedian: null, n: 5, k: 10 })).toBe(50)
  })
  it('n=0 ignores self entirely (w_self = 0)', () => {
    expect(poolSubScore({ self: 80, cohortMedian: 40, n: 0, k: 10 })).toBe(40)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/growth-score.test.ts`
Expected output: fails — `meanOrNull`/`poolSubScore` are `undefined` / not exported. The Task 2 tests still pass.

- [ ] **Step 3: Implement**

In `lib/growth-score.ts`, after `ratioScore`, add:

```ts
/** Mean of the defined entries; null if there are none. */
export function meanOrNull(xs: Array<number | null>): number | null {
  const defined = xs.filter((x): x is number => x != null)
  if (defined.length === 0) return null
  return defined.reduce((a, b) => a + b, 0) / defined.length
}

/**
 * Partial pooling: blend the user's own sub-score toward the cohort median.
 *   w_self = n / (n + K)
 *   pooled = w_self * self + (1 - w_self) * cohortMedian
 * - self null  → fully cohort
 * - cohort null → self, or neutral 50 if self is also null (bootstrap floor)
 */
export function poolSubScore(args: {
  self: number | null
  cohortMedian: number | null
  n: number
  k: number
}): number {
  const { self, cohortMedian, n, k } = args
  if (self == null) return cohortMedian ?? 50
  if (cohortMedian == null) return self
  const wSelf = n / (n + k)
  return wSelf * self + (1 - wSelf) * cohortMedian
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/growth-score.test.ts`
Expected output: all tests passed (Task 2 + Task 3 blocks).

- [ ] **Step 5: Commit**

```bash
git add lib/growth-score.ts lib/__tests__/growth-score.test.ts
git commit -m "feat(growth): meanOrNull + poolSubScore partial-pooling helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `computeGrowthScore(input)` — the full composite

This is the heart of the plan. It takes pre-windowed aggregate inputs (the thin wrapper builds them in Task 5) and returns `{ score, breakdown }`.

**Files:**
- Modify: `lib/growth-score.ts`
- Modify: `lib/__tests__/growth-score.test.ts`

- [ ] **Step 1: Add the failing tests (zero-data, cold-start, weighting, clamping)**

In `lib/__tests__/growth-score.test.ts`, update the import line to:

```ts
import {
  clamp0_100, ratioScore, meanOrNull, poolSubScore, computeGrowthScore,
  GROWTH_WEIGHTS, GROWTH_K,
} from '../growth-score'
```

Append:

```ts
// A fully-populated input where every current == baseline → every sub-score 100.
function flatInput() {
  return {
    nPosts: 20,
    source: 'creator_api' as const,
    current: {
      impressions: 1000, members_reached: 800,
      followerDelta: 30, followersGained: 12,
      reactions: 40, comments: 8, reshares: 4, saves: 6,
      profileViews: 50, searchAppearances: 10,
    },
    baseline: {
      impressions: 1000, members_reached: 800,
      followerDelta: 30, followersGained: 12,
      reactions: 40, comments: 8, reshares: 4, saves: 6,
      profileViews: 50, searchAppearances: 10,
    },
    cohortMedians: { reach: 50, audience: 50, resonance: 50, authority: 50 },
  }
}

describe('computeGrowthScore', () => {
  it('flat-vs-baseline + high n → ~100 across the board', () => {
    const { score, breakdown } = computeGrowthScore(flatInput())
    // n=20, K=10 → w_self = 0.6667; self=100, cohort=50 → pooled ≈ 83.33 each
    expect(breakdown.reach).toBeCloseTo(83.33, 1)
    expect(breakdown.resonance).toBeCloseTo(83.33, 1)
    expect(score).toBe(83) // 0.3*83.33*2 + 0.25*83.33 + 0.15*83.33 = 83.33 → round 83
    expect(breakdown.w_self).toBeCloseTo(0.6667, 3)
    expect(breakdown.n_posts).toBe(20)
    expect(breakdown.baseline_window).toBe(28)
    expect(breakdown.source).toBe('creator_api')
  })

  it('weights are echoed verbatim and sum to 1', () => {
    const { breakdown } = computeGrowthScore(flatInput())
    expect(breakdown.weights).toEqual(GROWTH_WEIGHTS)
    const sum = Object.values(breakdown.weights).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 10)
  })

  it('zero-data user (no baseline, no posts) falls entirely to cohort medians', () => {
    const { score, breakdown } = computeGrowthScore({
      nPosts: 0,
      source: 'manual',
      current: {
        impressions: 0, members_reached: 0, followerDelta: 0, followersGained: 0,
        reactions: 0, comments: 0, reshares: 0, saves: 0, profileViews: 0, searchAppearances: 0,
      },
      baseline: {
        impressions: 0, members_reached: 0, followerDelta: 0, followersGained: 0,
        reactions: 0, comments: 0, reshares: 0, saves: 0, profileViews: 0, searchAppearances: 0,
      },
      cohortMedians: { reach: 60, audience: 40, resonance: 55, authority: 30 },
    })
    expect(breakdown.reach).toBe(60)
    expect(breakdown.audience).toBe(40)
    expect(breakdown.resonance).toBe(55)
    expect(breakdown.authority).toBe(30)
    expect(breakdown.w_self).toBe(0) // n=0
    // 0.3*60 + 0.3*40 + 0.25*55 + 0.15*30 = 18 + 12 + 13.75 + 4.5 = 48.25 → 48
    expect(score).toBe(48)
  })

  it('bootstrap: no baseline AND no cohort → neutral 50 floor', () => {
    const { score, breakdown } = computeGrowthScore({
      nPosts: 3,
      source: 'public_fallback',
      current: {
        impressions: 0, members_reached: 0, followerDelta: 0, followersGained: 0,
        reactions: 0, comments: 0, reshares: 0, saves: 0, profileViews: 0, searchAppearances: 0,
      },
      baseline: {
        impressions: 0, members_reached: 0, followerDelta: 0, followersGained: 0,
        reactions: 0, comments: 0, reshares: 0, saves: 0, profileViews: 0, searchAppearances: 0,
      },
      cohortMedians: { reach: null, audience: null, resonance: null, authority: null },
    })
    expect(breakdown.reach).toBe(50)
    expect(score).toBe(50)
  })

  it('blowout growth clamps each sub-score at 100 (never above)', () => {
    const huge = {
      impressions: 100000, members_reached: 90000, followerDelta: 9000, followersGained: 5000,
      reactions: 9000, comments: 2000, reshares: 1000, saves: 1500, profileViews: 9000, searchAppearances: 900,
    }
    const small = {
      impressions: 100, members_reached: 90, followerDelta: 9, followersGained: 5,
      reactions: 9, comments: 2, reshares: 1, saves: 2, profileViews: 9, searchAppearances: 1,
    }
    const { score, breakdown } = computeGrowthScore({
      nPosts: 200, source: 'creator_api',
      current: huge, baseline: small,
      cohortMedians: { reach: 50, audience: 50, resonance: 50, authority: 50 },
    })
    // self=100 everywhere, n huge → w_self ≈ 0.952 → pooled ≈ 97.6, capped at 100
    expect(breakdown.reach).toBeLessThanOrEqual(100)
    expect(score).toBeLessThanOrEqual(100)
    expect(score).toBeGreaterThan(95)
  })

  it('resonance uses engagement RATE, not raw counts', () => {
    // current rate = (40+8+4+6)/1000 = 0.058 ; baseline rate = (10+2+1+1)/1000 = 0.014
    // ratio clamps to 100 (improved). Make baseline rate higher to test downscale:
    const { breakdown } = computeGrowthScore({
      nPosts: 50, source: 'creator_api',
      current: {
        impressions: 1000, members_reached: 1000, followerDelta: 1, followersGained: 1,
        reactions: 5, comments: 0, reshares: 0, saves: 0, profileViews: 1, searchAppearances: 1,
      },
      baseline: {
        impressions: 1000, members_reached: 1000, followerDelta: 1, followersGained: 1,
        reactions: 10, comments: 0, reshares: 0, saves: 0, profileViews: 1, searchAppearances: 1,
      },
      cohortMedians: { reach: 0, audience: 0, resonance: 0, authority: 0 },
    })
    // self resonance = (0.005/0.010)*100 = 50 ; n=50,K=10 → w_self=0.8333 → 0.8333*50 + 0 = 41.67
    expect(breakdown.resonance).toBeCloseTo(41.67, 1)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/growth-score.test.ts`
Expected output: fails — `computeGrowthScore` is not exported. Prior blocks still pass.

- [ ] **Step 3: Implement `computeGrowthScore`**

In `lib/growth-score.ts`, after `poolSubScore`, add:

```ts
type MetricBundle = {
  impressions: number | null
  members_reached: number | null
  followerDelta: number | null
  followersGained: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
  profileViews: number | null
  searchAppearances: number | null
}

export type GrowthScoreInput = {
  nPosts: number
  source: MetricSource
  current: MetricBundle
  baseline: MetricBundle
  cohortMedians: {
    reach: number | null
    audience: number | null
    resonance: number | null
    authority: number | null
  }
}

type SubScores = { reach: number; audience: number; resonance: number; authority: number }

/** Engagement rate = (reactions+comments+reshares+saves) / impressions, or null. */
function engagementRate(m: MetricBundle): number | null {
  if (!m.impressions || m.impressions <= 0) return null
  const eng = (m.reactions ?? 0) + (m.comments ?? 0) + (m.reshares ?? 0) + (m.saves ?? 0)
  return eng / m.impressions
}

/** Each sub-score 0–100 vs the user's own baseline; null if no baseline signal. */
export function selfSubScores(current: MetricBundle, baseline: MetricBundle): {
  reach: number | null; audience: number | null; resonance: number | null; authority: number | null
} {
  const reach = meanOrNull([
    ratioScore(current.impressions, baseline.impressions),
    ratioScore(current.members_reached, baseline.members_reached),
  ])
  const audience = meanOrNull([
    ratioScore(current.followerDelta, baseline.followerDelta),
    ratioScore(current.followersGained, baseline.followersGained),
  ])
  const resonance = ratioScore(engagementRate(current), engagementRate(baseline))
  const authority = meanOrNull([
    ratioScore(current.profileViews, baseline.profileViews),
    ratioScore(current.searchAppearances, baseline.searchAppearances),
  ])
  return { reach, audience, resonance, authority }
}

export function computeGrowthScore(input: GrowthScoreInput): {
  score: number
  breakdown: import('@/lib/supabase').GrowthBreakdown
} {
  const self = selfSubScores(input.current, input.baseline)
  const k = GROWTH_K
  const n = input.nPosts

  const pooled: SubScores = {
    reach: poolSubScore({ self: self.reach, cohortMedian: input.cohortMedians.reach, n, k }),
    audience: poolSubScore({ self: self.audience, cohortMedian: input.cohortMedians.audience, n, k }),
    resonance: poolSubScore({ self: self.resonance, cohortMedian: input.cohortMedians.resonance, n, k }),
    authority: poolSubScore({ self: self.authority, cohortMedian: input.cohortMedians.authority, n, k }),
  }

  const w = GROWTH_WEIGHTS
  const composite =
    w.reach * pooled.reach +
    w.audience * pooled.audience +
    w.resonance * pooled.resonance +
    w.authority * pooled.authority

  return {
    score: Math.round(clamp0_100(composite)),
    breakdown: {
      reach: pooled.reach,
      audience: pooled.audience,
      resonance: pooled.resonance,
      authority: pooled.authority,
      weights: { ...w },
      baseline_window: BASELINE_WINDOW_DAYS,
      n_posts: n,
      w_self: n / (n + k),
      source: input.source,
    },
  }
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/growth-score.test.ts`
Expected output: all tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/growth-score.ts lib/__tests__/growth-score.test.ts
git commit -m "feat(growth): computeGrowthScore composite (weights, pooling, clamps)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `persistGrowthScore(userId)` — thin DB wrapper (mirror lib/scoring.ts)

The wrapper fetches the two 28-day windows + the latest cohort baseline, calls the pure `computeGrowthScore`, and inserts into `growth_scores`. Mirrors `recordLinkedInScore`.

**Files:**
- Modify: `lib/growth-score.ts`

- [ ] **Step 1: Implement the window builder + persister**

> Not unit-tested with a live DB (the runner stubs `supabase-admin`). The pure math it delegates to is already fully covered by Tasks 2–4. We verify this wrapper compiles (Step 2) and via the API route smoke test in Task 9.

In `lib/growth-score.ts`, at the bottom, add:

```ts
/** Sum a numeric column across rows, treating null as 0; null if no rows. */
function sumOrNull(rows: Array<Record<string, number | null>>, key: string): number | null {
  if (rows.length === 0) return null
  return rows.reduce((acc, r) => acc + (r[key] ?? 0), 0)
}

/** Dominant metric_source across rows (most frequent); defaults to 'manual'. */
function dominantSource(values: Array<string | null | undefined>): MetricSource {
  const counts: Record<string, number> = {}
  for (const v of values) {
    const key = v ?? 'manual'
    counts[key] = (counts[key] ?? 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return ((top?.[0] as MetricSource) ?? 'manual')
}

/**
 * Fetch the user's current vs prior 28-day windows + cohort baseline, compute the
 * Growth Score, and insert it into growth_scores. Mirrors lib/scoring.ts.
 */
export async function persistGrowthScore(userId: string) {
  const now = new Date()
  const day = 24 * 60 * 60 * 1000
  const w = BASELINE_WINDOW_DAYS
  const curStart = new Date(now.getTime() - w * day)
  const baseStart = new Date(now.getTime() - 2 * w * day)
  const curStartDate = curStart.toISOString().slice(0, 10)
  const baseStartDate = baseStart.toISOString().slice(0, 10)
  const nowDate = now.toISOString().slice(0, 10)

  const [
    curPostsRes, basePostsRes,
    curFollowersRes, baseFollowersRes,
    curProfileRes, baseProfileRes,
    cohortRes,
  ] = await Promise.all([
    supabaseAdmin.from('posts')
      .select('impressions, reactions, comments, reshares, saves, members_reached, followers_gained, profile_views_from_post, metric_source')
      .eq('user_id', userId).eq('status', 'published')
      .gte('published_at', curStart.toISOString()),
    supabaseAdmin.from('posts')
      .select('impressions, reactions, comments, reshares, saves, members_reached, followers_gained, profile_views_from_post')
      .eq('user_id', userId).eq('status', 'published')
      .gte('published_at', baseStart.toISOString()).lt('published_at', curStart.toISOString()),
    supabaseAdmin.from('follower_snapshots').select('follower_count, snapshot_date')
      .eq('user_id', userId).gte('snapshot_date', curStartDate).lte('snapshot_date', nowDate)
      .order('snapshot_date', { ascending: true }),
    supabaseAdmin.from('follower_snapshots').select('follower_count, snapshot_date')
      .eq('user_id', userId).gte('snapshot_date', baseStartDate).lt('snapshot_date', curStartDate)
      .order('snapshot_date', { ascending: true }),
    supabaseAdmin.from('profile_analytics').select('profile_views, search_appearances')
      .eq('user_id', userId).gte('snapshot_date', curStartDate).lte('snapshot_date', nowDate),
    supabaseAdmin.from('profile_analytics').select('profile_views, search_appearances')
      .eq('user_id', userId).gte('snapshot_date', baseStartDate).lt('snapshot_date', curStartDate),
    supabaseAdmin.from('cohort_baselines').select('*').order('computed_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const curPosts = curPostsRes.data ?? []
  const basePosts = basePostsRes.data ?? []
  const cohort = cohortRes.data

  const followerDelta = (rows: Array<{ follower_count: number | null }>) =>
    rows.length >= 2 ? (rows[rows.length - 1].follower_count ?? 0) - (rows[0].follower_count ?? 0) : null

  const input: GrowthScoreInput = {
    nPosts: curPosts.length,
    source: dominantSource(curPosts.map(p => (p as { metric_source?: string }).metric_source)),
    current: {
      impressions: sumOrNull(curPosts, 'impressions'),
      members_reached: sumOrNull(curPosts, 'members_reached'),
      followerDelta: followerDelta(curFollowersRes.data ?? []),
      followersGained: sumOrNull(curPosts, 'followers_gained'),
      reactions: sumOrNull(curPosts, 'reactions'),
      comments: sumOrNull(curPosts, 'comments'),
      reshares: sumOrNull(curPosts, 'reshares'),
      saves: sumOrNull(curPosts, 'saves'),
      profileViews: sumOrNull(curProfileRes.data ?? [], 'profile_views'),
      searchAppearances: sumOrNull(curProfileRes.data ?? [], 'search_appearances'),
    },
    baseline: {
      impressions: sumOrNull(basePosts, 'impressions'),
      members_reached: sumOrNull(basePosts, 'members_reached'),
      followerDelta: followerDelta(baseFollowersRes.data ?? []),
      followersGained: sumOrNull(basePosts, 'followers_gained'),
      reactions: sumOrNull(basePosts, 'reactions'),
      comments: sumOrNull(basePosts, 'comments'),
      reshares: sumOrNull(basePosts, 'reshares'),
      saves: sumOrNull(basePosts, 'saves'),
      profileViews: sumOrNull(baseProfileRes.data ?? [], 'profile_views'),
      searchAppearances: sumOrNull(baseProfileRes.data ?? [], 'search_appearances'),
    },
    cohortMedians: {
      reach: cohort?.reach_median ?? null,
      audience: cohort?.audience_median ?? null,
      resonance: cohort?.resonance_median ?? null,
      authority: cohort?.authority_median ?? null,
    },
  }

  const { score, breakdown } = computeGrowthScore(input)
  await supabaseAdmin.from('growth_scores').insert({ user_id: userId, score, breakdown })
  return { score, breakdown }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected output: no errors (exit 0).

- [ ] **Step 3: Re-run the score tests (guard against accidental breakage)**

Run: `npx vitest run lib/__tests__/growth-score.test.ts`
Expected output: all tests passed.

- [ ] **Step 4: Commit**

```bash
git add lib/growth-score.ts
git commit -m "feat(growth): persistGrowthScore thin wrapper (28d windows + insert)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `lib/insights.ts` — pure group-by performance (pillar / format / time-slot)

**Files:**
- Create: `lib/insights.ts`
- Create: `lib/__tests__/insights.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/insights.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  groupPerformanceBy, perPillarPerformance, perFormatPerformance, perTimeSlotPerformance,
  type PostPerfRow,
} from '../insights'

const rows: PostPerfRow[] = [
  { content_pillar: 'Leadership', format: 'text', published_at: '2026-05-04T09:00:00Z', impressions: 1000, reactions: 50, comments: 5, reshares: 2, saves: 3 },
  { content_pillar: 'Leadership', format: 'video', published_at: '2026-05-06T14:00:00Z', impressions: 2000, reactions: 60, comments: 10, reshares: 4, saves: 6 },
  { content_pillar: 'Innovation', format: 'text', published_at: '2026-05-04T09:30:00Z', impressions: 500, reactions: 40, comments: 2, reshares: 1, saves: 1 },
  { content_pillar: null, format: null, published_at: null, impressions: 100, reactions: 1, comments: 0, reshares: 0, saves: 0 },
]

describe('groupPerformanceBy', () => {
  it('aggregates avg impressions + engagement rate per key, sorted by avg engagement rate desc', () => {
    const out = groupPerformanceBy(rows, r => r.content_pillar ?? 'Uncategorized')
    expect(out.map(g => g.key)).toEqual(['Innovation', 'Leadership', 'Uncategorized'])
    const innov = out.find(g => g.key === 'Innovation')!
    expect(innov.posts).toBe(1)
    expect(innov.avgImpressions).toBe(500)
    // (40+2+1+1)/500 = 0.088
    expect(innov.avgEngagementRate).toBeCloseTo(0.088, 4)
    const lead = out.find(g => g.key === 'Leadership')!
    expect(lead.posts).toBe(2)
    expect(lead.avgImpressions).toBe(1500)
  })

  it('skips zero-impression posts when computing engagement rate (no divide-by-zero)', () => {
    const out = groupPerformanceBy(
      [{ content_pillar: 'X', format: 'text', published_at: null, impressions: 0, reactions: 5, comments: 0, reshares: 0, saves: 0 }],
      r => r.content_pillar ?? 'Uncategorized',
    )
    expect(out[0].avgEngagementRate).toBe(0)
    expect(out[0].avgImpressions).toBe(0)
  })
})

describe('perPillarPerformance / perFormatPerformance', () => {
  it('group by pillar', () => {
    expect(perPillarPerformance(rows).map(g => g.key)).toContain('Leadership')
  })
  it('group by format, null format → unknown', () => {
    const out = perFormatPerformance(rows)
    expect(out.map(g => g.key).sort()).toEqual(['text', 'unknown', 'video'])
  })
})

describe('perTimeSlotPerformance', () => {
  it('buckets by ISO weekday + hour (UTC), best slot first', () => {
    const out = perTimeSlotPerformance(rows)
    // 2026-05-04 is a Monday, 2026-05-06 is a Wednesday
    expect(out.some(s => s.day === 'Mon' && s.hour === 9)).toBe(true)
    expect(out.some(s => s.day === 'Wed' && s.hour === 14)).toBe(true)
    // posts with null published_at are dropped
    expect(out.reduce((n, s) => n + s.posts, 0)).toBe(3)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/insights.test.ts`
Expected output: fails to resolve `../insights`. 0 passed.

- [ ] **Step 3: Implement the pure group-bys**

Create `lib/insights.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase-admin'

export type PostPerfRow = {
  content_pillar: string | null
  format: string | null
  published_at: string | null
  impressions: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
}

export type GroupPerf = {
  key: string
  posts: number
  avgImpressions: number
  avgEngagementRate: number
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function engagement(r: PostPerfRow): number {
  return (r.reactions ?? 0) + (r.comments ?? 0) + (r.reshares ?? 0) + (r.saves ?? 0)
}

/** Group rows by an arbitrary key; avg impressions + avg engagement rate per group. */
export function groupPerformanceBy(rows: PostPerfRow[], keyFn: (r: PostPerfRow) => string): GroupPerf[] {
  const buckets = new Map<string, PostPerfRow[]>()
  for (const r of rows) {
    const k = keyFn(r)
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(r)
  }
  const out: GroupPerf[] = []
  for (const [key, rs] of buckets) {
    const avgImpressions = rs.reduce((a, r) => a + (r.impressions ?? 0), 0) / rs.length
    const withImpr = rs.filter(r => (r.impressions ?? 0) > 0)
    const avgEngagementRate = withImpr.length
      ? withImpr.reduce((a, r) => a + engagement(r) / (r.impressions as number), 0) / withImpr.length
      : 0
    out.push({ key, posts: rs.length, avgImpressions, avgEngagementRate })
  }
  return out.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
}

export function perPillarPerformance(rows: PostPerfRow[]): GroupPerf[] {
  return groupPerformanceBy(rows, r => r.content_pillar ?? 'Uncategorized')
}

export function perFormatPerformance(rows: PostPerfRow[]): GroupPerf[] {
  return groupPerformanceBy(rows, r => r.format ?? 'unknown')
}

export type TimeSlotPerf = { day: string; hour: number; posts: number; avgEngagementRate: number }

/** Bucket posts by ISO weekday + UTC hour; best avg engagement rate first. */
export function perTimeSlotPerformance(rows: PostPerfRow[]): TimeSlotPerf[] {
  const dated = rows.filter(r => r.published_at)
  const grouped = groupPerformanceBy(dated, r => {
    const d = new Date(r.published_at as string)
    const day = DAYS[(d.getUTCDay() + 6) % 7]
    return `${day}-${d.getUTCHours()}`
  })
  return grouped.map(g => {
    const [day, hour] = g.key.split('-')
    return { day, hour: Number(hour), posts: g.posts, avgEngagementRate: g.avgEngagementRate }
  })
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/insights.test.ts`
Expected output: all tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/insights.ts lib/__tests__/insights.test.ts
git commit -m "feat(insights): pure per-pillar/format/time-slot performance group-bys

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: `lib/insights.ts` — velocity classification + attribution rollups (pure)

**Files:**
- Modify: `lib/insights.ts`
- Modify: `lib/__tests__/insights.test.ts`

- [ ] **Step 1: Add the failing tests**

In `lib/__tests__/insights.test.ts`, update the import line to:

```ts
import {
  groupPerformanceBy, perPillarPerformance, perFormatPerformance, perTimeSlotPerformance,
  classifyVelocity, attributionByPillar,
  type PostPerfRow, type VelocitySample,
} from '../insights'
```

Append:

```ts
describe('classifyVelocity (fast-spike vs slow-burn)', () => {
  // Series of post_analytics snapshots: age_minutes + cumulative impressions.
  it('fast-spike: most impressions arrive in the first 24h', () => {
    const series: VelocitySample[] = [
      { age_minutes: 60, impressions: 800 },
      { age_minutes: 24 * 60, impressions: 950 },
      { age_minutes: 7 * 24 * 60, impressions: 1000 },
    ]
    const v = classifyVelocity(series)
    expect(v.class).toBe('fast-spike')
    expect(v.share24h).toBeCloseTo(0.95, 2)
  })

  it('slow-burn: impressions keep accruing well past 24h', () => {
    const series: VelocitySample[] = [
      { age_minutes: 60, impressions: 100 },
      { age_minutes: 24 * 60, impressions: 300 },
      { age_minutes: 7 * 24 * 60, impressions: 1000 },
    ]
    const v = classifyVelocity(series)
    expect(v.class).toBe('slow-burn')
    expect(v.share24h).toBeCloseTo(0.3, 2)
  })

  it('returns unknown when fewer than 2 snapshots or no terminal impressions', () => {
    expect(classifyVelocity([{ age_minutes: 60, impressions: 50 }]).class).toBe('unknown')
    expect(classifyVelocity([]).class).toBe('unknown')
  })
})

describe('attributionByPillar', () => {
  it('rolls up followers_gained + profile_views_from_post per pillar, sorted by followers desc', () => {
    const rows = [
      { content_pillar: 'Leadership', followers_gained: 10, profile_views_from_post: 30 },
      { content_pillar: 'Leadership', followers_gained: 5, profile_views_from_post: 10 },
      { content_pillar: 'Innovation', followers_gained: 20, profile_views_from_post: 5 },
      { content_pillar: null, followers_gained: null, profile_views_from_post: 2 },
    ]
    const out = attributionByPillar(rows)
    expect(out[0]).toEqual({ key: 'Innovation', followersGained: 20, profileViews: 5, posts: 1 })
    const lead = out.find(g => g.key === 'Leadership')!
    expect(lead.followersGained).toBe(15)
    expect(lead.profileViews).toBe(40)
    expect(out.find(g => g.key === 'Uncategorized')!.followersGained).toBe(0)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/insights.test.ts`
Expected output: fails — `classifyVelocity` / `attributionByPillar` not exported. Task 6 tests still pass.

- [ ] **Step 3: Implement**

In `lib/insights.ts`, after `perTimeSlotPerformance`, add:

```ts
export type VelocitySample = { age_minutes: number | null; impressions: number | null }
export type VelocityClass = 'fast-spike' | 'slow-burn' | 'unknown'

/**
 * Classify a single post's impression accrual curve from its post_analytics
 * snapshots. share24h = impressions at the last snapshot <= 24h / terminal
 * impressions. >= 0.6 → fast-spike, else slow-burn. Needs 2+ usable snapshots.
 */
export function classifyVelocity(series: VelocitySample[]): { class: VelocityClass; share24h: number } {
  const usable = series
    .filter((s): s is { age_minutes: number; impressions: number } => s.age_minutes != null && s.impressions != null)
    .sort((a, b) => a.age_minutes - b.age_minutes)
  if (usable.length < 2) return { class: 'unknown', share24h: 0 }
  const terminal = usable[usable.length - 1].impressions
  if (terminal <= 0) return { class: 'unknown', share24h: 0 }
  const within24h = usable.filter(s => s.age_minutes <= 24 * 60)
  const at24h = within24h.length ? within24h[within24h.length - 1].impressions : usable[0].impressions
  const share24h = at24h / terminal
  return { class: share24h >= 0.6 ? 'fast-spike' : 'slow-burn', share24h }
}

export type AttributionRow = {
  content_pillar: string | null
  followers_gained: number | null
  profile_views_from_post: number | null
}
export type AttributionGroup = { key: string; followersGained: number; profileViews: number; posts: number }

/** Roll up content→growth attribution per pillar; sorted by followers gained desc. */
export function attributionByPillar(rows: AttributionRow[]): AttributionGroup[] {
  const buckets = new Map<string, AttributionGroup>()
  for (const r of rows) {
    const key = r.content_pillar ?? 'Uncategorized'
    const g = buckets.get(key) ?? { key, followersGained: 0, profileViews: 0, posts: 0 }
    g.followersGained += r.followers_gained ?? 0
    g.profileViews += r.profile_views_from_post ?? 0
    g.posts += 1
    buckets.set(key, g)
  }
  return [...buckets.values()].sort((a, b) => b.followersGained - a.followersGained)
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/insights.test.ts`
Expected output: all tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/insights.ts lib/__tests__/insights.test.ts
git commit -m "feat(insights): pure velocity classification + pillar attribution rollups

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: `lib/insights.ts` — thin fetch wrapper `getUserInsights(userId)`

**Files:**
- Modify: `lib/insights.ts`

- [ ] **Step 1: Implement the fetch wrapper**

> Thin DB glue (not unit-tested with a live DB). The pure functions it calls are fully covered by Tasks 6–7; this wrapper is exercised by the API smoke test in Task 9.

In `lib/insights.ts`, at the bottom, add:

```ts
/**
 * Fetch a user's last-90-day published posts + per-post velocity series, and
 * return the bundle of insight aggregations the dashboard renders.
 */
export async function getUserInsights(userId: string) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, content_pillar, format, published_at, impressions, reactions, comments, reshares, saves, followers_gained, profile_views_from_post')
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', ninetyDaysAgo)

  const rows = (posts ?? []) as Array<PostPerfRow & AttributionRow & { id: string }>

  // Velocity: classify each post from its post_analytics snapshots, then tally classes.
  const { data: snaps } = await supabaseAdmin
    .from('post_analytics')
    .select('post_id, age_minutes, impressions')
    .eq('user_id', userId)
    .gte('captured_at', ninetyDaysAgo)

  const byPost = new Map<string, VelocitySample[]>()
  for (const s of (snaps ?? []) as Array<{ post_id: string; age_minutes: number | null; impressions: number | null }>) {
    if (!byPost.has(s.post_id)) byPost.set(s.post_id, [])
    byPost.get(s.post_id)!.push({ age_minutes: s.age_minutes, impressions: s.impressions })
  }
  const velocityCounts = { 'fast-spike': 0, 'slow-burn': 0, unknown: 0 }
  for (const series of byPost.values()) {
    velocityCounts[classifyVelocity(series).class] += 1
  }

  return {
    byPillar: perPillarPerformance(rows),
    byFormat: perFormatPerformance(rows),
    byTimeSlot: perTimeSlotPerformance(rows),
    attribution: attributionByPillar(rows),
    velocity: velocityCounts,
    totalPosts: rows.length,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected output: no errors (exit 0).

- [ ] **Step 3: Re-run insight tests**

Run: `npx vitest run lib/__tests__/insights.test.ts`
Expected output: all tests passed.

- [ ] **Step 4: Commit**

```bash
git add lib/insights.ts
git commit -m "feat(insights): getUserInsights fetch wrapper (90d posts + velocity)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: `GET /api/growth` read route (feeds the dashboard)

Mirrors the auth pattern in `app/api/scoring/route.ts` (`getUserFromRequest`). Reads the latest persisted Growth Score (computing one on demand if none exists today) and the insights bundle.

**Files:**
- Create: `app/api/growth/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/api/growth/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { persistGrowthScore } from '@/lib/growth-score'
import { getUserInsights } from '@/lib/insights'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Latest score; recompute if the freshest is older than 24h (mirrors analytics page cadence).
    const { data: latest } = await supabaseAdmin
      .from('growth_scores')
      .select('score, breakdown, captured_at')
      .eq('user_id', user.id)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let growthScore = latest
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    if (!latest || new Date(latest.captured_at).getTime() < oneDayAgo) {
      const fresh = await persistGrowthScore(user.id)
      growthScore = { ...fresh, captured_at: new Date().toISOString() }
    }

    const insights = await getUserInsights(user.id)
    return NextResponse.json({ growthScore, insights })
  } catch (err) {
    console.error('[growth]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected output: no errors (exit 0).

- [ ] **Step 3: Build smoke test (route compiles in the Next.js bundle)**

Run: `npm run build 2>&1 | grep -E "/api/growth|Failed to compile|error" || echo "BUILD CLEAN — /api/growth bundled"`
Expected output: a line showing `/api/growth` in the route manifest, or `BUILD CLEAN — /api/growth bundled` with no compile errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/growth/route.ts
git commit -m "feat(growth): GET /api/growth read route (score + insights)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: `cohort_baselines` — migration, pure rollup, cron

This delivers the pooling priors used by Task 4. Cohort = **global** for v1 (single row of medians); the calibration task (Task 11) decides whether to segment.

**Files:**
- Create: `supabase/migrations/20260531b_cohort_baselines.sql`
- Modify: `supabase/schema.sql`
- Modify: `lib/supabase.ts`
- Create: `lib/cohort-baselines.ts`
- Create: `lib/__tests__/cohort-baselines.test.ts`
- Create: `app/api/cron/cohort-baselines/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260531b_cohort_baselines.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 1 (Understand)
-- cohort_baselines: periodic rollup of cohort-median sub-scores. Feeds cold-start
-- partial pooling (w_self = n/(n+K)) in lib/growth-score.ts. Global cohort in v1
-- (cohort_key = 'global'); segmentation deferred to the calibration task.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists cohort_baselines (
  id uuid default gen_random_uuid() primary key,
  cohort_key text not null default 'global',
  reach_median numeric,
  audience_median numeric,
  resonance_median numeric,
  authority_median numeric,
  n_users integer not null default 0,
  computed_at timestamptz default now()
);

create index if not exists cohort_baselines_key_computed_idx
  on cohort_baselines(cohort_key, computed_at desc);
```

- [ ] **Step 2: Lint the migration**

Run: `grep -c "create table if not exists cohort_baselines" supabase/migrations/20260531b_cohort_baselines.sql`
Expected output: `1`

- [ ] **Step 3: Mirror into schema.sql + add the type**

In `supabase/schema.sql`, after the `growth_scores` block added in Task 1, append:

```sql

create table if not exists cohort_baselines (
  id uuid default gen_random_uuid() primary key,
  cohort_key text not null default 'global',
  reach_median numeric,
  audience_median numeric,
  resonance_median numeric,
  authority_median numeric,
  n_users integer not null default 0,
  computed_at timestamptz default now()
);
```

In `lib/supabase.ts`, after the `GrowthScore` type, add:

```ts
export type CohortBaseline = {
  id: string
  cohort_key: string
  reach_median: number | null
  audience_median: number | null
  resonance_median: number | null
  authority_median: number | null
  n_users: number
  computed_at: string
}
```

- [ ] **Step 4: Write the failing test for the pure median rollup**

Create `lib/__tests__/cohort-baselines.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { median, computeCohortBaselines, type UserSubScores } from '../cohort-baselines'

describe('median', () => {
  it('odd + even length, ignores nulls', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([5, null, 1])).toBe(3)
  })
  it('null when empty/all-null', () => {
    expect(median([])).toBeNull()
    expect(median([null, null])).toBeNull()
  })
})

describe('computeCohortBaselines', () => {
  it('takes the per-sub-score median across users', () => {
    const users: UserSubScores[] = [
      { reach: 80, audience: 40, resonance: 60, authority: 20 },
      { reach: 60, audience: 50, resonance: 50, authority: 30 },
      { reach: 40, audience: 60, resonance: 70, authority: 40 },
    ]
    const out = computeCohortBaselines(users)
    expect(out).toEqual({
      cohort_key: 'global',
      reach_median: 60, audience_median: 50, resonance_median: 60, authority_median: 30,
      n_users: 3,
    })
  })
  it('excludes null sub-scores per dimension and reports n_users', () => {
    const out = computeCohortBaselines([
      { reach: 100, audience: null, resonance: 50, authority: null },
      { reach: 50, audience: 40, resonance: null, authority: null },
    ])
    expect(out.reach_median).toBe(75)
    expect(out.audience_median).toBe(40)
    expect(out.resonance_median).toBe(50)
    expect(out.authority_median).toBeNull()
    expect(out.n_users).toBe(2)
  })
})
```

- [ ] **Step 5: Run to see it fail**

Run: `npx vitest run lib/__tests__/cohort-baselines.test.ts`
Expected output: fails to resolve `../cohort-baselines`. 0 passed.

- [ ] **Step 6: Implement the pure rollup + thin wrappers**

Create `lib/cohort-baselines.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase-admin'
import { selfSubScores, type GrowthScoreInput } from '@/lib/growth-score'

export type UserSubScores = {
  reach: number | null
  audience: number | null
  resonance: number | null
  authority: number | null
}

export function median(xs: Array<number | null>): number | null {
  const v = xs.filter((x): x is number => x != null).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/** Pure: per-dimension median across users' self sub-scores. */
export function computeCohortBaselines(users: UserSubScores[]) {
  return {
    cohort_key: 'global',
    reach_median: median(users.map(u => u.reach)),
    audience_median: median(users.map(u => u.audience)),
    resonance_median: median(users.map(u => u.resonance)),
    authority_median: median(users.map(u => u.authority)),
    n_users: users.length,
  }
}

/**
 * Build each active user's *self* sub-scores (no pooling) from their persisted
 * Growth Score breakdown is NOT reliable (already pooled), so we recompute self
 * sub-scores from the same 28-day windows. To keep this rollup cheap we reuse the
 * breakdown's sub-scores only as a fallback; primary path recomputes via the
 * shared selfSubScores against pre-aggregated windows fetched per user.
 *
 * For v1 we approximate the cohort from the *latest persisted breakdowns*, which
 * is acceptable because pooling of an already-pooled prior converges (self≈prior
 * once a user has data). The calibration task revisits this.
 */
export async function persistCohortBaselines() {
  const { data } = await supabaseAdmin
    .from('growth_scores')
    .select('user_id, breakdown, captured_at')
    .order('captured_at', { ascending: false })
    .limit(5000)

  // Keep only the most-recent breakdown per user.
  const latestByUser = new Map<string, UserSubScores>()
  for (const row of (data ?? []) as Array<{ user_id: string; breakdown: UserSubScores }>) {
    if (!latestByUser.has(row.user_id)) {
      latestByUser.set(row.user_id, {
        reach: row.breakdown.reach ?? null,
        audience: row.breakdown.audience ?? null,
        resonance: row.breakdown.resonance ?? null,
        authority: row.breakdown.authority ?? null,
      })
    }
  }

  const baseline = computeCohortBaselines([...latestByUser.values()])
  await supabaseAdmin.from('cohort_baselines').insert(baseline)
  return baseline
}

// Re-export so callers that already import this module get the score input type.
export type { GrowthScoreInput }
void selfSubScores
```

- [ ] **Step 7: Run to pass**

Run: `npx vitest run lib/__tests__/cohort-baselines.test.ts`
Expected output: all tests passed.

- [ ] **Step 8: Write the cron route (copy the day7-stats `cron_locks` guard)**

Create `app/api/cron/cohort-baselines/route.ts`:

```ts
// Vercel cron — daily. Rolls up cohort-median sub-scores into cohort_baselines,
// feeding cold-start partial pooling in lib/growth-score.ts. Idempotent per day
// via cron_locks (mirrors day7-stats).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { persistCohortBaselines } from '@/lib/cohort-baselines'
import crypto from 'crypto'

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'cohort-baselines', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  const baseline = await persistCohortBaselines()

  await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
  return NextResponse.json({ ok: true, n_users: baseline.n_users })
}

export { handler as GET, handler as POST }
```

- [ ] **Step 9: Register the cron in `vercel.json`**

In `vercel.json`, add an entry to the `crons` array (mirroring the existing cron entries' shape — `path` + `schedule`). Schedule it daily at 04:00 UTC, after Phase 0 capture crons:

```json
{ "path": "/api/cron/cohort-baselines", "schedule": "0 4 * * *" }
```

(If `vercel.json` has no `crons` array yet, add `"crons": [ { "path": "/api/cron/cohort-baselines", "schedule": "0 4 * * *" } ]` at the top level.)

- [ ] **Step 10: Typecheck + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | grep -E "/api/cron/cohort-baselines|Failed to compile" || echo "BUILD CLEAN"`
Expected output: no TS errors; `/api/cron/cohort-baselines` appears in the manifest or `BUILD CLEAN`.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/20260531b_cohort_baselines.sql supabase/schema.sql lib/supabase.ts lib/cohort-baselines.ts lib/__tests__/cohort-baselines.test.ts app/api/cron/cohort-baselines/route.ts vercel.json
git commit -m "feat(growth): cohort_baselines table, median rollup, daily cron

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: CALIBRATION — choose K and the weights once data exists

This is a **concrete, runnable analysis task**, not a vague TODO. It defines the exact queries, the decision rule, and the v1 defaults that ship now.

**Files:**
- Create: `docs/superpowers/specs/2026-05-31-growth-score-calibration.md` (documentation of the procedure + defaults — the only doc file this plan creates, and it is the deliverable of this task)

> **Ship-now defaults (already implemented in Tasks 2–4):** `K = 10`; weights `reach 0.30, audience 0.30, resonance 0.25, authority 0.15`; baseline window `28` days; cohort = `global`. These are the v1 constants in `lib/growth-score.ts` (`GROWTH_K`, `GROWTH_WEIGHTS`, `BASELINE_WINDOW_DAYS`). Do not change them until the procedure below clears the decision gate.

- [ ] **Step 1: Write the calibration procedure doc**

Create `docs/superpowers/specs/2026-05-31-growth-score-calibration.md` with:

```md
# Growth Score Calibration — K and Weights

**Status:** Procedure defined; run when ≥ 8 weeks of capture exist for ≥ 50 active users.
**v1 defaults shipped now:** K = 10; weights reach 0.30 / audience 0.30 / resonance 0.25 / authority 0.15; baseline window 28 days; cohort = global.

## Retention proxy (dependent variable)
Define "retained" = the user published ≥ 1 post in BOTH the 28 days *after* a given
Growth Score row and the 28 days after that (8-week survival). Compute per
growth_scores row that has 56+ days of subsequent history.

## A. Which sub-scores correlate with retention (weight tuning)
For each sub-score column in growth_scores.breakdown, correlate its value with the
retention proxy across all eligible rows:

```sql
-- One row per (user_id, captured_at) with the sub-scores and the 8-week-survival flag.
with scored as (
  select gs.user_id, gs.captured_at,
         (gs.breakdown->>'reach')::numeric      as reach,
         (gs.breakdown->>'audience')::numeric   as audience,
         (gs.breakdown->>'resonance')::numeric  as resonance,
         (gs.breakdown->>'authority')::numeric  as authority
  from growth_scores gs
  where gs.captured_at < now() - interval '56 days'
),
retained as (
  select s.*,
    (exists (select 1 from posts p where p.user_id = s.user_id and p.status='published'
        and p.published_at >= s.captured_at and p.published_at < s.captured_at + interval '28 days')
     and
     exists (select 1 from posts p where p.user_id = s.user_id and p.status='published'
        and p.published_at >= s.captured_at + interval '28 days' and p.published_at < s.captured_at + interval '56 days')
    )::int as retained
  from scored s
)
select corr(reach, retained)      as corr_reach,
       corr(audience, retained)   as corr_audience,
       corr(resonance, retained)  as corr_resonance,
       corr(authority, retained)  as corr_authority,
       count(*)                   as n
from retained;
```

**Decision rule (weights):** rank the four `corr_*` values. Set each weight
proportional to its positive correlation, normalized to sum to 1.0, then **round to
the nearest 0.05** and clip each weight to the band [0.10, 0.40] (no single pillar
dominates or vanishes). If `n < 200` OR any correlation's sign flips between two
consecutive monthly runs, **keep the v1 defaults** (insufficient/unstable signal).

## B. Choosing K (pooling strength)
Backtest: for K ∈ {5, 10, 20, 40}, recompute each historical Growth Score using
that K (pure `computeGrowthScore` re-run over stored windows), then measure
mean absolute month-over-month score change per user (stability) AND the
correlation of the composite with the retention proxy (signal):

```sql
-- Stability proxy per user: avg absolute delta between consecutive monthly scores.
with ordered as (
  select user_id, score, captured_at,
         lag(score) over (partition by user_id order by captured_at) as prev
  from growth_scores
)
select avg(abs(score - prev)) as mean_abs_delta, count(*) as n
from ordered where prev is not null;
```

**Decision rule (K):** pick the smallest K whose `mean_abs_delta` is within 10% of
the most-stable K, AND whose composite↔retention correlation is within 0.02 of the
best. Smaller K = trusts the user sooner. If the curve is flat (all within those
bands), **keep K = 10**. Re-evaluate quarterly (LinkedIn version sunsets force
periodic data review anyway).

## C. Cohort segmentation (deferred decision)
Currently `cohort_key = 'global'`. Segment (e.g. by industry or follower tier) only
if, within a segment, the segment median differs from the global median by > 15
points on any sub-score AND each segment has ≥ 30 users. Until both hold, global
pooling is less noisy. No code change ships until this gate is met.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-31-growth-score-calibration.md
git commit -m "docs(growth): K + weights calibration procedure (v1 defaults locked)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Surface the Growth Score ring + breakdown panel on the analytics page

The analytics page (`app/dashboard/analytics/page.tsx`) is a client component that already fetches via `/api/*` and renders cards with the existing CSS-variable style. Recharts (`^3.8.1`) is available; the page currently hand-rolls SVG, so for consistency the ring is a small inline SVG (matches the existing `LineChart`/score-circle idiom) — no new dependency needed.

**Data props:** the page fetches `GET /api/growth` → `{ growthScore: { score, breakdown }, insights: { byPillar, byFormat, byTimeSlot, attribution, velocity, totalPosts } }`. `breakdown` carries `reach/audience/resonance/authority` (0–100), `weights`, `baseline_window`, `n_posts`, `w_self`, `source` — everything the "How this is calculated" panel needs. No prop drilling: state lives in the page alongside `scores`/`posts`.

**Files:**
- Modify: `app/dashboard/analytics/page.tsx`

- [ ] **Step 1: Add Growth Score state + fetch**

In `app/dashboard/analytics/page.tsx`, after the existing type aliases (after `type ProfileAnalysis = ...`), add:

```ts
type GrowthBreakdownUI = {
  reach: number; audience: number; resonance: number; authority: number
  weights: { reach: number; audience: number; resonance: number; authority: number }
  baseline_window: number; n_posts: number; w_self: number; source: string
}
type GrowthData = {
  growthScore: { score: number; breakdown: GrowthBreakdownUI } | null
  insights: {
    byPillar: { key: string; posts: number; avgImpressions: number; avgEngagementRate: number }[]
    byTimeSlot: { day: string; hour: number; posts: number; avgEngagementRate: number }[]
    velocity: { 'fast-spike': number; 'slow-burn': number; unknown: number }
    totalPosts: number
  } | null
}
```

In the component body, after `const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null)`, add:

```ts
  const [growth, setGrowth] = useState<GrowthData | null>(null)
```

Inside the existing `load()` in `useEffect`, after the `await Promise.all([ fetchData(user.id), fetchAnalysis(user.id) ])` call, add:

```ts
        try {
          const gRes = await fetch('/api/growth')
          if (gRes.ok && !cancelled) setGrowth(await gRes.json())
        } catch { /* non-fatal */ }
```

- [ ] **Step 2: Add the Growth Score ring + "How this is calculated" panel**

In the returned JSX, immediately after the header `</div>` block (the `flex flex-col sm:flex-row ... justify-between` block that ends just before `{/* Profile Analysis Card */}`), insert:

```tsx
      {/* Growth Score — ring + always-visible breakdown */}
      {growth?.growthScore && (() => {
        const gs = growth.growthScore!
        const b = gs.breakdown
        const PILLARS = [
          { key: 'reach', label: 'Reach', sub: 'More people seeing you' },
          { key: 'audience', label: 'Audience', sub: 'Building a following' },
          { key: 'resonance', label: 'Resonance', sub: 'Content landing' },
          { key: 'authority', label: 'Authority', sub: 'Converting to opportunity' },
        ] as const
        const R = 34, C = 2 * Math.PI * R
        const dash = (gs.score / 100) * C
        const sourceLabel = b.source === 'creator_api' ? 'LinkedIn Creator API'
          : b.source === 'public_fallback' ? 'public metrics' : 'manual'
        return (
          <div className="mb-4 sm:mb-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
            <div className="flex items-start gap-4 mb-4">
              <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
                  <circle cx="42" cy="42" r={R} fill="none" stroke="var(--pl-accent)" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={`${dash} ${C}`} transform="rotate(-90 42 42)" />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.04em' }}>{gs.score}</span>
                </div>
              </div>
              <div className="min-w-0">
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 2 }}>Growth Score</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', lineHeight: 1.5 }}>
                  // vs your last {b.baseline_window} days · {b.n_posts} posts · source: {sourceLabel}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>
                  Blends your own trend with the community baseline ({Math.round(b.w_self * 100)}% you).
                </div>
              </div>
            </div>

            {/* How this is calculated — always visible */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 600, marginBottom: 10, fontFamily: 'var(--f-mono)' }}>
                // How this is calculated
              </div>
              <div className="flex flex-col gap-3">
                {PILLARS.map(p => {
                  const val = Math.round(b[p.key])
                  const weight = b.weights[p.key]
                  return (
                    <div key={p.key}>
                      <div className="flex justify-between items-baseline mb-1.5 gap-2">
                        <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>
                          {p.label} <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>· {p.sub}</span>
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', flexShrink: 0 }}>
                          {val} <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 500 }}>×{Math.round(weight * 100)}%</span>
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--pl-accent)', borderRadius: 3, width: `${val}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
```

- [ ] **Step 3: Add per-pillar performance + best-time insight cards**

Immediately after the Growth Score block from Step 2, insert:

```tsx
      {/* Growth insights — per-pillar performance + best time */}
      {growth?.insights && growth.insights.totalPosts > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 sm:mb-5">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>What's Working</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 12, fontFamily: 'var(--f-mono)' }}>// best pillars by engagement rate</div>
            <div className="flex flex-col gap-2.5">
              {growth.insights.byPillar.slice(0, 5).map(p => (
                <div key={p.key} className="flex justify-between items-baseline gap-2">
                  <span className="truncate" style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{p.key}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-4)', flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{(p.avgEngagementRate * 100).toFixed(1)}%</span> · {p.posts} posts
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>Best Times to Post</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 12, fontFamily: 'var(--f-mono)' }}>// top slots by engagement rate (UTC)</div>
            <div className="flex flex-col gap-2.5">
              {growth.insights.byTimeSlot.slice(0, 5).map((s, i) => (
                <div key={`${s.day}-${s.hour}-${i}`} className="flex justify-between items-baseline gap-2">
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{s.day} {s.hour}:00</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-4)', flexShrink: 0 }}>
                    <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{(s.avgEngagementRate * 100).toFixed(1)}%</span> · {s.posts} posts
                  </span>
                </div>
              ))}
            </div>
            {(growth.insights.velocity['fast-spike'] + growth.insights.velocity['slow-burn']) > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-4)' }}>
                {growth.insights.velocity['fast-spike']} fast-spike · {growth.insights.velocity['slow-burn']} slow-burn posts
              </div>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit && npm run build 2>&1 | grep -E "Failed to compile|dashboard/analytics" || echo "BUILD CLEAN"`
Expected output: no TS errors; the analytics route compiles (`BUILD CLEAN` or the route in the manifest).

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/analytics/page.tsx
git commit -m "feat(growth): Growth Score ring + how-it's-calculated panel + insight cards

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13: Full-suite verification + branch wrap-up

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected output: all test files pass — `growth-score.test.ts`, `insights.test.ts`, `cohort-baselines.test.ts`, and the pre-existing `magic-link.test.ts`. 0 failed.

- [ ] **Step 2: Full typecheck + production build**

Run: `npx tsc --noEmit && npm run build`
Expected output: TS exits 0; build succeeds with `/api/growth`, `/api/cron/cohort-baselines`, and `/dashboard/analytics` in the route manifest.

- [ ] **Step 3: Confirm the migrations + schema mirror are consistent**

Run: `grep -l "create table if not exists growth_scores" supabase/schema.sql supabase/migrations/20260531_growth_scores.sql && grep -l "create table if not exists cohort_baselines" supabase/schema.sql supabase/migrations/20260531b_cohort_baselines.sql`
Expected output: all four file paths listed (each table defined in both its migration and schema.sql).

- [ ] **Step 4: Use superpowers:finishing-a-development-branch** to decide merge/PR/cleanup for `feat/organic-growth-engine`.

---

## Out of scope (explicitly — keep this plan focused)

- **Writing `post_analytics` / `follower_snapshots` / `profile_analytics` / `posts` attributed columns** — that is Phase 0 (assumed done).
- **Any generation/scheduling change** based on these insights — that is Phase 2 (`experiments`, per-user learned weights, control-vs-treatment).
- **The attributable growth report email / plateau detection / performance-aware voice** — that is Phase 3.
- **OAuth scope changes / the `/rest/` Creator API migration / version-pinning** — that is Gate 0.
- **Mutating `linkedin_scores`** — the Growth Score is additive; profile-health scoring stays untouched.
