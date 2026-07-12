import { describe, it, expect } from 'vitest'
import { fingerprintAngle, angleCollides, COLLISION_THRESHOLD } from '@/lib/brand-fingerprint'

describe('fingerprintAngle', () => {
  it('is deterministic and order-independent', () => {
    const a = fingerprintAngle('How Zomato scaled', 'unit economics and dark stores')
    const b = fingerprintAngle('scaled Zomato How', 'dark stores and unit economics')
    expect(a).toBe(b)
  })

  it('normalizes case and punctuation, drops short words', () => {
    // "of", "to", "the" (<=3 chars) are dropped; longer tokens survive lowercased.
    const fp = fingerprintAngle('The Rise of Notion!', 'to product-led growth')
    expect(fp).not.toContain('the')
    expect(fp).toContain('notion')
    expect(fp).toContain('growth')
  })

  it('produces different fingerprints for different content', () => {
    const a = fingerprintAngle('Zomato dark-store logistics', 'hyperlocal delivery density')
    const b = fingerprintAngle('Notion product-led growth', 'bottom-up adoption loops')
    expect(a).not.toBe(b)
  })
})

describe('angleCollides', () => {
  const seed = fingerprintAngle('Zomato dark stores', 'hyperlocal delivery density and unit economics')

  it('returns false against an empty set', () => {
    expect(angleCollides(fingerprintAngle('anything here', 'novel angle'), [])).toBe(false)
  })

  it('flags a near-duplicate above threshold', () => {
    const nearDup = fingerprintAngle('Zomato dark stores', 'hyperlocal delivery density with unit economics')
    expect(angleCollides(nearDup, [seed])).toBe(true)
  })

  it('passes a genuinely distinct angle below threshold', () => {
    const distinct = fingerprintAngle('Zomato founder culture', 'contrarian hiring philosophy and remote teams')
    expect(angleCollides(distinct, [seed])).toBe(false)
  })

  it('ignores empty/blank fingerprints in the locked set', () => {
    expect(angleCollides(seed, ['', '   '])).toBe(false)
  })

  it('respects a custom threshold', () => {
    const partial = fingerprintAngle('Zomato dark stores', 'completely different tail words here')
    // Loose threshold should catch the shared "zomato dark stores" head.
    expect(angleCollides(partial, [seed], 0.2)).toBe(true)
    // Strict threshold should not.
    expect(angleCollides(partial, [seed], 0.9)).toBe(false)
  })
})

describe('COLLISION_THRESHOLD', () => {
  it('is a sane mid-range default', () => {
    expect(COLLISION_THRESHOLD).toBeGreaterThan(0.3)
    expect(COLLISION_THRESHOLD).toBeLessThan(0.8)
  })
})
