import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { apiFetch, textResult, proxyError, requireScope, tokenOf } from '@/lib/mcp/proxy'

export function registerGenerateTools(server: McpServer): void {
  server.tool(
    'generate_post',
    'Generate a LinkedIn post draft in the user\'s voice from a topic or idea. Saves it as an unscheduled draft — nothing is published or scheduled. Takes up to a minute.',
    {
      topic: z.string().describe('What the post should be about'),
      additional_context: z.string().optional().describe('Extra context, angle, or details to inform the draft'),
    },
    {},
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/posts/generate', {
        method: 'POST',
        body: { topic: args.topic, additionalContext: args.additional_context },
      })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'repurpose_post',
    'Turn an existing post into several fresh angles/rewrites in the user\'s voice. Pro plan only. Takes up to a minute.',
    {
      post_id: z.string().describe('ID of the existing post to repurpose'),
    },
    {},
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/posts/repurpose', {
        method: 'POST',
        body: { postId: args.post_id },
      })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'bulk_generate',
    'Generate and auto-schedule a batch of posts (up to 30) across the user\'s content pillars, one run per hour. Pro plan only. WARNING: this consumes multiple monthly post-generation credits in one call — only use when the user clearly wants a bulk batch, not a single post. Can take several minutes.',
    {},
    {},
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/posts/bulk-generate', { method: 'POST' })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )
}
