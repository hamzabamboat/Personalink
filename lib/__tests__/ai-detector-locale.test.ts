import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.mock is hoisted above imports, so the mock fn must be created via vi.hoisted.
const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(async (..._args: unknown[]) => ({ content: [{ type: 'text', text: 'rewritten' }] })),
}))
vi.mock('../anthropic', () => ({ anthropic: { messages: { create: (...a: unknown[]) => createMock(...a) } } }))
vi.mock('../humanize', () => ({ humanizeText: (s: string) => s }))

import { rewriteToHumanize } from '../ai-detector'
import type { UserProfile } from '../supabase'

const profile = { name: 'Test' } as unknown as UserProfile

function lastPrompt(): string {
  const call = createMock.mock.calls[0][0] as { messages: { content: string }[] }
  return call.messages[0].content
}

beforeEach(() => createMock.mockClear())

describe('rewriteToHumanize locale awareness', () => {
  it('adds a dialect-preservation clause for hinglish', async () => {
    await rewriteToHumanize('text', ['triadic_anaphora'], { profile, attempt: 1, locale: 'hinglish' })
    const prompt = lastPrompt().toLowerCase()
    expect(prompt).toContain('preserve')
    expect(prompt).toContain('hinglish')
    expect(prompt).toContain('devanagari')
  })

  it('adds an Indian-English preservation clause for indian_english', async () => {
    await rewriteToHumanize('text', ['triadic_anaphora'], { profile, attempt: 1, locale: 'indian_english' })
    const prompt = lastPrompt().toLowerCase()
    expect(prompt).toContain('preserve')
    expect(prompt).toContain('indian english')
  })

  it('adds no dialect clause for english', async () => {
    await rewriteToHumanize('text', ['triadic_anaphora'], { profile, attempt: 1, locale: 'english' })
    expect(lastPrompt().toLowerCase()).not.toContain('preserve')
  })
})
