import { describe, it, expect, vi } from 'vitest'
import { registerDiscoveryTools } from '../mcp/tools/discovery'

describe('discovery tool registration', () => {
  it('registers the expected tools', () => {
    const tool = vi.fn()
    registerDiscoveryTools({ tool } as never)
    expect(tool.mock.calls.map((c) => c[0])).toEqual([
      'get_trending_topics',
      'get_suggestions',
      'get_profile',
      'regenerate_bio',
      'get_usage',
    ])
  })

  it('marks read tools as readOnly and regenerate_bio as a write', () => {
    const tool = vi.fn()
    registerDiscoveryTools({ tool } as never)
    const byName = Object.fromEntries(tool.mock.calls.map((c) => [c[0], c]))
    expect(byName.get_trending_topics[3]).toEqual({ readOnlyHint: true })
    expect(byName.get_suggestions[3]).toEqual({ readOnlyHint: true })
    expect(byName.get_profile[3]).toEqual({ readOnlyHint: true })
    expect(byName.get_usage[3]).toEqual({ readOnlyHint: true })
    expect(byName.regenerate_bio[3]).not.toEqual({ readOnlyHint: true })
  })
})
