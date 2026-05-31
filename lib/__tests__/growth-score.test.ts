import { describe, it, expect } from 'vitest'
import {
  clamp0_100, ratioScore, meanOrNull, poolSubScore, computeGrowthScore,
  GROWTH_WEIGHTS, GROWTH_K,
} from '../growth-score'

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
