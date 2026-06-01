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

// ── OAuth authorization scopes ─────────────────────────────────────────
/** Scopes the LinkedIn app is approved for — always safe to request. */
export const LINKEDIN_BASE_SCOPES = ['openid', 'profile', 'email', 'w_member_social'] as const

// Analytics scopes powering the Organic Growth Engine's creator-metrics capture.
// ⚠️ These require LinkedIn approval (Member Data Portability) that is still
// PENDING. Requesting an unapproved scope makes LinkedIn reject the ENTIRE
// authorization (error=unauthorized_scope_error) — the callback maps that to
// `linkedin_error`, the landing page shows "Couldn't connect to LinkedIn",
// and NO ONE can sign in. Same failure mode as the r_member_social incident
// (commit f517b63). Keep these out of the request until approval lands.
export const LINKEDIN_ANALYTICS_SCOPES = ['r_member_postAnalytics', 'r_member_profileAnalytics'] as const

/** Space-delimited scope string for the LinkedIn OAuth authorization request.
 *  Analytics scopes are withheld until LinkedIn approval lands — pass `true` only then. */
export function buildLinkedInAuthScope(analyticsApproved = false): string {
  return [
    ...LINKEDIN_BASE_SCOPES,
    ...(analyticsApproved ? LINKEDIN_ANALYTICS_SCOPES : []),
  ].join(' ')
}

/** Extracts the numeric id from a share/ugcPost urn, or null. */
export function shareIdFromUrn(urn: string): string | null {
  const m = /urn:li:(?:share|ugcPost):(\d+)/.exec(urn)
  return m ? m[1] : null
}

/** URL-encoded entity param for memberCreatorPostAnalytics, with the correct
 *  ugc:/share: prefix per URN type. Returns null if the URN is unparseable. */
export function entityParamFromUrn(urn: string): string | null {
  const m = /urn:li:(share|ugcPost):(\d+)/.exec(urn)
  if (!m) return null
  const [, type, id] = m
  const prefix = type === 'ugcPost' ? 'ugc' : 'share'
  return encodeURIComponent(`(${prefix}:urn:li:${type}:${id})`)
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
    const entity = entityParamFromUrn(urn)
    if (!entity) return { ...ALL_NULL_FALLBACK }
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

/** Reads the lifetime follower total from a memberFollowersCount?q=me response
 *  (no dateRange). Sums organic + paid; null when followerCounts is absent. */
export function parseLifetimeFollowerCount(json: unknown): number | null {
  const fc = (json as { elements?: Array<{ followerCounts?: { organicFollowerCount?: number; paidFollowerCount?: number } }> } | null)
    ?.elements?.[0]?.followerCounts
  if (!fc || (fc.organicFollowerCount == null && fc.paidFollowerCount == null)) return null
  return (fc.organicFollowerCount ?? 0) + (fc.paidFollowerCount ?? 0)
}

/** Lifetime follower count via q=me (requires r_member_profileAnalytics). null on error/absence. */
export async function fetchLifetimeFollowerCount(
  token: string,
  fetchImpl: FetchLike = fetch
): Promise<number | null> {
  try {
    const res = await fetchImpl(`${REST_BASE}/memberFollowersCount?q=me`, { headers: restHeaders(token) })
    if (!res.ok) return null
    return parseLifetimeFollowerCount(await res.json())
  } catch {
    return null
  }
}

/** Backfill window helper: the last `days` days, as an epoch-ms dateRange ending now. */
export function findFollowerDateRange(days = 90, now: number = Date.now()): {
  startMs: number
  endMs: number
} {
  return { startMs: now - days * 24 * 60 * 60 * 1000, endMs: now }
}

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

  const { error: updateError } = await args.db
    .from('posts')
    .update(buildPostsLatestUpdate(metrics, capturedAt))
    .eq('id', args.postId)
  if (updateError) throw updateError

  const { error: insertError } = await args.db.from('post_analytics').insert(
    buildPostAnalyticsRow({
      postId: args.postId,
      userId: args.userId,
      metrics,
      publishedAt: args.publishedAt,
      capturedAt,
    })
  )
  if (insertError) throw insertError

  return metrics
}
