// lib/__tests__/oauth-flow.test.ts
import { describe, it, expect } from 'vitest'
import { pkceChallengeFromVerifier, verifyPkce, sanitizeScope, generateToken, sha256 } from '../oauth'

describe('oauth end-to-end pure flow', () => {
  it('a client that keeps its verifier can complete PKCE; an attacker with only the challenge cannot', () => {
    const verifier = generateToken()
    const challenge = pkceChallengeFromVerifier(verifier) // sent at /authorize
    // token endpoint check:
    expect(verifyPkce(verifier, challenge)).toBe(true)
    expect(verifyPkce(generateToken(), challenge)).toBe(false)
  })

  it('scope is narrowed to supported values', () => {
    expect(sanitizeScope('posts:read posts:publish admin:everything')).toBe('posts:read posts:publish')
  })

  it('tokens are stored hashed, never raw', () => {
    const raw = generateToken()
    const stored = sha256(raw)
    expect(stored).not.toBe(raw)
    expect(sha256(raw)).toBe(stored) // deterministic lookup
  })
})
