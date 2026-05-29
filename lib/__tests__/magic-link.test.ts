import { describe, it, expect } from 'vitest'
import { hashToken, generateToken, consumeMagicLinkToken } from '../magic-link'

describe('magic-link token primitives', () => {
  it('generates a 64-char hex token', () => {
    const t = generateToken()
    expect(t).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashes deterministically and differs from the raw token', () => {
    const t = generateToken()
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/)
    const h1 = hashToken(t)
    const h2 = hashToken(t)
    expect(h1).toBe(h2)
    expect(hashToken(t)).not.toBe(t)
  })
})

describe('consumeMagicLinkToken input validation', () => {
  it('returns null for malformed tokens without touching the DB', async () => {
    for (const bad of ['', 'abc', 'g'.repeat(64), 'A'.repeat(64), generateToken().slice(0, 63)]) {
      expect(await consumeMagicLinkToken(bad)).toBeNull()
    }
  })
})
