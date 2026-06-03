import { supabaseAdmin } from './supabase-admin'

export type PostPerfRow = {
  content_pillar: string | null
  format: string | null
  published_at: string | null
  impressions: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
}

export type GroupPerf = {
  key: string
  posts: number
  avgImpressions: number
  avgEngagementRate: number
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function engagement(r: PostPerfRow): number {
  return (r.reactions ?? 0) + (r.comments ?? 0) + (r.reshares ?? 0) + (r.saves ?? 0)
}

/** Group rows by an arbitrary key; avg impressions + avg engagement rate per group. */
export function groupPerformanceBy(rows: PostPerfRow[], keyFn: (r: PostPerfRow) => string): GroupPerf[] {
  const buckets = new Map<string, PostPerfRow[]>()
  for (const r of rows) {
    const k = keyFn(r)
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(r)
  }
  const out: GroupPerf[] = []
  for (const [key, rs] of buckets) {
    const avgImpressions = rs.reduce((a, r) => a + (r.impressions ?? 0), 0) / rs.length
    const withImpr = rs.filter(r => (r.impressions ?? 0) > 0)
    const avgEngagementRate = withImpr.length
      ? withImpr.reduce((a, r) => a + engagement(r) / (r.impressions as number), 0) / withImpr.length
      : 0
    out.push({ key, posts: rs.length, avgImpressions, avgEngagementRate })
  }
  return out.sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)
}

export function perPillarPerformance(rows: PostPerfRow[]): GroupPerf[] {
  return groupPerformanceBy(rows, r => r.content_pillar ?? 'Uncategorized')
}

export function perFormatPerformance(rows: PostPerfRow[]): GroupPerf[] {
  return groupPerformanceBy(rows, r => r.format ?? 'unknown')
}

export type TimeSlotPerf = { day: string; hour: number; posts: number; avgEngagementRate: number }

/** Bucket posts by ISO weekday + UTC hour; best avg engagement rate first. */
export function perTimeSlotPerformance(rows: PostPerfRow[]): TimeSlotPerf[] {
  const dated = rows.filter(r => r.published_at)
  const grouped = groupPerformanceBy(dated, r => {
    const d = new Date(r.published_at as string)
    const day = DAYS[(d.getUTCDay() + 6) % 7]
    return `${day}-${d.getUTCHours()}`
  })
  return grouped.map(g => {
    const [day, hour] = g.key.split('-')
    return { day, hour: Number(hour), posts: g.posts, avgEngagementRate: g.avgEngagementRate }
  })
}

export type VelocitySample = { age_minutes: number | null; impressions: number | null }
export type VelocityClass = 'fast-spike' | 'slow-burn' | 'unknown'

/**
 * Classify a single post's impression accrual curve from its post_analytics
 * snapshots. share24h = impressions at the last snapshot <= 24h / terminal
 * impressions. >= 0.6 → fast-spike, else slow-burn. Needs 2+ usable snapshots.
 */
export function classifyVelocity(series: VelocitySample[]): { class: VelocityClass; share24h: number } {
  const usable = series
    .filter((s): s is { age_minutes: number; impressions: number } => s.age_minutes != null && s.impressions != null)
    .sort((a, b) => a.age_minutes - b.age_minutes)
  if (usable.length < 2) return { class: 'unknown', share24h: 0 }
  const terminal = usable[usable.length - 1].impressions
  if (terminal <= 0) return { class: 'unknown', share24h: 0 }
  const within24h = usable.filter(s => s.age_minutes <= 24 * 60)
  const at24h = within24h.length ? within24h[within24h.length - 1].impressions : usable[0].impressions
  const share24h = at24h / terminal
  return { class: share24h >= 0.6 ? 'fast-spike' : 'slow-burn', share24h }
}

export type AttributionRow = {
  content_pillar: string | null
  followers_gained: number | null
  profile_views_from_post: number | null
}
export type AttributionGroup = { key: string; followersGained: number; profileViews: number; posts: number }

/** Roll up content→growth attribution per pillar; sorted by followers gained desc. */
export function attributionByPillar(rows: AttributionRow[]): AttributionGroup[] {
  const buckets = new Map<string, AttributionGroup>()
  for (const r of rows) {
    const key = r.content_pillar ?? 'Uncategorized'
    const g = buckets.get(key) ?? { key, followersGained: 0, profileViews: 0, posts: 0 }
    g.followersGained += r.followers_gained ?? 0
    g.profileViews += r.profile_views_from_post ?? 0
    g.posts += 1
    buckets.set(key, g)
  }
  return [...buckets.values()].sort((a, b) => b.followersGained - a.followersGained)
}

/**
 * Fetch a user's last-90-day published posts + per-post velocity series, and
 * return the bundle of insight aggregations the dashboard renders.
 */
export async function getUserInsights(userId: string) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, content_pillar, format, published_at, members_reached, reshares, saves, followers_gained, profile_views_from_post')
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', ninetyDaysAgo)

  // `posts` caches members_reached (reach) + reshares/saves. Per-snapshot
  // reactions/impressions/comments live in post_analytics, not here — so map
  // reach into the impressions slot and treat reactions/comments as absent (0).
  // The pure perf functions are unchanged; they just see the real columns.
  const rows = ((posts ?? []) as Array<{
    id: string; content_pillar: string | null; format: string | null; published_at: string | null
    members_reached: number | null; reshares: number | null; saves: number | null
    followers_gained: number | null; profile_views_from_post: number | null
  }>).map((p) => ({
    id: p.id,
    content_pillar: p.content_pillar,
    format: p.format,
    published_at: p.published_at,
    impressions: p.members_reached,
    reactions: null,
    comments: null,
    reshares: p.reshares,
    saves: p.saves,
    followers_gained: p.followers_gained,
    profile_views_from_post: p.profile_views_from_post,
  })) as Array<PostPerfRow & AttributionRow & { id: string }>

  // Velocity: classify each post from its post_analytics snapshots, then tally classes.
  const { data: snaps } = await supabaseAdmin
    .from('post_analytics')
    .select('post_id, age_minutes, impressions')
    .eq('user_id', userId)
    .gte('captured_at', ninetyDaysAgo)

  const byPost = new Map<string, VelocitySample[]>()
  for (const s of (snaps ?? []) as Array<{ post_id: string; age_minutes: number | null; impressions: number | null }>) {
    if (!byPost.has(s.post_id)) byPost.set(s.post_id, [])
    byPost.get(s.post_id)!.push({ age_minutes: s.age_minutes, impressions: s.impressions })
  }
  const velocityCounts = { 'fast-spike': 0, 'slow-burn': 0, unknown: 0 }
  for (const series of byPost.values()) {
    velocityCounts[classifyVelocity(series).class] += 1
  }

  return {
    byPillar: perPillarPerformance(rows),
    byFormat: perFormatPerformance(rows),
    byTimeSlot: perTimeSlotPerformance(rows),
    attribution: attributionByPillar(rows),
    velocity: velocityCounts,
    totalPosts: rows.length,
  }
}
