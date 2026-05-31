# Sustain Calibration — Plateau Thresholds, Report Cadence, Voice Blend

**Status:** Procedure defined; run when ≥ 8 weeks of `growth_scores` exist for ≥ 50 active users.
**v1 defaults shipped now (locked until the gates below clear):**
- Plateau: `PLATEAU_WINDOWS = 3`, `PLATEAU_SCORE_DELTA = 2`, `REGRESSION_SCORE_DELTA = -5`,
  `PLATEAU_FOLLOWER_GROWTH_PCT = 0.01` — in `lib/plateau.ts`.
- Report cadence: weekly, Monday 13:00 UTC (`vercel.json`); window = 28 days (`REPORT_WINDOW_DAYS` in `lib/growth-report.ts`).
- Voice blend: `PERF_BLEND = 0.5`, `PERF_SAMPLE_MIN_IMPRESSIONS = 50` — in `lib/voice.ts`.

These live in `lib/plateau.ts` and `lib/voice.ts`. Change ONLY after the gates below.

---

## A. Plateau threshold + consecutive-window count

### A1. Calibrate PLATEAU_SCORE_DELTA (the flat-band width)

Goal: the flat band should cover ordinary week-to-week noise, so a real stall stands
out clearly. Run this when ≥ 200 consecutive score-delta rows exist.

```sql
-- Distribution of absolute week-to-week Growth Score deltas per user.
-- "Normal wobble" = p50_abs_delta; the plateau band should be ≥ this.
with ordered as (
  select
    user_id,
    score,
    captured_at,
    lag(score) over (partition by user_id order by captured_at) as prev
  from growth_scores
)
select
  percentile_cont(0.5)  within group (order by abs(score - prev)) as p50_abs_delta,
  percentile_cont(0.75) within group (order by abs(score - prev)) as p75_abs_delta,
  percentile_cont(0.90) within group (order by abs(score - prev)) as p90_abs_delta,
  count(*) as n
from ordered
where prev is not null;
```

**Decision rule (PLATEAU_SCORE_DELTA):** set to `round(p50_abs_delta)` — the median
window-to-window wobble is the natural "flat" threshold. Floor at 2 (never tighten
below v1; Growth Score is 0–100 and sub-2 deltas are rounding noise). Cap at 5 (a wider
band silences genuine stalls). If `n < 200`, **keep `PLATEAU_SCORE_DELTA = 2`**.

### A2. Calibrate PLATEAU_WINDOWS (consecutive flat-window count)

Goal: N flat windows should *precede* disengagement — flag before a user ghosts, not
after. Validate by measuring how many consecutive flat windows preceded each user's first
28-day posting gap.

```sql
-- For each user, find the start of their first ≥ 28-day posting gap (churn proxy).
-- Then count growth_score rows in the 90 days before that gap.
with last_post as (
  select
    user_id,
    published_at,
    lead(published_at) over (partition by user_id order by published_at) as next_published_at
  from posts
  where status = 'published'
),
first_gap as (
  select
    user_id,
    published_at as gap_start
  from last_post
  where next_published_at is null
     or extract(epoch from (next_published_at - published_at)) / 86400 >= 28
  qualify row_number() over (partition by user_id order by published_at) = 1
),
scores_before_gap as (
  select
    fg.user_id,
    gs.score,
    gs.captured_at,
    lag(gs.score) over (partition by gs.user_id order by gs.captured_at) as prev_score
  from first_gap fg
  join growth_scores gs
    on gs.user_id = fg.user_id
   and gs.captured_at between fg.gap_start - interval '90 days' and fg.gap_start
)
select
  user_id,
  count(*) filter (where prev_score is not null and abs(score - prev_score) <= 2) as flat_windows_before_gap,
  count(*) as total_windows_before_gap
from scores_before_gap
group by user_id;
```

Run the above and compute the median `flat_windows_before_gap` across all users who
reached their first gap.

**Decision rule (PLATEAU_WINDOWS):** set to `median(flat_windows_before_gap)`, clamped
to `[2, 4]`. Interpretation: if users who eventually churned averaged 3 flat windows
before going quiet, N = 3 flags them just in time. If `n < 50` users reached a first
gap, **keep `PLATEAU_WINDOWS = 3`**. Re-evaluate quarterly.

### A3. Calibrate REGRESSION_SCORE_DELTA (single-window drop threshold)

Use the same delta distribution from A1:

**Decision rule (REGRESSION_SCORE_DELTA):** set to `-1 * round(p90_abs_delta)` — a drop
in the top decile of week-to-week moves is a genuine regression. Floor at -5 (never
relax beyond v1; catching a 5-point drop is already conservative). Cap at -10 (a very
wide regression band misses sharp collapses). If `p90_abs_delta` rounds to ≤ 5,
**keep `REGRESSION_SCORE_DELTA = -5`**.

### A4. Calibrate PLATEAU_FOLLOWER_GROWTH_PCT (follower-growth override floor)

Goal: a user whose followers are still growing is not in a true stall, even if their
score is flat. Validate the 1% floor against actual follower-growth distributions.

```sql
-- Rolling 28-day follower growth rate per user, across the plateau window span (84 days).
-- Each row is the growth rate over the most recent PLATEAU_WINDOWS * 28-day block.
with snap as (
  select
    user_id,
    snapshot_date,
    follower_count,
    lag(follower_count, 1) over (partition by user_id order by snapshot_date) as count_28d_ago
  from follower_snapshots
)
select
  user_id,
  snapshot_date,
  follower_count,
  count_28d_ago,
  round(
    (follower_count - count_28d_ago)::numeric / nullif(count_28d_ago, 0),
    4
  ) as growth_rate_28d
from snap
where count_28d_ago is not null
order by user_id, snapshot_date desc;
```

**Decision rule (PLATEAU_FOLLOWER_GROWTH_PCT):** compute the 25th percentile of
`growth_rate_28d` across all rows where the corresponding Growth Score window was flat
(use A1's delta data joined here). If p25 of the flat-score follower growth rate is
`> 0.01`, raise the floor to that p25 (too many genuinely-growing users are being
flagged). If p25 is `< 0.005`, lower to 0.005 (the floor is needlessly generous). If
the flat-score sample has `< 200` rows, **keep `PLATEAU_FOLLOWER_GROWTH_PCT = 0.01`**.

### A5. False-positive guardrail (run after any change)

Before shipping any threshold change, dry-run `detectPlateau` over all stored series:

```sql
-- Estimate the "would-flag" rate: users with PLATEAU_WINDOWS+ consecutive flat deltas
-- AND follower growth below the floor, in the last reporting week.
with recent_scores as (
  select
    user_id,
    score,
    captured_at,
    lag(score) over (partition by user_id order by captured_at) as prev
  from growth_scores
  where captured_at >= now() - interval '90 days'
),
deltas as (
  select user_id, abs(score - prev) as abs_delta, captured_at
  from recent_scores where prev is not null
),
flat_run as (
  select
    user_id,
    count(*) filter (where abs_delta <= 2) as flat_count,   -- substitute new PLATEAU_SCORE_DELTA
    count(*) as total
  from deltas
  group by user_id
  having count(*) >= 3                                       -- substitute new PLATEAU_WINDOWS
)
select
  count(*) as would_flag,
  (select count(distinct user_id) from posts where status='published'
     and published_at >= now() - interval '28 days') as active_users,
  round(
    count(*)::numeric /
    nullif((select count(distinct user_id) from posts where status='published'
              and published_at >= now() - interval '28 days'), 0),
    3
  ) as flag_rate
from flat_run
where flat_count >= 3;   -- substitute new PLATEAU_WINDOWS
```

**Guardrail:** the `flag_rate` must be `< 0.25` (flagging > 25% of active users in a
single week means the threshold is too tight and experiments would thrash). If the
guardrail fails, widen `PLATEAU_SCORE_DELTA` by 1 point and re-run.

---

## B. Report cadence

v1 = weekly, Mon 13:00 UTC, for all trend branches (up / flat / down / insufficient).
The cron always runs weekly; cadence tuning is implemented as a per-user skip in the
cron body based on `trend + growth_report_sent_at` age — the schedule itself does not
change.

Email engagement data lives in Resend, not Postgres. Pull it from Resend's dashboard
or events API, filtered to the `growth-report` template, segmented by subject-line
keyword (subjects encode the trend: "up" subjects contain "is up", "flat" contains
"held steady", "down" contains "dip", "insufficient" contains "first week").

**Decision rule (cadence per trend):**

| Condition | Action |
|---|---|
| 4-week rolling open rate for FLAT or INSUFFICIENT reports drops below 25% | Switch those two trends to bi-weekly: in the cron, skip a user on alternate weeks if their latest `trend ∈ {flat, insufficient}` and `growth_report_sent_at < 14 days ago`. Keep UP and DOWN weekly. |
| 4-week rolling click-through rate for any trend drops below 5% | Revise that trend's subject line and body copy before changing cadence. Copy fatigue is a content problem, not a frequency problem. |
| Open rate for UP / DOWN remains above 35% but flat/insufficient below 20% | Ship the bi-weekly gate for flat/insufficient only (do not touch UP/DOWN). |
| All four trend open rates consistently above 30% | Keep weekly; the reports are landing. Do not change. |

Do not change the `0 13 * * 1` Vercel cron schedule itself. Only add per-user skip
logic in `app/api/cron/growth-report/route.ts`.

---

## C. Performance-weight blend factor (PERF_BLEND) and impressions trust floor (PERF_SAMPLE_MIN_IMPRESSIONS)

### C1. Calibrate PERF_BLEND

Goal: bias the voice corpus toward high-reach writing without overfitting to a couple
of viral posts. v1 = 0.5 (equal trust between recency and performance).

First, measure the distribution of `impressions` across posts whose `voice_samples` are
now linked via `post_id`:

```sql
-- Coverage: what fraction of voice_samples carry a post_id (performance data linked)?
-- And what is the impression distribution for those posts?
select
  count(*) filter (where post_id is not null)   as samples_with_post,
  count(*) filter (where post_id is null)        as samples_no_post,
  count(*)                                       as total_samples
from voice_samples;
```

```sql
-- Impression distribution for posts linked to voice samples (the performance signal).
select
  count(*)                                                        as n,
  percentile_cont(0.25) within group (order by p.impressions)    as p25_impressions,
  percentile_cont(0.5)  within group (order by p.impressions)    as p50_impressions,
  percentile_cont(0.75) within group (order by p.impressions)    as p75_impressions,
  count(*) filter (where p.impressions < 50)                     as below_floor,
  count(*) filter (where p.impressions between 50 and 100)       as in_50_100_band,
  count(*) filter (where p.impressions > 100)                    as above_100
from voice_samples vs
join posts p on p.id = vs.post_id
where vs.post_id is not null;
```

**Backtest procedure for PERF_BLEND:** for candidate blends ∈ {0.0, 0.25, 0.5, 0.75}:
1. For each user who has ≥ 10 `voice_samples` with linked `post_id`, re-rank their
   corpus using the candidate blend and select the top 10 samples.
2. Re-distil a fingerprint from those 10 samples using `distillVoiceFingerprint`.
3. Regenerate their last 5 published posts with the new fingerprint.
4. Score voice fidelity: run `computeVoiceMatch` (the 6 stylometric dimensions in
   `lib/voice-match.ts`) between the regenerated post and the user's reference writing.
5. Record mean `voiceMatchScore` across all users at each candidate blend.
6. Track 28-day engagement rate of posts generated after the change (from `post_analytics`).

```sql
-- Engagement rate of posts generated after a fingerprint re-distil, by generation date.
-- (Use this to compare post-blend-change cohorts once data accumulates.)
select
  date_trunc('week', p.published_at)         as week,
  avg(
    (coalesce(p.reactions,0) + coalesce(p.comments,0) + coalesce(p.reshares,0) + coalesce(p.saves,0))
    / nullif(p.impressions, 0)
  )                                          as mean_engagement_rate,
  count(*)                                   as n_posts
from posts p
where p.status = 'published'
  and p.impressions is not null
  and p.impressions > 0
  and p.published_at >= now() - interval '90 days'
group by date_trunc('week', p.published_at)
order by week desc;
```

**Decision rule (PERF_BLEND):** pick the largest blend value whose mean
`voiceMatchScore` stays within 5 points of the `PERF_BLEND = 0.0` baseline (voice
still recognizably theirs) AND whose post engagement rate is ≥ baseline. If no blend
beats baseline engagement, **keep `PERF_BLEND = 0.5`** (it is voice-safe and was not
harmful in testing). Run only when `samples_with_post ≥ 200` across the user base
(coverage gate). Re-evaluate when coverage doubles again.

### C2. Calibrate PERF_SAMPLE_MIN_IMPRESSIONS (the impression trust floor)

The floor (v1 = 50) determines when a post's engagement rate is trusted. Too low
→ noisy signal from very-low-reach posts. Too high → performance weighting never
engages for most users.

```sql
-- What fraction of linked-post impressions fall in key bands?
-- Run after C1's impression distribution query above.
-- If > 30% are in the 50–100 band (thin signal), raise the floor.
-- If < 20% of samples ever exceed 50 impressions, lower the floor.
select
  round(100.0 * count(*) filter (where p.impressions between 50 and 100)
        / nullif(count(*) filter (where p.impressions is not null), 0), 1)
    as pct_in_50_100_band,
  round(100.0 * count(*) filter (where p.impressions >= 50)
        / nullif(count(*) filter (where p.impressions is not null), 0), 1)
    as pct_above_floor
from voice_samples vs
join posts p on p.id = vs.post_id
where vs.post_id is not null;
```

**Decision rule (PERF_SAMPLE_MIN_IMPRESSIONS):**
- If `pct_in_50_100_band > 30%`: raise floor to `100` (too many borderline posts
  carry thin signal; weight them out).
- If `pct_above_floor < 20%`: lower floor to `25` (most posts never reach 50
  impressions — weighting never engages).
- Otherwise: **keep `PERF_SAMPLE_MIN_IMPRESSIONS = 50`**.

---

## D. Dependency: voice_samples.post_id population

Performance weighting only engages for `voice_samples` rows that carry a `post_id`.
Today only the `'edit'`-source path (human correcting an AI draft) naturally has an
originating post. Until `addVoiceSample` is wired to set `post_id` on those calls,
`refreshFingerprint` degrades gracefully to recency-only (no fingerprint divergence from
pre-Phase-3 behavior). Track coverage with the C1 query above and revisit PERF_BLEND
calibration once `samples_with_post / total_samples ≥ 0.30`.

Wiring `post_id` on `addVoiceSample` calls is a follow-up — out of Phase 3 scope.

---

## Guardrail invariants (do NOT calibrate away)

- `PLATEAU_SCORE_DELTA` floored at 2 (never flag on sub-noise movement).
- `PLATEAU_WINDOWS` clamped to [2, 4] (never open experiments more than weekly).
- False-positive rate gate (Section A5): `< 25%` of active users flagged in any week.
- `REGRESSION_SCORE_DELTA` capped at -5 (never miss a genuine 5-point drop).
- `PERF_BLEND` changes require voice-fidelity gate: mean `voiceMatchScore` must stay
  within 5 points of the 0.0 baseline — do not trade voice identity for engagement.
- Cadence changes are per-trend skip logic only; the Vercel cron schedule (`0 13 * * 1`)
  is never modified as a calibration action.
