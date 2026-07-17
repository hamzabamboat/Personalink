import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, proxyError, requireScope, textResult, errorResult } from '../mcp/proxy'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'

const realFetch = global.fetch

describe('mcp proxy', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    }) as unknown as typeof fetch
  })
  afterEach(() => {
    global.fetch = realFetch
  })

  it('apiFetch forwards the Bearer token and hits our own origin', async () => {
    await apiFetch('tok123', '/api/posts')
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toBe(`${process.env.NEXT_PUBLIC_APP_URL}/api/posts`)
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok123')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
  })

  it('apiFetch serializes JSON bodies with content-type', async () => {
    await apiFetch('tok', '/api/posts/generate', { method: 'POST', body: { topic: 'x' } })
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ topic: 'x' }))
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json')
  })

  it('proxyError surfaces the route error message, with a fallback', () => {
    expect(proxyError(429, { error: 'Rate limited, try later' }).content[0].text).toBe('Rate limited, try later')
    expect(proxyError(500, null).content[0].text).toBe('Request failed (500)')
    expect(proxyError(429, { error: 'x' }).isError).toBe(true)
  })

  it('requireScope passes when granted and errors helpfully when not', () => {
    const auth = { token: 't', clientId: 'c', scopes: ['posts:read'] } as AuthInfo
    expect(requireScope(auth, 'posts:read')).toBeNull()
    const denied = requireScope(auth, 'posts:publish')
    expect(denied?.isError).toBe(true)
    expect(denied?.content[0].text).toContain('posts:publish')
  })

  it('result helpers shape MCP content', () => {
    expect(textResult('hi').content).toEqual([{ type: 'text', text: 'hi' }])
    expect(textResult({ a: 1 }).content[0].text).toContain('"a": 1')
    expect(errorResult('bad').isError).toBe(true)
  })
})
