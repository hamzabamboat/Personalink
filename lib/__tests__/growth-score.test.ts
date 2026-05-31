import { describe, it, expect } from 'vitest'
import { clamp0_100, ratioScore, GROWTH_WEIGHTS, GROWTH_K } from '../growth-score'

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
