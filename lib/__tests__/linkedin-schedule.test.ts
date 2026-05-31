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
