import { supabaseAdmin } from './supabase-admin'
import { getUserInsights } from './insights'

/** The growth delta window the report narrates, in days (= one baseline window). */
export const REPORT_WINDOW_DAYS = 28

/**
 * Fractional change of a current value vs a prior value.
 * - prior absent/zero → null (no baseline to compare against)
 * - current null but prior present → -1 (lost everything, -100%)
 */
export function pctChange(current: number | null, prior: number | null): number | null {
  if (prior == null || prior === 0) return null
  const c = current ?? 0
  return (c - prior) / prior
}

/** Format a fraction (0.4) as a signed percentage string ("+40%"); "—" for null. */
export function signedPct(frac: number | null): string {
  if (frac == null) return '—'
  const pct = Math.round(frac * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

/** Format a signed integer with thousands separators ("+1,200"); "—" for null. */
export function signedInt(n: number | null): string {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : '-'
  return `${sign}${Math.abs(n).toLocaleString('en-US')}`
}

export type GrowthNarrativeInput = {
  firstName: string
  windowDays: number
  current: { score: number | null; impressions: number | null; followers: number | null }
  prior: { score: number | null; impressions: number | null; followers: number | null }
  /** The top attributed driver from lib/insights.ts (pillar that gained the most
   *  followers) + the best-performing time slot. null when there's no signal. */
  topDriver: {
    pillar: string
    followersGained: number
    bestSlot: { day: string; hour: number } | null
  } | null
}

export type GrowthTrend = 'up' | 'flat' | 'down' | 'insufficient'

/** The structured email model — sendGrowthReportEmail renders this into HTML. */
export type GrowthReportBody = {
  trend: GrowthTrend
  windowDays: number
  headline: string
  attribution: string | null
  scoreLine: string
  recovery: string | null
  cta: { label: string; href: string }
}

export type GrowthNarrative = { subject: string; body: GrowthReportBody }

// v1 trend thresholds, mirrored from the Growth Score band (0–100) / impressions %.
const UP_IMPRESSIONS_PCT = 0.1   // ≥ +10% impressions reads as a real up-week
const DOWN_IMPRESSIONS_PCT = -0.1

function followerDelta(input: GrowthNarrativeInput): number | null {
  if (input.current.followers == null || input.prior.followers == null) return null
  return input.current.followers - input.prior.followers
}

function attributionSentence(input: GrowthNarrativeInput): string | null {
  const d = input.topDriver
  if (!d) return null
  const slot = d.bestSlot ? ` and posting on ${d.bestSlot.day} mornings` : ''
  return `Most of that came from leaning into your ${d.pillar} pillar${slot} — ${signedInt(d.followersGained)} followers traced back to it.`
}

/**
 * Compose the weekly attributable growth narrative. PURE — no I/O.
 * Branches on the impressions trend (the headline reach signal), with follower
 * delta woven in. Insufficient-data wins when there's no prior baseline at all.
 */
export function composeGrowthNarrative(input: GrowthNarrativeInput): GrowthNarrative {
  const { firstName, windowDays } = input
  const imprPct = pctChange(input.current.impressions, input.prior.impressions)
  const fDelta = followerDelta(input)
  const score = input.current.score
  const scoreLine =
    score == null ? `Your Growth Score is still warming up.` : `Your Growth Score is ${score}/100.`
  const cta = { label: 'See the full breakdown', href: '/dashboard/analytics' }

  // No prior baseline → insufficient-data variant.
  if (imprPct == null && input.prior.score == null) {
    return {
      subject: `${firstName}, your first week of growth tracking is underway`,
      body: {
        trend: 'insufficient',
        windowDays,
        headline: `We're still building your baseline, ${firstName} — keep posting and next week's report will show your first real trend.`,
        attribution: null,
        scoreLine,
        recovery: null,
        cta,
      },
    }
  }

  const attribution = attributionSentence(input)

  // UP
  if (imprPct != null && imprPct >= UP_IMPRESSIONS_PCT) {
    const fLabel = fDelta != null ? `, ${signedInt(fDelta)} followers` : ''
    return {
      subject: `${firstName}, your reach is up ${signedPct(imprPct)} this ${windowDays} days`,
      body: {
        trend: 'up',
        windowDays,
        headline: `Impressions ${signedPct(imprPct)}${fLabel} over the last ${windowDays} days.`,
        attribution,
        scoreLine,
        recovery: null,
        cta,
      },
    }
  }

  // DOWN
  if (imprPct != null && imprPct <= DOWN_IMPRESSIONS_PCT) {
    return {
      subject: `${firstName}, a quick read on this week's dip`,
      body: {
        trend: 'down',
        windowDays,
        headline: `Impressions ${signedPct(imprPct)} over the last ${windowDays} days — worth a small course-correct.`,
        attribution,
        scoreLine,
        recovery: input.topDriver
          ? `Your ${input.topDriver.pillar} pillar still drives the most followers — leaning back into it is the fastest way back up.`
          : `Posting a touch more often is usually the fastest way back up.`,
        cta,
      },
    }
  }

  // FLAT (held steady)
  const fLabel = fDelta != null ? ` (${signedInt(fDelta)} followers)` : ''
  return {
    subject: `${firstName}, you held steady this ${windowDays} days`,
    body: {
      trend: 'flat',
      windowDays,
      headline: `Your reach held consistent over the last ${windowDays} days${fLabel} — a steady base to push from.`,
      attribution,
      scoreLine,
      recovery: null,
      cta,
    },
  }
}

/** Pick the score row closest to (but not after) `target`; null if none. */
function scoreAtOrBefore(
  rows: Array<{ score: number; captured_at: string }>,
  target: Date,
): number | null {
  const eligible = rows.filter(r => new Date(r.captured_at) <= target)
  if (eligible.length === 0) return null
  eligible.sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())
  return eligible[0].score
}

/** Sum impressions across published posts in a window. */
function sumImpressions(rows: Array<{ impressions: number | null }>): number | null {
  if (rows.length === 0) return null
  return rows.reduce((acc, r) => acc + (r.impressions ?? 0), 0)
}

export async function buildGrowthReportForUser(
  userId: string,
  firstName: string,
): Promise<GrowthNarrative & { hasData: boolean }> {
  const now = new Date()
  const day = 24 * 60 * 60 * 1000
  const w = REPORT_WINDOW_DAYS
  const curStart = new Date(now.getTime() - w * day)
  const priorStart = new Date(now.getTime() - 2 * w * day)
  const curStartDate = curStart.toISOString().slice(0, 10)
  const priorStartDate = priorStart.toISOString().slice(0, 10)
  const nowDate = now.toISOString().slice(0, 10)

  const [scoresRes, curPostsRes, priorPostsRes, curFollowersRes, priorFollowersRes, insights] =
    await Promise.all([
      supabaseAdmin.from('growth_scores').select('score, captured_at')
        .eq('user_id', userId).gte('captured_at', priorStart.toISOString())
        .order('captured_at', { ascending: true }),
      supabaseAdmin.from('posts').select('impressions')
        .eq('user_id', userId).eq('status', 'published')
        .gte('published_at', curStart.toISOString()),
      supabaseAdmin.from('posts').select('impressions')
        .eq('user_id', userId).eq('status', 'published')
        .gte('published_at', priorStart.toISOString()).lt('published_at', curStart.toISOString()),
      supabaseAdmin.from('follower_snapshots').select('follower_count, snapshot_date')
        .eq('user_id', userId).gte('snapshot_date', curStartDate).lte('snapshot_date', nowDate)
        .order('snapshot_date', { ascending: true }),
      supabaseAdmin.from('follower_snapshots').select('follower_count, snapshot_date')
        .eq('user_id', userId).gte('snapshot_date', priorStartDate).lt('snapshot_date', curStartDate)
        .order('snapshot_date', { ascending: true }),
      getUserInsights(userId),
    ])

  const scores = (scoresRes.data ?? []) as Array<{ score: number; captured_at: string }>
  const curFollowers = (curFollowersRes.data ?? []) as Array<{ follower_count: number | null }>
  const priorFollowers = (priorFollowersRes.data ?? []) as Array<{ follower_count: number | null }>
  const lastFollower = (rows: Array<{ follower_count: number | null }>) =>
    rows.length ? (rows[rows.length - 1].follower_count ?? null) : null

  // Top attributed driver: the pillar that gained the most followers + the best slot.
  const topAttr = insights.attribution?.[0]
  const bestSlot = insights.byTimeSlot?.[0]
  const topDriver =
    topAttr && topAttr.key !== 'Uncategorized' && topAttr.followersGained > 0
      ? {
          pillar: topAttr.key,
          followersGained: topAttr.followersGained,
          bestSlot: bestSlot ? { day: bestSlot.day, hour: bestSlot.hour } : null,
        }
      : null

  const input: GrowthNarrativeInput = {
    firstName,
    windowDays: w,
    current: {
      score: scoreAtOrBefore(scores, now),
      impressions: sumImpressions((curPostsRes.data ?? []) as Array<{ impressions: number | null }>),
      followers: lastFollower(curFollowers),
    },
    prior: {
      score: scoreAtOrBefore(scores, curStart),
      impressions: sumImpressions((priorPostsRes.data ?? []) as Array<{ impressions: number | null }>),
      followers: lastFollower(priorFollowers),
    },
    topDriver,
  }

  const narrative = composeGrowthNarrative(input)
  // "hasData" = the user posted at least once in the current window (worth emailing).
  const hasData = (curPostsRes.data?.length ?? 0) > 0
  return { ...narrative, hasData }
}
