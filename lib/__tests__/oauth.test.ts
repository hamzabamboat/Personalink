import { describe, it, expect } from 'vitest'
import { sha256, pkceChallengeFromVerifier, verifyPkce, generateToken, ACCESS_TTL_MS, REFRESH_TTL_MS, CODE_TTL_MS, bearerScopeFor } from '../oauth'

describe('oauth helpers', () => {
  it('sha256 is stable hex', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('derives an S256 challenge as base64url with no padding', () => {
    const challenge = pkceChallengeFromVerifier('verifier-123')
    expect(challenge).not.toContain('=')
    expect(challenge).not.toContain('+')
    expect(challenge).not.toContain('/')
  })

  it('verifyPkce accepts a matching verifier and rejects a wrong one', () => {
    const verifier = 'a-long-random-code-verifier-string-1234567890'
    const challenge = pkceChallengeFromVerifier(verifier)
    expect(verifyPkce(verifier, challenge)).toBe(true)
    expect(verifyPkce('wrong', challenge)).toBe(false)
  })

  it('generateToken returns a long unguessable string', () => {
    const a = generateToken()
    const b = generateToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(43)
  })

  it('TTLs have sane ordering', () => {
    expect(CODE_TTL_MS).toBeLessThan(ACCESS_TTL_MS)
    expect(ACCESS_TTL_MS).toBeLessThan(REFRESH_TTL_MS)
  })
})

describe('bearerScopeFor', () => {
  it('denies Bearer on unlisted routes (billing, account, oauth admin)', () => {
    expect(bearerScopeFor('/api/dodo/create-subscription', 'POST')).toBeNull()
    expect(bearerScopeFor('/api/razorpay/verify', 'POST')).toBeNull()
    expect(bearerScopeFor('/api/oauth/connected', 'GET')).toBeNull()
    expect(bearerScopeFor('/api/account/delete', 'POST')).toBeNull()
  })
  it('requires posts:read for reads and posts:write for writes', () => {
    expect(bearerScopeFor('/api/posts', 'GET')).toBe('posts:read')
    expect(bearerScopeFor('/api/me', 'GET')).toBe('posts:read')
    expect(bearerScopeFor('/api/posts/generate', 'POST')).toBe('posts:write')
    expect(bearerScopeFor('/api/memories', 'PATCH')).toBe('posts:write')
  })
  it('requires posts:publish for approve/send-approval', () => {
    expect(bearerScopeFor('/api/posts/abc123/approve', 'POST')).toBe('posts:publish')
    expect(bearerScopeFor('/api/posts/abc123/send-approval', 'POST')).toBe('posts:publish')
  })
  it('does not match prefix-lookalike routes', () => {
    expect(bearerScopeFor('/api/mem', 'GET')).toBeNull()
    expect(bearerScopeFor('/api/postsfoo', 'GET')).toBeNull()
  })
})
