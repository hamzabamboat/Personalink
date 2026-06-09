import { describe, it, expect } from 'vitest'
import { parseUsdInrRate, inrFromUsd, FX_FALLBACK_USD_INR } from '@/lib/fx'

describe('parseUsdInrRate', () => {
  it('extracts a valid INR rate', () => {
    expect(parseUsdInrRate({ rates: { INR: 85.2 } })).toBe(85.2)
  })
  it('rejects out-of-band (too high)', () => {
    expect(parseUsdInrRate({ rates: { INR: 5000 } })).toBeNull()
  })
  it('rejects out-of-band (too low)', () => {
    expect(parseUsdInrRate({ rates: { INR: 10 } })).toBeNull()
  })
  it('rejects missing INR', () => {
    expect(parseUsdInrRate({ rates: { EUR: 0.9 } })).toBeNull()
  })
  it('rejects malformed payloads', () => {
    expect(parseUsdInrRate(null)).toBeNull()
    expect(parseUsdInrRate('nope')).toBeNull()
    expect(parseUsdInrRate({})).toBeNull()
    expect(parseUsdInrRate({ rates: { INR: 'x' } })).toBeNull()
  })
})

describe('inrFromUsd', () => {
  it('rounds to whole rupees', () => {
    expect(inrFromUsd(39, 85)).toBe(3315)
    expect(inrFromUsd(19, 84.4)).toBe(1604) // 1603.6 → 1604
  })
})

describe('FX_FALLBACK_USD_INR', () => {
  it('is a sane recent default', () => {
    expect(FX_FALLBACK_USD_INR).toBe(94)
  })
})
