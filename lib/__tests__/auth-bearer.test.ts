import { describe, it, expect, vi, beforeEach } from 'vitest'

const { maybeSingle, eq, select, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle, single: maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { maybeSingle, eq, select, from }
})
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from } }))

import { getUserFromToken } from '../auth'
import { sha256 } from '../oauth'

describe('getUserFromToken', () => {
  beforeEach(() => { maybeSingle.mockReset(); from.mockClear() })

  it('returns null for an unknown token', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null }) // token lookup misses
    const user = await getUserFromToken('nope')
    expect(user).toBeNull()
  })

  it('resolves the user for a valid unexpired token', async () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    maybeSingle
      .mockResolvedValueOnce({ data: { user_id: 'u1', scope: 'posts:read', access_expires_at: future, revoked_at: null } })
      .mockResolvedValueOnce({ data: { id: 'u1', email: 'a@b.com' } })
    const user = await getUserFromToken('secret')
    expect(user?.id).toBe('u1')
    // token was looked up by its hash, never raw
    expect(eq).toHaveBeenCalledWith('access_token', sha256('secret'))
  })

  it('rejects an expired token', async () => {
    const past = new Date(Date.now() - 1000).toISOString()
    maybeSingle.mockResolvedValueOnce({ data: { user_id: 'u1', scope: 'posts:read', access_expires_at: past, revoked_at: null } })
    const user = await getUserFromToken('secret')
    expect(user).toBeNull()
  })
})
