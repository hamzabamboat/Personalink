import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerPublishTools } from '../mcp/tools/publish'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'

const realFetch = global.fetch

describe('publish tool registration', () => {
  it('registers publish_post as destructive', () => {
    const tool = vi.fn()
    registerPublishTools({ tool } as never)
    expect(tool.mock.calls.map((c) => c[0])).toEqual(['publish_post'])
    expect(tool.mock.calls[0][3]).toEqual({ destructiveHint: true })
  })
})

describe('publish_post handler', () => {
  const authInfo = { token: 't', clientId: 'c', scopes: ['posts:publish'] } as AuthInfo
  const post = { id: 'abc123', content: 'Hello world post content', status: 'draft' }

  beforeEach(() => {
    global.fetch = vi.fn(async (url: string) => {
      if (String(url).includes('/approve')) {
        return { ok: true, status: 200, json: async () => ({ post: { ...post, status: 'approved' } }) } as unknown as Response
      }
      return { ok: true, status: 200, json: async () => ({ posts: [post] }) } as unknown as Response
    }) as unknown as typeof fetch
  })
  afterEach(() => {
    global.fetch = realFetch
  })

  function getHandler() {
    const tool = vi.fn()
    registerPublishTools({ tool } as never)
    return tool.mock.calls[0][4] as (args: unknown, extra: unknown) => Promise<{ content: Array<{ type: string; text: string }> }>
  }

  it('previews without confirm and does not call approve', async () => {
    const handler = getHandler()
    const result = await handler({ post_id: 'abc123' }, { authInfo })
    expect(result.content[0].text).toContain('PREVIEW')
    expect(result.content[0].text).toContain(post.content)
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some(([url]) => String(url).includes('/approve'))).toBe(false)
  })

  it('calls approve when confirm is true', async () => {
    const handler = getHandler()
    await handler({ post_id: 'abc123', confirm: true }, { authInfo })
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some(([url]) => String(url).includes('/api/posts/abc123/approve'))).toBe(true)
  })
})
