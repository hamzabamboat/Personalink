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
