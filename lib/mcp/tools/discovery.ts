import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { apiFetch, textResult, proxyError, requireScope, tokenOf } from '@/lib/mcp/proxy'

export function registerDiscoveryTools(server: McpServer): void {
  server.tool(
    'get_trending_topics',
    "Get trending topics and news relevant to the user's profile, plus insights from their recent posts.",
    {},
    { readOnlyHint: true },
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/trends')
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'get_suggestions',
    "Get the user's pending post ideas (AI-generated suggestions with angle, hashtags, and why it works). Returns cached suggestions — use PersonaLink's app to refresh them.",
    {},
    { readOnlyHint: true },
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/suggestions/refresh')
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'get_profile',
    "Get the user's PersonaLink profile — role, industry, company, topics, tone, and posting preferences.",
    {},
    { readOnlyHint: true },
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/profile')
      if (!res.ok) return proxyError(res.status, res.body)
      const body = res.body as { profile?: Record<string, unknown> }
      const p = body.profile
      if (!p) return textResult({ profile: null })
      return textResult({
        profile: {
          name: p.name,
          role: p.job_title || p.role,
          industry: p.industry,
          company: p.company,
          years_experience: p.years_experience,
          topics: p.topics || p.content_pillars,
          writing_style: p.writing_style,
          tone: p.tone,
          plan: p.plan,
          preferred_days: p.preferred_days,
          preferred_post_hour: p.preferred_post_hour,
          timezone: p.timezone,
        },
      })
    },
  )

  server.tool(
    'regenerate_bio',
    "Rewrite the user's LinkedIn bio (headline + About section) in their own voice. Slow — can take up to a minute. Only available on Standard and Pro plans.",
    {
      headline: z.string().optional().describe("Current LinkedIn headline; defaults to the user's saved headline."),
      about: z.string().optional().describe("Current LinkedIn About text; defaults to the user's saved About text."),
      skills: z.array(z.string()).optional().describe('Current LinkedIn skills list.'),
      guidance: z.string().optional().describe('Extra direction for the rewrite, e.g. "emphasize leadership".'),
    },
    { readOnlyHint: false },
    async (args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:write')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/profile/beautify', {
        method: 'POST',
        body: {
          headline: args.headline,
          about: args.about,
          skills: args.skills,
          guidance: args.guidance,
        },
      })
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )

  server.tool(
    'get_usage',
    "Get the user's monthly plan usage summary — quota and remaining allowance per feature.",
    {},
    { readOnlyHint: true },
    async (_args, extra) => {
      const authInfo = extra.authInfo as AuthInfo | undefined
      const denied = requireScope(authInfo, 'posts:read')
      if (denied) return denied
      const res = await apiFetch(tokenOf(authInfo), '/api/usage')
      if (!res.ok) return proxyError(res.status, res.body)
      return textResult(res.body)
    },
  )
}
