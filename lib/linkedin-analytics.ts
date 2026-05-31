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
