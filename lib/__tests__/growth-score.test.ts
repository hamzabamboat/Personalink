import { describe, it, expect } from 'vitest'
import { clamp0_100, ratioScore, meanOrNull, poolSubScore, GROWTH_WEIGHTS, GROWTH_K } from '../growth-score'

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
