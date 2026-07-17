import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { apiFetch, textResult, proxyError, requireScope, tokenOf } from '@/lib/mcp/proxy'

export function registerGraphicsTools(server: McpServer): void {
  server.tool(
    'generate_carousel',
    'Generate a branded multi-slide LinkedIn carousel (PNGs + PDF) from a topic or existing post content. Cost-neutral template rendering, not AI images.',
    {
      source: z
        .string()
        .describe('Topic or post text to build the carousel from (also accepted as postContent/topic on the server).'),
      theme: z.string().optional().describe('Visual theme id. Falls back to a default if omitted or unrecognized.'),
      slideCount: z.number().optional().describe('Desired number of slides; clamped to the supported range server-side.'),
      postId: z.string().optional().describe('Existing post id to associate this carousel with.'),
    },
    { readOnlyHint: false },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/carousels/generate', { method: 'POST', body: args })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'generate_card',
    'Generate a single branded graphic card (quote, stat, title, list, or myth-busting format) from post content. Cost-neutral template rendering, not AI images.',
    {
      postContent: z.string().describe('Post text to extract the card content from.'),
      templateType: z
        .enum(['quote', 'stat', 'title', 'list', 'myth'])
        .optional()
        .describe('Card layout. Defaults to "quote" if omitted or invalid.'),
      palette: z.string().optional().describe('Curated palette id (preferred over theme; bundles bg/ink/accent).'),
      theme: z.string().optional().describe('Legacy theme id, used only when palette is not given.'),
      aspectRatio: z.string().optional().describe('Output aspect ratio, e.g. "1:1" or "4:5".'),
      font: z.string().optional().describe('Font family override; falls back to the brand kit default.'),
    },
    { readOnlyHint: false },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/images/template', { method: 'POST', body: args })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'generate_banner',
    "Generate a branded LinkedIn profile banner using the user's name, role, tagline and content pillars. Cost-neutral template rendering; all fields are optional and fall back to the user's profile.",
    {
      name: z.string().optional().describe('Name to display. Falls back to the profile name.'),
      designation: z.string().optional().describe('Job title/role. Falls back to the profile role.'),
      tagline: z.string().optional().describe('Short tagline text.'),
      keywords: z
        .array(z.string())
        .optional()
        .describe('Up to 4 topic keywords. Falls back to the profile content pillars/topics.'),
      theme: z.string().optional().describe('Visual theme id. Falls back to a default if omitted or unrecognized.'),
    },
    { readOnlyHint: false },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/banner', { method: 'POST', body: args })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'list_images',
    "List the user's generated images and graphics (cards, carousels, banners, uploads).",
    {},
    { readOnlyHint: true },
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/images')
      if (!res.ok) return proxyError(res.status, res.body)
      const body = res.body as { images?: Array<Record<string, unknown>> }
      const images = (body?.images || []).map((img) => ({
        id: img.id,
        kind: img.kind ?? img.template_type ?? null,
        url: img.public_url ?? img.url ?? null,
        created_at: img.uploaded_at ?? img.created_at ?? null,
      }))
      return textResult({ images })
    },
  )
}
