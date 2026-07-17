import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { apiFetch, textResult, errorResult, proxyError, requireScope, tokenOf } from '@/lib/mcp/proxy'

type PostRow = { id: string; content: string; status: string; scheduled_at?: string | null }

export function registerPublishTools(server: McpServer): void {
  server.tool(
    'publish_post',
    'Approve a draft/pending post for publishing. Two-step confirm: call without "confirm" first to preview the exact post text, then call again with confirm: true after the user explicitly approves. Approving does not post to LinkedIn instantly — it marks the post approved (or scheduled, if it already has a scheduled time) and PersonaLink\'s publish cron posts it to LinkedIn at its scheduled time.',
    {
      post_id: z.string().describe('ID of the post to publish'),
      confirm: z
        .boolean()
        .optional()
        .describe('Must be exactly true to actually publish. Omit first to preview.'),
    },
    { destructiveHint: true },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:publish')
      if (denied) return denied

      const token = tokenOf(authInfo)
      const listRes = await apiFetch(token, '/api/posts')
      if (!listRes.ok) return proxyError(listRes.status, listRes.body)

      const posts = (listRes.body as { posts?: PostRow[] } | null)?.posts || []
      const post = posts.find((p) => p.id === args.post_id)
      if (!post) return errorResult(`Post not found: ${args.post_id}`)

      if (args.confirm !== true) {
        return textResult(
          `PREVIEW — NOT YET PUBLISHED. Review the post below and show it to the user. Only call publish_post again with confirm: true after the user explicitly approves publishing this to LinkedIn.\n\n${post.content}`,
        )
      }

      const res = await apiFetch(token, `/api/posts/${encodeURIComponent(args.post_id)}/approve`, { method: 'POST' })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )
}
