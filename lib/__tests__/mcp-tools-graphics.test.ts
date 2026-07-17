import { describe, it, expect, vi } from 'vitest'
import { registerGraphicsTools } from '../mcp/tools/graphics'

describe('graphics tool registration', () => {
  it('registers the expected tools', () => {
    const tool = vi.fn()
    registerGraphicsTools({ tool } as never)
    expect(tool.mock.calls.map((c) => c[0])).toEqual([
      'generate_carousel',
      'generate_card',
      'generate_banner',
      'list_images',
    ])
    expect(tool.mock.calls[3][3]).toEqual({ readOnlyHint: true })
  })

  it('marks the write tools as not read-only', () => {
    const tool = vi.fn()
    registerGraphicsTools({ tool } as never)
    expect(tool.mock.calls[0][3]).toEqual({ readOnlyHint: false })
    expect(tool.mock.calls[1][3]).toEqual({ readOnlyHint: false })
    expect(tool.mock.calls[2][3]).toEqual({ readOnlyHint: false })
  })
})
