import { describe, it, expect } from 'vitest'
import { BRAND_FONTS, resolveBrandFont } from '@/lib/images/fonts'

describe('BRAND_FONTS', () => {
  it('has unique ids', () => {
    const ids = BRAND_FONTS.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every font has a label, family, vibe and a valid kind', () => {
    for (const f of BRAND_FONTS) {
      expect(f.label).toBeTruthy()
      expect(f.family).toBeTruthy()
      expect(f.vibe).toBeTruthy()
      expect(['sans', 'serif']).toContain(f.kind)
    }
  })

  it('offers a meaningful spread of choices', () => {
    expect(BRAND_FONTS.length).toBeGreaterThanOrEqual(4)
    expect(BRAND_FONTS.some(f => f.kind === 'serif')).toBe(true)
    expect(BRAND_FONTS.some(f => f.kind === 'sans')).toBe(true)
  })
})

describe('resolveBrandFont', () => {
  it('returns null for empty / unknown ids (→ system sans fallback)', () => {
    expect(resolveBrandFont(null)).toBeNull()
    expect(resolveBrandFont(undefined)).toBeNull()
    expect(resolveBrandFont('')).toBeNull()
    expect(resolveBrandFont('not-a-real-font')).toBeNull()
  })

  it('resolves a known id to its definition', () => {
    expect(resolveBrandFont('inter')?.family).toBe('Inter')
    expect(resolveBrandFont('playfair-display')?.kind).toBe('serif')
  })
})
