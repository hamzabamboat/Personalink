# Phase 3 — Sustain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn measured growth into *felt* growth — a weekly attributable growth report email per active user, plateau/regression detection that re-opens optimization experiments, and a performance-aware voice fingerprint that evolves toward what actually drives reach.

**Architecture:** All narrative-composition, plateau-detection, and sample-weighting math lives in PURE, side-effect-free functions (`composeGrowthNarrative`, `detectPlateau`, `performanceWeight`/`combinedWeight`) that take plain fixtures and return values — unit-tested without a live DB. Three thin wrappers glue them to Supabase + Resend: a new `app/api/cron/growth-report/route.ts` (copying the day7-stats `cron_locks` auth guard) fetches each user's `growth_scores` window + `lib/insights.ts` attribution and sends via `lib/email.ts`; a `maybeOpenPlateauExperiment` wrapper calls Phase 2's `createExperiment` when a plateau is detected and no experiment is already running; and `lib/voice.ts`'s existing `refreshFingerprint` is extended to order/select `voice_samples` by combined recency×performance weight before distilling, kept behind the existing every-N-samples trigger.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres), TypeScript, Vitest, Resend

---

## Cross-Phase Dependency Assumption (Plans 0–2 — assume DELIVERED, do NOT re-create)

This plan **depends on Phases 0, 1, and 2 already being delivered**. The following are read/called, never created here:

**From Phase 0 (capture):**
- `posts` attributed columns: `impressions, reactions, comments, reshares, saves, link_clicks, members_reached, followers_gained, profile_views_from_post` (all `integer`, nullable), `metric_source text`, `metrics_synced_at timestamptz`, plus existing `content_pillar text`, `published_at timestamptz`, `format text`, `status text`, `linkedin_post_id text`.
- `follower_snapshots(user_id, snapshot_date date, follower_count int, source)`, `unique(user_id, snapshot_date)`.
- `MetricSource = 'creator_api' | 'public_fallback' | 'manual'` (in `lib/supabase.ts`).

**From Phase 1 (understand):**
- `growth_scores(id, user_id, score int, breakdown jsonb, captured_at timestamptz)`, indexed `(user_id, captured_at desc)`. `breakdown` is the `GrowthBreakdown` jsonb: `{ reach, audience, resonance, authority, weights, baseline_window, n_posts, w_self, source }`.
- `lib/growth-score.ts` — `computeGrowthScore`, `persistGrowthScore(userId)`, `GROWTH_WEIGHTS`, `BASELINE_WINDOW_DAYS` (= 28).
- `lib/insights.ts` — pure `perPillarPerformance`, `perTimeSlotPerformance`, `attributionByPillar(rows)` → `Array<{ key, followersGained, profileViews, posts }>` sorted by `followersGained` desc, and the thin `getUserInsights(userId)` → `{ byPillar, byFormat, byTimeSlot, attribution, velocity, totalPosts }`.
- Type `lib/supabase.ts` `GrowthScore`, `GrowthBreakdown`.

**From Phase 2 (intervene) — `lib/experiments.ts` + the `experiments` table.** Per the master spec (Data Model → `experiments`), this plan binds to exactly this minimal surface and NOTHING more:

```ts
// lib/experiments.ts (Phase 2 — assumed to exist)
export type ExperimentDimension = 'timing' | 'format' | 'pillar' | 'hook' | 'length'

export type CreateExperimentInput = {
  userId: string
  hypothesis: string
  dimension: ExperimentDimension
  control: Record<string, unknown>
  treatment: Record<string, unknown>
  baselineMetric: string            // e.g. 'engagement_rate' | 'impressions'
}
/** Inserts an experiments row with status 'running'; returns its id. */
export function createExperiment(input: CreateExperimentInput): Promise<{ id: string }>
```

And the `experiments` table (Phase 2 migration) has at least: `id, user_id, dimension text, status text` (`'running'|'won'|'lost'|'inconclusive'`), `started_at, ended_at`.

> **If the real Phase 2 `createExperiment` signature differs**, the implementing agent adapts the single call site in Task 6 (`maybeOpenPlateauExperiment`) and its one stubbed test — no pure-function change. The detector (Task 5) is signature-independent and stays as-is.

> **Verify-before-build gate (Task 0):** the very first step confirms these symbols actually exist on the branch. If `lib/experiments.ts` / the `experiments` table are missing (Phase 2 not yet merged), Tasks 4–6's plateau→experiment *wiring* is blocked, but Tasks 1–3 (report) and 7 (voice) are independent and proceed. The detector pure function (Task 5) also proceeds — only the thin `createExperiment` call in Task 6 waits.

This plan adds NO new tables. It reads `growth_scores` + `follower_snapshots` + `posts`, writes one cron-tracking column to `user_profiles`, and updates `voice_samples` selection only.

---

## File Structure

**New files:**
- `lib/growth-report.ts` — pure `composeGrowthNarrative(input)` → `{ subject, body }` (the email model) + thin `buildGrowthReportForUser(userId)` fetch wrapper.
- `lib/__tests__/growth-report.test.ts` — pure unit tests for the narrative (up / flat / down / insufficient-data).
- `lib/plateau.ts` — pure `detectPlateau(growthScoreSeries, followerSeries)` → `{ plateaued, reason }` + thin `maybeOpenPlateauExperiment(userId)`.
- `lib/__tests__/plateau.test.ts` — pure unit tests for the detector (rising / flat / declining / noisy / insufficient-data).
- `lib/__tests__/voice-weight.test.ts` — pure unit tests for `performanceWeight` + `combinedWeight`.
- `app/api/cron/growth-report/route.ts` — weekly cron; thin wrapper that selects active users, builds + sends the report, runs plateau detection, and persists `growth_report_sent_at`. Copies the day7-stats `cron_locks` guard.
- `docs/superpowers/specs/2026-05-31-sustain-calibration.md` — the calibration procedure + v1 defaults (the only doc this plan creates; it is the Task 8 deliverable).

**Modified files:**
- `lib/email.ts` — add `sendGrowthReportEmail({ to, subject, body })` (Resend send; renders the `GrowthReportBody` model into the existing PersonaLink HTML shell).
- `lib/voice.ts` — add pure `performanceWeight` + `combinedWeight`; extend `refreshFingerprint` to ORDER/SELECT samples by combined recency×performance weight (falling back to recency-only when metrics are absent); the existing `DISTILL_EVERY` trigger is unchanged.
- `supabase/migrations/20260531c_growth_report_sent_at.sql` — `alter table user_profiles add column if not exists growth_report_sent_at timestamptz` (idempotency marker, mirrors `day7_stats_sent_at`).
- `supabase/schema.sql` — mirror the `growth_report_sent_at` column.
- `vercel.json` — register the `growth-report` cron.

> **Why no new email *template function* per outcome:** `composeGrowthNarrative` returns a structured `body` model and `sendGrowthReportEmail` renders it. One envelope, four narratives — DRY. The narrative branching (up/flat/down/insufficient) is pure and unit-tested; the envelope is dumb glue.

---

## Conventions every task follows

- Server libs import the DB client as `import { supabaseAdmin } from '@/lib/supabase-admin'`. Types live in `lib/supabase.ts`. Email send via `lib/email.ts` (Resend).
- **Pure functions take fixtures and return values — no `supabaseAdmin`, no `Date.now()`, no I/O, no email send.** Anything time-relative takes pre-windowed rows or an explicit `now`. This is what makes them unit-testable without a live DB.
- Tests: Vitest at `lib/__tests__/<name>.test.ts`, `import { describe, it, expect } from 'vitest'`. The runner (`vitest.config.ts`) stubs `server-only` and `./supabase-admin`, so importing a lib that contains thin DB/email wrappers is fine **as long as the test only calls the pure exports**.
- Single test run: `npx vitest run lib/__tests__/<name>.test.ts`.
- Cron: a `vercel.json` `crons` entry + `app/api/cron/<name>/route.ts`, copying the day7-stats auth + `cron_locks` guard verbatim (`authorization` header === `Bearer ${process.env.CRON_SECRET}`; insert a `cron_locks` row keyed `(job_name, run_date)` for idempotency; `update completed_at` at the end). `cron_locks` columns: `job_name text, run_date date, lock_id text, completed_at timestamptz`, `unique(job_name, run_date)`.
- Migrations: `supabase/migrations/YYYYMMDD_<name>.sql`, box-comment header, `add column if not exists`; also mirror into `supabase/schema.sql`.
- Commit after every green step. Branch is `feat/organic-growth-engine`. End every commit message with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

## v1 calibration defaults (locked, implemented in code; revisited in Task 8)

These ship as named constants now. Do not change them until the Task 8 procedure clears its decision gate.

| Constant | v1 value | Where | Meaning |
|---|---|---|---|
| `REPORT_WINDOW_DAYS` | `28` | `lib/growth-report.ts` | the growth delta window the email narrates (= one `BASELINE_WINDOW_DAYS`). |
| Report cadence | **weekly, Mon 13:00 UTC** | `vercel.json` | one email/week; staggered after the Phase 0 6-hourly capture + Phase 1 04:00 cohort-baselines cron so the freshest score exists. |
| `PLATEAU_WINDOWS` | `3` | `lib/plateau.ts` | N consecutive score windows below threshold = plateaued. |
| `PLATEAU_SCORE_DELTA` | `2` | `lib/plateau.ts` | a score window counts as "flat" when `|Δscore| <= 2` points (the Growth Score is 0–100). |
| `PLATEAU_FOLLOWER_GROWTH_PCT` | `0.01` | `lib/plateau.ts` | …AND follower growth over the same span `< 1%` (so a flat-but-still-gaining-followers user is NOT flagged). |
| `REGRESSION_SCORE_DELTA` | `-5` | `lib/plateau.ts` | a single window dropping `>= 5` points is a regression (flagged immediately, distinct reason). |
| `PERF_BLEND` | `0.5` | `lib/voice.ts` | combined weight = `recencyWeight * (1 - PERF_BLEND) + performanceWeight * PERF_BLEND` after normalizing each to 0–1. Equal trust v1. |
| `PERF_SAMPLE_MIN_IMPRESSIONS` | `50` | `lib/voice.ts` | a post needs ≥ 50 impressions before its performance is trusted; below that the sample falls back to recency-only. |

---

## Tasks

### Task 0: Confirm Phase 0–2 dependencies exist on the branch (gate, no code)

**Files:** none (verification only)

- [ ] **Step 1: Confirm Phase 1 read surface exists**

Run: `npx tsc --noEmit >/dev/null 2>&1; node -e "const f=require('fs'); for (const p of ['lib/growth-score.ts','lib/insights.ts']) console.log(p, f.existsSync(p)?'OK':'MISSING')"`
Expected output:
```
lib/growth-score.ts OK
lib/insights.ts OK
```
If either is MISSING, STOP — Phase 1 is not merged; this plan cannot bind its interfaces.

- [ ] **Step 2: Confirm `attributionByPillar` + `getUserInsights` are exported (the report depends on them)**

Run: `grep -E "export (async )?function (attributionByPillar|getUserInsights)" lib/insights.ts`
Expected output: two matching lines.

- [ ] **Step 3: Check the Phase 2 experiment surface (informational — gates Task 6 only)**

Run: `node -e "const f=require('fs'); console.log('lib/experiments.ts', f.existsSync('lib/experiments.ts')?'OK':'MISSING (Task 6 wiring blocked; Tasks 1-5,7-8 proceed)')"` ; `grep -E "export (async )?function createExperiment" lib/experiments.ts 2>/dev/null || echo "createExperiment not found yet"`
Expected output: either `lib/experiments.ts OK` + a `createExperiment` export line (proceed with Task 6), OR a MISSING/not-found line (note it; do Task 6's pure detector via Task 5, and stub the wiring per Task 6 Step 4's fallback note).

- [ ] **Step 4: Confirm `growth_scores` + `follower_snapshots` are in schema.sql**

Run: `grep -c "create table if not exists growth_scores\|create table if not exists follower_snapshots" supabase/schema.sql`
Expected output: `2`

---

### Task 1: `composeGrowthNarrative` — pure leaf helpers (delta + pct formatting)

Build the narrative bottom-up. This task delivers only the leaf math (percent-change + signed labels) so its failure modes are tiny and isolated. No DB, no email.

**Files:**
- Create: `lib/growth-report.ts`
- Create: `lib/__tests__/growth-report.test.ts`

- [ ] **Step 1: Write the failing test for the leaf helpers**

Create `lib/__tests__/growth-report.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { pctChange, signedPct, signedInt, REPORT_WINDOW_DAYS } from '../growth-report'

describe('growth-report leaf helpers', () => {
  it('pctChange returns fractional change vs a prior value', () => {
    expect(pctChange(140, 100)).toBeCloseTo(0.4, 10)   // +40%
    expect(pctChange(50, 100)).toBeCloseTo(-0.5, 10)    // -50%
    expect(pctChange(100, 100)).toBe(0)
  })

  it('pctChange returns null when the prior is zero/absent (no baseline to compare)', () => {
    expect(pctChange(10, 0)).toBeNull()
    expect(pctChange(10, null)).toBeNull()
    expect(pctChange(null, 100)).toBe(-1) // had a baseline, now nothing → -100%
  })

  it('signedPct formats a fraction as a +/- percentage string', () => {
    expect(signedPct(0.4)).toBe('+40%')
    expect(signedPct(-0.5)).toBe('-50%')
    expect(signedPct(0)).toBe('+0%')
    expect(signedPct(null)).toBe('—')
  })

  it('signedInt formats a signed integer with thousands separators', () => {
    expect(signedInt(120)).toBe('+120')
    expect(signedInt(-3)).toBe('-3')
    expect(signedInt(0)).toBe('+0')
    expect(signedInt(1200)).toBe('+1,200')
    expect(signedInt(null)).toBe('—')
  })

  it('exposes the v1 report window', () => {
    expect(REPORT_WINDOW_DAYS).toBe(28)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/growth-report.test.ts`
Expected output: fails to resolve `../growth-report` (`Failed to load url ../growth-report` / "Cannot find module"). 0 passed.

- [ ] **Step 3: Minimal implementation of the leaf helpers**

Create `lib/growth-report.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase-admin'

/** The growth delta window the report narrates, in days (= one baseline window). */
export const REPORT_WINDOW_DAYS = 28

/**
 * Fractional change of a current value vs a prior value.
 * - prior absent/zero → null (no baseline to compare against)
 * - current null but prior present → -1 (lost everything, -100%)
 */
export function pctChange(current: number | null, prior: number | null): number | null {
  if (prior == null || prior === 0) return null
  const c = current ?? 0
  return (c - prior) / prior
}

/** Format a fraction (0.4) as a signed percentage string ("+40%"); "—" for null. */
export function signedPct(frac: number | null): string {
  if (frac == null) return '—'
  const pct = Math.round(frac * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

/** Format a signed integer with thousands separators ("+1,200"); "—" for null. */
export function signedInt(n: number | null): string {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : '-'
  return `${sign}${Math.abs(n).toLocaleString('en-US')}`
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/growth-report.test.ts`
Expected output: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/growth-report.ts lib/__tests__/growth-report.test.ts
git commit -m "feat(growth-report): narrative leaf helpers (pctChange, signedPct, signedInt)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `composeGrowthNarrative(input)` — the pure narrative composer

The heart of the report. Takes pre-fetched window aggregates + the top attributed driver and returns `{ subject, body }`, where `body` is a structured model (NOT HTML) the email envelope renders. Four branches: growth up, flat, down, insufficient-data.

**Files:**
- Modify: `lib/growth-report.ts`
- Modify: `lib/__tests__/growth-report.test.ts`

- [ ] **Step 1: Add the failing tests (up / flat / down / insufficient-data)**

In `lib/__tests__/growth-report.test.ts`, update the import line to:

```ts
import {
  pctChange, signedPct, signedInt, composeGrowthNarrative, REPORT_WINDOW_DAYS,
  type GrowthNarrativeInput,
} from '../growth-report'
```

Append:

```ts
function baseInput(): GrowthNarrativeInput {
  return {
    firstName: 'Sam',
    windowDays: 28,
    current: { score: 72, impressions: 14000, followers: 1320 },
    prior:   { score: 60, impressions: 10000, followers: 1200 },
    // attribution: the pillar that drove the most followers + the best time slot
    topDriver: {
      pillar: 'founder-story',
      followersGained: 120,
      bestSlot: { day: 'Tue', hour: 9 },
    },
  }
}

describe('composeGrowthNarrative — growth UP', () => {
  it('leads with the headline gain and attributes it to the driver + time slot', () => {
    const { subject, body } = composeGrowthNarrative(baseInput())
    expect(body.trend).toBe('up')
    expect(subject).toContain('+40%')           // impressions delta in the subject
    expect(subject.toLowerCase()).toContain('sam')
    // headline mentions both impressions % and follower count delta
    expect(body.headline).toContain('+40%')
    expect(body.headline).toContain('+120')
    // attribution sentence names the pillar AND the day it moved them to
    expect(body.attribution).toMatch(/founder-story/i)
    expect(body.attribution).toMatch(/Tue/)
    expect(body.scoreLine).toContain('72')      // current score shown
    expect(body.cta.href).toContain('/dashboard/analytics')
  })
})

describe('composeGrowthNarrative — FLAT', () => {
  it('frames a held-steady week honestly (no fake gain) and nudges the next experiment', () => {
    const input = baseInput()
    input.current = { score: 61, impressions: 10100, followers: 1205 }
    input.prior = { score: 60, impressions: 10000, followers: 1200 }
    const { body } = composeGrowthNarrative(input)
    expect(body.trend).toBe('flat')
    expect(body.headline.toLowerCase()).toMatch(/steady|holding|consistent/)
    // never claims a big jump when there isn't one
    expect(body.headline).not.toContain('+40%')
  })
})

describe('composeGrowthNarrative — DOWN', () => {
  it('is candid about the dip and orients toward recovery, not blame', () => {
    const input = baseInput()
    input.current = { score: 48, impressions: 7000, followers: 1180 }
    input.prior = { score: 60, impressions: 10000, followers: 1200 }
    const { subject, body } = composeGrowthNarrative(input)
    expect(body.trend).toBe('down')
    expect(body.headline).toMatch(/-30%/)       // impressions fell 30%
    expect(body.recovery).toBeTruthy()          // a recovery suggestion is present
    expect(subject.toLowerCase()).not.toMatch(/congrat|great week/)
  })
})

describe('composeGrowthNarrative — INSUFFICIENT DATA', () => {
  it('returns the no-baseline variant when the prior window is empty', () => {
    const { subject, body } = composeGrowthNarrative({
      firstName: 'Sam',
      windowDays: 28,
      current: { score: 55, impressions: 800, followers: 40 },
      prior: { score: null, impressions: null, followers: null },
      topDriver: null,
    })
    expect(body.trend).toBe('insufficient')
    expect(body.headline.toLowerCase()).toMatch(/first|baseline|getting started|keep posting/)
    expect(body.attribution).toBeNull()         // nothing to attribute yet
    expect(subject.toLowerCase()).not.toContain('—') // subject is still human
  })

  it('echoes the window length passed in', () => {
    const { body } = composeGrowthNarrative({ ...baseInput(), windowDays: REPORT_WINDOW_DAYS })
    expect(body.windowDays).toBe(28)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/growth-report.test.ts`
Expected output: fails — `composeGrowthNarrative` is not exported. The Task 1 leaf tests still pass.

- [ ] **Step 3: Implement `composeGrowthNarrative`**

In `lib/growth-report.ts`, after `signedInt`, add:

```ts
export type GrowthNarrativeInput = {
  firstName: string
  windowDays: number
  current: { score: number | null; impressions: number | null; followers: number | null }
  prior: { score: number | null; impressions: number | null; followers: number | null }
  /** The top attributed driver from lib/insights.ts (pillar that gained the most
   *  followers) + the best-performing time slot. null when there's no signal. */
  topDriver: {
    pillar: string
    followersGained: number
    bestSlot: { day: string; hour: number } | null
  } | null
}

export type GrowthTrend = 'up' | 'flat' | 'down' | 'insufficient'

/** The structured email model — sendGrowthReportEmail renders this into HTML. */
export type GrowthReportBody = {
  trend: GrowthTrend
  windowDays: number
  headline: string
  attribution: string | null
  scoreLine: string
  recovery: string | null
  cta: { label: string; href: string }
}

export type GrowthNarrative = { subject: string; body: GrowthReportBody }

// v1 trend thresholds, mirrored from the Growth Score band (0–100) / impressions %.
const UP_IMPRESSIONS_PCT = 0.1   // ≥ +10% impressions reads as a real up-week
const DOWN_IMPRESSIONS_PCT = -0.1

function followerDelta(input: GrowthNarrativeInput): number | null {
  if (input.current.followers == null || input.prior.followers == null) return null
  return input.current.followers - input.prior.followers
}

function attributionSentence(input: GrowthNarrativeInput): string | null {
  const d = input.topDriver
  if (!d) return null
  const slot = d.bestSlot ? ` and posting on ${d.bestSlot.day} mornings` : ''
  return `Most of that came from leaning into your ${d.pillar} pillar${slot} — ${signedInt(d.followersGained)} followers traced back to it.`
}

/**
 * Compose the weekly attributable growth narrative. PURE — no I/O.
 * Branches on the impressions trend (the headline reach signal), with follower
 * delta woven in. Insufficient-data wins when there's no prior baseline at all.
 */
export function composeGrowthNarrative(input: GrowthNarrativeInput): GrowthNarrative {
  const { firstName, windowDays } = input
  const imprPct = pctChange(input.current.impressions, input.prior.impressions)
  const fDelta = followerDelta(input)
  const score = input.current.score
  const scoreLine =
    score == null ? `Your Growth Score is still warming up.` : `Your Growth Score is ${score}/100.`
  const cta = { label: 'See the full breakdown', href: '/dashboard/analytics' }

  // No prior baseline → insufficient-data variant.
  if (imprPct == null && input.prior.score == null) {
    return {
      subject: `${firstName}, your first week of growth tracking is underway`,
      body: {
        trend: 'insufficient',
        windowDays,
        headline: `We're still building your baseline, ${firstName} — keep posting and next week's report will show your first real trend.`,
        attribution: null,
        scoreLine,
        recovery: null,
        cta,
      },
    }
  }

  const attribution = attributionSentence(input)

  // UP
  if (imprPct != null && imprPct >= UP_IMPRESSIONS_PCT) {
    const fLabel = fDelta != null ? `, ${signedInt(fDelta)} followers` : ''
    return {
      subject: `${firstName}, your reach is up ${signedPct(imprPct)} this ${windowDays} days`,
      body: {
        trend: 'up',
        windowDays,
        headline: `Impressions ${signedPct(imprPct)}${fLabel} over the last ${windowDays} days.`,
        attribution,
        scoreLine,
        recovery: null,
        cta,
      },
    }
  }

  // DOWN
  if (imprPct != null && imprPct <= DOWN_IMPRESSIONS_PCT) {
    return {
      subject: `${firstName}, a quick read on this week's dip`,
      body: {
        trend: 'down',
        windowDays,
        headline: `Impressions ${signedPct(imprPct)} over the last ${windowDays} days — worth a small course-correct.`,
        attribution,
        scoreLine,
        recovery: input.topDriver
          ? `Your ${input.topDriver.pillar} pillar still drives the most followers — leaning back into it is the fastest way back up.`
          : `Posting a touch more often is usually the fastest way back up.`,
        cta,
      },
    }
  }

  // FLAT (held steady)
  const fLabel = fDelta != null ? ` (${signedInt(fDelta)} followers)` : ''
  return {
    subject: `${firstName}, you held steady this ${windowDays} days`,
    body: {
      trend: 'flat',
      windowDays,
      headline: `Your reach held consistent over the last ${windowDays} days${fLabel} — a steady base to push from.`,
      attribution,
      scoreLine,
      recovery: null,
      cta,
    },
  }
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/growth-report.test.ts`
Expected output: all tests passed (Task 1 + Task 2 blocks).

- [ ] **Step 5: Commit**

```bash
git add lib/growth-report.ts lib/__tests__/growth-report.test.ts
git commit -m "feat(growth-report): pure composeGrowthNarrative (up/flat/down/insufficient)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `sendGrowthReportEmail` — the Resend envelope (renders the model)

One email envelope that renders the `GrowthReportBody` model into the existing PersonaLink HTML shell (matching `sendDay7StatsEmail`'s structure). No narrative logic here — it's dumb glue.

**Files:**
- Modify: `lib/email.ts`

- [ ] **Step 1: Implement the envelope**

> Not unit-tested (it's a Resend wrapper; the runner has no `RESEND_API_KEY` and the narrative model is fully covered by Tasks 1–2). Verified by typecheck (Step 2) + the cron build smoke test in Task 7.

In `lib/email.ts`, after `sendDay7StatsEmail` (the last export, ~line 1203), add:

```ts
import type { GrowthReportBody } from '@/lib/growth-report'

export async function sendGrowthReportEmail({
  to, subject, body,
}: { to: string; subject: string; body: GrowthReportBody }) {
  const accentByTrend: Record<string, string> = {
    up: '#059669', flat: '#0A66C2', down: '#d97706', insufficient: '#64748b',
  }
  const accent = accentByTrend[body.trend] ?? '#0A66C2'
  const attributionHtml = body.attribution
    ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">${body.attribution}</p>`
    : ''
  const recoveryHtml = body.recovery
    ? `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin:0 0 20px;"><p style="margin:0;font-size:14px;color:#92400e;">${body.recovery}</p></div>`
    : ''

  return resend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#0A66C2;padding:28px 32px;">
      <div style="background:white;border-radius:8px;padding:6px 12px;display:inline-block;">
        <span style="display:inline-block;line-height:1;white-space:nowrap;vertical-align:middle;">
          <img src="${APP_URL}/logo-mark.png" alt="" width="24" height="24" style="vertical-align:middle;display:inline-block;border:0;margin-right:8px;width:24px;height:24px;" />
          <img src="${APP_URL}/logo-text.png" alt="PersonaLink" height="22" style="vertical-align:middle;display:inline-block;border:0;height:22px;width:auto;" />
        </span>
      </div>
      <p style="margin:16px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your ${body.windowDays}-day growth report</p>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#0f172a;line-height:1.4;">${body.headline}</h1>
      ${attributionHtml}
      ${recoveryHtml}
      <div style="border-left:3px solid ${accent};padding:10px 16px;margin:0 0 24px;background:#f8fafc;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:14px;color:#0f172a;">${body.scoreLine}</p>
      </div>
      <a href="${APP_URL}${body.cta.href}" style="display:block;text-align:center;background:#0A66C2;color:white;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:16px;">${body.cta.label} →</a>
      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">Sent weekly by PersonaLink. Numbers are best-effort from LinkedIn and reflect trends, not exact UI figures.</p>
    </div>
  </div>
</body>
</html>`,
    text: [
      body.headline,
      body.attribution ?? '',
      body.recovery ?? '',
      body.scoreLine,
      '',
      `${body.cta.label}: ${APP_URL}${body.cta.href}`,
    ].filter(Boolean).join('\n\n'),
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected output: no errors (exit 0).

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat(email): sendGrowthReportEmail envelope (renders the narrative model)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `buildGrowthReportForUser(userId)` — thin fetch wrapper for the report

Fetches the two `growth_scores` windows + follower deltas + the top attributed driver (via `lib/insights.ts`), feeds the pure `composeGrowthNarrative`, and returns `{ subject, body, hasData }`. Mirrors the fetch shape of `lib/growth-score.ts`'s `persistGrowthScore`.

**Files:**
- Modify: `lib/growth-report.ts`

- [ ] **Step 1: Implement the fetch wrapper**

> Thin DB glue (not unit-tested with a live DB). The pure composer it calls is fully covered by Tasks 1–2; this wrapper is exercised by the cron build smoke test in Task 7.

In `lib/growth-report.ts`, at the bottom, add:

```ts
import { getUserInsights } from '@/lib/insights'

/** Pick the score row closest to (but not after) `target`; null if none. */
function scoreAtOrBefore(
  rows: Array<{ score: number; captured_at: string }>,
  target: Date,
): number | null {
  const eligible = rows.filter(r => new Date(r.captured_at) <= target)
  if (eligible.length === 0) return null
  eligible.sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())
  return eligible[0].score
}

/** Sum impressions across published posts in [start, end). */
function sumImpressions(rows: Array<{ impressions: number | null }>): number | null {
  if (rows.length === 0) return null
  return rows.reduce((acc, r) => acc + (r.impressions ?? 0), 0)
}

export async function buildGrowthReportForUser(
  userId: string,
  firstName: string,
): Promise<GrowthNarrative & { hasData: boolean }> {
  const now = new Date()
  const day = 24 * 60 * 60 * 1000
  const w = REPORT_WINDOW_DAYS
  const curStart = new Date(now.getTime() - w * day)
  const priorStart = new Date(now.getTime() - 2 * w * day)
  const curStartDate = curStart.toISOString().slice(0, 10)
  const priorStartDate = priorStart.toISOString().slice(0, 10)
  const nowDate = now.toISOString().slice(0, 10)

  const [scoresRes, curPostsRes, priorPostsRes, curFollowersRes, priorFollowersRes, insights] =
    await Promise.all([
      supabaseAdmin.from('growth_scores').select('score, captured_at')
        .eq('user_id', userId).gte('captured_at', priorStart.toISOString())
        .order('captured_at', { ascending: true }),
      supabaseAdmin.from('posts').select('impressions')
        .eq('user_id', userId).eq('status', 'published')
        .gte('published_at', curStart.toISOString()),
      supabaseAdmin.from('posts').select('impressions')
        .eq('user_id', userId).eq('status', 'published')
        .gte('published_at', priorStart.toISOString()).lt('published_at', curStart.toISOString()),
      supabaseAdmin.from('follower_snapshots').select('follower_count, snapshot_date')
        .eq('user_id', userId).gte('snapshot_date', curStartDate).lte('snapshot_date', nowDate)
        .order('snapshot_date', { ascending: true }),
      supabaseAdmin.from('follower_snapshots').select('follower_count, snapshot_date')
        .eq('user_id', userId).gte('snapshot_date', priorStartDate).lt('snapshot_date', curStartDate)
        .order('snapshot_date', { ascending: true }),
      getUserInsights(userId),
    ])

  const scores = (scoresRes.data ?? []) as Array<{ score: number; captured_at: string }>
  const curFollowers = (curFollowersRes.data ?? []) as Array<{ follower_count: number | null }>
  const priorFollowers = (priorFollowersRes.data ?? []) as Array<{ follower_count: number | null }>
  const lastFollower = (rows: Array<{ follower_count: number | null }>) =>
    rows.length ? (rows[rows.length - 1].follower_count ?? null) : null

  // Top attributed driver: the pillar that gained the most followers + the best slot.
  const topAttr = insights.attribution?.[0]
  const bestSlot = insights.byTimeSlot?.[0]
  const topDriver =
    topAttr && topAttr.key !== 'Uncategorized' && topAttr.followersGained > 0
      ? {
          pillar: topAttr.key,
          followersGained: topAttr.followersGained,
          bestSlot: bestSlot ? { day: bestSlot.day, hour: bestSlot.hour } : null,
        }
      : null

  const input: GrowthNarrativeInput = {
    firstName,
    windowDays: w,
    current: {
      score: scoreAtOrBefore(scores, now),
      impressions: sumImpressions((curPostsRes.data ?? []) as Array<{ impressions: number | null }>),
      followers: lastFollower(curFollowers),
    },
    prior: {
      score: scoreAtOrBefore(scores, curStart),
      impressions: sumImpressions((priorPostsRes.data ?? []) as Array<{ impressions: number | null }>),
      followers: lastFollower(priorFollowers),
    },
    topDriver,
  }

  const narrative = composeGrowthNarrative(input)
  // "hasData" = the user posted at least once in the current window (worth emailing).
  const hasData = (curPostsRes.data?.length ?? 0) > 0
  return { ...narrative, hasData }
}
```

- [ ] **Step 2: Typecheck + re-run report tests (guard against regressions)**

Run: `npx tsc --noEmit && npx vitest run lib/__tests__/growth-report.test.ts`
Expected output: no TS errors; all report tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/growth-report.ts
git commit -m "feat(growth-report): buildGrowthReportForUser fetch wrapper (28d windows + attribution)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `detectPlateau` — pure plateau/regression detector

A defensible rule: N consecutive score windows "flat" (|Δ| ≤ threshold) AND follower growth below a floor over the same span ⇒ plateaued; a single window dropping ≥ regression threshold ⇒ regression (flagged immediately, distinct reason). No DB.

**Files:**
- Create: `lib/plateau.ts`
- Create: `lib/__tests__/plateau.test.ts`

- [ ] **Step 1: Write the failing tests (rising / flat / declining / noisy / insufficient)**

Create `lib/__tests__/plateau.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  detectPlateau,
  PLATEAU_WINDOWS, PLATEAU_SCORE_DELTA, REGRESSION_SCORE_DELTA, PLATEAU_FOLLOWER_GROWTH_PCT,
} from '../plateau'

// score series = chronological Growth Score points; follower series = chronological counts.
describe('detectPlateau — constants', () => {
  it('exposes the v1 calibration defaults', () => {
    expect(PLATEAU_WINDOWS).toBe(3)
    expect(PLATEAU_SCORE_DELTA).toBe(2)
    expect(REGRESSION_SCORE_DELTA).toBe(-5)
    expect(PLATEAU_FOLLOWER_GROWTH_PCT).toBeCloseTo(0.01, 10)
  })
})

describe('detectPlateau — rising', () => {
  it('is NOT plateaued when scores climb', () => {
    const r = detectPlateau([50, 56, 63, 70], [1000, 1050, 1120, 1210])
    expect(r.plateaued).toBe(false)
  })
})

describe('detectPlateau — flat', () => {
  it('flags a plateau: N flat windows AND follower growth under the floor', () => {
    // 4 points → 3 deltas, all within ±2; followers essentially flat (<1%).
    const r = detectPlateau([60, 61, 60, 62], [2000, 2001, 2002, 2003])
    expect(r.plateaued).toBe(true)
    expect(r.reason).toMatch(/plateau/i)
  })

  it('does NOT flag when the score is flat but followers still grow >= 1%', () => {
    const r = detectPlateau([60, 61, 60, 62], [1000, 1050, 1100, 1160]) // +16% followers
    expect(r.plateaued).toBe(false)
  })
})

describe('detectPlateau — declining (regression)', () => {
  it('flags a regression immediately on a single sharp drop', () => {
    const r = detectPlateau([70, 64], [1200, 1180]) // Δ = -6 <= -5
    expect(r.plateaued).toBe(true)
    expect(r.reason).toMatch(/regress|declin|drop/i)
  })
})

describe('detectPlateau — noisy', () => {
  it('does NOT flag a plateau when one window swings beyond the flat band', () => {
    // deltas: +1, +9, -1 → the +9 breaks the "all flat" run.
    const r = detectPlateau([60, 61, 70, 69], [1000, 1005, 1010, 1015])
    expect(r.plateaued).toBe(false)
  })
})

describe('detectPlateau — insufficient data', () => {
  it('does NOT flag (and says so) when there are fewer than PLATEAU_WINDOWS+1 points', () => {
    const r = detectPlateau([60, 61], [1000, 1002])
    expect(r.plateaued).toBe(false)
    expect(r.reason).toMatch(/insufficient|not enough/i)
  })
  it('handles an empty series safely', () => {
    expect(detectPlateau([], []).plateaued).toBe(false)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/plateau.test.ts`
Expected output: fails to resolve `../plateau`. 0 passed.

- [ ] **Step 3: Implement `detectPlateau`**

Create `lib/plateau.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Consecutive flat windows that constitute a plateau. v1; calibrated in Task 8. */
export const PLATEAU_WINDOWS = 3
/** A score window is "flat" when |Δ| <= this many points (Growth Score is 0–100). */
export const PLATEAU_SCORE_DELTA = 2
/** A single window dropping <= this (i.e. ≥ 5 points down) is a regression. */
export const REGRESSION_SCORE_DELTA = -5
/** …and follower growth over the flat span must be under this fraction to flag. */
export const PLATEAU_FOLLOWER_GROWTH_PCT = 0.01

export type PlateauResult = { plateaued: boolean; reason: string }

/**
 * Detect a growth plateau or regression from a user's chronological Growth Score
 * series + follower-count series. PURE — no I/O, no Date.now().
 *
 * Rules (in priority order):
 *  1. Regression: the most recent score delta <= REGRESSION_SCORE_DELTA → flag now.
 *  2. Plateau: the last PLATEAU_WINDOWS deltas are ALL within ±PLATEAU_SCORE_DELTA
 *     AND follower growth across that same span is < PLATEAU_FOLLOWER_GROWTH_PCT.
 *  3. Otherwise: not plateaued.
 *
 * Needs at least PLATEAU_WINDOWS+1 score points (PLATEAU_WINDOWS deltas).
 */
export function detectPlateau(
  scoreSeries: number[],
  followerSeries: number[],
): PlateauResult {
  if (scoreSeries.length < 2) {
    return { plateaued: false, reason: 'insufficient data (need 2+ score points)' }
  }

  const deltas = scoreSeries.slice(1).map((s, i) => s - scoreSeries[i])
  const lastDelta = deltas[deltas.length - 1]

  // 1. Regression — a sharp single-window drop, flagged immediately.
  if (lastDelta <= REGRESSION_SCORE_DELTA) {
    return { plateaued: true, reason: `regression: Growth Score dropped ${lastDelta} in the latest window` }
  }

  // 2. Plateau — need a full run of flat windows.
  if (deltas.length < PLATEAU_WINDOWS) {
    return { plateaued: false, reason: 'insufficient data (not enough windows for a plateau)' }
  }
  const recent = deltas.slice(-PLATEAU_WINDOWS)
  const allFlat = recent.every(d => Math.abs(d) <= PLATEAU_SCORE_DELTA)
  if (!allFlat) {
    return { plateaued: false, reason: 'score still moving' }
  }

  // Follower growth across the same span (last PLATEAU_WINDOWS+1 points).
  const span = PLATEAU_WINDOWS + 1
  const fStart = followerSeries.length >= span ? followerSeries[followerSeries.length - span] : followerSeries[0]
  const fEnd = followerSeries.length ? followerSeries[followerSeries.length - 1] : 0
  const fGrowth = fStart && fStart > 0 ? (fEnd - fStart) / fStart : 0
  if (fGrowth >= PLATEAU_FOLLOWER_GROWTH_PCT) {
    return { plateaued: false, reason: 'score flat but followers still growing' }
  }

  return {
    plateaued: true,
    reason: `plateau: ${PLATEAU_WINDOWS} flat windows (|Δscore| ≤ ${PLATEAU_SCORE_DELTA}) with follower growth under ${Math.round(PLATEAU_FOLLOWER_GROWTH_PCT * 100)}%`,
  }
}

void supabaseAdmin // wrappers below use it (Task 6); keep the import stable
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/plateau.test.ts`
Expected output: all tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/plateau.ts lib/__tests__/plateau.test.ts
git commit -m "feat(plateau): pure detectPlateau (regression + N-flat-window rule)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `maybeOpenPlateauExperiment(userId)` — thin wiring into Phase 2 `createExperiment`

When a user is plateaued AND no experiment is currently `running` for them, open one via Phase 2's `createExperiment`. The experiment's treatment is seeded from the user's top attributed driver (lean into the best pillar / best slot). Thin glue; the decision logic is the pure `detectPlateau`.

**Files:**
- Modify: `lib/plateau.ts`

> **GATE:** This task's `createExperiment` import requires Phase 2 (`lib/experiments.ts`). If Task 0 Step 3 showed it MISSING, implement Step 1 with the **fallback stub** in Step 4 instead (a local `createExperiment` no-op typed to the same signature, marked `// TODO: replace with Phase 2 import on merge`), so the wrapper compiles and the cron wiring is in place — then swap the import when Phase 2 lands. The pure detector (Task 5) is already complete and unaffected.

- [ ] **Step 1: Implement the wrapper (Phase 2 present path)**

In `lib/plateau.ts`, replace the trailing `void supabaseAdmin` line with:

```ts
import { createExperiment, type ExperimentDimension } from '@/lib/experiments'

/** Map a plateau to the dimension we'll experiment on, seeded from attribution. */
function plateauTreatment(topPillar: string | null, bestSlot: { day: string; hour: number } | null): {
  dimension: ExperimentDimension
  control: Record<string, unknown>
  treatment: Record<string, unknown>
  hypothesis: string
} {
  // Prefer a timing experiment when we know a best slot; else a pillar experiment.
  if (bestSlot) {
    return {
      dimension: 'timing',
      control: { strategy: 'current_schedule' },
      treatment: { day: bestSlot.day, hour: bestSlot.hour },
      hypothesis: `Posting on ${bestSlot.day} ${bestSlot.hour}:00 (the user's best-performing slot) lifts reach off the plateau.`,
    }
  }
  return {
    dimension: 'pillar',
    control: { strategy: 'current_mix' },
    treatment: { pillar: topPillar ?? 'top_performing' },
    hypothesis: `Weighting toward the ${topPillar ?? 'best-performing'} pillar lifts reach off the plateau.`,
  }
}

/**
 * If the user is plateaued/regressing and has NO experiment currently running,
 * open one (seeded from their attribution) via Phase 2's createExperiment.
 * Idempotent: never opens a second concurrent experiment. Best-effort; returns
 * what it did. Thin glue — the decision is the pure detectPlateau.
 */
export async function maybeOpenPlateauExperiment(
  userId: string,
): Promise<{ opened: boolean; reason: string; experimentId?: string }> {
  // 1. Build the chronological score + follower series (last ~6 windows of history).
  const lookback = new Date(Date.now() - (PLATEAU_WINDOWS + 3) * 28 * 24 * 60 * 60 * 1000).toISOString()
  const [scoresRes, followersRes, runningRes] = await Promise.all([
    supabaseAdmin.from('growth_scores').select('score, captured_at')
      .eq('user_id', userId).gte('captured_at', lookback)
      .order('captured_at', { ascending: true }),
    supabaseAdmin.from('follower_snapshots').select('follower_count, snapshot_date')
      .eq('user_id', userId).order('snapshot_date', { ascending: true }),
    supabaseAdmin.from('experiments').select('id')
      .eq('user_id', userId).eq('status', 'running').limit(1).maybeSingle(),
  ])

  const scores = (scoresRes.data ?? []).map(r => r.score as number)
  const followers = (followersRes.data ?? []).map(r => (r.follower_count as number | null) ?? 0)
  const verdict = detectPlateau(scores, followers)
  if (!verdict.plateaued) return { opened: false, reason: verdict.reason }

  // 2. Never run two experiments at once on the same user.
  if (runningRes.data) return { opened: false, reason: 'experiment already running' }

  // 3. Seed the treatment from attribution (lib/insights.ts via getUserInsights).
  const { getUserInsights } = await import('@/lib/insights')
  const insights = await getUserInsights(userId)
  const topPillar = insights.attribution?.find(a => a.key !== 'Uncategorized' && a.followersGained > 0)?.key ?? null
  const bestSlot = insights.byTimeSlot?.[0] ? { day: insights.byTimeSlot[0].day, hour: insights.byTimeSlot[0].hour } : null
  const plan = plateauTreatment(topPillar, bestSlot)

  const { id } = await createExperiment({
    userId,
    hypothesis: plan.hypothesis,
    dimension: plan.dimension,
    control: plan.control,
    treatment: plan.treatment,
    baselineMetric: 'engagement_rate',
  })
  return { opened: true, reason: verdict.reason, experimentId: id }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected output: no errors (exit 0) — provided Phase 2's `lib/experiments.ts` exports `createExperiment` + `ExperimentDimension`. If it errors with "Cannot find module '@/lib/experiments'", apply the Step 4 fallback.

- [ ] **Step 3: Re-run the detector tests (guard)**

Run: `npx vitest run lib/__tests__/plateau.test.ts`
Expected output: all tests passed (importing the wrapper must not break the pure tests; the runner stubs `./supabase-admin`).

- [ ] **Step 4 (FALLBACK, only if Phase 2 absent): stub `createExperiment` locally**

If Step 2 fails on the missing module, replace the `import { createExperiment ... } from '@/lib/experiments'` line with this typed local stub and leave the rest of Step 1 unchanged:

```ts
// TODO(phase2): replace with `import { createExperiment, type ExperimentDimension } from '@/lib/experiments'`
export type ExperimentDimension = 'timing' | 'format' | 'pillar' | 'hook' | 'length'
async function createExperiment(_input: {
  userId: string; hypothesis: string; dimension: ExperimentDimension
  control: Record<string, unknown>; treatment: Record<string, unknown>; baselineMetric: string
}): Promise<{ id: string }> {
  // Phase 2 not merged yet — no-op so the cron wiring compiles and runs harmlessly.
  return { id: 'pending-phase2' }
}
```

Re-run Step 2 + Step 3 (both must pass), then proceed.

- [ ] **Step 5: Commit**

```bash
git add lib/plateau.ts
git commit -m "feat(plateau): maybeOpenPlateauExperiment wires detector into Phase 2 createExperiment

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: The weekly cron — `growth-report` route + migration + vercel.json

Selects active users (posted in the last `REPORT_WINDOW_DAYS`), builds + sends each report, runs plateau detection (opening an experiment when warranted), and marks `growth_report_sent_at` (≤ 1/week per user). Copies the day7-stats auth + `cron_locks` guard verbatim.

**Files:**
- Create: `supabase/migrations/20260531c_growth_report_sent_at.sql`
- Modify: `supabase/schema.sql`
- Create: `app/api/cron/growth-report/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260531c_growth_report_sent_at.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 3 (Sustain)
-- Weekly growth-report idempotency marker (mirrors user_profiles.day7_stats_sent_at).
-- Lets the growth-report cron skip a user already emailed within the last 7 days.
-- ─────────────────────────────────────────────────────────────────────────────

alter table user_profiles add column if not exists growth_report_sent_at timestamptz;
```

- [ ] **Step 2: Lint the migration**

Run: `grep -c "growth_report_sent_at" supabase/migrations/20260531c_growth_report_sent_at.sql`
Expected output: `1`

- [ ] **Step 3: Mirror into schema.sql**

In `supabase/schema.sql`, find the line `alter table user_profiles add column if not exists last_pipeline_reminder_sent_at timestamptz;` and add directly after it:

```sql

-- Organic Growth Engine — Phase 3: weekly growth-report idempotency marker.
alter table user_profiles add column if not exists growth_report_sent_at timestamptz;
```

- [ ] **Step 4: Write the cron route (copy the day7-stats guard verbatim)**

Create `app/api/cron/growth-report/route.ts`:

```ts
// Vercel cron — weekly (Mon 13:00 UTC). Per active user: send the attributable
// growth report and run plateau detection (re-opening optimization experiments
// when warranted). Idempotent per day via cron_locks (mirrors day7-stats);
// per-user throttle via user_profiles.growth_report_sent_at (≤ 1/week).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendGrowthReportEmail } from '@/lib/email'
import { buildGrowthReportForUser } from '@/lib/growth-report'
import { maybeOpenPlateauExperiment } from '@/lib/plateau'
import crypto from 'crypto'

export const maxDuration = 60

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'growth-report', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  // Active users = posted at least once in the last 28 days. One query for the
  // distinct user_ids, then per-user build/send.
  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentPosts } = await supabaseAdmin
    .from('posts')
    .select('user_id')
    .eq('status', 'published')
    .gte('published_at', since)
  const activeUserIds = [...new Set((recentPosts ?? []).map(p => p.user_id as string))]

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const results = await Promise.allSettled(activeUserIds.map(async (userId) => {
    const { data: user } = await supabaseAdmin
      .from('users').select('email, linkedin_name').eq('id', userId).maybeSingle()
    if (!user?.email) return { userId, skipped: 'no_email' }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles').select('growth_report_sent_at, name').eq('user_id', userId).maybeSingle()
    if (profile?.growth_report_sent_at && profile.growth_report_sent_at > oneWeekAgo) {
      return { userId, skipped: 'sent_this_week' }
    }

    const firstName = (profile?.name || user.linkedin_name || 'there').split(' ')[0]
    const report = await buildGrowthReportForUser(userId, firstName)

    // Plateau detection runs regardless of whether we email (best-effort, non-fatal).
    const plateau = await maybeOpenPlateauExperiment(userId).catch(() => ({ opened: false, reason: 'error' }))

    if (!report.hasData) return { userId, skipped: 'no_posts_in_window', plateau }

    await sendGrowthReportEmail({ to: user.email, subject: report.subject, body: report.body })
    await supabaseAdmin.from('user_profiles')
      .update({ growth_report_sent_at: new Date().toISOString() }).eq('user_id', userId)
    return { userId, sent: true, trend: report.body.trend, experimentOpened: plateau.opened }
  }))

  await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as { sent?: boolean }).sent).length
  const experiments = results.filter(r => r.status === 'fulfilled' && (r.value as { experimentOpened?: boolean }).experimentOpened).length
  return NextResponse.json({ sent, experimentsOpened: experiments, active: activeUserIds.length })
}

export { handler as GET, handler as POST }
```

- [ ] **Step 5: Register the cron in `vercel.json`**

In `vercel.json`, add a new object to the existing `crons` array (after the `day7-stats` entry). Schedule it weekly, Monday 13:00 UTC (staggered after the 6-hourly Phase 0 capture and the Phase 1 04:00 cohort-baselines roll-up):

```json
    {
      "path": "/api/cron/growth-report",
      "schedule": "0 13 * * 1"
    }
```

(Keep the array valid JSON — add a comma after the preceding entry's closing `}`.)

- [ ] **Step 6: Typecheck + build smoke test**

Run: `npx tsc --noEmit && npm run build 2>&1 | grep -E "/api/cron/growth-report|Failed to compile|error" || echo "BUILD CLEAN — /api/cron/growth-report bundled"`
Expected output: no TS errors; a line showing `/api/cron/growth-report` in the route manifest, or `BUILD CLEAN — /api/cron/growth-report bundled`.

- [ ] **Step 7: Confirm the cron is registered + auth guard matches day7-stats**

Run: `grep -c "growth-report" vercel.json && grep -c "Bearer .\\{0,4\\}process.env.CRON_SECRET" app/api/cron/growth-report/route.ts`
Expected output: `1` then `1`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260531c_growth_report_sent_at.sql supabase/schema.sql app/api/cron/growth-report/route.ts vercel.json
git commit -m "feat(growth-report): weekly cron — send report + plateau-driven experiments

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Performance-aware voice fingerprint — pure weights

Today `refreshFingerprint` orders `voice_samples` by `weight` (source-based) then recency. This task adds PURE `performanceWeight` + `combinedWeight` so the corpus selection can favor samples drawn from high-performing posts — the voice evolves toward what drives reach. Built bottom-up, no DB.

**Files:**
- Modify: `lib/voice.ts`
- Create: `lib/__tests__/voice-weight.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/voice-weight.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  performanceWeight, combinedWeight, PERF_BLEND, PERF_SAMPLE_MIN_IMPRESSIONS,
} from '../voice'

describe('voice weighting — constants', () => {
  it('exposes the v1 blend factor + impressions floor', () => {
    expect(PERF_BLEND).toBeCloseTo(0.5, 10)
    expect(PERF_SAMPLE_MIN_IMPRESSIONS).toBe(50)
  })
})

describe('performanceWeight', () => {
  it('scores a post by engagement rate, normalized to 0–1', () => {
    // engagement rate = (reactions+comments+reshares+saves)/impressions, capped at a ceiling.
    const hi = performanceWeight({ impressions: 1000, reactions: 80, comments: 10, reshares: 5, saves: 5 })
    const lo = performanceWeight({ impressions: 1000, reactions: 5, comments: 0, reshares: 0, saves: 0 })
    expect(hi).toBeGreaterThan(lo)
    expect(hi).toBeLessThanOrEqual(1)
    expect(lo).toBeGreaterThanOrEqual(0)
  })

  it('returns null when metrics are missing or below the impressions floor (untrusted)', () => {
    expect(performanceWeight(null)).toBeNull()
    expect(performanceWeight({ impressions: null, reactions: 5, comments: 0, reshares: 0, saves: 0 })).toBeNull()
    expect(performanceWeight({ impressions: 10, reactions: 5, comments: 0, reshares: 0, saves: 0 })).toBeNull() // < 50 impressions
  })
})

describe('combinedWeight', () => {
  it('blends normalized recency and performance by PERF_BLEND', () => {
    // recency=1 (newest), performance=0 → 1*0.5 + 0*0.5 = 0.5
    expect(combinedWeight({ recencyNorm: 1, perf: 0 })).toBeCloseTo(0.5, 10)
    // recency=0, performance=1 → 0.5
    expect(combinedWeight({ recencyNorm: 0, perf: 1 })).toBeCloseTo(0.5, 10)
    // both high → high
    expect(combinedWeight({ recencyNorm: 1, perf: 1 })).toBeCloseTo(1, 10)
  })

  it('falls back to recency-only when performance is null (missing metrics)', () => {
    // perf null → weight is just recencyNorm (no performance penalty for unknown posts)
    expect(combinedWeight({ recencyNorm: 0.8, perf: null })).toBeCloseTo(0.8, 10)
    expect(combinedWeight({ recencyNorm: 0.2, perf: null })).toBeCloseTo(0.2, 10)
  })

  it('a high-performing sample outranks an equally-recent low-performing one', () => {
    const recent = 0.9
    const hi = combinedWeight({ recencyNorm: recent, perf: 0.9 })
    const lo = combinedWeight({ recencyNorm: recent, perf: 0.1 })
    expect(hi).toBeGreaterThan(lo)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/voice-weight.test.ts`
Expected output: fails — `performanceWeight` / `combinedWeight` / the constants are not exported from `../voice`. 0 passed.

- [ ] **Step 3: Implement the pure weights in `lib/voice.ts`**

In `lib/voice.ts`, after the `DISTILL_EVERY` constant (line ~28), add:

```ts
/** v1 blend: combined = recency*(1-PERF_BLEND) + performance*PERF_BLEND. Calibrated in Task 8 doc. */
export const PERF_BLEND = 0.5
/** A post needs at least this many impressions before its performance is trusted. */
export const PERF_SAMPLE_MIN_IMPRESSIONS = 50
/** Engagement-rate ceiling for normalization (rates above this all map to 1.0). */
const PERF_ENGAGEMENT_CEILING = 0.1 // 10% engagement rate is exceptional on LinkedIn

export type SamplePostMetrics = {
  impressions: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
} | null

/**
 * Performance weight (0–1) of the post a voice sample came from, by engagement
 * rate, normalized against a ceiling. PURE.
 * - null metrics, or impressions below PERF_SAMPLE_MIN_IMPRESSIONS → null
 *   (untrusted → caller falls back to recency-only).
 */
export function performanceWeight(m: SamplePostMetrics): number | null {
  if (!m || m.impressions == null || m.impressions < PERF_SAMPLE_MIN_IMPRESSIONS) return null
  const eng = (m.reactions ?? 0) + (m.comments ?? 0) + (m.reshares ?? 0) + (m.saves ?? 0)
  const rate = eng / m.impressions
  return Math.max(0, Math.min(1, rate / PERF_ENGAGEMENT_CEILING))
}

/**
 * Combine a sample's normalized recency (0–1, newest=1) with its post's
 * performance (0–1, or null) into a single ranking weight. PURE.
 * - perf null → recency-only (don't penalize a sample for unknown performance).
 */
export function combinedWeight(args: { recencyNorm: number; perf: number | null }): number {
  const { recencyNorm, perf } = args
  if (perf == null) return recencyNorm
  return recencyNorm * (1 - PERF_BLEND) + perf * PERF_BLEND
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/voice-weight.test.ts`
Expected output: all tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/voice.ts lib/__tests__/voice-weight.test.ts
git commit -m "feat(voice): pure performanceWeight + combinedWeight (recency×performance)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Wire performance weighting into `refreshFingerprint` (behind the existing trigger)

`refreshFingerprint` already runs only on the throttled `DISTILL_EVERY` trigger (unchanged). This step changes only WHICH samples it selects + their ORDER: rank by `combinedWeight` (recency×performance), then pass the top-ordered texts to `distillVoiceFingerprint`. Samples whose source post has no/low metrics fall back to recency-only — never dropped.

**Files:**
- Modify: `lib/voice.ts`

> The pure weighting (Task 8) is fully tested. This is the thin DB-glue that consumes it; verified by typecheck + the full suite in Task 11. `distillVoiceFingerprint(samples: string[])` takes a FLAT ordered array (and itself slices to 10), so all weighting MUST happen here in selection/ordering — that is the correct seam.

- [ ] **Step 1: Replace the body of `refreshFingerprint`**

In `lib/voice.ts`, replace the entire `refreshFingerprint` function (currently lines ~107–132) with:

```ts
/**
 * Re-distil the voice fingerprint from the current corpus and save it.
 *
 * Performance-aware: samples are ranked by combinedWeight (recency × the
 * engagement performance of the post each sample came from), so the voice
 * evolves toward what actually drives reach. Samples whose source post lacks
 * trustworthy metrics fall back to recency-only and are never dropped.
 *
 * Stays behind the existing DISTILL_EVERY trigger in addVoiceSample — this
 * function does not change WHEN we re-distil, only WHICH samples we feed.
 */
export async function refreshFingerprint(userId: string): Promise<string | null> {
  try {
    // Pull a generous candidate set with the columns we need to weight by.
    // post_id links a sample back to the post it came from (null for onboarding/
    // analyzer/voice_note samples that have no originating post).
    const { data } = await supabaseAdmin
      .from('voice_samples')
      .select('text, weight, created_at, post_id')
      .eq('user_id', userId)
      .order('weight', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40)

    const rows = (data || []).filter(r => r.text) as Array<{
      text: string; weight: number | null; created_at: string; post_id: string | null
    }>
    if (!rows.length) return null

    // Fetch performance metrics for the posts these samples came from (one query).
    const postIds = [...new Set(rows.map(r => r.post_id).filter((id): id is string => !!id))]
    const metricsByPost = new Map<string, SamplePostMetrics>()
    if (postIds.length) {
      const { data: posts } = await supabaseAdmin
        .from('posts')
        .select('id, impressions, reactions, comments, reshares, saves')
        .in('id', postIds)
      for (const p of posts || []) {
        metricsByPost.set(p.id as string, {
          impressions: p.impressions, reactions: p.reactions, comments: p.comments,
          reshares: p.reshares, saves: p.saves,
        })
      }
    }

    // Normalize recency to 0–1 (newest = 1) over the candidate set.
    const times = rows.map(r => new Date(r.created_at).getTime())
    const minT = Math.min(...times)
    const maxT = Math.max(...times)
    const span = maxT - minT || 1

    const ranked = rows
      .map(r => {
        const recencyNorm = (new Date(r.created_at).getTime() - minT) / span
        const perf = r.post_id ? performanceWeight(metricsByPost.get(r.post_id) ?? null) : null
        // Keep the source-based `weight` as a gentle multiplier (edits still matter most).
        const sourceMult = (r.weight ?? 1) / 3 // SOURCE_WEIGHT max is 3 (edit)
        return { text: r.text, score: combinedWeight({ recencyNorm, perf }) * (0.5 + 0.5 * sourceMult) }
      })
      .sort((a, b) => b.score - a.score)

    const samples = ranked.map(r => r.text.trim()).filter(Boolean)
    if (!samples.length) return null

    const fingerprint = await distillVoiceFingerprint(samples)
    if (fingerprint) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ voice_fingerprint: fingerprint, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }
    return fingerprint || null
  } catch (err) {
    console.error('[voice.refreshFingerprint]', err)
    return null
  }
}
```

- [ ] **Step 2: Confirm `voice_samples.post_id` exists; if not, add it (idempotent migration)**

Run: `grep -c "post_id" supabase/migrations/20260522_voice_samples.sql 2>/dev/null; grep -n "voice_samples" supabase/schema.sql | head -1`
Expected output: a count (0 or more) and the schema line number.

If the count is `0` (no `post_id` on `voice_samples`), create `supabase/migrations/20260531d_voice_sample_post_id.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 3 (Sustain)
-- Link voice samples to the post they were drawn from, so re-distillation can
-- weight by that post's measured performance. Nullable: onboarding/analyzer/
-- voice-note samples have no originating post and fall back to recency-only.
-- ─────────────────────────────────────────────────────────────────────────────

alter table voice_samples add column if not exists post_id uuid references posts(id) on delete set null;
create index if not exists voice_samples_post_id_idx on voice_samples(post_id);
```

…and mirror it into `supabase/schema.sql` directly after the `voice_samples` index lines (~line 217):

```sql
-- Organic Growth Engine — Phase 3: link a sample to its source post for perf-weighting.
alter table voice_samples add column if not exists post_id uuid references posts(id) on delete set null;
create index if not exists voice_samples_post_id_idx on voice_samples(post_id);
```

> The `'edit'`-source path in `addVoiceSample` (a human correcting an AI draft) is the natural place to populate `post_id` later; that wiring is out of scope here (the weighting degrades gracefully to recency-only until samples carry a `post_id`). Note this in the calibration doc (Task 10).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected output: no errors (exit 0).

- [ ] **Step 4: Re-run the voice-weight tests (the wrapper edit must not break the pure exports)**

Run: `npx vitest run lib/__tests__/voice-weight.test.ts`
Expected output: all tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/voice.ts supabase/migrations/20260531d_voice_sample_post_id.sql supabase/schema.sql
git commit -m "feat(voice): performance-aware re-distillation (rank samples by recency×performance)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

(If Step 2 found `post_id` already present, drop the migration paths from the `git add`.)

---

### Task 10: CALIBRATION — concrete queries + decision rules + v1 defaults

A concrete, runnable analysis task (NOT a vague TODO). Defines the exact queries, decision rules, and v1 defaults already shipped in code, for: the plateau threshold + consecutive-window count, the report cadence, and the performance-weight blend factor.

**Files:**
- Create: `docs/superpowers/specs/2026-05-31-sustain-calibration.md`

- [ ] **Step 1: Write the calibration procedure doc**

Create `docs/superpowers/specs/2026-05-31-sustain-calibration.md`:

```md
# Sustain Calibration — Plateau Thresholds, Report Cadence, Voice Blend

**Status:** Procedure defined; run when ≥ 8 weeks of growth_scores exist for ≥ 50 active users.
**v1 defaults shipped now (locked until the gate below clears):**
- Plateau: PLATEAU_WINDOWS = 3, PLATEAU_SCORE_DELTA = 2, REGRESSION_SCORE_DELTA = -5,
  PLATEAU_FOLLOWER_GROWTH_PCT = 0.01 (in `lib/plateau.ts`).
- Report cadence: weekly, Monday 13:00 UTC (`vercel.json`); window = 28 days (`REPORT_WINDOW_DAYS`).
- Voice blend: PERF_BLEND = 0.5, PERF_SAMPLE_MIN_IMPRESSIONS = 50 (in `lib/voice.ts`).

## A. Plateau threshold + consecutive-window count
Goal: flag a true stall without crying wolf on noise. Tune against the distribution of
real consecutive score deltas.

```sql
-- Distribution of consecutive Growth Score deltas per user (one row per window step).
with ordered as (
  select user_id, score, captured_at,
         lag(score) over (partition by user_id order by captured_at) as prev
  from growth_scores
)
select
  percentile_cont(0.5)  within group (order by abs(score - prev)) as p50_abs_delta,
  percentile_cont(0.75) within group (order by abs(score - prev)) as p75_abs_delta,
  percentile_cont(0.90) within group (order by abs(score - prev)) as p90_abs_delta,
  count(*) as n
from ordered where prev is not null;
```

**Decision rule (PLATEAU_SCORE_DELTA):** set it to the rounded `p50_abs_delta` (the
typical week-to-week wobble is "flat"). If `p50_abs_delta` rounds to ≤ 2, keep 2.
**Decision rule (PLATEAU_WINDOWS):** validate against churn — a plateau should
*precede* disengagement. Compute, for users who later went 28+ days without posting,
how many consecutive flat windows preceded that gap:

```sql
-- For each user's first 28-day posting gap, count flat windows immediately before it.
-- (Run as an analysis script; the threshold N is the median of that count, clamped to [2,4].)
```

Set `PLATEAU_WINDOWS` to the median, clamped to [2, 4]. If `n < 200` flat-window
samples, **keep N = 3** (insufficient signal). Re-evaluate quarterly.

**Decision rule (REGRESSION_SCORE_DELTA):** set to `-1 * round(p90_abs_delta)` — a drop
in the top decile of week-to-week moves is a genuine regression worth flagging now.
If `p90_abs_delta` rounds to ≤ 5, keep -5.

**False-positive guardrail:** after any change, dry-run `detectPlateau` over all stored
series and assert the flagged fraction is < 25% of active users in any single week
(a higher rate means the threshold is too tight and experiments would thrash).

## B. Report cadence
v1 = weekly. The question is whether weekly is too frequent (open-rate decay) or too
sparse (growth feels invisible).

```sql
-- Email engagement is in Resend, not Postgres. Pull open/click rates per send from
-- Resend's dashboard/API for the growth-report template, segmented by trend
-- (up/flat/down/insufficient — encoded in the subject).
```

**Decision rule:** if the 4-week rolling open rate for FLAT/INSUFFICIENT reports drops
below 25%, switch those two trends to **bi-weekly** while keeping UP/DOWN weekly
(people want to hear about movement, not stasis). Implement by gating the per-user send
in the cron on `trend` + `growth_report_sent_at` age. Keep weekly for all trends until
that gate is hit. Do not change the cron schedule itself (still runs weekly; it just
skips flat/insufficient users on alternate weeks).

## C. Performance-weight blend factor (PERF_BLEND)
Goal: bias the voice toward high-reach writing without overfitting to a couple of viral
posts (which would flatten the person's actual voice). v1 = 0.5 (equal trust).

**Backtest:** for PERF_BLEND ∈ {0.0, 0.25, 0.5, 0.75}, re-rank each user's corpus,
re-distil, and regenerate their last N posts; score voice fidelity with the existing
`computeVoiceMatch` (lib/voice-match.ts, the 6 stylometric dimensions) against the
user's reference writing, AND track the engagement rate of posts generated after the
change.

**Decision rule:** pick the largest PERF_BLEND whose mean `computeVoiceMatch` score
stays within 5 points of the PERF_BLEND=0 baseline (voice still recognizably theirs)
AND whose post engagement rate is ≥ the baseline. If no blend beats baseline engagement,
**keep 0.5** (it is voice-safe and never *hurt* in testing). Re-evaluate when
`PERF_SAMPLE_MIN_IMPRESSIONS` data volume doubles.

**PERF_SAMPLE_MIN_IMPRESSIONS:** raise from 50 only if > 30% of perf-weighted samples
come from posts in the 50–100 impression band (thin signal). Lower only if < 20% of
samples ever clear 50 impressions (most posts excluded → weighting never engages).

## D. Dependency: voice_samples.post_id population
The performance weighting only engages for samples that carry a `post_id`. Today only
the future `'edit'`-source path (human-corrected AI drafts) naturally has an originating
post. Until `addVoiceSample` is wired to set `post_id` on those, re-distillation degrades
gracefully to recency-only. Wiring that population is a follow-up (out of Phase 3 scope);
track sample-with-post_id coverage and revisit PERF_BLEND once coverage > 30%.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-31-sustain-calibration.md
git commit -m "docs(sustain): calibration procedure for plateau/cadence/voice-blend (v1 defaults locked)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Full-suite verification + branch wrap-up

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected output: all test files pass — `growth-report.test.ts`, `plateau.test.ts`, `voice-weight.test.ts`, plus the pre-existing Phase 0/1 tests and `magic-link.test.ts`. 0 failed.

- [ ] **Step 2: Full typecheck + production build**

Run: `npx tsc --noEmit && npm run build`
Expected output: TS exits 0; build succeeds with `/api/cron/growth-report` in the route manifest.

- [ ] **Step 3: Confirm the migration + schema mirror are consistent**

Run: `grep -l "growth_report_sent_at" supabase/schema.sql supabase/migrations/20260531c_growth_report_sent_at.sql`
Expected output: both file paths listed (the column defined in both its migration and schema.sql).

- [ ] **Step 4: Confirm the cron auth guard matches the day7-stats pattern**

Run: `grep -A1 "async function handler" app/api/cron/growth-report/route.ts | grep -c "CRON_SECRET"`
Expected output: `1` (the guard is present as the first line of the handler).

- [ ] **Step 5: Use superpowers:finishing-a-development-branch** to decide merge/PR/cleanup for `feat/organic-growth-engine`.

---

## Out of scope (explicitly — keep this plan focused)

- **Creating `growth_scores` / `lib/growth-score.ts` / `lib/insights.ts`** — that is Phase 1 (assumed done; read, never created).
- **Creating the `experiments` table / `lib/experiments.ts` / `createExperiment` / `computeLift`** — that is Phase 2 (assumed done; called, never created). This plan only OPENS experiments from plateau detection.
- **Writing `post_analytics` / `follower_snapshots` / `posts` attributed columns** — that is Phase 0 (assumed done).
- **Populating `voice_samples.post_id` from the `'edit'` flow** — a follow-up; the weighting degrades to recency-only until coverage exists (noted in the calibration doc).
- **Changing WHEN the voice re-distils** — the existing `DISTILL_EVERY` trigger is unchanged; this plan only changes WHICH samples are fed and in what order.
- **Dashboard UI for the growth report or plateau status** — the report is an email; the analytics surface is Phase 1's. No new pages here.
- **A/B-testing the email cadence in code** — the calibration doc defines the gate; the per-trend send-throttle ships only when that gate is hit.
