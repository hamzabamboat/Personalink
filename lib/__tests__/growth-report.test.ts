import { describe, it, expect } from 'vitest'
import { pctChange, signedPct, signedInt, REPORT_WINDOW_DAYS } from '../growth-report'

describe('growth-report leaf helpers', () => {
  it('pctChange returns fractional change vs a prior value', () => {
    expect(pctChange(140, 100)).toBeCloseTo(0.4, 10)   // +40%
    expect(pctChange(50, 100)).toBeCloseTo(-0.5, 10)    // -50%
    expect(pctChange(100, 100)).toBe(0)
  })

  it('pctChange returns null when the prior is zero/absent (no baseline to compare)', () => {
    expect(pctChange(10, 0)).toBeNull()
    expect(pctChange(10, null)).toBeNull()
    expect(pctChange(null, 100)).toBe(-1) // had a baseline, now nothing → -100%
  })

  it('signedPct formats a fraction as a +/- percentage string', () => {
    expect(signedPct(0.4)).toBe('+40%')
    expect(signedPct(-0.5)).toBe('-50%')
    expect(signedPct(0)).toBe('+0%')
    expect(signedPct(null)).toBe('—')
  })

  it('signedInt formats a signed integer with thousands separators', () => {
    expect(signedInt(120)).toBe('+120')
    expect(signedInt(-3)).toBe('-3')
    expect(signedInt(0)).toBe('+0')
    expect(signedInt(1200)).toBe('+1,200')
    expect(signedInt(null)).toBe('—')
  })

  it('exposes the v1 report window', () => {
    expect(REPORT_WINDOW_DAYS).toBe(28)
  })
})
