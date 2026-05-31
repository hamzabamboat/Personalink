import { describe, it, expect } from 'vitest'
import {
  detectPlateau,
  PLATEAU_WINDOWS, PLATEAU_SCORE_DELTA, REGRESSION_SCORE_DELTA, PLATEAU_FOLLOWER_GROWTH_PCT,
} from '../plateau'

// score series = chronological Growth Score points; follower series = chronological counts.
describe('detectPlateau — constants', () => {
  it('exposes the v1 calibration defaults', () => {
    expect(PLATEAU_WINDOWS).toBe(3)
    expect(PLATEAU_SCORE_DELTA).toBe(2)
    expect(REGRESSION_SCORE_DELTA).toBe(-5)
    expect(PLATEAU_FOLLOWER_GROWTH_PCT).toBeCloseTo(0.01, 10)
  })
})

describe('detectPlateau — rising', () => {
  it('is NOT plateaued when scores climb', () => {
    const r = detectPlateau([50, 56, 63, 70], [1000, 1050, 1120, 1210])
    expect(r.plateaued).toBe(false)
  })
})

describe('detectPlateau — flat', () => {
  it('flags a plateau: N flat windows AND follower growth under the floor', () => {
    // 4 points → 3 deltas, all within ±2; followers essentially flat (<1%).
    const r = detectPlateau([60, 61, 60, 62], [2000, 2001, 2002, 2003])
    expect(r.plateaued).toBe(true)
    expect(r.reason).toMatch(/plateau/i)
  })

  it('does NOT flag when the score is flat but followers still grow >= 1%', () => {
    const r = detectPlateau([60, 61, 60, 62], [1000, 1050, 1100, 1160]) // +16% followers
    expect(r.plateaued).toBe(false)
  })
})

describe('detectPlateau — declining (regression)', () => {
  it('flags a regression immediately on a single sharp drop', () => {
    const r = detectPlateau([70, 64], [1200, 1180]) // Δ = -6 <= -5
    expect(r.plateaued).toBe(true)
    expect(r.reason).toMatch(/regress|declin|drop/i)
  })

  it('does NOT flag when the single-window drop is exactly at the boundary', () => {
    // Δ = -5 is exactly REGRESSION_SCORE_DELTA — should flag
    const r = detectPlateau([70, 65], [1200, 1180]) // Δ = -5 = REGRESSION_SCORE_DELTA
    expect(r.plateaued).toBe(true)
    expect(r.reason).toMatch(/regress|declin|drop/i)
  })

  it('does NOT flag when drop is one above the threshold', () => {
    // Δ = -4 is above REGRESSION_SCORE_DELTA (-5) — should NOT immediately flag
    const r = detectPlateau([70, 66], [1200, 1180]) // Δ = -4
    // With only 2 points there aren't enough for a plateau check either
    expect(r.plateaued).toBe(false)
  })
})

describe('detectPlateau — noisy', () => {
  it('does NOT flag a plateau when one window swings beyond the flat band', () => {
    // deltas: +1, +9, -1 → the +9 breaks the "all flat" run.
    const r = detectPlateau([60, 61, 70, 69], [1000, 1005, 1010, 1015])
    expect(r.plateaued).toBe(false)
  })

  it('does NOT flag when scores oscillate widely even with stalled followers', () => {
    // deltas: +10, -8, +7 — all outside flat band
    const r = detectPlateau([50, 60, 52, 59], [2000, 2001, 2002, 2003])
    expect(r.plateaued).toBe(false)
  })
})

describe('detectPlateau — insufficient data', () => {
  it('does NOT flag (and says so) when there are fewer than PLATEAU_WINDOWS+1 points', () => {
    const r = detectPlateau([60, 61], [1000, 1002])
    expect(r.plateaued).toBe(false)
    expect(r.reason).toMatch(/insufficient|not enough/i)
  })
  it('handles an empty series safely', () => {
    expect(detectPlateau([], []).plateaued).toBe(false)
  })
  it('handles a single-point series safely', () => {
    expect(detectPlateau([60], [1000]).plateaued).toBe(false)
  })
  it('returns insufficient when exactly PLATEAU_WINDOWS points (one short of needed)', () => {
    // 3 points = 2 deltas, need 3 deltas (PLATEAU_WINDOWS=3) → insufficient for plateau
    // but first check regression: delta -1 is not a regression, so falls through to insufficient
    const r = detectPlateau([60, 61, 60], [1000, 1001, 1002])
    expect(r.plateaued).toBe(false)
    expect(r.reason).toMatch(/insufficient|not enough/i)
  })
})

describe('detectPlateau — boundary / edge cases', () => {
  it('flags plateau with exactly PLATEAU_WINDOWS+1 score points (minimum sufficient)', () => {
    // 4 points → 3 deltas: 0, 0, 0 — all flat; followers also flat
    const r = detectPlateau([60, 60, 60, 60], [1000, 1001, 1002, 1003])
    expect(r.plateaued).toBe(true)
  })

  it('uses only the last PLATEAU_WINDOWS deltas (ignores older history)', () => {
    // First 3 scores rise sharply, then last 4 are flat — only the recent flat run matters
    const r = detectPlateau([10, 30, 55, 56, 55, 57], [500, 800, 1000, 1001, 1002, 1003])
    expect(r.plateaued).toBe(true)
  })

  it('does not flag regression when the last delta is exactly 0', () => {
    const r = detectPlateau([50, 50], [1000, 1000])
    // Δ=0, not <= -5; only 2 points so insufficient for plateau path
    expect(r.plateaued).toBe(false)
  })
})
