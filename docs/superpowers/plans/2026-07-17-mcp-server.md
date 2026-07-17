# MCP Server Implementation Plan (Sub-project 2)

> **For agentic workers:** executed via parallel subagents on disjoint files; agents do NOT run git commands (controller integrates + commits). Spec: `docs/superpowers/specs/2026-07-17-mcp-server-design.md`.

**Goal:** Remote MCP server at `/api/mcp` exposing PersonaLink actions as OAuth-scoped tools that thin-proxy to existing API routes.

**Architecture:** `mcp-handler` + `withMcpAuth` (verify via `getUserFromToken`), Streamable HTTP only; tool modules per domain call `lib/mcp/proxy.ts`.

**Tech stack:** mcp-handler 1.1, @modelcontextprotocol/sdk 1.26, zod 4, vitest.

## File structure

- `lib/mcp/proxy.ts` — `apiFetch(token, path, init)`, `textResult`, `errorResult`, `requireScope`. (foundation)
- `app/api/mcp/[transport]/route.ts` — handler wiring + auth + registers all modules + `whoami` tool. (foundation)
- `lib/mcp/tools/posts.ts` — list/get/edit/schedule/send_for_approval/view_calendar. (agent A)
- `lib/mcp/tools/generate.ts` — generate_post/repurpose_post/bulk_generate. (agent B)
- `lib/mcp/tools/publish.ts` — publish_post two-step confirm. (agent B)
- `lib/mcp/tools/graphics.ts` — carousel/card/banner/list_images. (agent C)
- `lib/mcp/tools/context.ts` — voice/story-bank/memories/brand-kit. (agent D)
- `lib/mcp/tools/discovery.ts` — trends/suggestions/profile/bio/usage. (agent D)
- `lib/__tests__/mcp-proxy.test.ts` — proxy + scope helper unit tests. (foundation)

## Tasks

1. **Foundation (sequential):** deps (done: mcp-handler, zod, sdk@1.26.0), proxy helper + tests, route scaffold with `whoami` + empty module stubs so the route compiles before agents fill them. Commit.
2. **Parallel tool agents A–D:** each rewrites ONLY its stub file(s) per the spec catalog, reading the target API route source to derive accurate zod input schemas and payload shapes. No git ops. Annotations: `readOnlyHint` on reads, `destructiveHint` on publish_post. Scope pre-check via `requireScope`.
3. **Integration (controller):** typecheck targeted files, full vitest, `next build`, fix, single commit.
4. **Review:** security/quality review agent over the sub-project 2 diff; fix findings; re-verify; commit.
5. **Ship:** push, PR #32 updates automatically; deploy-time checklist (migration via psql, live connector test).
