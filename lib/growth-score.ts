import { supabaseAdmin } from './supabase-admin'
import type { MetricSource } from './supabase'

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
  breakdown: import('./supabase').GrowthBreakdown
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
