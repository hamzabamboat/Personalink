import { describe, it, expect } from 'vitest'
import { hashToken, generateToken } from '../magic-link'

describe('magic-link token primitives', () => {
  it('generates a 64-char hex token', () => {
    const t = generateToken()
    expect(t).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashes deterministically and differs from the raw token', () => {
    const t = generateToken()
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken(t)).toBe(hashToken(t))
    expect(hashToken(t)).not.toBe(t)
  })
})
