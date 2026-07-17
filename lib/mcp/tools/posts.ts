import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { apiFetch, textResult, proxyError, requireScope, tokenOf } from '@/lib/mcp/proxy'

type Post = {
  id: string
  status: string
  scheduled_at?: string | null
  posted_at?: string | null
  published_at?: string | null
  content?: string | null
}

function truncate(content: string | null | undefined, max: number): string {
  const text = content || ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function compactPost(post: Post) {
  return {
    id: post.id,
    status: post.status,
    scheduled_at: post.scheduled_at ?? null,
    ...(post.posted_at !== undefined ? { posted_at: post.posted_at } : {}),
    content: truncate(post.content, 200),
  }
}

export function registerPostsTools(server: McpServer): void {
  server.tool(
    'list_posts',
    "List the user's LinkedIn posts and drafts with status and scheduling info. Optionally filter by status.",
    { status: z.string().optional().describe('Filter by status: draft | scheduled | posted | pending_approval') },
    { readOnlyHint: true },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const qs = args.status ? `?status=${encodeURIComponent(args.status)}` : ''
      const res = await apiFetch(tokenOf(authInfo), `/api/posts${qs}`)
      if (!res.ok) return proxyError(res.status, res.body)
      const posts = ((res.body as { posts?: Post[] } | null)?.posts || []) as Post[]
      return textResult(posts.map(compactPost))
    },
  )

  server.tool(
    'get_post',
    'Get the full details of a single post, including its complete content.',
    { post_id: z.string().describe('The ID of the post to fetch') },
    { readOnlyHint: true },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/posts')
      if (!res.ok) return proxyError(res.status, res.body)
      const posts = ((res.body as { posts?: Post[] } | null)?.posts || []) as Post[]
      const post = posts.find((p) => p.id === args.post_id)
      if (!post) return proxyError(404, { error: 'Post not found' })
      return textResult(post)
    },
  )

  server.tool(
    'edit_post',
    'Edit the text content of a post (draft, scheduled, or pending approval).',
    {
      post_id: z.string().describe('The ID of the post to edit'),
      content: z.string().describe('The new post content'),
    },
    {},
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), `/api/posts/${encodeURIComponent(args.post_id)}/update`, {
        method: 'PATCH',
        body: { content: args.content },
      })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'schedule_post',
    'Schedule a post to publish at a specific time. The time must be at least 30 minutes in the future.',
    {
      post_id: z.string().describe('The ID of the post to schedule'),
      scheduled_at: z.string().describe('ISO 8601 datetime, must be ≥30 minutes in the future'),
    },
    {},
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), `/api/posts/${encodeURIComponent(args.post_id)}/schedule`, {
        method: 'POST',
        body: { scheduledAt: args.scheduled_at },
      })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'send_for_approval',
    'Send a post to the user for email approval before it can be scheduled or published.',
    { post_id: z.string().describe('The ID of the post to send for approval') },
    {},
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), `/api/posts/${encodeURIComponent(args.post_id)}/send-approval`, {
        method: 'POST',
      })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'view_calendar',
    "View the user's upcoming scheduled posts in chronological order.",
    {},
    { readOnlyHint: true },
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/posts?status=scheduled')
      if (!res.ok) return proxyError(res.status, res.body)
      const posts = ((res.body as { posts?: Post[] } | null)?.posts || []) as Post[]
      const sorted = posts
        .filter((p) => p.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime())
      return textResult(
        sorted.map((p) => ({
          id: p.id,
          scheduled_at: p.scheduled_at ?? null,
          content: truncate(p.content, 120),
        })),
      )
    },
  )
}
