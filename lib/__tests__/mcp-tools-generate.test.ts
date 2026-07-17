import { describe, it, expect, vi } from 'vitest'
import { registerGenerateTools } from '../mcp/tools/generate'

describe('generate tool registration', () => {
  it('registers all three generate tools with write scope behavior (no annotations)', () => {
    const tool = vi.fn()
    registerGenerateTools({ tool } as never)
    expect(tool.mock.calls.map((c) => c[0])).toEqual(['generate_post', 'repurpose_post', 'bulk_generate'])
    for (const call of tool.mock.calls) {
      expect(call[3]).toEqual({})
    }
  })
})
