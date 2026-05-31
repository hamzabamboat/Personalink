# Phase 2 — Intervene (Experiments) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tweak how each user posts (timing/format/pillar/hook/length) and *prove the tweak caused the lift* — every change runs behind an `experiments` row with a control arm, is measured against the user's own pre-experiment baseline, and auto-rolls-back losers, with zero silent global behavior change.

**Architecture:** All assignment / lift / guardrail / weight math lives in two new pure server libs (`lib/experiments.ts`, plus pure additions to `lib/linkedin-schedule.ts`) as side-effect-free functions tested with fixtures; thin DB wrappers (`createExperiment`, `evaluateExperiment`, `getUserSlotWeights`, `getActiveExperiment`) fetch windows and persist. A new `experiments` table + `posts.experiment_id`/`posts.variant` record each test; `app/api/posts/generate-batch/route.ts` threads an active experiment's treatment into generation for the treatment arm only and stamps provenance; a daily cron (`/api/cron/evaluate-experiments`) gathers baseline-vs-treatment series from `post_analytics`/`growth_scores`, calls `evaluateExperiment`, updates `status`, and rolls back losers so future generation stops applying the treatment.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres), TypeScript, Vitest

---

## Cross-Phase Dependency Assumption (state at top)

**Plan 0 (Capture) and Plan 1 (Understand) are DELIVERED.** This plan READS the following — it never creates them:

- **`post_analytics`** velocity time series: `id, post_id, user_id, captured_at, age_minutes, impressions, reactions, comments, reshares, saves, link_clicks, members_reached, source`.
- **`growth_scores`** (Plan 1): `id, user_id, score int, breakdown jsonb, captured_at`. Read for series in the evaluate cron.
- **`posts` attributed columns** (Plan 0): `reshares, saves, link_clicks, members_reached, followers_gained, profile_views_from_post, metric_source, metrics_synced_at`. Plus `posts.content_pillar` and `posts.format` (Plan 1 Task 1 adds `format`) and `posts.published_at` (already in `schema.sql`).
- **`lib/insights.ts`** (Plan 1) pure exports, CALLED here: `perTimeSlotPerformance(rows): { day, hour, posts, avgEngagementRate }[]` (UTC ISO-weekday buckets, `day` ∈ `'Mon'..'Sun'`), `perPillarPerformance`, `perFormatPerformance`, and `type PostPerfRow`. We import these; we do not re-implement them.
- **`lib/linkedin-schedule.ts`** global `DOW_WEIGHT: Record<number, number>` (0=Sun..6=Sat) and `buildOptimalSlots(input)` whose Pass-1 scoring line is `const base = DOW_WEIGHT[dow] ?? 0.50`. We AUGMENT that line with per-user learned weights without changing behavior for users with insufficient data.
- **`cron_locks`** table (`job_name, run_date, lock_id, completed_at`) used by `app/api/cron/day7-stats/route.ts`. We reuse it; we do not create it.

**This plan CREATES:** the `experiments` table, `posts.experiment_id`, `posts.variant`, `lib/experiments.ts`, pure weight-merge helpers in `lib/linkedin-schedule.ts`, the evaluate cron, and a calibration doc. It MODIFIES `app/api/posts/generate-batch/route.ts`, `lib/supabase.ts`, `supabase/schema.sql`, and `vercel.json`.

> The `source`/`metric_source` enum is `'creator_api' | 'public_fallback' | 'manual'`; columns may be NULL in legacy rows. Pure functions tolerate NULL and never throw.

---

## File Structure

**New files:**
- `supabase/migrations/20260531c_experiments.sql` — `experiments` table + `posts.experiment_id` + `posts.variant`.
- `lib/experiments.ts` — pure `assignVariant`, `computeLift`, `evaluateGuardrails`, `applyTreatmentToGeneration`, `EXPERIMENT_THRESHOLDS` + thin `createExperiment`, `getActiveExperiment`, `evaluateExperiment`.
- `lib/__tests__/experiments.test.ts` — pure unit tests (assignment determinism/split, tiny-N inconclusive, clear win, clear loss → rollback, treatment application).
- `lib/__tests__/linkedin-schedule.test.ts` — pure unit tests for `mergeSlotWeights` (new).
- `app/api/cron/evaluate-experiments/route.ts` — daily lifecycle cron (copies the day7-stats guard + `cron_locks`).
- `docs/superpowers/specs/2026-05-31-experiment-calibration.md` — concrete calibration procedure + v1 defaults (Task 7 deliverable).

**Modified files:**
- `supabase/schema.sql` — append `experiments`; add `posts.experiment_id` + `posts.variant` to the posts block.
- `lib/supabase.ts` — add `Experiment`, `ExperimentDimension`, `ExperimentStatus`, `Variant`, `ExperimentResult` types; extend `Post` with `experiment_id` + `variant`.
- `lib/linkedin-schedule.ts` — add pure `mergeSlotWeights` + `slotPerformanceToDowWeights`, thin `getUserSlotWeights`, and an optional `learnedDowWeight` field on `OptimalSlotsInput` that the Pass-1 scoring line prefers when present.
- `app/api/posts/generate-batch/route.ts` — fetch the active experiment, thread its treatment into the treatment arm's generation, stamp `experiment_id`/`variant`; control arm stays byte-identical to today.
- `vercel.json` — register `/api/cron/evaluate-experiments` (`30 4 * * *`).

---

## Conventions every task follows

- Server libs import the DB client as `import { supabaseAdmin } from '@/lib/supabase-admin'`. Types live in `lib/supabase.ts`.
- **Pure functions take fixtures and return values — no `supabaseAdmin`, no `Date.now()`, no I/O, no randomness.** Determinism comes from hashing inputs, not `Math.random()`. Anything time-relative takes an explicit argument.
- Tests: Vitest at `lib/__tests__/<name>.test.ts`, `import { describe, it, expect } from 'vitest'`. The runner (`vitest.config.ts`) stubs `server-only` and aliases `./supabase-admin` (resolves `@/lib/supabase-admin` too) to an empty mock, so importing a lib with thin DB wrappers is fine **as long as the test calls only the pure exports**.
- Single test run: `npx vitest run lib/__tests__/<name>.test.ts`. Full suite: `npm test`.
- Migrations: `supabase/migrations/YYYYMMDD_<name>.sql`, box-comment header, `create table if not exists` / `alter table ... add column if not exists`; also mirror into `supabase/schema.sql`.
- Cron: `vercel.json` `crons` entry + `app/api/cron/<name>/route.ts`, copying the day7-stats `Bearer ${process.env.CRON_SECRET}` guard and the `cron_locks` idempotency insert verbatim.
- Commit after every green step. Branch is `feat/organic-growth-engine`. Commit messages end with the `Co-Authored-By` trailer shown in each task.

---

## Core principle enforced throughout

**NO silent global behavior changes.** Every tweak is an `experiments` row with `control` and `treatment` JSONB and a `status`. Generation applies the treatment ONLY to posts assigned to the `treatment` arm of a `running` experiment; `control`-arm posts are byte-identical to today's output. Lift is measured against the user's OWN pre-experiment baseline (cohort pooling stabilizes small N where relevant). Losers are rolled back (status → `lost`), which makes future generation stop applying the treatment because the experiment is no longer `running`.

---

## The experiment data shapes (authoritative — implement EXACTLY)

`experiments` row (snake_case columns; `control`/`treatment`/`result` are JSONB):

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid → users | |
| `hypothesis` | text | human-readable, e.g. "Posting Tue 9am beats the user's current slots" |
| `dimension` | text | one of `timing` \| `format` \| `pillar` \| `hook` \| `length` |
| `control` | jsonb | the baseline arm's config, e.g. `{}` (= today's behavior) |
| `treatment` | jsonb | the change, shape depends on `dimension` (see below) |
| `baseline_metric` | text | which metric lift is measured on, e.g. `engagement_rate` \| `impressions` \| `growth_score` |
| `started_at` | timestamptz | default now() |
| `ended_at` | timestamptz | null until decided |
| `status` | text | `running` \| `won` \| `lost` \| `inconclusive` |
| `result` | jsonb | `{ lift, confidence, n, decision, rollback, evaluated_at }` |

`treatment` JSONB shape per `dimension` (consumed by `applyTreatmentToGeneration`):
- `timing`: `{ "day": "Tue", "hour": 9 }` — applied by the scheduler arm, not the prompt (out of scope to fully wire the per-post slot override here; we stamp it and let `getUserSlotWeights` learn). For v1 the timing treatment is recorded + measured; slot biasing is delivered via the learned-weights path (Task 4) which is itself the timing intervention.
- `format`: `{ "format": "story" }` — forces the post `format` field + a prompt nudge.
- `pillar`: `{ "pillar": "Founder Lessons" }` — forces the content pillar for the arm.
- `hook`: `{ "hook_style": "question" }` — prepends a hook-style instruction to the prompt.
- `length`: `{ "target_words": 90 }` — overrides the 150-300 word rule for the arm.

`posts.variant` ∈ `'control' | 'treatment'`; `posts.experiment_id` → `experiments.id` (nullable; null for posts outside any experiment).

---

## Tasks

### Task 1: Migration + types for `experiments` (+ `posts.experiment_id`, `posts.variant`)

**Files:**
- Create: `supabase/migrations/20260531c_experiments.sql`
- Modify: `supabase/schema.sql` (posts block ends at line 87 `);`; append `experiments` after the final table in the file)
- Modify: `lib/supabase.ts` (extend `Post`; add experiment types)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260531c_experiments.sql`:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 2 (Intervene)
-- experiments: one row per posting tweak under test. Every intervention holds a
-- control arm and is measured against the user's own pre-experiment baseline —
-- there are NO silent global behavior changes. posts gets experiment_id + variant
-- so each generated post records which arm it belongs to.
--
-- dimension : timing | format | pillar | hook | length
-- status    : running | won | lost | inconclusive
-- variant   : control | treatment
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists experiments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  hypothesis text not null,
  dimension text not null,
  control jsonb not null default '{}',
  treatment jsonb not null default '{}',
  baseline_metric text not null default 'engagement_rate',
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text not null default 'running',
  result jsonb,
  created_at timestamptz default now()
);

create index if not exists experiments_user_status_idx
  on experiments(user_id, status);
create index if not exists experiments_user_dimension_idx
  on experiments(user_id, dimension, status);

-- posts: which experiment + arm produced this post (null = not in an experiment)
alter table posts add column if not exists experiment_id uuid references experiments(id) on delete set null;
alter table posts add column if not exists variant text;

create index if not exists posts_experiment_idx on posts(experiment_id);
```

- [ ] **Step 2: Lint the migration (no live DB needed)**

Run: `grep -c "create table if not exists experiments" supabase/migrations/20260531c_experiments.sql`
Expected output: `1`

- [ ] **Step 3: Mirror into schema.sql — add the two posts columns**

In `supabase/schema.sql`, in the `create table if not exists posts (...)` block, find the line:

```sql
  comments integer,
```

and replace it with:

```sql
  comments integer,
  experiment_id uuid,
  variant text,
```

> Note: in `schema.sql` the FK is declared inline-light (column only). The migration carries the real `references experiments(id)`; schema.sql stays a readable mirror. This matches how Plan 1 mirrored `posts.format` as a bare column.

- [ ] **Step 4: Mirror into schema.sql — append the experiments table at end of file**

At the END of `supabase/schema.sql`, append:

```sql

-- Organic Growth Engine — Phase 2: experiments (control-vs-treatment tweaks)
create table if not exists experiments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  hypothesis text not null,
  dimension text not null,
  control jsonb not null default '{}',
  treatment jsonb not null default '{}',
  baseline_metric text not null default 'engagement_rate',
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text not null default 'running',
  result jsonb,
  created_at timestamptz default now()
);
create index if not exists experiments_user_status_idx on experiments(user_id, status);
create index if not exists experiments_user_dimension_idx on experiments(user_id, dimension, status);
create index if not exists posts_experiment_idx on posts(experiment_id);
```

- [ ] **Step 5: Add types to `lib/supabase.ts`**

In `lib/supabase.ts`, find the existing `Post` type. Inside it, find:

```ts
  comments: number | null
```

and replace it with:

```ts
  comments: number | null
  experiment_id: string | null
  variant: 'control' | 'treatment' | null
```

> If Plan 0/1 already widened the `Post` type (adding `reshares`, `format`, etc.), the `comments: number | null` line still exists and is unique — match it verbatim. The two new lines are additive and order-independent.

Then, at the END of `lib/supabase.ts`, append:

```ts
export type ExperimentDimension = 'timing' | 'format' | 'pillar' | 'hook' | 'length'
export type ExperimentStatus = 'running' | 'won' | 'lost' | 'inconclusive'
export type Variant = 'control' | 'treatment'

export type ExperimentResult = {
  lift: number
  confidence: number
  n: number
  decision: 'won' | 'lost' | 'inconclusive' | 'keep_running'
  rollback: boolean
  evaluated_at: string
}

export type Experiment = {
  id: string
  user_id: string
  hypothesis: string
  dimension: ExperimentDimension
  control: Record<string, unknown>
  treatment: Record<string, unknown>
  baseline_metric: string
  started_at: string
  ended_at: string | null
  status: ExperimentStatus
  result: ExperimentResult | null
  created_at: string
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected output: no errors (exit 0).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260531c_experiments.sql supabase/schema.sql lib/supabase.ts
git commit -m "feat(experiments): experiments table + posts.experiment_id/variant + types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `assignVariant` — deterministic control/treatment split (pure)

Deterministic so the same post always lands in the same arm (no flapping across regenerations) and so tests need no RNG. We hash `experimentId + postKey` to a uniform bucket and compare against a 50/50 split.

**Files:**
- Create: `lib/experiments.ts`
- Create: `lib/__tests__/experiments.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/experiments.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assignVariant, hashToUnitInterval } from '../experiments'

describe('hashToUnitInterval', () => {
  it('is deterministic and in [0,1)', () => {
    const a = hashToUnitInterval('exp-1:post-1')
    const b = hashToUnitInterval('exp-1:post-1')
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })
  it('different keys generally differ', () => {
    expect(hashToUnitInterval('exp-1:post-1')).not.toBe(hashToUnitInterval('exp-1:post-2'))
  })
})

describe('assignVariant', () => {
  it('is deterministic for the same experiment + post', () => {
    const exp = { id: 'exp-1' }
    const v1 = assignVariant(exp, { id: 'post-A' })
    const v2 = assignVariant(exp, { id: 'post-A' })
    expect(v1).toBe(v2)
    expect(['control', 'treatment']).toContain(v1)
  })

  it('splits a large population close to 50/50', () => {
    const exp = { id: 'exp-split' }
    let treatment = 0
    const N = 2000
    for (let i = 0; i < N; i++) {
      if (assignVariant(exp, { id: `post-${i}` }) === 'treatment') treatment++
    }
    const ratio = treatment / N
    expect(ratio).toBeGreaterThan(0.42)
    expect(ratio).toBeLessThan(0.58)
  })

  it('the same post in two different experiments is assigned independently', () => {
    // Not asserting they differ (they may coincide), only that the key includes
    // the experiment id so assignment is per-experiment, not global per-post.
    const a = assignVariant({ id: 'exp-A' }, { id: 'post-1' })
    const b = assignVariant({ id: 'exp-B' }, { id: 'post-1' })
    expect(['control', 'treatment']).toContain(a)
    expect(['control', 'treatment']).toContain(b)
  })

  it('respects an explicit split (e.g. 0.25 treatment)', () => {
    const exp = { id: 'exp-quarter' }
    let treatment = 0
    const N = 2000
    for (let i = 0; i < N; i++) {
      if (assignVariant(exp, { id: `p-${i}` }, 0.25) === 'treatment') treatment++
    }
    const ratio = treatment / N
    expect(ratio).toBeGreaterThan(0.20)
    expect(ratio).toBeLessThan(0.30)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/experiments.test.ts`
Expected output: fails to resolve `../experiments` (`Failed to load url ../experiments` / "Cannot find module"). 0 passed.

- [ ] **Step 3: Minimal implementation**

Create `lib/experiments.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  Experiment,
  ExperimentResult,
  Variant,
} from '@/lib/supabase'

/**
 * Deterministic hash of a string to a uniform value in [0, 1). FNV-1a 32-bit;
 * no crypto needed (this is bucketing, not security). Same input → same output,
 * so a post never flaps between arms across regenerations and tests need no RNG.
 */
export function hashToUnitInterval(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  // >>> 0 makes it unsigned; divide by 2^32 for [0,1)
  return (h >>> 0) / 0x100000000
}

/**
 * Assign a post to the control or treatment arm of an experiment, deterministically.
 * `treatmentShare` is the fraction routed to treatment (default 0.5 = even split).
 * Keyed on `${experiment.id}:${post.id}` so assignment is per-experiment.
 */
export function assignVariant(
  experiment: { id: string },
  post: { id: string },
  treatmentShare = 0.5,
): Variant {
  const x = hashToUnitInterval(`${experiment.id}:${post.id}`)
  return x < treatmentShare ? 'treatment' : 'control'
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/experiments.test.ts`
Expected output: all tests passed (hashToUnitInterval + assignVariant blocks).

- [ ] **Step 5: Commit**

```bash
git add lib/experiments.ts lib/__tests__/experiments.test.ts
git commit -m "feat(experiments): deterministic assignVariant (FNV-1a 50/50 split)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `computeLift` + `evaluateGuardrails` — effect size, confidence, decision (pure)

This is the statistical heart. We keep it **simple and defensible** rather than reaching for a t-test we can't justify at N≈20:

**`computeLift(baselineSeries, treatmentSeries)` → `{ lift, confidence, n }`:**
- `lift` = relative change of the treatment mean vs the baseline mean: `(meanT - meanB) / meanB`. If `meanB <= 0`, `lift = 0` (no baseline to lift from).
- `n` = `min(baselineSeries.length, treatmentSeries.length)` — the binding sample count; a 30-post treatment judged against 2 baseline posts is really N=2.
- `confidence` = a **sample-aware, effect-aware** score in `[0,1]`, NOT a real p-value (documented as such). We combine two intuitions: bigger effects and bigger samples are more trustworthy. Using the pooled standard deviation `sd` we form a standardized effect `z = |meanT - meanB| / (sd / sqrt(n))` (a Welch-ish signal-to-noise, with a guard for `sd == 0`), then squash: `confidence = clamp01(1 - exp(-z / 2))`. With `sd == 0` and a non-zero difference, treat as fully separated (`confidence = 1`); with `n < 2`, `confidence = 0`. This is monotonic in both effect size and n, bounded, and needs no stats library. **It is a heuristic confidence, surfaced as such; the calibration doc (Task 7) defines when/how to replace it with a bootstrap.**

**`evaluateGuardrails({ n, lift, confidence })` → `{ decision, rollback }`** with v1 thresholds (from `EXPERIMENT_THRESHOLDS`):
- If `n < MIN_SAMPLE` (v1 = 6) → `{ decision: 'keep_running', rollback: false }` (never judge on too little data).
- Else if `lift <= ROLLBACK_LIFT` (v1 = -0.10, i.e. treatment is ≥10% worse) AND `confidence >= MIN_CONFIDENCE` (v1 = 0.6) → `{ decision: 'lost', rollback: true }` (clear loss; roll back).
- Else if `lift >= WIN_LIFT` (v1 = +0.10) AND `confidence >= MIN_CONFIDENCE` → `{ decision: 'won', rollback: false }` (clear win; keep treatment).
- Else, if the experiment has run "long enough" we want a terminal verdict; the cron passes `matured` to force a decision (see Task 6). When `matured` is true and neither win nor loss fired → `{ decision: 'inconclusive', rollback: true }` (stop the experiment and revert to control, since we couldn't prove the treatment helped — reverting is the safe default that preserves the user's baseline behavior). When `matured` is false → `{ decision: 'keep_running', rollback: false }`.

**Files:**
- Modify: `lib/experiments.ts`
- Modify: `lib/__tests__/experiments.test.ts`

- [ ] **Step 1: Add the failing tests**

In `lib/__tests__/experiments.test.ts`, update the import line to:

```ts
import {
  assignVariant, hashToUnitInterval,
  computeLift, evaluateGuardrails, EXPERIMENT_THRESHOLDS,
} from '../experiments'
```

Then append:

```ts
describe('EXPERIMENT_THRESHOLDS (v1 defaults)', () => {
  it('exposes the ship-now numbers', () => {
    expect(EXPERIMENT_THRESHOLDS).toEqual({
      MIN_SAMPLE: 6,
      WIN_LIFT: 0.10,
      ROLLBACK_LIFT: -0.10,
      MIN_CONFIDENCE: 0.6,
      MATURE_DAYS: 21,
    })
  })
})

describe('computeLift', () => {
  it('positive lift when treatment mean exceeds baseline mean', () => {
    const r = computeLift([10, 10, 10, 10], [12, 12, 12, 12])
    expect(r.lift).toBeCloseTo(0.2, 6) // (12-10)/10
    expect(r.n).toBe(4)
    expect(r.confidence).toBe(1) // zero variance, clean separation
  })

  it('negative lift when treatment underperforms', () => {
    const r = computeLift([10, 10, 10], [8, 8, 8])
    expect(r.lift).toBeCloseTo(-0.2, 6)
    expect(r.n).toBe(3)
  })

  it('n is the smaller of the two arms', () => {
    const r = computeLift([10, 10, 10, 10, 10], [12, 12])
    expect(r.n).toBe(2)
  })

  it('lift is 0 when baseline mean is non-positive', () => {
    expect(computeLift([0, 0], [5, 5]).lift).toBe(0)
  })

  it('confidence is 0 with fewer than 2 usable points', () => {
    expect(computeLift([10], [12]).confidence).toBe(0)
  })

  it('noisy data yields lower confidence than clean data for the same lift', () => {
    const clean = computeLift([10, 10, 10, 10], [11, 11, 11, 11])
    const noisy = computeLift([2, 18, 5, 15], [1, 21, 6, 16])
    expect(clean.lift).toBeCloseTo(noisy.lift, 1)
    expect(clean.confidence).toBeGreaterThan(noisy.confidence)
  })

  it('ignores null/NaN entries when computing means', () => {
    const r = computeLift([10, null as unknown as number, 10], [12, 12, NaN])
    expect(r.lift).toBeCloseTo(0.2, 6)
  })
})

describe('evaluateGuardrails', () => {
  it('tiny N → keep_running, no rollback (never judge on too little data)', () => {
    expect(evaluateGuardrails({ n: 3, lift: 0.5, confidence: 0.99, matured: true }))
      .toEqual({ decision: 'keep_running', rollback: false })
  })

  it('clear win → won, no rollback', () => {
    expect(evaluateGuardrails({ n: 10, lift: 0.25, confidence: 0.8, matured: false }))
      .toEqual({ decision: 'won', rollback: false })
  })

  it('clear loss → lost, rollback true', () => {
    expect(evaluateGuardrails({ n: 10, lift: -0.30, confidence: 0.8, matured: false }))
      .toEqual({ decision: 'lost', rollback: true })
  })

  it('a bad lift with low confidence does NOT roll back until matured', () => {
    expect(evaluateGuardrails({ n: 10, lift: -0.30, confidence: 0.3, matured: false }))
      .toEqual({ decision: 'keep_running', rollback: false })
  })

  it('matured but neither win nor loss → inconclusive, rollback to control', () => {
    expect(evaluateGuardrails({ n: 10, lift: 0.02, confidence: 0.9, matured: true }))
      .toEqual({ decision: 'inconclusive', rollback: true })
  })

  it('small positive lift, not matured → keep_running', () => {
    expect(evaluateGuardrails({ n: 10, lift: 0.05, confidence: 0.9, matured: false }))
      .toEqual({ decision: 'keep_running', rollback: false })
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/experiments.test.ts`
Expected output: fails — `computeLift` / `evaluateGuardrails` / `EXPERIMENT_THRESHOLDS` not exported. The Task 2 blocks still pass.

- [ ] **Step 3: Implement**

In `lib/experiments.ts`, after `assignVariant`, add:

```ts
/** v1 decision thresholds. Calibrated in docs/.../2026-05-31-experiment-calibration.md. */
export const EXPERIMENT_THRESHOLDS = {
  MIN_SAMPLE: 6,        // min posts in the binding arm before any verdict
  WIN_LIFT: 0.10,       // +10% over baseline = a win (with confidence)
  ROLLBACK_LIFT: -0.10, // -10% under baseline = a loss → roll back (with confidence)
  MIN_CONFIDENCE: 0.6,  // heuristic confidence gate for win/loss
  MATURE_DAYS: 21,      // after this many days, force a terminal verdict
} as const

function cleanNumbers(xs: Array<number | null | undefined>): number[] {
  return xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

/** Population variance of the pooled arms (used only for the heuristic confidence). */
function pooledSd(a: number[], b: number[]): number {
  const all = [...a, ...b]
  if (all.length < 2) return 0
  const m = mean(all)
  const variance = all.reduce((acc, x) => acc + (x - m) ** 2, 0) / all.length
  return Math.sqrt(variance)
}

function clamp01(x: number): number {
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

/**
 * Effect size + sample-aware HEURISTIC confidence (NOT a p-value).
 *   lift       = (meanT - meanB) / meanB        (0 when meanB <= 0)
 *   n          = min(|baseline|, |treatment|)    (the binding sample count)
 *   confidence = 1 - exp(-z/2),  z = |meanT-meanB| / (sd / sqrt(n))
 *               (z is a Welch-ish signal-to-noise; sd is the pooled stdev)
 * Edge rules: n<2 → confidence 0; sd==0 with a real difference → confidence 1.
 * Monotonic in both effect size and n, bounded to [0,1], no stats library needed.
 * The calibration doc defines when to swap this for a bootstrap CI.
 */
export function computeLift(
  baselineSeries: Array<number | null | undefined>,
  treatmentSeries: Array<number | null | undefined>,
): { lift: number; confidence: number; n: number } {
  const b = cleanNumbers(baselineSeries)
  const t = cleanNumbers(treatmentSeries)
  const n = Math.min(b.length, t.length)
  const meanB = mean(b)
  const meanT = mean(t)
  const lift = meanB > 0 ? (meanT - meanB) / meanB : 0

  if (n < 2) return { lift, confidence: 0, n }

  const sd = pooledSd(b, t)
  const diff = Math.abs(meanT - meanB)
  let confidence: number
  if (sd === 0) {
    confidence = diff > 0 ? 1 : 0
  } else {
    const z = diff / (sd / Math.sqrt(n))
    confidence = clamp01(1 - Math.exp(-z / 2))
  }
  return { lift, confidence, n }
}

/**
 * Turn a lift result into a lifecycle decision under the v1 guardrails.
 * `matured` = the experiment has run >= MATURE_DAYS (the cron computes it).
 *   n < MIN_SAMPLE                          → keep_running (no judgement yet)
 *   clear loss (lift<=ROLLBACK, conf>=MIN)  → lost,  rollback
 *   clear win  (lift>=WIN,      conf>=MIN)  → won,   keep
 *   matured, neither                        → inconclusive, rollback (revert to control)
 *   not matured, neither                    → keep_running
 */
export function evaluateGuardrails(args: {
  n: number
  lift: number
  confidence: number
  matured: boolean
}): { decision: ExperimentResult['decision']; rollback: boolean } {
  const T = EXPERIMENT_THRESHOLDS
  if (args.n < T.MIN_SAMPLE) return { decision: 'keep_running', rollback: false }

  const confident = args.confidence >= T.MIN_CONFIDENCE
  if (confident && args.lift <= T.ROLLBACK_LIFT) return { decision: 'lost', rollback: true }
  if (confident && args.lift >= T.WIN_LIFT) return { decision: 'won', rollback: false }

  if (args.matured) return { decision: 'inconclusive', rollback: true }
  return { decision: 'keep_running', rollback: false }
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/experiments.test.ts`
Expected output: all tests passed (Task 2 + Task 3 blocks).

- [ ] **Step 5: Commit**

```bash
git add lib/experiments.ts lib/__tests__/experiments.test.ts
git commit -m "feat(experiments): computeLift + evaluateGuardrails (v1 thresholds, heuristic confidence)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Per-user learned scheduling weights (pure `mergeSlotWeights` + `slotPerformanceToDowWeights`)

Derive per-day-of-week weights from Plan 1's `perTimeSlotPerformance`, pooled toward the global `DOW_WEIGHT` with the same `w_self = n/(n+K)` idea, so users without enough data keep today's exact behavior. This is the **timing intervention** — it only takes effect through the scheduler, and (per the core principle) the change is held behind the experiment lifecycle: `getUserSlotWeights` (Task 5 thin wrapper) returns learned weights only when a `timing` experiment is active/won for that user; otherwise the scheduler uses the untouched global table.

**Files:**
- Modify: `lib/linkedin-schedule.ts`
- Create: `lib/__tests__/linkedin-schedule.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/linkedin-schedule.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  DOW_WEIGHT,
  slotPerformanceToDowWeights,
  mergeSlotWeights,
  SLOT_WEIGHT_K,
} from '../linkedin-schedule'

// Day index: 0=Sun..6=Sat. Plan 1 perTimeSlotPerformance uses 'Mon'..'Sun' labels.
describe('slotPerformanceToDowWeights', () => {
  it('aggregates engagement rate per weekday into a 0..1-normalised weight map', () => {
    const slots = [
      { day: 'Mon', hour: 9, posts: 2, avgEngagementRate: 0.02 },
      { day: 'Wed', hour: 9, posts: 3, avgEngagementRate: 0.06 }, // best
      { day: 'Fri', hour: 17, posts: 1, avgEngagementRate: 0.03 },
    ]
    const { weights, counts } = slotPerformanceToDowWeights(slots)
    // Wed (index 3) is the best → normalised to 1.0
    expect(weights[3]).toBeCloseTo(1.0, 6)
    // Mon (index 1) = 0.02 / 0.06
    expect(weights[1]).toBeCloseTo(0.02 / 0.06, 6)
    // counts carry the post volume per weekday (drives pooling strength)
    expect(counts[3]).toBe(3)
    expect(counts[1]).toBe(2)
    // days with no data are absent from the maps
    expect(weights[0]).toBeUndefined()
  })

  it('returns empty maps when there is no slot data', () => {
    const { weights, counts } = slotPerformanceToDowWeights([])
    expect(Object.keys(weights)).toHaveLength(0)
    expect(Object.keys(counts)).toHaveLength(0)
  })

  it('handles a weekday with zero engagement (weight 0, still counted)', () => {
    const { weights, counts } = slotPerformanceToDowWeights([
      { day: 'Tue', hour: 9, posts: 4, avgEngagementRate: 0 },
      { day: 'Wed', hour: 9, posts: 1, avgEngagementRate: 0.05 },
    ])
    expect(weights[2]).toBe(0)
    expect(counts[2]).toBe(4)
    expect(weights[3]).toBeCloseTo(1.0, 6)
  })
})

describe('mergeSlotWeights (w_self = n/(n+K))', () => {
  it('with no user data, returns the global table unchanged (no behavior change)', () => {
    const merged = mergeSlotWeights(DOW_WEIGHT, { weights: {}, counts: {} }, SLOT_WEIGHT_K)
    expect(merged).toEqual(DOW_WEIGHT)
  })

  it('blends per-day toward the user signal by that day\'s post count', () => {
    // Wednesday global = 1.0; user signal 0.0 with n=10, K=10 → w_self 0.5 → 0.5
    const merged = mergeSlotWeights(
      DOW_WEIGHT,
      { weights: { 3: 0.0 }, counts: { 3: 10 } },
      10,
    )
    expect(merged[3]).toBeCloseTo(0.5, 6)
    // untouched days keep the global value exactly
    expect(merged[1]).toBe(DOW_WEIGHT[1])
  })

  it('a high-volume day trusts the user signal more', () => {
    // Monday global 0.70; user signal 1.0 with n=90, K=10 → w_self 0.9 → 0.9*1.0 + 0.1*0.70 = 0.97
    const merged = mergeSlotWeights(
      DOW_WEIGHT,
      { weights: { 1: 1.0 }, counts: { 1: 90 } },
      10,
    )
    expect(merged[1]).toBeCloseTo(0.97, 6)
  })

  it('never mutates the input global table', () => {
    const before = { ...DOW_WEIGHT }
    mergeSlotWeights(DOW_WEIGHT, { weights: { 3: 0.1 }, counts: { 3: 50 } }, 10)
    expect(DOW_WEIGHT).toEqual(before)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/linkedin-schedule.test.ts`
Expected output: fails — `slotPerformanceToDowWeights` / `mergeSlotWeights` / `SLOT_WEIGHT_K` not exported. 0 passed.

- [ ] **Step 3: Implement the pure helpers**

In `lib/linkedin-schedule.ts`, immediately AFTER the `DOW_WEIGHT` block (after the closing `}` on the line `6: 0.20, // Saturday — very low B2B\n}`), add:

```ts
// ─── Per-user learned slot weights (Phase 2 — Intervene) ─────────────────────
// Derive day-of-week weights from Plan 1's per-time-slot performance, pooled
// toward the global DOW_WEIGHT with w_self = n/(n+K). Users with little/no data
// fall back to the EXACT global table — no behavior change.

/** v1 pooling strength for learned slot weights. Calibrated in the Phase 2 calibration doc. */
export const SLOT_WEIGHT_K = 10

const DOW_LABEL_TO_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

export type SlotPerf = { day: string; hour: number; posts: number; avgEngagementRate: number }

/**
 * Collapse Plan 1's per-(weekday,hour) slot performance into a per-weekday signal:
 * - `weights[dow]` = that weekday's mean engagement rate, normalised so the best
 *   weekday = 1.0 (matching DOW_WEIGHT's 0..1 scale). Absent for weekdays with no data.
 * - `counts[dow]`  = total posts observed that weekday (drives pooling strength).
 */
export function slotPerformanceToDowWeights(slots: SlotPerf[]): {
  weights: Record<number, number>
  counts: Record<number, number>
} {
  // Sum engagement-rate * posts and posts per weekday → post-weighted mean rate.
  const sumRate: Record<number, number> = {}
  const counts: Record<number, number> = {}
  for (const s of slots) {
    const dow = DOW_LABEL_TO_INDEX[s.day]
    if (dow === undefined) continue
    const posts = s.posts ?? 0
    if (posts <= 0) continue
    sumRate[dow] = (sumRate[dow] ?? 0) + (s.avgEngagementRate ?? 0) * posts
    counts[dow] = (counts[dow] ?? 0) + posts
  }
  const meanRate: Record<number, number> = {}
  let max = 0
  for (const k of Object.keys(counts)) {
    const dow = Number(k)
    meanRate[dow] = counts[dow] > 0 ? sumRate[dow] / counts[dow] : 0
    if (meanRate[dow] > max) max = meanRate[dow]
  }
  const weights: Record<number, number> = {}
  for (const k of Object.keys(meanRate)) {
    const dow = Number(k)
    weights[dow] = max > 0 ? meanRate[dow] / max : 0
  }
  return { weights, counts }
}

/**
 * Blend the global DOW_WEIGHT with a user's per-weekday signal:
 *   w_self = n / (n + K);  merged = w_self*userWeight + (1 - w_self)*globalWeight
 * Weekdays with no user signal (or n=0) keep the global value exactly, so a user
 * without enough data gets today's behavior unchanged. Pure: never mutates inputs.
 */
export function mergeSlotWeights(
  globalDowWeight: Record<number, number>,
  userSignal: { weights: Record<number, number>; counts: Record<number, number> },
  k: number,
): Record<number, number> {
  const merged: Record<number, number> = { ...globalDowWeight }
  for (const key of Object.keys(globalDowWeight)) {
    const dow = Number(key)
    const userWeight = userSignal.weights[dow]
    const n = userSignal.counts[dow] ?? 0
    if (userWeight === undefined || n <= 0) continue
    const wSelf = n / (n + k)
    merged[dow] = wSelf * userWeight + (1 - wSelf) * globalDowWeight[dow]
  }
  return merged
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/linkedin-schedule.test.ts`
Expected output: all tests passed.

- [ ] **Step 5: Integrate into the slot-scoring pass WITHOUT changing default behavior**

In `lib/linkedin-schedule.ts`, in the `OptimalSlotsInput` interface, find:

```ts
  periodEndDate?: Date
}
```

and replace it with:

```ts
  periodEndDate?: Date
  /**
   * Per-user learned day-of-week weights (Phase 2). When provided, the Pass-1
   * day score uses these instead of the global DOW_WEIGHT. Omit (default) and
   * behavior is byte-identical to before. Built by mergeSlotWeights / passed by
   * the caller only when a timing experiment is active for the user.
   */
  learnedDowWeight?: Record<number, number>
}
```

Then, in `buildOptimalSlots`, find the destructuring:

```ts
  const {
    now, count, planMonthlyLimit, timezone, pillars,
    takenDateStrings, userPreferredDays, userPreferredHour,
    periodEndDate,
  } = input
```

and replace it with:

```ts
  const {
    now, count, planMonthlyLimit, timezone, pillars,
    takenDateStrings, userPreferredDays, userPreferredHour,
    periodEndDate, learnedDowWeight,
  } = input
```

Then find the Pass-1 base-weight line:

```ts
    const base    = DOW_WEIGHT[dow] ?? 0.50
```

and replace it with:

```ts
    const base    = (learnedDowWeight ?? DOW_WEIGHT)[dow] ?? 0.50
```

- [ ] **Step 6: Re-run the schedule tests + typecheck (no regression)**

Run: `npx vitest run lib/__tests__/linkedin-schedule.test.ts && npx tsc --noEmit`
Expected output: all schedule tests pass; TS exits 0. (No existing `buildOptimalSlots` callers pass `learnedDowWeight`, so their behavior is unchanged.)

- [ ] **Step 7: Commit**

```bash
git add lib/linkedin-schedule.ts lib/__tests__/linkedin-schedule.test.ts
git commit -m "feat(schedule): pure mergeSlotWeights/slotPerformanceToDowWeights + optional learnedDowWeight (no default behavior change)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Thin DB wrappers — `createExperiment`, `getActiveExperiment`, `getUserSlotWeights` + treatment applier

`applyTreatmentToGeneration` is PURE (unit-tested). The three DB functions are thin glue (not unit-tested with a live DB — the runner stubs `supabase-admin`); they are exercised by the cron + route smoke builds.

**Files:**
- Modify: `lib/experiments.ts`
- Modify: `lib/__tests__/experiments.test.ts`

- [ ] **Step 1: Add the failing test for the PURE treatment applier**

In `lib/__tests__/experiments.test.ts`, update the import line to:

```ts
import {
  assignVariant, hashToUnitInterval,
  computeLift, evaluateGuardrails, EXPERIMENT_THRESHOLDS,
  applyTreatmentToGeneration,
} from '../experiments'
```

Then append:

```ts
describe('applyTreatmentToGeneration', () => {
  const base = { pillar: 'Industry Trends', format: 'insight', promptSuffix: '', targetWords: null as number | null }

  it('control arm returns the base config unchanged', () => {
    const exp = { dimension: 'pillar' as const, treatment: { pillar: 'Founder Lessons' } }
    expect(applyTreatmentToGeneration(base, exp, 'control')).toEqual(base)
  })

  it('pillar treatment overrides the pillar for the treatment arm', () => {
    const exp = { dimension: 'pillar' as const, treatment: { pillar: 'Founder Lessons' } }
    const out = applyTreatmentToGeneration(base, exp, 'treatment')
    expect(out.pillar).toBe('Founder Lessons')
    expect(out.format).toBe('insight') // untouched
  })

  it('format treatment overrides the format', () => {
    const exp = { dimension: 'format' as const, treatment: { format: 'story' } }
    expect(applyTreatmentToGeneration(base, exp, 'treatment').format).toBe('story')
  })

  it('hook treatment appends a hook-style instruction to the prompt suffix', () => {
    const exp = { dimension: 'hook' as const, treatment: { hook_style: 'question' } }
    const out = applyTreatmentToGeneration(base, exp, 'treatment')
    expect(out.promptSuffix).toContain('question')
    expect(out.promptSuffix.length).toBeGreaterThan(0)
  })

  it('length treatment sets targetWords', () => {
    const exp = { dimension: 'length' as const, treatment: { target_words: 90 } }
    expect(applyTreatmentToGeneration(base, exp, 'treatment').targetWords).toBe(90)
  })

  it('timing treatment does NOT alter generation config (timing acts via the scheduler)', () => {
    const exp = { dimension: 'timing' as const, treatment: { day: 'Tue', hour: 9 } }
    expect(applyTreatmentToGeneration(base, exp, 'treatment')).toEqual(base)
  })

  it('a null/absent experiment returns the base config (no experiment running)', () => {
    expect(applyTreatmentToGeneration(base, null, 'control')).toEqual(base)
  })
})
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run lib/__tests__/experiments.test.ts`
Expected output: fails — `applyTreatmentToGeneration` not exported. Prior blocks still pass.

- [ ] **Step 3: Implement the pure applier**

In `lib/experiments.ts`, after `evaluateGuardrails`, add:

```ts
/** The generation knobs an experiment treatment can turn. */
export type GenerationConfig = {
  pillar: string
  format: string
  promptSuffix: string
  targetWords: number | null
}

type TreatmentExperiment = {
  dimension: Experiment['dimension']
  treatment: Record<string, unknown>
}

/**
 * Apply an experiment's treatment to a post's generation config — PURELY.
 * - control arm (or null experiment) → base config UNCHANGED (byte-identical to today)
 * - treatment arm → only the field(s) for that dimension are overridden
 * - timing acts via the scheduler (learned weights), so it is a no-op here
 */
export function applyTreatmentToGeneration(
  base: GenerationConfig,
  experiment: TreatmentExperiment | null,
  variant: Variant,
): GenerationConfig {
  if (!experiment || variant !== 'treatment') return base
  const t = experiment.treatment
  switch (experiment.dimension) {
    case 'pillar':
      return typeof t.pillar === 'string' ? { ...base, pillar: t.pillar } : base
    case 'format':
      return typeof t.format === 'string' ? { ...base, format: t.format } : base
    case 'hook':
      return typeof t.hook_style === 'string'
        ? { ...base, promptSuffix: `${base.promptSuffix}\nOpen with a ${t.hook_style} hook.`.trim() }
        : base
    case 'length':
      return typeof t.target_words === 'number' ? { ...base, targetWords: t.target_words } : base
    case 'timing':
    default:
      return base
  }
}
```

- [ ] **Step 4: Run to pass**

Run: `npx vitest run lib/__tests__/experiments.test.ts`
Expected output: all tests passed.

- [ ] **Step 5: Add the thin DB wrappers (no unit test — DB glue)**

> Not unit-tested with a live DB (the runner stubs `supabase-admin`). The pure logic they call is fully covered. They are verified by typecheck + the cron/route build smoke tests.

In `lib/experiments.ts`, at the bottom, add:

```ts
// ── Thin DB wrappers ─────────────────────────────────────────────────────────

/** Create a running experiment for a user. Returns the inserted row. */
export async function createExperiment(args: {
  userId: string
  hypothesis: string
  dimension: Experiment['dimension']
  treatment: Record<string, unknown>
  control?: Record<string, unknown>
  baselineMetric?: string
}): Promise<Experiment | null> {
  const { data } = await supabaseAdmin
    .from('experiments')
    .insert({
      user_id: args.userId,
      hypothesis: args.hypothesis,
      dimension: args.dimension,
      control: args.control ?? {},
      treatment: args.treatment,
      baseline_metric: args.baselineMetric ?? 'engagement_rate',
      status: 'running',
    })
    .select()
    .single()
  return (data as Experiment) ?? null
}

/**
 * The single running experiment for a user (if any). v1 runs ONE change at a
 * time per user (the framework forbids conflicting experiments on a dimension),
 * so we take the most-recently-started running row.
 */
export async function getActiveExperiment(userId: string): Promise<Experiment | null> {
  const { data } = await supabaseAdmin
    .from('experiments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Experiment) ?? null
}

/**
 * Per-user learned day-of-week weights for the scheduler, or null to use the
 * global DOW_WEIGHT. Only returns learned weights when the user has a timing
 * experiment that is running or won (the timing intervention is itself gated by
 * an experiment — no silent global change). Reads Plan 1's perTimeSlotPerformance.
 */
export async function getUserSlotWeights(userId: string): Promise<Record<number, number> | null> {
  const { perTimeSlotPerformance, type as _ } = await loadInsights()
  void _

  const { data: timingExp } = await supabaseAdmin
    .from('experiments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('dimension', 'timing')
    .in('status', ['running', 'won'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!timingExp) return null

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('content_pillar, format, published_at, impressions, reactions, comments, reshares, saves')
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', ninetyDaysAgo)

  const slots = perTimeSlotPerformance((posts ?? []) as unknown as Parameters<typeof perTimeSlotPerformance>[0])
  const { weights, counts } = slotPerformanceToDowWeights(slots)
  if (Object.keys(counts).length === 0) return null
  return mergeSlotWeights(DOW_WEIGHT, { weights, counts }, SLOT_WEIGHT_K)
}
```

> The `loadInsights` indirection (below) and the `slotPerformanceToDowWeights` / `mergeSlotWeights` / `DOW_WEIGHT` / `SLOT_WEIGHT_K` imports are added in Step 6 so the module compiles.

- [ ] **Step 6: Wire the imports the wrappers need**

At the TOP of `lib/experiments.ts`, replace the existing import block:

```ts
import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  Experiment,
  ExperimentResult,
  Variant,
} from '@/lib/supabase'
```

with:

```ts
import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  Experiment,
  ExperimentResult,
  Variant,
} from '@/lib/supabase'
import {
  DOW_WEIGHT,
  SLOT_WEIGHT_K,
  slotPerformanceToDowWeights,
  mergeSlotWeights,
} from '@/lib/linkedin-schedule'

/** Lazy import of Plan 1's pure insight helpers (keeps the import graph thin). */
async function loadInsights() {
  const mod = await import('@/lib/insights')
  return { perTimeSlotPerformance: mod.perTimeSlotPerformance, type: undefined }
}
```

Then in `getUserSlotWeights`, simplify the destructure line — replace:

```ts
  const { perTimeSlotPerformance, type as _ } = await loadInsights()
  void _
```

with:

```ts
  const { perTimeSlotPerformance } = await loadInsights()
```

- [ ] **Step 7: Typecheck + re-run experiment tests**

Run: `npx tsc --noEmit && npx vitest run lib/__tests__/experiments.test.ts`
Expected output: TS exits 0; all experiment tests pass.

- [ ] **Step 8: Commit**

```bash
git add lib/experiments.ts lib/__tests__/experiments.test.ts
git commit -m "feat(experiments): applyTreatmentToGeneration (pure) + createExperiment/getActiveExperiment/getUserSlotWeights wrappers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Thread the active experiment into `generate-batch` + the evaluate cron

Two parts: (a) generation hooks that apply the treatment to the treatment arm and stamp `experiment_id`/`variant` (control arm byte-identical to today); (b) `evaluateExperiment` + the lifecycle cron.

#### 6a — Generation hooks in `app/api/posts/generate-batch/route.ts`

**Files:**
- Modify: `app/api/posts/generate-batch/route.ts`

- [ ] **Step 1: Import the experiment helpers**

In `app/api/posts/generate-batch/route.ts`, find:

```ts
import { buildOptimalSlots } from '@/lib/linkedin-schedule'
```

and replace it with (note `getUserSlotWeights` is exported from `lib/experiments.ts`, NOT `lib/linkedin-schedule.ts`):

```ts
import { buildOptimalSlots } from '@/lib/linkedin-schedule'
import {
  getActiveExperiment, getUserSlotWeights, assignVariant, applyTreatmentToGeneration,
} from '@/lib/experiments'
import type { Experiment } from '@/lib/supabase'
```

- [ ] **Step 2: Fetch the active experiment + learned slot weights (non-fatal)**

In `app/api/posts/generate-batch/route.ts`, find:

```ts
  const now = new Date()
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
```

and replace it with:

```ts
  const now = new Date()
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  // ── Active experiment (Phase 2) ───────────────────────────────────────────
  // One change at a time per user, held behind a control arm. Null = no
  // experiment running → generation is byte-identical to pre-Phase-2 behavior.
  let activeExperiment: Experiment | null = null
  try { activeExperiment = await getActiveExperiment(user.id) }
  catch (e) { console.warn('[generate-batch] getActiveExperiment failed (non-fatal):', e) }

  // Per-user learned day-of-week weights — only non-null when a timing
  // experiment is active/won for this user; otherwise the scheduler keeps the
  // global DOW_WEIGHT (no silent change).
  let learnedDowWeight: Record<number, number> | null = null
  try { learnedDowWeight = await getUserSlotWeights(user.id) }
  catch (e) { console.warn('[generate-batch] getUserSlotWeights failed (non-fatal):', e) }
```

- [ ] **Step 3: Pass the learned weights to the scheduler**

In the same file, find the `buildOptimalSlots({ ... })` call and the line:

```ts
    periodEndDate,   // caps window to subscription renewal date (monthly plans only)
  })
```

and replace it with:

```ts
    periodEndDate,   // caps window to subscription renewal date (monthly plans only)
    ...(learnedDowWeight ? { learnedDowWeight } : {}),
  })
```

- [ ] **Step 4: Apply the treatment per-post + stamp provenance in the insert payload**

In the same file, find the `insertPayloads` builder:

```ts
  const insertPayloads = await Promise.all(allPosts.map(async (post, i) => {
    let content = post.content
    let aiScore = 0
    let aiPatterns: string[] = []
    let aiAttempts = 0
    try {
      const gate = await cleanThroughAIGate(post.content, { profile: profile as unknown as UserProfile, voiceExemplars })
      content = gate.content
      aiScore = gate.finalScore
      aiPatterns = gate.patternsAtSave
      aiAttempts = gate.rewriteAttempts
    } catch (e) {
      console.warn('[generate-batch] cleanThroughAIGate failed (non-fatal):', e)
    }
    return {
      user_id: user.id,
      content,
      content_pillar: post.content_pillar || pillars[i % pillars.length],
      source: 'ai_generated',
      status: postStatus,
      scheduled_at: slots[i]?.toISOString() ?? null,
      ai_detection_score: aiScore,
      ai_detection_patterns: aiPatterns,
      ai_rewrite_attempts: aiAttempts,
      ...(post.story_bank_id ? { story_bank_id: post.story_bank_id } : {}),
    }
  }))
```

and replace it with:

```ts
  const insertPayloads = await Promise.all(allPosts.map(async (post, i) => {
    let content = post.content
    let aiScore = 0
    let aiPatterns: string[] = []
    let aiAttempts = 0
    try {
      const gate = await cleanThroughAIGate(post.content, { profile: profile as unknown as UserProfile, voiceExemplars })
      content = gate.content
      aiScore = gate.finalScore
      aiPatterns = gate.patternsAtSave
      aiAttempts = gate.rewriteAttempts
    } catch (e) {
      console.warn('[generate-batch] cleanThroughAIGate failed (non-fatal):', e)
    }

    // ── Experiment provenance (Phase 2) ──────────────────────────────────────
    // Assign each post to control/treatment for the active experiment and apply
    // the treatment's pillar/format override. The control arm is byte-identical
    // to pre-Phase-2 output; only the treatment arm differs. Posts outside any
    // experiment carry null experiment_id/variant.
    const basePillar = post.content_pillar || pillars[i % pillars.length]
    let finalPillar = basePillar
    let finalFormat = post.format
    let variant: 'control' | 'treatment' | null = null
    let experimentId: string | null = null
    if (activeExperiment) {
      // Stable per-post key so the arm doesn't flap (index within this batch + a
      // content hash proxy via slot time; deterministic within the batch).
      const postKey = `${slots[i]?.toISOString() ?? 'noslot'}#${i}`
      variant = assignVariant({ id: activeExperiment.id }, { id: postKey })
      experimentId = activeExperiment.id
      const applied = applyTreatmentToGeneration(
        { pillar: basePillar, format: post.format, promptSuffix: '', targetWords: null },
        { dimension: activeExperiment.dimension, treatment: activeExperiment.treatment },
        variant,
      )
      finalPillar = applied.pillar
      finalFormat = applied.format
    }

    return {
      user_id: user.id,
      content,
      content_pillar: finalPillar,
      format: finalFormat,
      source: 'ai_generated',
      status: postStatus,
      scheduled_at: slots[i]?.toISOString() ?? null,
      ai_detection_score: aiScore,
      ai_detection_patterns: aiPatterns,
      ai_rewrite_attempts: aiAttempts,
      ...(experimentId ? { experiment_id: experimentId, variant } : {}),
      ...(post.story_bank_id ? { story_bank_id: post.story_bank_id } : {}),
    }
  }))
```

> **Why pillar/format are stamped post-generation rather than re-prompted:** the batch prompt rotates pillars internally and returns a `format` per post; for v1 the treatment override is applied to the stored `content_pillar`/`format` columns (what insights + the next learning loop read), which is enough to measure timing/format/pillar lift. A deeper prompt-level treatment (hook/length re-prompting per arm) is a follow-up; this task delivers the measurable, non-silent control-vs-treatment split with correct provenance. The `format` column exists (Plan 1 Task 1). `applyTreatmentToGeneration` keeps the control arm identical, satisfying the core principle.

- [ ] **Step 5: Typecheck + build smoke test**

Run: `npx tsc --noEmit && npm run build 2>&1 | grep -E "generate-batch|Failed to compile|error" || echo "BUILD CLEAN — generate-batch bundled"`
Expected output: no TS errors; `generate-batch` appears in the manifest or `BUILD CLEAN — generate-batch bundled`.

- [ ] **Step 6: Commit**

```bash
git add app/api/posts/generate-batch/route.ts
git commit -m "feat(experiments): thread active experiment treatment + learned slot weights into generate-batch (control arm unchanged)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

#### 6b — `evaluateExperiment` wrapper + lifecycle cron

**Files:**
- Modify: `lib/experiments.ts`
- Create: `app/api/cron/evaluate-experiments/route.ts`
- Modify: `vercel.json`

- [ ] **Step 7: Add the `evaluateExperiment` thin wrapper**

> DB glue, not unit-tested with a live DB. The math (`computeLift`, `evaluateGuardrails`) is fully covered by Task 3.

In `lib/experiments.ts`, at the bottom, add:

```ts
/**
 * Build the per-post engagement-rate series for one arm of an experiment, within
 * the experiment's lifetime. engagement rate = (reactions+comments+reshares+saves)
 * / impressions, computed per post (posts with 0 impressions are dropped).
 */
function engagementRateSeries(
  rows: Array<{
    impressions: number | null
    reactions: number | null
    comments: number | null
    reshares: number | null
    saves: number | null
  }>,
): number[] {
  const out: number[] = []
  for (const r of rows) {
    const impr = r.impressions ?? 0
    if (impr <= 0) continue
    const eng = (r.reactions ?? 0) + (r.comments ?? 0) + (r.reshares ?? 0) + (r.saves ?? 0)
    out.push(eng / impr)
  }
  return out
}

/**
 * Evaluate one experiment: gather treatment-arm posts vs the user's pre-experiment
 * baseline (the same metric over the 28 days BEFORE started_at, control-equivalent
 * behavior), compute lift, apply guardrails, persist status/result, and on rollback
 * mark the experiment terminal so future generation stops applying the treatment.
 * Returns the result written.
 */
export async function evaluateExperiment(
  experimentId: string,
  now: Date = new Date(),
): Promise<ExperimentResult | null> {
  const { data: exp } = await supabaseAdmin
    .from('experiments')
    .select('*')
    .eq('id', experimentId)
    .maybeSingle()
  if (!exp || (exp as Experiment).status !== 'running') return null
  const e = exp as Experiment

  const startedAt = new Date(e.started_at)
  const baselineStart = new Date(startedAt.getTime() - 28 * 24 * 60 * 60 * 1000)
  const cols = 'impressions, reactions, comments, reshares, saves'

  const [treatmentRes, baselineRes] = await Promise.all([
    // Treatment arm: posts in this experiment tagged treatment, published since start.
    supabaseAdmin.from('posts').select(cols)
      .eq('user_id', e.user_id).eq('experiment_id', e.id).eq('variant', 'treatment')
      .eq('status', 'published').gte('published_at', e.started_at),
    // Baseline: the user's published posts in the 28 days before the experiment
    // began (their own pre-experiment behavior = the control reference).
    supabaseAdmin.from('posts').select(cols)
      .eq('user_id', e.user_id).eq('status', 'published')
      .gte('published_at', baselineStart.toISOString()).lt('published_at', e.started_at),
  ])

  const treatmentSeries = engagementRateSeries((treatmentRes.data ?? []) as Parameters<typeof engagementRateSeries>[0])
  const baselineSeries = engagementRateSeries((baselineRes.data ?? []) as Parameters<typeof engagementRateSeries>[0])

  const { lift, confidence, n } = computeLift(baselineSeries, treatmentSeries)
  const ageDays = (now.getTime() - startedAt.getTime()) / (24 * 60 * 60 * 1000)
  const matured = ageDays >= EXPERIMENT_THRESHOLDS.MATURE_DAYS
  const { decision, rollback } = evaluateGuardrails({ n, lift, confidence, matured })

  const result: ExperimentResult = {
    lift, confidence, n, decision, rollback, evaluated_at: now.toISOString(),
  }

  // Persist. keep_running leaves status unchanged; a verdict ends the experiment.
  const terminal = decision !== 'keep_running'
  await supabaseAdmin.from('experiments').update({
    result,
    ...(terminal
      ? { status: decision as Experiment['status'], ended_at: now.toISOString() }
      : {}),
  }).eq('id', e.id)

  // Rollback: clear future treatment application. The treatment stops being
  // applied automatically because the experiment is no longer `running`
  // (getActiveExperiment only returns running rows). No posts are mutated; this
  // is purely "stop doing the new thing going forward".
  return result
}
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected output: no errors (exit 0).

- [ ] **Step 9: Create the lifecycle cron (copy the day7-stats guard + cron_locks verbatim)**

Create `app/api/cron/evaluate-experiments/route.ts`:

```ts
// Vercel cron — daily. For each running experiment, gather treatment vs the
// user's pre-experiment baseline, evaluate lift under the v1 guardrails, update
// status, and roll back losers (clears future treatment application by ending
// the experiment). Idempotent per day via cron_locks (mirrors day7-stats).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { evaluateExperiment } from '@/lib/experiments'
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
    .insert({ job_name: 'evaluate-experiments', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  const { data: running } = await supabaseAdmin
    .from('experiments')
    .select('id')
    .eq('status', 'running')

  const results = await Promise.allSettled(
    (running ?? []).map(async (e: { id: string }) => {
      const r = await evaluateExperiment(e.id)
      return { id: e.id, decision: r?.decision ?? 'skipped' }
    }),
  )

  await supabaseAdmin.from('cron_locks')
    .update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)

  const tally = { won: 0, lost: 0, inconclusive: 0, keep_running: 0 }
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const d = (r.value as { decision: string }).decision
      if (d in tally) (tally as Record<string, number>)[d]++
    }
  }
  return NextResponse.json({ evaluated: running?.length ?? 0, ...tally })
}

export { handler as GET, handler as POST }
```

- [ ] **Step 10: Register the cron in `vercel.json`**

In `vercel.json`, the `crons` array currently ends with the `day7-stats` entry. Find:

```json
    {
      "path": "/api/cron/day7-stats",
      "schedule": "0 9 * * *"
    }
  ]
```

and replace it with:

```json
    {
      "path": "/api/cron/day7-stats",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/evaluate-experiments",
      "schedule": "30 4 * * *"
    }
  ]
```

> Scheduled at 04:30 UTC — after Plan 1's `cohort-baselines` (04:00) and the Phase 0 capture crons, so the freshest analytics are in before evaluation.

- [ ] **Step 11: Typecheck + build smoke test**

Run: `npx tsc --noEmit && npm run build 2>&1 | grep -E "evaluate-experiments|Failed to compile" || echo "BUILD CLEAN — evaluate-experiments bundled"`
Expected output: no TS errors; `/api/cron/evaluate-experiments` in the manifest or `BUILD CLEAN`.

- [ ] **Step 12: Commit**

```bash
git add lib/experiments.ts app/api/cron/evaluate-experiments/route.ts vercel.json
git commit -m "feat(experiments): evaluateExperiment wrapper + daily lifecycle cron (rolls back losers)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: CALIBRATION — set min sample, lift threshold, and K once data exists

A concrete, runnable analysis task — exact queries, decision rules, and the v1 defaults that ship now. Not a vague TODO.

**Files:**
- Create: `docs/superpowers/specs/2026-05-31-experiment-calibration.md`

> **Ship-now defaults (already implemented):** `MIN_SAMPLE = 6`, `WIN_LIFT = +0.10`, `ROLLBACK_LIFT = -0.10`, `MIN_CONFIDENCE = 0.6`, `MATURE_DAYS = 21` (in `EXPERIMENT_THRESHOLDS`, `lib/experiments.ts`); `SLOT_WEIGHT_K = 10` (in `lib/linkedin-schedule.ts`). Do NOT change them until the procedure below clears its decision gate.

- [ ] **Step 1: Write the calibration doc**

Create `docs/superpowers/specs/2026-05-31-experiment-calibration.md` with:

```md
# Experiment Calibration — min sample, lift thresholds, K

**Status:** Procedure defined; run when ≥ 30 experiments have reached `ended_at`
across ≥ 20 users (enough decided experiments to judge the thresholds).
**v1 defaults shipped now:** MIN_SAMPLE = 6 posts; WIN_LIFT = +0.10; ROLLBACK_LIFT
= -0.10; MIN_CONFIDENCE = 0.6; MATURE_DAYS = 21 days; SLOT_WEIGHT_K = 10.

These live in `lib/experiments.ts` (`EXPERIMENT_THRESHOLDS`) and
`lib/linkedin-schedule.ts` (`SLOT_WEIGHT_K`). Change ONLY after the gates below.

## A. MIN_SAMPLE — how many treatment posts before judging

Goal: the smallest sample at which the sign of `lift` is stable (a verdict at N
posts agrees with the verdict the same experiment reaches at maturity).

```sql
-- For each ended experiment, recompute lift at rolling sample sizes and compare
-- the early sign to the final sign. (Run via the pure computeLift over stored
-- per-post engagement rates; this SQL gathers the raw inputs.)
select e.id, e.user_id, e.started_at, e.ended_at, e.dimension,
       (e.result->>'lift')::numeric   as final_lift,
       (e.result->>'n')::int          as final_n
from experiments e
where e.ended_at is not null
order by e.ended_at desc;
```

**Decision rule (MIN_SAMPLE):** for candidate M ∈ {4, 6, 8, 12}, replay each
experiment's first M treatment posts vs its baseline and compute `sign(lift_M)`.
Pick the smallest M where `sign(lift_M) == sign(final_lift)` for ≥ 80% of
experiments. If < 80% at every M, **keep MIN_SAMPLE = 6** (more data needed).
Re-check whenever the decided-experiment count doubles.

## B. WIN_LIFT / ROLLBACK_LIFT — the effect thresholds

Goal: thresholds that separate experiments whose lift *persists* from noise.
"Persisted win" = a `won` experiment whose dimension, when later left in place,
keeps engagement ≥ baseline over the following 28 days.

```sql
-- Distribution of final lift by terminal decision — eyeball the separation.
select status,
       count(*)                              as n,
       percentile_cont(0.5)  within group (order by (result->>'lift')::numeric) as p50_lift,
       percentile_cont(0.25) within group (order by (result->>'lift')::numeric) as p25_lift,
       percentile_cont(0.75) within group (order by (result->>'lift')::numeric) as p75_lift
from experiments
where ended_at is not null
group by status;
```

**Decision rule (lift thresholds):** set WIN_LIFT to the 25th percentile of the
lift of *persisted* wins (so most real wins clear it) and ROLLBACK_LIFT to the
75th percentile (i.e. closest to 0) of the lift of *persisted* losses, floored at
-0.05 (never roll back on < 5% degradation — that is within measurement noise).
If the win and loss lift distributions overlap at their medians (no separation),
**keep ±0.10** and raise MIN_SAMPLE / MATURE_DAYS instead (the problem is noise,
not the threshold).

## C. MIN_CONFIDENCE and the confidence heuristic

The v1 `confidence = 1 - exp(-z/2)` is a heuristic, not a p-value. Validate it:

```sql
-- Reliability: among experiments that fired a verdict at confidence >= 0.6,
-- what fraction had the correct sign at maturity? (join early result snapshots
-- if retained; else approximate from final result vs persisted outcome above)
select width_bucket((result->>'confidence')::numeric, 0, 1, 5) as conf_bucket,
       count(*) as n,
       avg(((result->>'lift')::numeric > 0)::int) as frac_positive
from experiments
where ended_at is not null
group by conf_bucket order by conf_bucket;
```

**Decision rule (confidence):** if the verdict-correctness in the `>= 0.6` buckets
is < 70%, replace the heuristic with a **bootstrap CI** (resample each arm 1000×,
flag win/loss only when the 90% CI of the lift excludes 0) — a pure function that
slots into `computeLift` behind the same return shape, so no caller changes. Until
then, **keep MIN_CONFIDENCE = 0.6** and the heuristic.

## D. MATURE_DAYS — when to force a verdict

```sql
-- Time-to-stable-sign: how many days until lift sign stops changing.
-- Proxy: median days between started_at and ended_at for decided experiments.
select percentile_cont(0.5) within group (order by extract(day from (ended_at - started_at))) as p50_days,
       percentile_cont(0.8) within group (order by extract(day from (ended_at - started_at))) as p80_days
from experiments where ended_at is not null and status in ('won','lost');
```

**Decision rule (MATURE_DAYS):** set to the 80th percentile of days-to-decisive
verdict, clamped to [14, 35]. If most experiments never reach a confident verdict
before MATURE_DAYS (lots of `inconclusive`), the sampling rate is too low — fix
posting cadence / treatment share, not this number. Until then, **keep 21**.

## E. SLOT_WEIGHT_K — pooling strength for learned timing weights

Backtest analogous to the Growth Score K (see growth-score calibration): for
K ∈ {5, 10, 20, 40}, recompute each user's `mergeSlotWeights` and measure (1) the
month-over-month stability of the resulting best-day ranking and (2) whether
posts scheduled on the learned-best day actually out-engage the global-best day.

```sql
-- Inputs: per-user, per-weekday post counts + mean engagement rate over 90 days.
select user_id,
       extract(dow from published_at) as dow,
       count(*) as posts,
       avg( (coalesce(reactions,0)+coalesce(comments,0)+coalesce(reshares,0)+coalesce(saves,0))
            / nullif(impressions,0) ) as mean_engagement_rate
from posts
where status = 'published' and published_at >= now() - interval '90 days'
group by user_id, extract(dow from published_at);
```

**Decision rule (K):** pick the smallest K whose learned-best-day ranking is
stable month-over-month (same top day ≥ 70% of users) AND whose learned-best day
beats the global-best day on mean engagement for the majority of users with ≥ 20
posts. If the curve is flat, **keep K = 10**. Re-evaluate quarterly.

## Guardrail invariants (do NOT calibrate away)
- ROLLBACK_LIFT floored at -0.05 (never roll back on sub-noise degradation).
- One running experiment per dimension per user (enforced operationally; the
  framework forbids conflicting experiments).
- A change is NEVER applied globally without a control arm — no threshold change
  may bypass `applyTreatmentToGeneration`'s control-arm passthrough.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-31-experiment-calibration.md
git commit -m "docs(experiments): calibration procedure for sample/lift/K (v1 defaults locked)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Full-suite verification + branch wrap-up

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected output: all test files pass — `experiments.test.ts`, `linkedin-schedule.test.ts`, the pre-existing `magic-link.test.ts`, and (from Plan 1) `growth-score.test.ts` / `insights.test.ts` / `cohort-baselines.test.ts` if present. 0 failed.

- [ ] **Step 2: Full typecheck + production build**

Run: `npx tsc --noEmit && npm run build`
Expected output: TS exits 0; build succeeds with `/api/cron/evaluate-experiments` and `/api/posts/generate-batch` in the route manifest.

- [ ] **Step 3: Confirm migration + schema mirror are consistent**

Run: `grep -l "create table if not exists experiments" supabase/schema.sql supabase/migrations/20260531c_experiments.sql && grep -c "experiment_id\|variant" supabase/schema.sql`
Expected output: both file paths listed; the `experiment_id|variant` count in schema.sql ≥ 3 (posts columns + the index line).

- [ ] **Step 4: Confirm the no-silent-change invariant holds in code**

Run: `grep -n "variant !== 'treatment'" lib/experiments.ts && grep -n "learnedDowWeight ?? DOW_WEIGHT" lib/linkedin-schedule.ts`
Expected output: one match in each — proving (a) the treatment applier passes the base config through for the control arm, and (b) the scheduler falls back to the global table when no learned weights are supplied.

- [ ] **Step 5: Use superpowers:finishing-a-development-branch** to decide merge/PR/cleanup for `feat/organic-growth-engine`.

---

## Out of scope (explicitly — keep this plan focused)

- **Writing `post_analytics` / `posts` attributed columns / `growth_scores`** — Phase 0/1 (assumed done). We only READ them.
- **The Growth Score / cohort baselines / insight surfaces** — Phase 1.
- **Per-post prompt-level hook/length re-prompting in `generateBatch`** — v1 stamps `format`/`content_pillar` overrides and records hook/length treatments; a deeper per-arm prompt rewrite is a follow-up. The measurable control-vs-treatment split + provenance + lift evaluation ship here.
- **A UI to create/inspect experiments** — operators create rows via `createExperiment`; a dashboard surface is Phase 3 (the attributable growth report) territory.
- **The attributable growth report email / plateau detection / performance-aware voice** — Phase 3.
- **OAuth scopes / `/rest/` Creator API migration** — Gate 0.
- **Mutating `linkedin_scores`** — untouched.
