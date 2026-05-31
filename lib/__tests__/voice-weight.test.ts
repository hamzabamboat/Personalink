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
    const hi = performanceWeight({ impressions: 1000, reactions: 80, comments: 10, reshares: 5, saves: 5 })!
    const lo = performanceWeight({ impressions: 1000, reactions: 5, comments: 0, reshares: 0, saves: 0 })!
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
