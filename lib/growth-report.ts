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
