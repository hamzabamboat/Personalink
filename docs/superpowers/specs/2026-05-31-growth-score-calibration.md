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
