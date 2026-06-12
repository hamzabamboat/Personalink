import { describe, it, expect } from 'vitest'
import { postAttentionKind } from '../posts-attention'

const NOW = new Date('2026-06-12T12:00:00Z')
const past = '2026-06-10T09:00:00Z'
const future = '2026-06-20T09:00:00Z'

describe('postAttentionKind', () => {
  it('overdue: scheduled with a past time', () => {
    expect(postAttentionKind({ status: 'scheduled', scheduled_at: past }, NOW)).toBe('overdue')
  })
  it('null: scheduled in the future', () => {
    expect(postAttentionKind({ status: 'scheduled', scheduled_at: future }, NOW)).toBe(null)
  })
  it('null: scheduled exactly at now (boundary = upcoming)', () => {
    expect(postAttentionKind({ status: 'scheduled', scheduled_at: NOW.toISOString() }, NOW)).toBe(null)
  })
  it('failed: any failed post, regardless of time', () => {
    expect(postAttentionKind({ status: 'failed', scheduled_at: past }, NOW)).toBe('failed')
    expect(postAttentionKind({ status: 'failed', scheduled_at: null }, NOW)).toBe('failed')
  })
  it('null: healthy/other statuses', () => {
    expect(postAttentionKind({ status: 'draft', scheduled_at: null }, NOW)).toBe(null)
    expect(postAttentionKind({ status: 'published', scheduled_at: past }, NOW)).toBe(null)
    expect(postAttentionKind({ status: 'pending_approval', scheduled_at: past }, NOW)).toBe(null)
  })
})
