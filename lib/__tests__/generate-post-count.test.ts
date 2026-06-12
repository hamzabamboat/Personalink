import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.mock is hoisted; create the spy via vi.hoisted so the factory can close over it.
const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(async (..._args: unknown[]) => ({
    content: [{ type: 'text', text: 'A single generated post body.' }],
  })),
}))

// Mock the Anthropic SDK so `new Anthropic()` yields our spy and no real API/key is needed.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...a: unknown[]) => createMock(...a) }
  },
}))
// Insurance: keep the supabase value-import (UserProfile is type-only) from initialising a client.
vi.mock('../supabase', () => ({}))

import { generateLinkedInPosts } from '../anthropic'
import type { UserProfile } from '../supabase'

const profile = {
  name: 'Test', role: 'Founder', industry: 'SaaS', content_pillars: ['Leadership'],
} as unknown as UserProfile

function lastCall() {
  return createMock.mock.calls[0][0] as { max_tokens: number; messages: { content: string }[] }
}

beforeEach(() => createMock.mockClear())

describe('generateLinkedInPosts count', () => {
  it('count: 1 asks for a single post and returns exactly one element', async () => {
    const posts = await generateLinkedInPosts({ profile, topic: 'startup pricing', count: 1 })
    const userPrompt = lastCall().messages[0].content.toLowerCase()
    expect(userPrompt).toContain('one linkedin post')
    expect(userPrompt).not.toContain('3 different')
    expect(lastCall().max_tokens).toBeLessThanOrEqual(1200)
    expect(posts).toHaveLength(1)
    expect(posts[0]).toBe('A single generated post body.')
  })

  it('default (no count) keeps the 3-option behavior', async () => {
    await generateLinkedInPosts({ profile, topic: 'startup pricing' })
    expect(lastCall().messages[0].content).toContain('3 different')
    expect(lastCall().max_tokens).toBe(2500)
  })
})
