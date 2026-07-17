# PersonaLink Remote MCP Server — Design (Sub-project 2)

**Date:** 2026-07-17 · **Status:** Approved (brainstormed 2026-07-16 with sub-project 1)
**Depends on:** OAuth 2.1 authorization server (implemented, PR #32).

## What

A remote MCP server at `/api/mcp` (Streamable HTTP) that any MCP client — Claude,
ChatGPT, Cursor — connects to via the OAuth server from sub-project 1. Users drive
PersonaLink from chat: generate/edit/schedule/publish posts, graphics, brand context,
trends, profile.

## Architecture

- **`mcp-handler`** (Vercel's Next.js adapter, with `@modelcontextprotocol/sdk@1.26.0`)
  provides the transport at `app/api/mcp/[transport]/route.ts`. No Redis → SSE fallback
  disabled; Streamable HTTP only (all current MCP clients support it).
- **Auth:** `withMcpAuth(handler, verifyToken, { required: true })`. `verifyToken` calls
  the existing `getUserFromToken` (lib/auth.ts) — unknown/expired/revoked → 401 with
  `WWW-Authenticate` pointing at `/.well-known/oauth-protected-resource` (already live).
  `AuthInfo.scopes` = the token's granted scopes; `extra.userId` = the user.
- **Thin proxy (Approach A):** every tool handler calls the existing `/api/*` route via
  server-side `fetch` with `Authorization: Bearer <token>` (`lib/mcp/proxy.ts`). All
  plan limits, rate limits, circuit breaker, and the `bearerScopeFor` route gate apply
  identically — zero duplicated business logic. Tools additionally check their required
  scope up front to return a friendly message instead of a proxied 401.
- **Tool modules** (`lib/mcp/tools/*.ts`), one per domain, each exporting
  `register<Domain>Tools(server)`: posts, generate, publish, graphics, context,
  discovery. The route file registers all.

## Tool catalog (v1)

| Module | Tools → endpoint |
|---|---|
| posts | `list_posts` GET /api/posts · `get_post` (filter of list) · `edit_post` PATCH /api/posts/[id]/update · `schedule_post` POST /api/posts/[id]/schedule · `send_for_approval` POST /api/posts/[id]/send-approval · `view_calendar` GET /api/posts?status=scheduled |
| generate | `generate_post` POST /api/posts/generate · `repurpose_post` POST /api/posts/repurpose · `bulk_generate` POST /api/posts/bulk-generate |
| publish | `publish_post` POST /api/posts/[id]/approve — **two-step**: without `confirm:true` returns the exact post text + instruction to confirm; `destructiveHint` annotation |
| graphics | `generate_carousel` POST /api/carousels/generate · `generate_card` POST /api/images/template · `generate_banner` POST /api/banner · `list_images` GET /api/images |
| context | `get_voice` GET /api/voice/samples · `list_story_bank`/`add_story` GET/POST /api/story-bank · `list_memories`/`add_memory` GET/POST /api/memories · `get_brand_kit` GET /api/brand-kit |
| discovery | `get_trending_topics` GET /api/trends · `get_suggestions` GET /api/suggestions/refresh · `get_profile` GET /api/profile · `regenerate_bio` POST /api/profile/beautify · `get_usage` GET /api/usage |

Read tools: `readOnlyHint: true`. `publish_post`: `destructiveHint: true` (only one).
Scopes: reads need `posts:read`, writes `posts:write`, publish `posts:publish` —
mirroring `bearerScopeFor`, which remains the enforcement backstop.

## Error shape

Proxied non-2xx → tool result `isError: true` with the route's `error` message passed
through (they're already user-readable: limits, upgrade nudges, retry times).

## Out of scope

Billing, account deletion, agency/affiliate admin, LinkedIn (dis)connect — blocked at
both the tool layer (absent) and `bearerScopeFor` (denied).

## Testing

- Unit: proxy helper (URL/headers/error mapping), publish two-step gate, scope-check
  helper (mocked fetch).
- Build: `next build` green.
- Live (deploy-time): connect from Claude custom connector → OAuth flow → call
  `list_posts`, `generate_post`, `publish_post` preview/confirm.
