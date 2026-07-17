import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { apiFetch, textResult, proxyError, requireScope, tokenOf } from '@/lib/mcp/proxy'

export function registerContextTools(server: McpServer): void {
  server.tool(
    'get_voice',
    "Get how many real writing samples are in the user's voice corpus (used to match their tone when generating posts).",
    {},
    { readOnlyHint: true },
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/voice/samples')
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'list_story_bank',
    "List the user's saved stories (raw material they can turn into posts).",
    {},
    { readOnlyHint: true },
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/story-bank')
      if (!res.ok) return proxyError(res.status, res.body)
      const body = res.body as { stories?: Array<Record<string, unknown>> }
      const stories = (body.stories || []).map((s) => ({
        id: s.id,
        title: s.title,
        raw_text: s.raw_text,
        status: s.status,
        created_at: s.created_at,
      }))
      return textResult({ stories })
    },
  )

  server.tool(
    'add_story',
    'Add a new story to the story bank — raw material the user can later turn into a post.',
    {
      raw_text: z.string().min(1).max(10000).describe('The story text (max 10,000 characters).'),
      title: z.string().optional().describe('Optional short title for the story.'),
    },
    { readOnlyHint: false },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/story-bank', {
        method: 'POST',
        body: { raw_text: args.raw_text, title: args.title },
      })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'list_memories',
    "List the user's saved content memories (facts, stories, preferences used to personalize posts).",
    {
      unposted: z.boolean().optional().describe('If true, only return memories not yet used in a post.'),
      days: z.number().int().positive().optional().describe('How many days back to look (default 30).'),
    },
    { readOnlyHint: true },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const params = new URLSearchParams()
      if (args.unposted) params.set('unposted', 'true')
      if (args.days) params.set('days', String(args.days))
      const qs = params.toString()
      const res = await apiFetch(tokenOf(authInfo), `/api/memories${qs ? `?${qs}` : ''}`)
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'add_memory',
    "Manually add a memory to the user's context (a fact, event, or preference to draw on when generating posts).",
    {
      memory_type: z.string().describe('Category of memory, e.g. "achievement", "preference", "event".'),
      content: z.string().min(1).describe('The memory content.'),
      occurred_at: z.string().optional().describe('ISO date the memory occurred, if known.'),
    },
    { readOnlyHint: false },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/memories', {
        method: 'POST',
        body: { memory_type: args.memory_type, content: args.content, occurred_at: args.occurred_at },
      })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'get_brand_kit',
    "Get the user's brand kits (colors, logo, font) — the active one first.",
    {},
    { readOnlyHint: true },
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/brand-kit')
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )
}
