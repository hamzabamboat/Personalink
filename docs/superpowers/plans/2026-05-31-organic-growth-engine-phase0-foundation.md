# Phase 0 — Foundation (Capture) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture every organic-growth signal (post velocity, follower growth, profile authority) as a source-abstracted time series — writing to `posts`, `post_analytics`, `follower_snapshots`, and `profile_analytics` on a schedule, automatically using the LinkedIn Creator Analytics API where scopes allow and the public `socialActions` fallback otherwise.

**Architecture:** A new `lib/linkedin-analytics.ts` adapter exposes `fetchPostMetrics` / `fetchFollowerCounts` whose network responses are parsed by PURE, unit-tested helpers (`parseCreatorAnalyticsResponse`, `parseSocialActions`, `parseFollowerCounts`); every returned metric carries a `source` of `'creator_api' | 'public_fallback' | 'manual'`. OAuth requests the two new analytics scopes and persists the granted set into `users.linkedin_scopes`, so the adapter picks `creator_api` vs `public_fallback` per-user with no rebuild. A scheduled cron (`/api/cron/sync-analytics`, ~every 6h) snapshots all users' published posts and writes daily follower/profile rows; the on-click `sync-stats` route is rewritten onto the same adapter and additionally appends velocity rows + backfills follower history on a user's first sync.

**Tech Stack:** Next.js 15 App Router, Supabase (Postgres), TypeScript, Vitest, LinkedIn Community Management API

---

## File Structure

| File | Create/Modify | Single responsibility |
|---|---|---|
| `app/api/auth/linkedin/route.ts` | Modify | Add `r_member_postAnalytics r_member_profileAnalytics` to the OAuth scope string. |
| `app/api/auth/linkedin/callback/route.ts` | Modify | Parse the granted `scope` from the token response and persist it to `users.linkedin_scopes` on insert/update (both the agency and standard paths). |
| `lib/linkedin-analytics.ts` | Create | Source-abstracted LinkedIn analytics adapter: pinned version constant, pure parsers (`parseCreatorAnalyticsResponse`, `parseSocialActions`, `parseFollowerCounts`), `hasCreatorScopes`, `findFollowerDateRange`, and network fns `fetchPostMetrics` / `fetchFollowerCounts`. |
| `lib/__tests__/linkedin-analytics.test.ts` | Create | Unit tests for the pure parsers + scope/urn helpers against sample JSON (no live DB, no network). |
| `lib/supabase.ts` | Modify | Extend the `Post` type with new metric columns; add `linkedin_scopes` to `User`; extend `PostAnalytics`; add `FollowerSnapshot` and `ProfileAnalytics` types; export the `MetricSource` union and `PostMetrics` shape. |
| `supabase/migrations/20260531_organic_growth_capture.sql` | Create | Box-comment migration: extend `users`, `posts`, `post_analytics`; create `follower_snapshots`, `profile_analytics` with unique constraints + indexes. |
| `supabase/schema.sql` | Modify | Reflect every migration change in the canonical schema. |
| `app/api/linkedin/sync-stats/route.ts` | Modify (rewrite) | Use the adapter to write "latest" metrics onto `posts` AND append a velocity row to `post_analytics` (with `age_minutes`); on a user's first sync, backfill `follower_snapshots`. |
| `app/api/cron/sync-analytics/route.ts` | Create | Scheduled (~6h) capture across all connected users: snapshot published posts → `posts` + `post_analytics`; write daily `follower_snapshots` + `profile_analytics`. Copies the day7-stats auth + `cron_locks` guard. |
| `vercel.json` | Modify | Add the `/api/cron/sync-analytics` cron entry (`0 */6 * * *`). |

**Cross-cutting constants (defined once in `lib/linkedin-analytics.ts`, imported elsewhere):**
- `LINKEDIN_API_VERSION = '202601'` — sent as the `Linkedin-Version` header on every `/rest/` call, alongside `X-Restli-Protocol-Version: 2.0.0`.
- `CREATOR_POST_METRICS` — the ordered list of `queryType` values to request per post: `IMPRESSION`, `MEMBERS_REACHED`, `REACTION`, `COMMENT`, `RESHARE`, `POST_SAVE`, `LINK_CLICKS`, `FOLLOWER_GAINED_FROM_CONTENT`, `PROFILE_VIEW_FROM_CONTENT`.
- `MetricSource = 'creator_api' | 'public_fallback' | 'manual'`.

---

## Tasks

### Task 1 — Pure parsers + helpers in `lib/linkedin-analytics.ts` (TDD core)

This task builds the entire pure surface (no network) so the adapter's logic is fully unit-tested before any `fetch` is added. The `fetch`-based functions land in Task 2.

**Files:**
- Create: `lib/linkedin-analytics.ts`
- Create: `lib/__tests__/linkedin-analytics.test.ts`

Sample response shapes used by the tests (from the spec's LinkedIn docs):
- `memberCreatorPostAnalytics` (one call per `queryType`, `aggregation=TOTAL`): `{ "elements": [ { "value": 1234 } ] }` (the aggregated total for that metric).
- `socialActions`: `{ "likesSummary": { "totalLikes": 12 }, "commentsSummary": { "totalFirstLevelComments": 3 } }`.
- `memberFollowersCount` daily (`q=dateRange`): `{ "elements": [ { "followerCounts": { "organicFollowerCount": 100 }, "dateRange": { "start": { "day": 1, "month": 5, "year": 2026 } } } ] }`.
- `memberFollowersCount` lifetime (`q=me`): `{ "elements": [ { "followerCounts": { "organicFollowerCount": 540 } } ] }`.

Steps:

- [ ] Write the failing test file `lib/__tests__/linkedin-analytics.test.ts` with the FULL contents below.

```ts
import { describe, it, expect } from 'vitest'
import {
  LINKEDIN_API_VERSION,
  CREATOR_POST_METRICS,
  hasCreatorScopes,
  shareIdFromUrn,
  parseCreatorMetricValue,
  parseCreatorAnalyticsResponse,
  parseSocialActions,
  parseFollowerCounts,
  ageMinutes,
} from '../linkedin-analytics'

describe('constants', () => {
  it('pins the LinkedIn API version', () => {
    expect(LINKEDIN_API_VERSION).toBe('202601')
  })

  it('lists every creator post metric queryType in order', () => {
    expect(CREATOR_POST_METRICS).toEqual([
      'IMPRESSION',
      'MEMBERS_REACHED',
      'REACTION',
      'COMMENT',
      'RESHARE',
      'POST_SAVE',
      'LINK_CLICKS',
      'FOLLOWER_GAINED_FROM_CONTENT',
      'PROFILE_VIEW_FROM_CONTENT',
    ])
  })
})

describe('hasCreatorScopes', () => {
  it('is true only when r_member_postAnalytics is present', () => {
    expect(hasCreatorScopes(['openid', 'r_member_postAnalytics'])).toBe(true)
    expect(hasCreatorScopes(['r_member_profileAnalytics'])).toBe(false)
    expect(hasCreatorScopes([])).toBe(false)
    expect(hasCreatorScopes(null)).toBe(false)
  })
})

describe('shareIdFromUrn', () => {
  it('extracts the numeric id from a share urn', () => {
    expect(shareIdFromUrn('urn:li:share:7123456789')).toBe('7123456789')
  })
  it('extracts the id from a ugcPost urn', () => {
    expect(shareIdFromUrn('urn:li:ugcPost:7000000000')).toBe('7000000000')
  })
  it('returns null for an unrecognised urn', () => {
    expect(shareIdFromUrn('not-a-urn')).toBeNull()
    expect(shareIdFromUrn('')).toBeNull()
  })
})

describe('parseCreatorMetricValue', () => {
  it('reads elements[0].value', () => {
    expect(parseCreatorMetricValue({ elements: [{ value: 1234 }] })).toBe(1234)
  })
  it('returns null on empty elements or missing value', () => {
    expect(parseCreatorMetricValue({ elements: [] })).toBeNull()
    expect(parseCreatorMetricValue({ elements: [{}] })).toBeNull()
    expect(parseCreatorMetricValue({})).toBeNull()
    expect(parseCreatorMetricValue(null)).toBeNull()
  })
})

describe('parseCreatorAnalyticsResponse', () => {
  it('maps queryType→value into the typed PostMetrics shape, source=creator_api', () => {
    const byMetric = {
      IMPRESSION: { elements: [{ value: 5000 }] },
      MEMBERS_REACHED: { elements: [{ value: 4200 }] },
      REACTION: { elements: [{ value: 80 }] },
      COMMENT: { elements: [{ value: 12 }] },
      RESHARE: { elements: [{ value: 5 }] },
      POST_SAVE: { elements: [{ value: 9 }] },
      LINK_CLICKS: { elements: [{ value: 33 }] },
      FOLLOWER_GAINED_FROM_CONTENT: { elements: [{ value: 7 }] },
      PROFILE_VIEW_FROM_CONTENT: { elements: [{ value: 21 }] },
    }
    expect(parseCreatorAnalyticsResponse(byMetric)).toEqual({
      impressions: 5000,
      members_reached: 4200,
      reactions: 80,
      comments: 12,
      reshares: 5,
      saves: 9,
      link_clicks: 33,
      followers_gained: 7,
      profile_views_from_post: 21,
      source: 'creator_api',
    })
  })

  it('fills nulls for any metric whose response was missing/empty', () => {
    const result = parseCreatorAnalyticsResponse({
      IMPRESSION: { elements: [{ value: 100 }] },
    })
    expect(result.impressions).toBe(100)
    expect(result.reactions).toBeNull()
    expect(result.profile_views_from_post).toBeNull()
    expect(result.source).toBe('creator_api')
  })
})

describe('parseSocialActions', () => {
  it('reads only likes + first-level comments, source=public_fallback, rest null', () => {
    expect(
      parseSocialActions({
        likesSummary: { totalLikes: 12 },
        commentsSummary: { totalFirstLevelComments: 3 },
      })
    ).toEqual({
      impressions: null,
      members_reached: null,
      reactions: 12,
      comments: 3,
      reshares: null,
      saves: null,
      link_clicks: null,
      followers_gained: null,
      profile_views_from_post: null,
      source: 'public_fallback',
    })
  })

  it('tolerates missing summaries', () => {
    const r = parseSocialActions({})
    expect(r.reactions).toBeNull()
    expect(r.comments).toBeNull()
    expect(r.source).toBe('public_fallback')
  })
})

describe('parseFollowerCounts', () => {
  it('maps daily dateRange elements to {snapshot_date, follower_count}', () => {
    const r = parseFollowerCounts({
      elements: [
        {
          followerCounts: { organicFollowerCount: 100, paidFollowerCount: 5 },
          dateRange: { start: { day: 1, month: 5, year: 2026 } },
        },
        {
          followerCounts: { organicFollowerCount: 102 },
          dateRange: { start: { day: 2, month: 5, year: 2026 } },
        },
      ],
    })
    expect(r).toEqual([
      { snapshot_date: '2026-05-01', follower_count: 105 },
      { snapshot_date: '2026-05-02', follower_count: 102 },
    ])
  })

  it('zero-pads month/day and sums organic+paid', () => {
    const r = parseFollowerCounts({
      elements: [
        {
          followerCounts: { organicFollowerCount: 10, paidFollowerCount: 2 },
          dateRange: { start: { day: 9, month: 3, year: 2026 } },
        },
      ],
    })
    expect(r).toEqual([{ snapshot_date: '2026-03-09', follower_count: 12 }])
  })

  it('returns [] for empty/missing elements', () => {
    expect(parseFollowerCounts({ elements: [] })).toEqual([])
    expect(parseFollowerCounts({})).toEqual([])
    expect(parseFollowerCounts(null)).toEqual([])
  })
})

describe('ageMinutes', () => {
  it('computes whole minutes between publish and capture', () => {
    expect(ageMinutes('2026-05-01T00:00:00.000Z', '2026-05-01T01:30:00.000Z')).toBe(90)
  })
  it('floors partial minutes and never goes negative', () => {
    expect(ageMinutes('2026-05-01T00:00:00.000Z', '2026-05-01T00:00:59.000Z')).toBe(0)
    expect(ageMinutes('2026-05-01T01:00:00.000Z', '2026-05-01T00:00:00.000Z')).toBe(0)
  })
  it('returns null when published_at is null', () => {
    expect(ageMinutes(null, '2026-05-01T00:00:00.000Z')).toBeNull()
  })
})
```

- [ ] Run the test to confirm it fails (module does not exist yet): `npx vitest run lib/__tests__/linkedin-analytics.test.ts` — expected output contains `Failed to load url ../linkedin-analytics` / `Cannot find module` and `Test Files  1 failed`.

- [ ] Create `lib/linkedin-analytics.ts` with ONLY the pure surface below (no `fetch` yet).

```ts
// ──────────────────────────────────────────────────────────────────────
// LinkedIn analytics adapter — source-abstracted capture.
//
// Every metric carries a `source`:
//   'creator_api'    — Member Creator Analytics API (impressions, reach, etc.)
//   'public_fallback'— legacy /v2/socialActions (reactions + comments only)
//   'manual'         — user-entered (not produced here)
//
// /rest/ calls pin a version via the `Linkedin-Version` header. LinkedIn
// sunsets versions every few months — bump LINKEDIN_API_VERSION as scheduled
// maintenance.
// ──────────────────────────────────────────────────────────────────────

export const LINKEDIN_API_VERSION = '202601'

export type MetricSource = 'creator_api' | 'public_fallback' | 'manual'

/** queryType values requested per post (one /rest/ call each, aggregation=TOTAL). */
export const CREATOR_POST_METRICS = [
  'IMPRESSION',
  'MEMBERS_REACHED',
  'REACTION',
  'COMMENT',
  'RESHARE',
  'POST_SAVE',
  'LINK_CLICKS',
  'FOLLOWER_GAINED_FROM_CONTENT',
  'PROFILE_VIEW_FROM_CONTENT',
] as const

export type CreatorMetric = (typeof CREATOR_POST_METRICS)[number]

/** All per-post metric fields the rest of the app stores, plus provenance. */
export type PostMetrics = {
  impressions: number | null
  members_reached: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
  link_clicks: number | null
  followers_gained: number | null
  profile_views_from_post: number | null
  source: MetricSource
}

export type FollowerCount = {
  snapshot_date: string // YYYY-MM-DD
  follower_count: number
}

/** Maps a queryType to its PostMetrics field. */
const METRIC_FIELD: Record<CreatorMetric, keyof PostMetrics> = {
  IMPRESSION: 'impressions',
  MEMBERS_REACHED: 'members_reached',
  REACTION: 'reactions',
  COMMENT: 'comments',
  RESHARE: 'reshares',
  POST_SAVE: 'saves',
  LINK_CLICKS: 'link_clicks',
  FOLLOWER_GAINED_FROM_CONTENT: 'followers_gained',
  PROFILE_VIEW_FROM_CONTENT: 'profile_views_from_post',
}

/** Creator analytics is available only when the postAnalytics scope was granted. */
export function hasCreatorScopes(scopes: string[] | null | undefined): boolean {
  return !!scopes && scopes.includes('r_member_postAnalytics')
}

/** Extracts the numeric id from a share/ugcPost urn, or null. */
export function shareIdFromUrn(urn: string): string | null {
  const m = /urn:li:(?:share|ugcPost):(\d+)/.exec(urn)
  return m ? m[1] : null
}

/** Reads the aggregated TOTAL value from one memberCreatorPostAnalytics response. */
export function parseCreatorMetricValue(json: unknown): number | null {
  const el = (json as { elements?: Array<{ value?: number }> } | null)?.elements?.[0]
  return typeof el?.value === 'number' ? el.value : null
}

/** Folds a map of {queryType: rawResponse} into a typed PostMetrics (creator_api). */
export function parseCreatorAnalyticsResponse(
  byMetric: Partial<Record<CreatorMetric, unknown>>
): PostMetrics {
  const out: PostMetrics = {
    impressions: null,
    members_reached: null,
    reactions: null,
    comments: null,
    reshares: null,
    saves: null,
    link_clicks: null,
    followers_gained: null,
    profile_views_from_post: null,
    source: 'creator_api',
  }
  for (const metric of CREATOR_POST_METRICS) {
    const field = METRIC_FIELD[metric]
    ;(out[field] as number | null) = parseCreatorMetricValue(byMetric[metric])
  }
  return out
}

/** Public fallback: only likes + first-level comments are exposed. */
export function parseSocialActions(json: unknown): PostMetrics {
  const j = json as {
    likesSummary?: { totalLikes?: number }
    commentsSummary?: { totalFirstLevelComments?: number }
  } | null
  const reactions = typeof j?.likesSummary?.totalLikes === 'number' ? j.likesSummary.totalLikes : null
  const comments =
    typeof j?.commentsSummary?.totalFirstLevelComments === 'number'
      ? j.commentsSummary.totalFirstLevelComments
      : null
  return {
    impressions: null,
    members_reached: null,
    reactions,
    comments,
    reshares: null,
    saves: null,
    link_clicks: null,
    followers_gained: null,
    profile_views_from_post: null,
    source: 'public_fallback',
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Maps memberFollowersCount elements (daily or lifetime) to dated follower totals. */
export function parseFollowerCounts(json: unknown): FollowerCount[] {
  const elements =
    (json as { elements?: Array<Record<string, unknown>> } | null)?.elements ?? []
  const out: FollowerCount[] = []
  for (const el of elements) {
    const counts = (el.followerCounts ?? {}) as {
      organicFollowerCount?: number
      paidFollowerCount?: number
    }
    const follower_count = (counts.organicFollowerCount ?? 0) + (counts.paidFollowerCount ?? 0)
    const start = (el.dateRange as { start?: { day?: number; month?: number; year?: number } } | undefined)
      ?.start
    if (!start || start.year == null || start.month == null || start.day == null) continue
    out.push({
      snapshot_date: `${start.year}-${pad2(start.month)}-${pad2(start.day)}`,
      follower_count,
    })
  }
  return out
}

/** Whole minutes between published_at and captured_at; null if unpublished, never negative. */
export function ageMinutes(publishedAt: string | null, capturedAt: string): number | null {
  if (!publishedAt) return null
  const diffMs = new Date(capturedAt).getTime() - new Date(publishedAt).getTime()
  return Math.max(0, Math.floor(diffMs / 60000))
}
```

- [ ] Run the test to confirm it passes: `npx vitest run lib/__tests__/linkedin-analytics.test.ts` — expected output contains `Test Files  1 passed` and all assertions green (`Tests  17 passed` or more).

- [ ] Commit: `git add lib/linkedin-analytics.ts lib/__tests__/linkedin-analytics.test.ts && git commit -m "feat(analytics): pure LinkedIn analytics parsers + scope/urn helpers (TDD)"`

---

### Task 2 — Network functions on the adapter: `fetchPostMetrics` + `fetchFollowerCounts` + `findFollowerDateRange`

Adds the `fetch`-based functions that call the parsers from Task 1. These are thin I/O wrappers; all logic stays in the tested pure helpers.

**Files:**
- Modify: `lib/linkedin-analytics.ts` (append below `ageMinutes`)
- Modify: `lib/__tests__/linkedin-analytics.test.ts` (add a metric-selection test using a stubbed `fetch`)

Steps:

- [ ] Add a failing test for `fetchPostMetrics` source-selection at the END of `lib/__tests__/linkedin-analytics.test.ts` (it asserts which endpoint is hit per scope). Append the FULL block below.

```ts
import { fetchPostMetrics } from '../linkedin-analytics'

describe('fetchPostMetrics source selection', () => {
  const urn = 'urn:li:share:7123456789'

  it('uses creator analytics (one call per metric) when scopes allow', async () => {
    const calls: string[] = []
    const fetchStub = (async (url: string) => {
      calls.push(url)
      return { ok: true, status: 200, json: async () => ({ elements: [{ value: 1 }] }) }
    }) as unknown as typeof fetch

    const result = await fetchPostMetrics('tok', urn, ['r_member_postAnalytics'], fetchStub)

    expect(result.source).toBe('creator_api')
    expect(calls.length).toBe(CREATOR_POST_METRICS.length)
    expect(calls[0]).toContain('memberCreatorPostAnalytics')
    expect(calls[0]).toContain('share%3A7123456789')
    expect(calls[0]).toContain('queryType=IMPRESSION')
  })

  it('falls back to socialActions when creator scope is absent', async () => {
    const calls: string[] = []
    const fetchStub = (async (url: string) => {
      calls.push(url)
      return {
        ok: true,
        status: 200,
        json: async () => ({ likesSummary: { totalLikes: 4 }, commentsSummary: { totalFirstLevelComments: 1 } }),
      }
    }) as unknown as typeof fetch

    const result = await fetchPostMetrics('tok', urn, ['openid'], fetchStub)

    expect(result.source).toBe('public_fallback')
    expect(result.reactions).toBe(4)
    expect(result.comments).toBe(1)
    expect(calls.length).toBe(1)
    expect(calls[0]).toContain('socialActions')
  })

  it('returns all-null public_fallback when the urn is unparseable under creator scope', async () => {
    const fetchStub = (async () => {
      throw new Error('should not be called')
    }) as unknown as typeof fetch
    const result = await fetchPostMetrics('tok', 'garbage', ['r_member_postAnalytics'], fetchStub)
    expect(result.source).toBe('public_fallback')
    expect(result.impressions).toBeNull()
  })
})
```

- [ ] Run the test to confirm the new block fails (function not exported): `npx vitest run lib/__tests__/linkedin-analytics.test.ts` — expected output contains `fetchPostMetrics is not a function` or `does not provide an export named 'fetchPostMetrics'` and `Test Files  1 failed`.

- [ ] Append the network functions to `lib/linkedin-analytics.ts` (below `ageMinutes`). Add the FULL code below.

```ts
// ── Network I/O (thin wrappers over the pure parsers above) ─────────────

type FetchLike = typeof fetch

const REST_BASE = 'https://api.linkedin.com/rest'
const V2_BASE = 'https://api.linkedin.com/v2'

function restHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Linkedin-Version': LINKEDIN_API_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  }
}

const ALL_NULL_FALLBACK: PostMetrics = {
  impressions: null,
  members_reached: null,
  reactions: null,
  comments: null,
  reshares: null,
  saves: null,
  link_clicks: null,
  followers_gained: null,
  profile_views_from_post: null,
  source: 'public_fallback',
}

/**
 * Per-post metrics. Uses creator analytics when scopes allow (one call per
 * metric, aggregation=TOTAL), else the public socialActions fallback.
 * `fetchImpl` is injectable for tests; defaults to global fetch.
 */
export async function fetchPostMetrics(
  token: string,
  urn: string,
  scopes: string[] | null | undefined,
  fetchImpl: FetchLike = fetch
): Promise<PostMetrics> {
  if (hasCreatorScopes(scopes)) {
    const id = shareIdFromUrn(urn)
    if (!id) return { ...ALL_NULL_FALLBACK }
    const entity = encodeURIComponent(`(share:urn:li:share:${id})`)
    const byMetric: Partial<Record<CreatorMetric, unknown>> = {}
    for (const metric of CREATOR_POST_METRICS) {
      try {
        const res = await fetchImpl(
          `${REST_BASE}/memberCreatorPostAnalytics?q=entity&entity=${entity}&queryType=${metric}&aggregation=TOTAL`,
          { headers: restHeaders(token) }
        )
        byMetric[metric] = res.ok ? await res.json() : null
      } catch {
        byMetric[metric] = null
      }
    }
    return parseCreatorAnalyticsResponse(byMetric)
  }

  // Public fallback: reactions + first-level comments only.
  const res = await fetchImpl(`${V2_BASE}/socialActions/${encodeURIComponent(urn)}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' },
  })
  if (!res.ok) return { ...ALL_NULL_FALLBACK }
  return parseSocialActions(await res.json())
}

/**
 * Follower counts. With a dateRange → daily series (backfillable); without →
 * lifetime via q=me. Requires r_member_profileAnalytics; returns [] without it.
 * `dateRange` is `{ startMs, endMs }` epoch-millis (LinkedIn uses ms timestamps).
 */
export async function fetchFollowerCounts(
  token: string,
  dateRange?: { startMs: number; endMs: number },
  fetchImpl: FetchLike = fetch
): Promise<FollowerCount[]> {
  const url = dateRange
    ? `${REST_BASE}/memberFollowersCount?q=dateRange&dateRange=(start:(day:${new Date(dateRange.startMs).getUTCDate()},month:${new Date(dateRange.startMs).getUTCMonth() + 1},year:${new Date(dateRange.startMs).getUTCFullYear()}),end:(day:${new Date(dateRange.endMs).getUTCDate()},month:${new Date(dateRange.endMs).getUTCMonth() + 1},year:${new Date(dateRange.endMs).getUTCFullYear()}))`
    : `${REST_BASE}/memberFollowersCount?q=me`
  try {
    const res = await fetchImpl(url, { headers: restHeaders(token) })
    if (!res.ok) return []
    return parseFollowerCounts(await res.json())
  } catch {
    return []
  }
}

/** Backfill window helper: the last `days` days, as an epoch-ms dateRange ending now. */
export function findFollowerDateRange(days = 90, now: number = Date.now()): {
  startMs: number
  endMs: number
} {
  return { startMs: now - days * 24 * 60 * 60 * 1000, endMs: now }
}
```

- [ ] Run the test to confirm it passes: `npx vitest run lib/__tests__/linkedin-analytics.test.ts` — expected output contains `Test Files  1 passed` and `Tests  20 passed` or more.

- [ ] Commit: `git add lib/linkedin-analytics.ts lib/__tests__/linkedin-analytics.test.ts && git commit -m "feat(analytics): fetchPostMetrics/fetchFollowerCounts network adapter over pure parsers"`

---

### Task 3 — Database migration + schema.sql

Adds the new columns/tables. The migration is idempotent (`IF NOT EXISTS`) and mirrored into `supabase/schema.sql`. No test step (DDL) — verification is a SQL-parse smoke check.

**Files:**
- Create: `supabase/migrations/20260531_organic_growth_capture.sql`
- Modify: `supabase/schema.sql` (users table block ~line 4–16; posts block ~line 65–87; post_analytics block ~line 142–149; append new tables near the end ~line 223)

Steps:

- [ ] Create `supabase/migrations/20260531_organic_growth_capture.sql` with the FULL contents below.

```sql
-- ──────────────────────────────────────────────────────────────────────
-- Organic Growth Engine — Phase 0 capture foundation
--
-- Source-abstracted analytics capture. Adds attributed "latest" metrics to
-- posts, activates+extends post_analytics as a velocity time series, and adds
-- daily follower_snapshots + profile_analytics. users.linkedin_scopes lets the
-- adapter pick creator_api vs public_fallback per user.
--
-- metric source enum (text): 'creator_api' | 'public_fallback' | 'manual'
-- ──────────────────────────────────────────────────────────────────────

-- users: which scopes the member granted (drives source selection)
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_scopes text[];

-- posts: extend the "latest" attributed-metrics cache
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reshares                integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS saves                   integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_clicks             integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS members_reached         integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS followers_gained        integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS profile_views_from_post integer;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS metric_source           text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS metrics_synced_at       timestamptz;

-- post_analytics: activate as a velocity time series (table already exists with
-- id, post_id, user_id, impressions, reactions, captured_at)
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS age_minutes     integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS comments        integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS reshares        integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS saves           integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS link_clicks     integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS members_reached integer;
ALTER TABLE post_analytics ADD COLUMN IF NOT EXISTS source          text;

CREATE INDEX IF NOT EXISTS post_analytics_post_id_idx
  ON post_analytics(post_id, captured_at);
CREATE INDEX IF NOT EXISTS post_analytics_user_id_idx
  ON post_analytics(user_id, captured_at);

-- follower_snapshots: daily audience growth (backfilled on connect)
CREATE TABLE IF NOT EXISTS follower_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  snapshot_date date not null,
  follower_count integer not null,
  source text default 'creator_api',
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS follower_snapshots_user_id_idx
  ON follower_snapshots(user_id, snapshot_date);

-- profile_analytics: daily authority signals
CREATE TABLE IF NOT EXISTS profile_analytics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  snapshot_date date not null,
  profile_views integer,
  search_appearances integer,
  source text default 'creator_api',
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS profile_analytics_user_id_idx
  ON profile_analytics(user_id, snapshot_date);
```

- [ ] Add `linkedin_scopes` to the `users` table block in `supabase/schema.sql`. Find the line `  linkedin_token_expires_at timestamptz,` (first occurrence, inside `create table if not exists users`) and add the new column directly after it so the block reads:

```sql
  linkedin_access_token text,
  linkedin_token_expires_at timestamptz,
  linkedin_scopes text[],
  subscription_status text default 'inactive',
```

- [ ] Extend the `posts` table block in `supabase/schema.sql`. Find the line `  comments integer,` (inside `create table if not exists posts`) and add the new metric columns directly after it so the block reads:

```sql
  impressions integer,
  reactions integer,
  comments integer,
  reshares integer,
  saves integer,
  link_clicks integer,
  members_reached integer,
  followers_gained integer,
  profile_views_from_post integer,
  metric_source text,
  metrics_synced_at timestamptz,
  approval_token text unique default gen_random_uuid()::text,
```

- [ ] Replace the `post_analytics` table block in `supabase/schema.sql`. Find:

```sql
create table if not exists post_analytics (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  impressions integer,
  reactions integer,
  captured_at timestamptz default now()
);
```

and replace it with:

```sql
create table if not exists post_analytics (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  age_minutes integer,
  impressions integer,
  reactions integer,
  comments integer,
  reshares integer,
  saves integer,
  link_clicks integer,
  members_reached integer,
  source text,
  captured_at timestamptz default now()
);
create index if not exists post_analytics_post_id_idx on post_analytics(post_id, captured_at);
create index if not exists post_analytics_user_id_idx on post_analytics(user_id, captured_at);
```

- [ ] Append the two new tables to the END of `supabase/schema.sql` (after the calendar_feed_token block, line ~223). Add the FULL block below.

```sql
-- Organic Growth Engine — daily audience growth (backfilled on connect)
create table if not exists follower_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  snapshot_date date not null,
  follower_count integer not null,
  source text default 'creator_api',
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);
create index if not exists follower_snapshots_user_id_idx on follower_snapshots(user_id, snapshot_date);

-- Organic Growth Engine — daily authority signals
create table if not exists profile_analytics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade,
  snapshot_date date not null,
  profile_views integer,
  search_appearances integer,
  source text default 'creator_api',
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);
create index if not exists profile_analytics_user_id_idx on profile_analytics(user_id, snapshot_date);
```

- [ ] Smoke-check both SQL files parse (no obvious syntax error) and contain the new objects: `grep -c "follower_snapshots\|profile_analytics\|linkedin_scopes\|profile_views_from_post" supabase/schema.sql supabase/migrations/20260531_organic_growth_capture.sql` — expected output: each filename followed by a count ≥ 4.

- [ ] Commit: `git add supabase/migrations/20260531_organic_growth_capture.sql supabase/schema.sql && git commit -m "feat(db): organic-growth capture tables/columns (posts, post_analytics, follower_snapshots, profile_analytics, users.linkedin_scopes)"`

---

### Task 4 — Extend shared types in `lib/supabase.ts`

Adds the new fields/types so the route and cron are type-safe. Pure type edits — no test step (TypeScript compile is the check).

**Files:**
- Modify: `lib/supabase.ts` (User type ~line 6–20; Post type ~line 79–111; PostAnalytics type ~line 180–187; add new types after PostAnalytics)

Steps:

- [ ] In the `User` type (`lib/supabase.ts`), add `linkedin_scopes` after `linkedin_token_expires_at`. Find:

```ts
  linkedin_access_token: string | null
  linkedin_token_expires_at: string | null
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'access_code'
```

and replace with:

```ts
  linkedin_access_token: string | null
  linkedin_token_expires_at: string | null
  linkedin_scopes: string[] | null
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'access_code'
```

- [ ] In the `Post` type, add the new metric fields after `comments`. Find:

```ts
  impressions: number | null
  reactions: number | null
  comments: number | null
  approval_token: string | null
```

and replace with:

```ts
  impressions: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
  link_clicks: number | null
  members_reached: number | null
  followers_gained: number | null
  profile_views_from_post: number | null
  metric_source: 'creator_api' | 'public_fallback' | 'manual' | null
  metrics_synced_at: string | null
  approval_token: string | null
```

- [ ] Replace the `PostAnalytics` type and add the two new types. Find:

```ts
export type PostAnalytics = {
  id: string
  post_id: string
  user_id: string
  impressions: number | null
  reactions: number | null
  captured_at: string
}
```

and replace with:

```ts
export type MetricSource = 'creator_api' | 'public_fallback' | 'manual'

export type PostAnalytics = {
  id: string
  post_id: string
  user_id: string
  age_minutes: number | null
  impressions: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
  link_clicks: number | null
  members_reached: number | null
  source: MetricSource | null
  captured_at: string
}

export type FollowerSnapshot = {
  id: string
  user_id: string
  snapshot_date: string
  follower_count: number
  source: MetricSource | null
  created_at: string
}

export type ProfileAnalytics = {
  id: string
  user_id: string
  snapshot_date: string
  profile_views: number | null
  search_appearances: number | null
  source: MetricSource | null
  created_at: string
}
```

- [ ] Verify the project still type-checks: `npx tsc --noEmit` — expected output: no errors (exit 0). (If the repo has no `tsc` script, this command still works via the local TypeScript install.)

- [ ] Commit: `git add lib/supabase.ts && git commit -m "feat(types): add growth-capture fields to User/Post/PostAnalytics + FollowerSnapshot/ProfileAnalytics types"`

---

### Task 5 — OAuth scopes + persist granted `linkedin_scopes`

Requests the two analytics scopes and stores the scopes LinkedIn actually granted (the token response's `scope` field) onto the user row, on every insert/update path in the callback.

**Files:**
- Modify: `app/api/auth/linkedin/route.ts` (line 14)
- Modify: `app/api/auth/linkedin/callback/route.ts` (parse `scope` near line 67; write `linkedin_scopes` in the agency update ~line 88, the existing-user update ~line 139, and the new-user insert ~line 157)

No isolated unit test (OAuth redirect + DB write are integration concerns). Verification is a typecheck + a manual scope assertion in the redirect URL.

Steps:

- [ ] Add the analytics scopes to the scope string in `app/api/auth/linkedin/route.ts`. Find:

```ts
  const scope = 'openid profile email w_member_social'
```

and replace with:

```ts
  const scope = 'openid profile email w_member_social r_member_postAnalytics r_member_profileAnalytics'
```

- [ ] In `app/api/auth/linkedin/callback/route.ts`, parse the granted scopes right after `accessToken` is read. Find:

```ts
    const accessToken = tokenData.access_token
    // LinkedIn tokens expire in 60 days; fall back to that if expires_in is missing
    const expiresInMs = (tokenData.expires_in ?? 5184000) * 1000
    const expiresAt = new Date(Date.now() + expiresInMs)
```

and replace with:

```ts
    const accessToken = tokenData.access_token
    // LinkedIn tokens expire in 60 days; fall back to that if expires_in is missing
    const expiresInMs = (tokenData.expires_in ?? 5184000) * 1000
    const expiresAt = new Date(Date.now() + expiresInMs)
    // Persist the scopes LinkedIn actually granted (space-delimited) so capture
    // can pick creator_api vs public_fallback per user. Null when absent.
    const grantedScopes: string[] | null =
      typeof tokenData.scope === 'string' && tokenData.scope.trim().length > 0
        ? tokenData.scope.trim().split(/\s+/)
        : null
```

- [ ] In the agency-client update (`app/api/auth/linkedin/callback/route.ts`), persist scopes. Find:

```ts
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', agencyClientUserId)
```

and replace with:

```ts
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          ...(grantedScopes ? { linkedin_scopes: grantedScopes } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', agencyClientUserId)
```

- [ ] In the existing-user update branch, persist scopes. Find:

```ts
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
```

and replace with:

```ts
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          ...(grantedScopes ? { linkedin_scopes: grantedScopes } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
```

- [ ] In the new-user insert branch, persist scopes. Find:

```ts
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      user = result.data
      dbError = result.error
    }
```

and replace with:

```ts
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          ...(grantedScopes ? { linkedin_scopes: grantedScopes } : {}),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      user = result.data
      dbError = result.error
    }
```

- [ ] Verify the project type-checks: `npx tsc --noEmit` — expected output: no errors (exit 0).

- [ ] Verify the redirect URL now requests the analytics scopes (the route builds a redirect; assert the scope string statically): `grep -n "r_member_postAnalytics r_member_profileAnalytics" app/api/auth/linkedin/route.ts` — expected output: one matching line (`const scope = ...`).

- [ ] Commit: `git add app/api/auth/linkedin/route.ts app/api/auth/linkedin/callback/route.ts && git commit -m "feat(oauth): request r_member_postAnalytics/profileAnalytics scopes and persist granted linkedin_scopes"`

---

### Task 6 — Capture writer helper `captureUserAnalytics` (TDD, pure write-plan builder)

Both `sync-stats` and the cron need the same logic: turn fetched metrics into the exact rows to UPSERT/INSERT. Extract the row-building into PURE functions, unit-test them, then have a small DB-applying function reuse them. This avoids duplicating capture logic across two routes (DRY).

**Files:**
- Modify: `lib/linkedin-analytics.ts` (append pure builders + a thin `capturePostSnapshot` writer)
- Modify: `lib/__tests__/linkedin-analytics.test.ts` (test the pure builders)

Steps:

- [ ] Append failing tests to `lib/__tests__/linkedin-analytics.test.ts`. Add the FULL block below.

```ts
import { buildPostsLatestUpdate, buildPostAnalyticsRow } from '../linkedin-analytics'

const sampleMetrics = {
  impressions: 5000,
  members_reached: 4200,
  reactions: 80,
  comments: 12,
  reshares: 5,
  saves: 9,
  link_clicks: 33,
  followers_gained: 7,
  profile_views_from_post: 21,
  source: 'creator_api' as const,
}

describe('buildPostsLatestUpdate', () => {
  it('maps metrics to the posts "latest" columns + provenance', () => {
    const at = '2026-05-31T12:00:00.000Z'
    expect(buildPostsLatestUpdate(sampleMetrics, at)).toEqual({
      impressions: 5000,
      reactions: 80,
      comments: 12,
      reshares: 5,
      saves: 9,
      link_clicks: 33,
      members_reached: 4200,
      followers_gained: 7,
      profile_views_from_post: 21,
      metric_source: 'creator_api',
      metrics_synced_at: at,
    })
  })

  it('omits null metric fields so we never overwrite a good value with null', () => {
    const at = '2026-05-31T12:00:00.000Z'
    const partial = { ...sampleMetrics, impressions: null, link_clicks: null }
    const update = buildPostsLatestUpdate(partial, at)
    expect('impressions' in update).toBe(false)
    expect('link_clicks' in update).toBe(false)
    expect(update.reactions).toBe(80)
    expect(update.metric_source).toBe('creator_api')
    expect(update.metrics_synced_at).toBe(at)
  })
})

describe('buildPostAnalyticsRow', () => {
  it('builds a full time-series row including age_minutes + source', () => {
    const row = buildPostAnalyticsRow({
      postId: 'post-1',
      userId: 'user-1',
      metrics: sampleMetrics,
      publishedAt: '2026-05-31T10:00:00.000Z',
      capturedAt: '2026-05-31T12:00:00.000Z',
    })
    expect(row).toEqual({
      post_id: 'post-1',
      user_id: 'user-1',
      age_minutes: 120,
      impressions: 5000,
      reactions: 80,
      comments: 12,
      reshares: 5,
      saves: 9,
      link_clicks: 33,
      members_reached: 4200,
      source: 'creator_api',
      captured_at: '2026-05-31T12:00:00.000Z',
    })
  })

  it('keeps nulls in the time-series row (a snapshot may legitimately be null)', () => {
    const row = buildPostAnalyticsRow({
      postId: 'p',
      userId: 'u',
      metrics: { ...sampleMetrics, impressions: null },
      publishedAt: null,
      capturedAt: '2026-05-31T12:00:00.000Z',
    })
    expect(row.impressions).toBeNull()
    expect(row.age_minutes).toBeNull()
  })
})
```

- [ ] Run the test to confirm the new block fails: `npx vitest run lib/__tests__/linkedin-analytics.test.ts` — expected output contains `buildPostsLatestUpdate is not a function` / `does not provide an export` and `Test Files  1 failed`.

- [ ] Append the pure builders + thin writer to `lib/linkedin-analytics.ts`. Add the FULL code below.

```ts
// ── Write-plan builders (pure) + DB writer ──────────────────────────────

/** Partial update for the posts "latest" cache; null metrics are OMITTED so a
 *  fallback sync never clobbers a previously-captured creator_api value. */
export function buildPostsLatestUpdate(
  m: PostMetrics,
  syncedAt: string
): Record<string, number | string> {
  const update: Record<string, number | string> = {
    metric_source: m.source,
    metrics_synced_at: syncedAt,
  }
  if (m.impressions !== null) update.impressions = m.impressions
  if (m.reactions !== null) update.reactions = m.reactions
  if (m.comments !== null) update.comments = m.comments
  if (m.reshares !== null) update.reshares = m.reshares
  if (m.saves !== null) update.saves = m.saves
  if (m.link_clicks !== null) update.link_clicks = m.link_clicks
  if (m.members_reached !== null) update.members_reached = m.members_reached
  if (m.followers_gained !== null) update.followers_gained = m.followers_gained
  if (m.profile_views_from_post !== null)
    update.profile_views_from_post = m.profile_views_from_post
  return update
}

/** A full post_analytics time-series row (nulls preserved — a snapshot is a
 *  point-in-time fact). */
export function buildPostAnalyticsRow(args: {
  postId: string
  userId: string
  metrics: PostMetrics
  publishedAt: string | null
  capturedAt: string
}): Record<string, unknown> {
  const { postId, userId, metrics: m, publishedAt, capturedAt } = args
  return {
    post_id: postId,
    user_id: userId,
    age_minutes: ageMinutes(publishedAt, capturedAt),
    impressions: m.impressions,
    reactions: m.reactions,
    comments: m.comments,
    reshares: m.reshares,
    saves: m.saves,
    link_clicks: m.link_clicks,
    members_reached: m.members_reached,
    source: m.source,
    captured_at: capturedAt,
  }
}

/**
 * Fetch one post's metrics and persist them: update the posts "latest" cache
 * AND append a post_analytics velocity row. Returns the metrics + the source
 * used. `db` is the supabaseAdmin client (kept as a param so this stays
 * testable / not coupled to the import in pure tests).
 */
export async function capturePostSnapshot(args: {
  db: { from: (t: string) => any }
  token: string
  scopes: string[] | null | undefined
  postId: string
  userId: string
  urn: string
  publishedAt: string | null
  now?: string
  fetchImpl?: FetchLike
}): Promise<PostMetrics> {
  const capturedAt = args.now ?? new Date().toISOString()
  const metrics = await fetchPostMetrics(args.token, args.urn, args.scopes, args.fetchImpl ?? fetch)

  await args.db
    .from('posts')
    .update(buildPostsLatestUpdate(metrics, capturedAt))
    .eq('id', args.postId)

  await args.db.from('post_analytics').insert(
    buildPostAnalyticsRow({
      postId: args.postId,
      userId: args.userId,
      metrics,
      publishedAt: args.publishedAt,
      capturedAt,
    })
  )

  return metrics
}
```

- [ ] Run the test to confirm it passes: `npx vitest run lib/__tests__/linkedin-analytics.test.ts` — expected output contains `Test Files  1 passed` and `Tests  24 passed` or more.

- [ ] Commit: `git add lib/linkedin-analytics.ts lib/__tests__/linkedin-analytics.test.ts && git commit -m "feat(analytics): pure posts/post_analytics write-plan builders + capturePostSnapshot writer (TDD)"`

---

### Task 7 — Rewrite `app/api/linkedin/sync-stats/route.ts` onto the adapter

Replaces the legacy `shareStatistics` logic. For each published post: capture latest + append a velocity row via `capturePostSnapshot`. On the user's FIRST sync (no `follower_snapshots` row yet), backfill daily follower history via the dateRange finder.

**Files:**
- Modify (rewrite): `app/api/linkedin/sync-stats/route.ts`

Steps:

- [ ] Replace the ENTIRE contents of `app/api/linkedin/sync-stats/route.ts` with the FULL code below.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isTokenExpired } from '@/lib/linkedin-api'
import {
  capturePostSnapshot,
  fetchFollowerCounts,
  findFollowerDateRange,
} from '@/lib/linkedin-analytics'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('linkedin_access_token, linkedin_token_expires_at, linkedin_scopes')
    .eq('id', user.id)
    .single()

  if (!userData?.linkedin_access_token || isTokenExpired(userData.linkedin_token_expires_at)) {
    return NextResponse.json(
      { error: 'LinkedIn token expired. Please log out and reconnect LinkedIn.' },
      { status: 403 }
    )
  }

  const token = userData.linkedin_access_token
  const scopes = userData.linkedin_scopes as string[] | null

  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, linkedin_post_id, published_at')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .not('linkedin_post_id', 'is', null)
    .limit(50)

  let synced = 0
  let failed = 0
  let usedFallback = false

  for (const post of posts ?? []) {
    try {
      const metrics = await capturePostSnapshot({
        db: supabaseAdmin,
        token,
        scopes,
        postId: post.id,
        userId: user.id,
        urn: post.linkedin_post_id!,
        publishedAt: post.published_at,
      })
      if (metrics.source === 'public_fallback') usedFallback = true
      synced++
    } catch {
      failed++
    }
  }

  // First-sync follower backfill: only when this user has no snapshots yet.
  let followersBackfilled = 0
  const { count: existingSnapshots } = await supabaseAdmin
    .from('follower_snapshots')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (!existingSnapshots) {
    const counts = await fetchFollowerCounts(token, findFollowerDateRange(90))
    if (counts.length) {
      const { error } = await supabaseAdmin.from('follower_snapshots').upsert(
        counts.map((c) => ({
          user_id: user.id,
          snapshot_date: c.snapshot_date,
          follower_count: c.follower_count,
          source: scopes?.includes('r_member_profileAnalytics') ? 'creator_api' : 'public_fallback',
        })),
        { onConflict: 'user_id,snapshot_date' }
      )
      if (!error) followersBackfilled = counts.length
    }
  }

  const total = posts?.length ?? 0
  const message =
    total === 0
      ? 'No published posts with LinkedIn IDs found.'
      : failed > 0
        ? `Synced ${synced} of ${total} posts (${failed} failed — LinkedIn may have rejected those URNs)`
        : `Synced ${synced} of ${total} posts`

  return NextResponse.json({
    synced,
    failed,
    total,
    followersBackfilled,
    message,
    ...(usedFallback && {
      warning: 'Impression data unavailable — reconnect LinkedIn to grant full analytics access.',
    }),
  })
}
```

- [ ] Verify the project type-checks: `npx tsc --noEmit` — expected output: no errors (exit 0).

- [ ] Verify the legacy endpoint is gone and the adapter is used: `grep -c "shareStatistics" app/api/linkedin/sync-stats/route.ts` — expected output: `0`. Then `grep -c "capturePostSnapshot" app/api/linkedin/sync-stats/route.ts` — expected output: `1`.

- [ ] Commit: `git add app/api/linkedin/sync-stats/route.ts && git commit -m "feat(sync-stats): rewrite onto source-abstracted adapter + velocity rows + first-sync follower backfill"`

---

### Task 8 — Scheduled cron `app/api/cron/sync-analytics/route.ts` + `vercel.json`

Moves capture off-click so the time series is consistent for all users. Runs ~every 6h: for each connected user with a non-expired token, snapshot published posts (latest + velocity row) and write today's `follower_snapshots` + `profile_analytics`. Copies the day7-stats auth + `cron_locks` idempotency guard exactly.

**Files:**
- Create: `app/api/cron/sync-analytics/route.ts`
- Modify: `vercel.json` (add a 5th cron entry)

Note on the lock: day7-stats locks once per `run_date` (a daily job). This cron runs 4×/day, so the lock id must include the hour to allow 4 runs/day while still being idempotent within a tick. We use `run_date = YYYY-MM-DD-HH`.

Steps:

- [ ] Create `app/api/cron/sync-analytics/route.ts` with the FULL contents below.

```ts
// Vercel cron — every 6h. Snapshots published posts (latest + velocity row)
// and writes daily follower_snapshots + profile_analytics for all connected
// users, so capture is consistent across users (not on-click).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isTokenExpired } from '@/lib/linkedin-api'
import {
  capturePostSnapshot,
  fetchFollowerCounts,
  parseFollowerCounts,
  LINKEDIN_API_VERSION,
} from '@/lib/linkedin-analytics'
import crypto from 'crypto'

export const maxDuration = 300

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Idempotency per 6h tick: include the hour so the daily lock pattern allows
  // 4 runs/day but still blocks a duplicate within the same tick.
  const now = new Date()
  const runKey = `${now.toISOString().slice(0, 13)}` // YYYY-MM-DDTHH
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'sync-analytics', run_date: runKey, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_this_tick' })

  const todayStr = now.toISOString().slice(0, 10)

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, linkedin_access_token, linkedin_token_expires_at, linkedin_scopes')
    .not('linkedin_access_token', 'is', null)

  let postsSnapshotted = 0
  let usersProcessed = 0
  let followerRows = 0
  let profileRows = 0

  for (const u of users ?? []) {
    if (!u.linkedin_access_token || isTokenExpired(u.linkedin_token_expires_at)) continue
    usersProcessed++
    const token = u.linkedin_access_token as string
    const scopes = u.linkedin_scopes as string[] | null
    const hasProfileScope = !!scopes?.includes('r_member_profileAnalytics')

    // 1) Snapshot this user's published posts (cap at 50/user/tick — rate limits).
    const { data: posts } = await supabaseAdmin
      .from('posts')
      .select('id, linkedin_post_id, published_at')
      .eq('user_id', u.id)
      .eq('status', 'published')
      .not('linkedin_post_id', 'is', null)
      .limit(50)

    for (const post of posts ?? []) {
      try {
        await capturePostSnapshot({
          db: supabaseAdmin,
          token,
          scopes,
          postId: post.id,
          userId: u.id as string,
          urn: post.linkedin_post_id as string,
          publishedAt: post.published_at as string | null,
        })
        postsSnapshotted++
      } catch {
        /* skip this post; continue the tick */
      }
    }

    // 2) Today's follower snapshot (lifetime count → today's date).
    try {
      const counts = await fetchFollowerCounts(token)
      const today = counts[counts.length - 1]
      if (today) {
        const { error } = await supabaseAdmin.from('follower_snapshots').upsert(
          {
            user_id: u.id,
            snapshot_date: todayStr,
            follower_count: today.follower_count,
            source: hasProfileScope ? 'creator_api' : 'public_fallback',
          },
          { onConflict: 'user_id,snapshot_date' }
        )
        if (!error) followerRows++
      }
    } catch {
      /* follower fetch failed; continue */
    }

    // 3) Today's profile authority snapshot (creator_api only — no fallback).
    if (hasProfileScope) {
      try {
        const res = await fetch(
          'https://api.linkedin.com/rest/memberProfileAnalytics?q=me',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Linkedin-Version': LINKEDIN_API_VERSION,
              'X-Restli-Protocol-Version': '2.0.0',
            },
          }
        )
        if (res.ok) {
          const json = (await res.json()) as {
            elements?: Array<{ profileViews?: number; searchAppearances?: number }>
          }
          const el = json.elements?.[0]
          if (el) {
            const { error } = await supabaseAdmin.from('profile_analytics').upsert(
              {
                user_id: u.id,
                snapshot_date: todayStr,
                profile_views: el.profileViews ?? null,
                search_appearances: el.searchAppearances ?? null,
                source: 'creator_api',
              },
              { onConflict: 'user_id,snapshot_date' }
            )
            if (!error) profileRows++
          }
        }
      } catch {
        /* profile fetch failed; continue */
      }
    }
  }

  await supabaseAdmin
    .from('cron_locks')
    .update({ completed_at: new Date().toISOString() })
    .eq('lock_id', lockId)

  return NextResponse.json({
    usersProcessed,
    postsSnapshotted,
    followerRows,
    profileRows,
    total: users?.length ?? 0,
  })
}

export { handler as GET, handler as POST }
```

- [ ] Add the cron entry to `vercel.json`. Find:

```json
    {
      "path": "/api/cron/day7-stats",
      "schedule": "0 9 * * *"
    }
  ]
```

and replace with:

```json
    {
      "path": "/api/cron/day7-stats",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/sync-analytics",
      "schedule": "0 */6 * * *"
    }
  ]
```

- [ ] Verify the project type-checks: `npx tsc --noEmit` — expected output: no errors (exit 0).

- [ ] Verify the cron auth guard matches day7-stats exactly: `grep -c "Bearer \${process.env.CRON_SECRET}" app/api/cron/sync-analytics/route.ts` — expected output: `1`. And confirm `vercel.json` is valid JSON with the new entry: `node -e "const c=require('./vercel.json'); const p=c.crons.map(x=>x.path); if(!p.includes('/api/cron/sync-analytics')) throw new Error('missing'); console.log('ok', p.length)"` — expected output: `ok 6`.

- [ ] Commit: `git add app/api/cron/sync-analytics/route.ts vercel.json && git commit -m "feat(cron): scheduled sync-analytics — snapshot posts + daily follower/profile capture (every 6h)"`

---

### Task 9 — Full suite green + calibration of profile_analytics field names

`memberProfileAnalytics`'s exact JSON field names (`profileViews` / `searchAppearances`) are documented but unverified against a live partner response. This is a CONCRETE calibration task with a default already shipped (Task 8) — not a TODO.

**Files:**
- Modify (only if calibration finds a mismatch): `app/api/cron/sync-analytics/route.ts`

Steps:

- [ ] Run the full lib test suite to confirm nothing regressed: `npx vitest run` — expected output: `Test Files  2 passed` (linkedin-analytics + magic-link), all tests green.

- [ ] Calibration (run ONCE after partner access is live, with a real token in `$TOKEN`): `curl -s -H "Authorization: Bearer $TOKEN" -H "Linkedin-Version: 202601" -H "X-Restli-Protocol-Version: 2.0.0" "https://api.linkedin.com/rest/memberProfileAnalytics?q=me" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(Object.keys((JSON.parse(s).elements||[{}])[0]||{}))))"` — prints the actual element keys.
  - **Decision rule:** if the printed keys are NOT `profileViews` / `searchAppearances`, update the two field reads in `app/api/cron/sync-analytics/route.ts` (section 3) to the real key names and re-run `npx tsc --noEmit`. **v1 default (already shipped):** `profileViews` / `searchAppearances`; if profile analytics is denied/unavailable, the column stays null and the rest of capture is unaffected.
  - If access is not yet live, this step is a no-op recorded as "deferred until Gate 0 approval" — the fallback path (no profile scope) already handles it.

- [ ] Commit (only if Task 9 changed a file; otherwise skip): `git add app/api/cron/sync-analytics/route.ts && git commit -m "fix(cron): calibrate memberProfileAnalytics field names against live response"`

---

## Done criteria

- `npx vitest run` is green (pure parsers, scope/urn helpers, write-plan builders, source selection).
- `npx tsc --noEmit` passes.
- OAuth requests `r_member_postAnalytics r_member_profileAnalytics`; granted scopes land in `users.linkedin_scopes`.
- `sync-stats` writes the posts "latest" cache AND a `post_analytics` velocity row per post (with `age_minutes`, `source`), and backfills `follower_snapshots` on first sync.
- `/api/cron/sync-analytics` is registered in `vercel.json` (`0 */6 * * *`), guarded identically to day7-stats, and writes posts snapshots + daily `follower_snapshots` + `profile_analytics`.
- Every stored metric carries `source ∈ {creator_api, public_fallback, manual}`.
