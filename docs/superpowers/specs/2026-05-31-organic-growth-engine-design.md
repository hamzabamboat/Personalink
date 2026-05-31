# Organic Growth Engine — Design (Master Roadmap)

**Date:** 2026-05-31
**Status:** Approved (roadmap shape + key decisions); each phase gets its own spec → plan

## Problem

The product's end goal is not signups — it is **users who can see their organic
LinkedIn growth measurably improve, and feel it enough to stay.** Reaching that
requires a loop: *capture performance → learn what drives each person's reach →
only then tweak how we post → keep monitoring and re-tweaking.* Retention is the
**downstream effect of that loop working**, not a separate feature.

Three gaps block this today:

1. **We don't record trends — we overwrite them.** `sync-stats` runs
   `UPDATE posts SET impressions=…` ([app/api/linkedin/sync-stats/route.ts:102](../../../app/api/linkedin/sync-stats/route.ts)),
   keeping a single lifetime number per post. The `post_analytics` table built
   for time-stamped snapshots has **zero writes** anywhere in the codebase. You
   cannot analyze a trend you never stored.
2. **Generation is static.** Post outcomes never feed back into generation or
   scheduling. The scheduler uses a global heuristic ([lib/linkedin-schedule.ts](../../../lib/linkedin-schedule.ts)
   `DOW_WEIGHT`, Wed=1.0) identical for every user.
3. **We're on the wrong LinkedIn API.** `sync-stats` calls the legacy
   `/v2/shareStatistics`, which 403s for personal profiles and falls back to
   public reaction counts (no impressions). LinkedIn shipped a **Member Creator
   Analytics API in July 2025** that exposes impressions, reach, follower growth,
   link clicks, saves, and per-post attribution of followers-gained and
   profile-views-driven — but it is partner-gated.

This document is the **master roadmap**. It defines the north-star, the data
foundation, and four sequenced phases. Each phase (starting with Phase 0) gets
its own detailed spec → implementation plan when we begin it. This doc is not an
implementation plan itself.

## North-Star: the Growth Score

The engine optimizes for and reports a single **Growth Score (0–100)** — a
composite, because no one metric captures "organic growth." Per the founder's
requirement, **the breakdown is always visible** (how the score is calculated is
never a black box). It follows the existing `linkedin_scores.breakdown` jsonb
pattern.

**Measured against the user's own rolling baseline, not an absolute scale.** A
user with 50 followers and one with 50k both want to see *their* number climbing.
The score rewards *improvement over the user's own trailing window*, so it is
meaningful at any size and directly expresses "seeing the difference."

Four sub-scores (each 0–100, vs. the user's prior 28-day baseline), then weighted:

| Sub-score | Weight (v1) | Signal | Source metrics |
|---|---|---|---|
| **Reach** | 30% | Are more people seeing them | `IMPRESSION`, `MEMBERS_REACHED` |
| **Audience** | 30% | Are they building a following | `memberFollowersCount` delta, `FOLLOWER_GAINED_FROM_CONTENT` |
| **Resonance** | 25% | Is the content landing | engagement rate = (`REACTION`+`COMMENT`+`RESHARE`+`POST_SAVE`) / `IMPRESSION` |
| **Authority** | 15% | Is it converting to opportunity | `PROFILE_VIEW_FROM_CONTENT`, search appearances |

- **Weights are v1 defaults, explicitly tunable** once Phase 1 data shows which
  components actually correlate with retention. They are not gospel.
- **Cold start (no baseline):** seed each sub-score from the **cohort median**
  (partial pooling), blending toward the user's own data as it accumulates:
  `w_self = n / (n + K)`. This avoids "learning" from 3 posts.
- `breakdown` jsonb stores `{ reach, audience, resonance, authority, weights,
  baseline_window, n_posts, w_self, source }` so the UI can render the full
  derivation.
- The Growth Score is **additive** — the existing profile-health "LinkedIn
  Score" (`linkedin_scores`) stays as-is; it measures profile completeness, not
  growth.

## Constraints & Key Decisions

Settled during brainstorming:

1. **North-star = composite Growth Score, breakdown always visible** (above).
2. **LinkedIn access: Community Management API application already submitted.**
   Gate 0's external clock is already running. We do not wait on it to start
   building — see #3.
3. **Capture is source-abstracted, with a fallback that works today.** Every
   stored metric carries a `source` of `creator_api` | `public_fallback` |
   `manual`. Phase 0 ships against the `public_fallback` (today's
   `socialActions`: reactions + comments only, no impressions) and switches to
   `creator_api` automatically per-user once their token carries the new scopes.
   No rebuild on approval; provenance is preserved so we never mix sources
   silently. The fallback is cheap and de-risks approval delay/denial.
4. **The new API surface** ([Member Post Statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/post-statistics?view=li-lms-2026-05),
   [Member Follower Statistics](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/members/follower-statistics?view=li-lms-2026-05)):
   - `memberCreatorPostAnalytics` (scope `r_member_postAnalytics`) — per-post and
     aggregate metrics incl. `FOLLOWER_GAINED_FROM_CONTENT`,
     `PROFILE_VIEW_FROM_CONTENT`, `LINK_CLICKS`, `POST_SAVE`.
   - `memberFollowersCount` (scope `r_member_profileAnalytics`) — lifetime **and
     daily** follower counts; also profile viewers + search appearances.
   - Calls use the versioned `/rest/` base + `Linkedin-Version: YYYYMM` header.
     **LinkedIn sunsets versions every few months** — we pin a version constant
     and treat upgrades as recurring maintenance.
5. **Per-post impression velocity is NOT available from the API** (it blocks
   `DAILY` impressions at post level — only lifetime `TOTAL`). The 1h/24h/7d
   velocity curve must be **snapshotted by us, going forward** — it cannot be
   backfilled. **Follower history CAN be backfilled** via the `dateRange` finder,
   so it is recoverable. Implication: the cost of delay is *post velocity*, which
   is why Phase 0 capture should start the day the data source is live.
6. **Metrics are "best-effort accurate" and the API warns reactions/comments/
   reshares are "not consistent with the UI."** We never promise UI-exact
   numbers; we label source, show trends over absolutes, and reconcile rather
   than claim precision.
7. **Tweaks are experiments, never silent global changes.** Every Phase 2
   intervention holds a baseline/control and measures lift. "Users seeing the
   difference" is only provable against a control.
8. **Small-N is handled by cohort partial pooling** (see Cold start). At ~2
   posts/day, per-user signal is noise for months without it.
9. **"Activity" (the user's own commenting/engaging on others' posts) is
   explicitly DEFERRED.** LinkedIn's API does not expose it. Tracking it would
   need a browser extension or manual logging — a separate track, out of scope
   for this roadmap. Posting *consistency* is in scope (already derivable).
10. **This is a master roadmap.** Each phase is a sub-project with its own spec →
    plan → implementation cycle. Phases are gated on having **enough data**, not
    just enough code.

## Architecture Overview

A four-stage pipeline sitting on a shared, source-abstracted capture layer:

```
                    ┌─────────────────────────────────────────────┐
   LinkedIn API ───►│  CAPTURE (Phase 0)                           │
   (creator_api |   │  scheduled cron → time-series snapshots      │
    public_fallback)│  posts(latest) + post_analytics(velocity)    │
                    │  follower_snapshots + profile_analytics       │
                    └───────────────────┬─────────────────────────┘
                                        │  (weeks of data accrue)
                    ┌───────────────────▼─────────────────────────┐
                    │  UNDERSTAND (Phase 1)  — read-only insight   │
                    │  per-pillar/format/time perf, velocity class,│
                    │  content→growth attribution, Growth Score,   │
                    │  cohort baselines for pooling                │
                    └───────────────────┬─────────────────────────┘
                                        │  (trustworthy baseline)
                    ┌───────────────────▼─────────────────────────┐
                    │  INTERVENE (Phase 2)  — experiments          │
                    │  per-user learned timing/format/pillar/hook, │
                    │  control-vs-treatment, measured lift          │
                    └───────────────────┬─────────────────────────┘
                                        │  (experiment results)
                    ┌───────────────────▼─────────────────────────┐
                    │  SUSTAIN (Phase 3)  — the retention surface  │
                    │  attributable growth report, plateau detect, │
                    │  performance-aware voice fingerprint          │
                    └─────────────────────────────────────────────┘
```

## Data Model

Additions (Supabase, snake_case, following existing conventions):

**`users` (extend) — track per-user capability**
- `linkedin_scopes text[]` — granted scopes, so capture knows `creator_api` vs `public_fallback` per user.

**`posts` (extend) — "latest" cache of attributed metrics**
- Keep `impressions`, `reactions`, `comments`.
- Add `reshares`, `saves`, `link_clicks`, `members_reached`, `followers_gained`,
  `profile_views_from_post` (all `integer`, nullable).
- Add `metric_source text` (`creator_api`|`public_fallback`|`manual`),
  `metrics_synced_at timestamptz`.

**`post_analytics` (ACTIVATE + extend) — velocity time series**
- `id, post_id, user_id, captured_at, age_minutes int, impressions, reactions,
  comments, reshares, saves, link_clicks, members_reached, source`.
- Written on a schedule at ~1h/6h/24h/3d/7d after publish.

**`follower_snapshots` (NEW) — daily audience growth**
- `id, user_id, snapshot_date date, follower_count int, source`,
  `unique(user_id, snapshot_date)`. **Backfilled on connect** via the
  `dateRange` finder.

**`profile_analytics` (NEW) — daily authority signals**
- `id, user_id, snapshot_date date, profile_views int, search_appearances int,
  source`, `unique(user_id, snapshot_date)`.

**`growth_scores` (NEW) — mirrors `linkedin_scores`**
- `id, user_id, captured_at, score int, breakdown jsonb`.

**`experiments` (NEW, Phase 2)**
- `id, user_id, hypothesis text, dimension text` (timing|format|pillar|hook|length),
  `control jsonb, treatment jsonb, baseline_metric text, started_at, ended_at,
  status text` (running|won|lost|inconclusive), `result jsonb` (lift, p-ish
  confidence, n).
- `posts` gets `experiment_id`, `variant text` (control|treatment).

**`cohort_baselines` (NEW, Phase 1) — pooling priors**
- Periodic rollup of cohort medians per sub-score, for cold-start blending.

## Phases

### Gate 0 — Unlock the data (critical path, already in flight)
- **Goal:** legitimate access to impressions + growth metrics.
- **Now:** Community Management API application **submitted**; code on legacy
  `shareStatistics`.
- **Build:** OAuth scope additions (`r_member_postAnalytics`,
  `r_member_profileAnalytics`); migrate to `/rest/memberCreatorPostAnalytics` +
  `memberFollowersCount` with the versioned header; version-pinning constant;
  the `public_fallback` adapter so we are not blocked while approval lands.
- **Exit:** at least the fallback source is writing snapshots; full source flips
  on per-user when scopes are granted.

### Phase 0 — Capture (pure gathering, zero UX change)
- **Goal:** every vision signal recorded as a time series.
- **Build:** activate `post_analytics` velocity snapshots; `follower_snapshots`
  (+ historical backfill); `profile_analytics`; extend `posts`; move sync from
  on-click to **scheduled QStash cron** for consistency across users.
- **Exit:** several weeks of continuous snapshots for active users — the
  baseline (exact threshold set in the Phase 0 spec).

### Phase 1 — Understand (read-only insight)
- **Goal:** "what's working for *this* person, what's driving their audience."
- **Build:** per-pillar / per-format / per-time-slot performance; velocity
  classification (fast-spike vs slow-burn); **content→growth attribution**
  (`FOLLOWER_GAINED_FROM_CONTENT`, `PROFILE_VIEW_FROM_CONTENT`); compute the
  Growth Score + cohort baselines; insight surfaces for user and operator.
- **Exit:** Growth Score stable; per-user signal distinguishable from cohort
  prior for sufficiently active users.

### Phase 2 — Intervene (experiments, gated on Phase 1)
- **Goal:** tweak how we post **and prove the tweak caused the lift.**
- **Build:** replace global `DOW_WEIGHT` with per-user learned timing/format/
  pillar/hook weights; wrap each change in an experiment (control vs treatment,
  measured lift, auto-rollback of losers); `experiments` + post `variant` tag.
- **Exit:** ≥1 dimension showing reproducible, attributable lift.

### Phase 3 — Sustain (monitor + retention surface)
- **Goal:** turn measured growth into *felt* growth.
- **Build:** evolve the day-7 stats email into a recurring **attributable growth
  report** ("impressions +40%, +120 followers since we moved you to Tue mornings
  and leaned into your founder-story pillar"); plateau/regression detection that
  re-opens experiments; make the **voice fingerprint performance-aware** (today
  it re-distills every ~20 samples regardless of results — [lib/voice.ts](../../../lib/voice.ts)).
- **Exit:** users receive attributable growth narratives; loop self-sustains.

## Experiment Framework (Phase 2 detail)

- **One change at a time per user**, against a rolling baseline window.
- **Lift = treatment vs the user's own pre-experiment baseline**, with cohort
  pooling to stabilize small N.
- **Guardrails:** minimum sample (posts/days) before judging; auto-rollback if a
  treatment underperforms baseline beyond a threshold; never run conflicting
  experiments on the same dimension simultaneously.
- **No silent global shifts** — a change that isn't measured against a control
  is not allowed, because it destroys attribution.

## Sequencing & Dependencies

```
Gate 0 ──► Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3
(access,   (capture,  (insight,   (tweak as   (report,
 in        weeks of   pooling)    experiments) sustain)
 flight)   data)
```

Gate 0 and Phase 0 design proceed **now, in parallel** with the access review.
Later phases are gated on *data readiness*, not just code — matching the
"gather substantially first, only then tweak" discipline.

**Migration ordering.** Because phases ship weeks apart, each phase's migrations
are dated/created **at the time that phase is executed**, in phase order, so the
canonical apply-order is: Phase 0 (capture) → Phase 1 (`growth_scores`,
`cohort_baselines`, `posts.format`) → Phase 2 (`experiments`,
`posts.experiment_id/variant`) → Phase 3 (`voice_samples.post_id`,
`growth_report_sent_at`). The DDL is independent (no cross-phase foreign keys), so
order is for clarity, not correctness. The dated filenames in the per-phase plans
are illustrative placeholders to be re-stamped on execution.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Partner access slow/denied | `public_fallback` source ships value now; source-abstracted layer flips on approval with no rebuild. |
| API counts ≠ LinkedIn UI ("best-effort") | Label `source`; lead with trends not absolutes; never promise UI-exact figures. |
| Small-N per user | Cohort partial pooling with `w_self = n/(n+K)`. |
| Post velocity not backfillable | Start Phase 0 capture the day a source is live; accept that pre-capture velocity is lost (followers are recoverable). |
| LinkedIn version sunsets | Single pinned version constant; scheduled upgrade as known maintenance. |
| Attribution invalidity (correlation≠cause) | Phase 2 control/treatment design; don't claim lift without it. |
| Rate limits on per-post sync | Batch via aggregate `me` finder where possible; cap snapshots per tick (existing pattern). |

## Open Questions (deferred to per-phase specs)

- Exact snapshot cadence and retention window for `post_analytics`.
- `K` (pooling strength) and the baseline window length (28d assumed).
- Whether `cohort_baselines` are global or segmented (industry/tier).
- Growth Score weight tuning method once Phase 1 data exists.
- Whether the deferred "activity" track ever becomes a browser-extension project.
