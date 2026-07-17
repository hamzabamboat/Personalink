import { describe, it, expect, vi } from 'vitest'
import { registerPostsTools } from '../mcp/tools/posts'

describe('posts tool registration', () => {
  it('registers the expected tools with annotations', () => {
    const tool = vi.fn()
    registerPostsTools({ tool } as never)
    const names = tool.mock.calls.map((c) => c[0])
    expect(names).toEqual([
      'list_posts',
      'get_post',
      'edit_post',
      'schedule_post',
      'send_for_approval',
      'view_calendar',
    ])
    const byName = Object.fromEntries(tool.mock.calls.map((c) => [c[0], c]))
    expect(byName.list_posts[3]).toEqual({ readOnlyHint: true })
    expect(byName.get_post[3]).toEqual({ readOnlyHint: true })
    expect(byName.view_calendar[3]).toEqual({ readOnlyHint: true })
    expect(byName.edit_post[3]).toEqual({})
    expect(byName.schedule_post[3]).toEqual({})
    expect(byName.send_for_approval[3]).toEqual({})
  })
})
