import { describe, it, expect, vi } from 'vitest'
import { registerContextTools } from '../mcp/tools/context'

describe('context tool registration', () => {
  it('registers the expected tools', () => {
    const tool = vi.fn()
    registerContextTools({ tool } as never)
    expect(tool.mock.calls.map((c) => c[0])).toEqual([
      'get_voice',
      'list_story_bank',
      'add_story',
      'list_memories',
      'add_memory',
      'get_brand_kit',
    ])
  })

  it('marks read tools as readOnly and write tools as not', () => {
    const tool = vi.fn()
    registerContextTools({ tool } as never)
    const byName = Object.fromEntries(tool.mock.calls.map((c) => [c[0], c]))
    expect(byName.get_voice[3]).toEqual({ readOnlyHint: true })
    expect(byName.list_story_bank[3]).toEqual({ readOnlyHint: true })
    expect(byName.list_memories[3]).toEqual({ readOnlyHint: true })
    expect(byName.get_brand_kit[3]).toEqual({ readOnlyHint: true })
    expect(byName.add_story[3]).not.toEqual({ readOnlyHint: true })
    expect(byName.add_memory[3]).not.toEqual({ readOnlyHint: true })
  })
})
