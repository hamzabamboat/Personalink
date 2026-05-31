/**
 * LinkedIn posting schedule optimizer.
 *
 * AI-first scheduling: the system determines the best days and times to post
 * based on platform engagement research. User-set preferred_days /
 * preferred_hour become a soft nudge (±2 h tolerance), not a hard filter.
 *
 * Research basis:
 *  • Best days globally (B2B):  Wed > Tue > Thu > Mon > Fri (Sat/Sun very low)
 *  • Peak windows vary by timezone: typically morning (8–10 AM), optional evening (5–7 PM)
 *  • Content pillars shift the day-weights slightly
 *  • India / South Asia: 9 AM + 7 PM IST perform best
 *
 * Double-stacking (Pro plan):
 *  When count > 30 (physically impossible to fit in 30 unique days), the best
 *  days receive a second slot at the evening peak hour.
 */

// ─── Day-of-week engagement weights ──────────────────────────────────────────
// 0 = Sunday … 6 = Saturday.  1.0 = best possible LinkedIn day for B2B.

export const DOW_WEIGHT: Record<number, number> = {
  0: 0.30, // Sunday  — nearly no B2B traffic
  1: 0.70, // Monday  — decent; good for motivation / week-start content
  2: 0.90, // Tuesday — strong B2B engagement
  3: 1.00, // Wednesday — peak; highest organic reach on LinkedIn
  4: 0.85, // Thursday — strong; good for insights & storytelling
  5: 0.55, // Friday  — declining; people wind down
  6: 0.20, // Saturday — very low B2B
}

// ─── Per-user learned slot weights (Phase 2 — Intervene) ─────────────────────
// Derive day-of-week weights from Plan 1's per-time-slot performance, pooled
// toward the global DOW_WEIGHT with w_self = n/(n+K). Users with little/no data
// fall back to the EXACT global table — no behavior change.

/** v1 pooling strength for learned slot weights. Calibrated in the Phase 2 calibration doc. */
export const SLOT_WEIGHT_K = 10

const DOW_LABEL_TO_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

export type SlotPerf = { day: string; hour: number; posts: number; avgEngagementRate: number }

/**
 * Collapse Plan 1's per-(weekday,hour) slot performance into a per-weekday signal:
 * - `weights[dow]` = that weekday's mean engagement rate, normalised so the best
 *   weekday = 1.0 (matching DOW_WEIGHT's 0..1 scale). Absent for weekdays with no data.
 * - `counts[dow]`  = total posts observed that weekday (drives pooling strength).
 */
export function slotPerformanceToDowWeights(slots: SlotPerf[]): {
  weights: Record<number, number>
  counts: Record<number, number>
} {
  // Sum engagement-rate * posts and posts per weekday → post-weighted mean rate.
  const sumRate: Record<number, number> = {}
  const counts: Record<number, number> = {}
  for (const s of slots) {
    const dow = DOW_LABEL_TO_INDEX[s.day]
    if (dow === undefined) continue
    const posts = s.posts ?? 0
    if (posts <= 0) continue
    sumRate[dow] = (sumRate[dow] ?? 0) + (s.avgEngagementRate ?? 0) * posts
    counts[dow] = (counts[dow] ?? 0) + posts
  }
  const meanRate: Record<number, number> = {}
  let max = 0
  for (const k of Object.keys(counts)) {
    const dow = Number(k)
    meanRate[dow] = counts[dow] > 0 ? sumRate[dow] / counts[dow] : 0
    if (meanRate[dow] > max) max = meanRate[dow]
  }
  const weights: Record<number, number> = {}
  for (const k of Object.keys(meanRate)) {
    const dow = Number(k)
    weights[dow] = max > 0 ? meanRate[dow] / max : 0
  }
  return { weights, counts }
}

/**
 * Blend the global DOW_WEIGHT with a user's per-weekday signal:
 *   w_self = n / (n + K);  merged = w_self*userWeight + (1 - w_self)*globalWeight
 * Weekdays with no user signal (or n=0) keep the global value exactly, so a user
 * without enough data gets today's behavior unchanged. Pure: never mutates inputs.
 */
export function mergeSlotWeights(
  globalDowWeight: Record<number, number>,
  userSignal: { weights: Record<number, number>; counts: Record<number, number> },
  k: number,
): Record<number, number> {
  const merged: Record<number, number> = { ...globalDowWeight }
  for (const key of Object.keys(globalDowWeight)) {
    const dow = Number(key)
    const userWeight = userSignal.weights[dow]
    const n = userSignal.counts[dow] ?? 0
    if (userWeight === undefined || n <= 0) continue
    const wSelf = n / (n + k)
    merged[dow] = wSelf * userWeight + (1 - wSelf) * globalDowWeight[dow]
  }
  return merged
}

// ─── Peak hours by timezone region ────────────────────────────────────────────

/**
 * Returns { primary, secondary } local hours (24 h) for the best posting windows.
 * primary  = single best slot (used for all plans)
 * secondary = double-stack slot (used only when count > 30, i.e. Pro full quota)
 */
export function getPeakHours(timezone: string): { primary: number; secondary: number } {
  const tz = timezone.toLowerCase()

  if (tz.includes('kolkata') || tz.includes('colombo') || tz.includes('dhaka') || tz.includes('karachi'))
    return { primary: 9, secondary: 19 }   // 9 AM + 7 PM IST

  if (tz.includes('dubai') || tz.includes('riyadh') || tz.includes('qatar') || tz.includes('bahrain') || tz.includes('muscat'))
    return { primary: 9, secondary: 18 }   // 9 AM + 6 PM GST

  if (tz.includes('lagos') || tz.includes('nairobi') || tz.includes('johannesburg') || tz.includes('cairo') || tz.includes('africa'))
    return { primary: 9, secondary: 18 }

  if (tz.includes('london') || tz.includes('dublin') || tz.includes('lisbon'))
    return { primary: 8, secondary: 17 }   // 8 AM + 5 PM GMT

  if (tz.includes('paris') || tz.includes('berlin') || tz.includes('amsterdam') ||
      tz.includes('rome') || tz.includes('madrid') || tz.includes('europe'))
    return { primary: 9, secondary: 17 }   // 9 AM + 5 PM CET

  if (tz.includes('new_york') || tz.includes('eastern') || tz.includes('toronto') || tz.includes('montreal'))
    return { primary: 8, secondary: 17 }   // 8 AM + 5 PM EST

  if (tz.includes('chicago') || tz.includes('central'))
    return { primary: 8, secondary: 17 }

  if (tz.includes('denver') || tz.includes('phoenix') || tz.includes('mountain'))
    return { primary: 8, secondary: 17 }

  if (tz.includes('los_angeles') || tz.includes('pacific') || tz.includes('vancouver') || tz.includes('seattle'))
    return { primary: 8, secondary: 17 }   // 8 AM + 5 PM PST

  if (tz.includes('singapore') || tz.includes('kuala_lumpur') || tz.includes('bangkok') ||
      tz.includes('jakarta') || tz.includes('manila'))
    return { primary: 9, secondary: 18 }

  if (tz.includes('tokyo') || tz.includes('seoul') || tz.includes('shanghai') ||
      tz.includes('beijing') || tz.includes('hongkong'))
    return { primary: 9, secondary: 18 }

  if (tz.includes('sydney') || tz.includes('melbourne') || tz.includes('brisbane') || tz.includes('australia'))
    return { primary: 8, secondary: 17 }

  return { primary: 9, secondary: 18 }    // safe global default
}

// ─── Content-pillar day boosts ────────────────────────────────────────────────

/**
 * Certain content types get a small score boost on specific days.
 * Motivation → Monday. Insights/thought-leadership → Tuesday.
 * Tips/education → Wednesday/Thursday. Stories → Thursday.
 */
export function getPillarDowBoosts(pillars: string[]): Record<number, number> {
  const boost: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  const lower = pillars.map(p => p.toLowerCase())

  if (lower.some(p => p.includes('motivat') || p.includes('mindset') || p.includes('personal growth')))
    boost[1] += 0.15  // Monday — motivation / week-start

  if (lower.some(p => p.includes('industry') || p.includes('insight') || p.includes('trend') || p.includes('thought'))) {
    boost[2] += 0.10  // Tuesday — industry takes
    boost[3] += 0.05
  }

  if (lower.some(p => p.includes('tip') || p.includes('how') || p.includes('learn') || p.includes('educat') || p.includes('guide'))) {
    boost[3] += 0.08  // Wednesday/Thursday — how-tos & education
    boost[4] += 0.08
  }

  if (lower.some(p => p.includes('story') || p.includes('behind') || p.includes('journey') || p.includes('personal')))
    boost[4] += 0.12  // Thursday — personal stories

  return boost
}

// ─── Main scheduler ───────────────────────────────────────────────────────────

export interface OptimalSlotsInput {
  now: Date
  count: number                    // posts to schedule
  planMonthlyLimit: number         // plan's posts_generated quota (for window calc)
  timezone: string                 // IANA timezone, e.g. "Asia/Kolkata"
  pillars: string[]                // content pillars (for day-score adjustment)
  takenDateStrings: Set<string>    // already-scheduled date strings (toDateString())
  userPreferredDays: string[]      // from profile — soft nudge, not hard filter
  userPreferredHour: number        // from profile — used if within ±2 h of AI pick
  /**
   * Subscription billing period end date.
   * Pass for monthly subscribers — ALL slots (including double-stacks) are hard-
   * capped to this date so posts never bleed into the next billing cycle.
   * Omit (or leave undefined) for annual subscribers and free users; the default
   * 30-day proportional window applies instead.
   */
  periodEndDate?: Date
  /**
   * Per-user learned day-of-week weights (Phase 2). When provided, the Pass-1
   * day score uses these instead of the global DOW_WEIGHT. Omit (default) and
   * behavior is byte-identical to before. Built by mergeSlotWeights / passed by
   * the caller only when a timing experiment is active for the user.
   */
  learnedDowWeight?: Record<number, number>
}

/**
 * Build an ordered list of Date posting slots, AI-optimised for LinkedIn reach.
 *
 * WINDOW LOGIC  (same as before — preserves billing-period renewal need):
 *   windowDays = max(count, round(count / planMonthlyLimit × 30))
 *
 * SLOT SELECTION:
 *   Pass 1 — score every day (DOW weight + pillar boost + user-pref nudge + recency)
 *   Pass 2 — fill remaining with double-stack evening slots on best days
 *            (only fires when count > windowDays, e.g. Pro-50 full quota)
 *
 * USER PREFERENCES:
 *   preferred_hour  → used as primary hour if within ±2 h of AI pick; else AI wins
 *   preferred_days  → +0.15 score nudge on those days; not a hard filter
 */
export function buildOptimalSlots(input: OptimalSlotsInput): Date[] {
  const {
    now, count, planMonthlyLimit, timezone, pillars,
    takenDateStrings, userPreferredDays, userPreferredHour,
    periodEndDate, learnedDowWeight,
  } = input

  // ── Proportional window (hard-capped at 30 days) ────────────────────────
  // windowDays = proportional share of the 30-day billing period, never > 30.
  // For Pro-50 full-quota generates this hits the 30-day cap; the remaining
  // posts are filled by double-stacking on the best days (Pass 2), NOT by
  // stretching into the next billing period.
  const effectivePlanLimit = Math.max(planMonthlyLimit, 1)
  const proportionalDays = Math.round((count / effectivePlanLimit) * 30)
  const rawWindowDays = Math.min(30, Math.max(count, proportionalDays))

  // ── Billing-period hard cap (monthly subscribers only) ──────────────────
  // If the caller supplies periodEndDate the window is further capped to the
  // days remaining in the current subscription cycle, so posts never bleed
  // into the next billing period.  Annual subscribers and free users omit
  // periodEndDate and the default 30-day window applies unchanged.
  let windowDays = rawWindowDays
  if (periodEndDate) {
    const msPerDay = 24 * 60 * 60 * 1000
    const daysLeft = Math.max(1, Math.floor((periodEndDate.getTime() - now.getTime()) / msPerDay))
    windowDays = Math.min(rawWindowDays, daysLeft)
  }

  // ── Optimal hours ────────────────────────────────────────────────────────
  const { primary: aiPrimary, secondary: aiSecondary } = getPeakHours(timezone)

  // Use user's preferred hour when it's close to the AI pick (≤2 h); else use AI's
  const primaryHour = Math.abs(userPreferredHour - aiPrimary) <= 2 ? userPreferredHour : aiPrimary
  const secondaryHour = aiSecondary   // double-stack always uses research-backed evening peak

  // ── Current hour in user timezone (for start-day calculation) ────────────
  let userNowStr: string
  try { userNowStr = now.toLocaleString('en-US', { timeZone: timezone }) }
  catch { userNowStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) }
  const userHour = new Date(userNowStr).getHours()
  const startOffset = userHour >= primaryHour ? 1 : 0

  const yr = now.getFullYear()
  const mo = now.getMonth()
  const dt = now.getDate()

  const pillarBoosts = getPillarDowBoosts(pillars)

  // ── Score every day in the search horizon ────────────────────────────────
  // horizon = window + buffer for taken-day skips + double-stack overflow
  const horizon = windowDays + 90 + takenDateStrings.size

  type DayScore = { offset: number; score: number }
  const scored: DayScore[] = []

  for (let offset = startOffset; offset < startOffset + horizon; offset++) {
    const d = new Date(yr, mo, dt + offset)
    if (takenDateStrings.has(d.toDateString())) continue

    const dow = d.getDay()
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' })

    const base    = (learnedDowWeight ?? DOW_WEIGHT)[dow] ?? 0.50
    const pillar  = pillarBoosts[dow] ?? 0
    const pref    = userPreferredDays.includes(dayName) ? 0.15 : 0
    const recency = Math.max(0, 0.10 - offset * 0.001)               // slight bias to sooner
    const penalty = offset >= startOffset + windowDays                // beyond window → penalise
      ? (offset - startOffset - windowDays) * 0.05 : 0

    scored.push({ offset, score: base + pillar + pref + recency - penalty })
  }

  // ── Pass 1: primary slots (one per day) ──────────────────────────────────
  // Capped at min(count, windowDays) so Pro-50 gets 30 primaries (not 50).
  // The remaining slots come from Pass 2 double-stacking.
  const rankedByScore = [...scored].sort((a, b) => b.score - a.score || a.offset - b.offset)
  const usedOffsets = new Set<number>()
  const primary: { offset: number; hour: number }[] = []
  const primaryCap = Math.min(count, windowDays)

  for (const { offset } of rankedByScore) {
    if (primary.length >= primaryCap) break
    if (usedOffsets.has(offset)) continue
    if (offset >= startOffset + windowDays) continue  // hard-cap: never place a primary beyond the window
    usedOffsets.add(offset)
    primary.push({ offset, hour: primaryHour })
  }

  // ── Pass 2: double-stack evening slots on the best days ──────────────────
  // Fires when count > windowDays (Pro-50 full quota, etc.).
  // Picks the highest-scoring days from the primary set and adds an
  // evening post at secondaryHour, fitting overflow within the same window.
  const doubleStack: { offset: number; hour: number }[] = []
  const needed = count - primary.length

  if (needed > 0) {
    const bestFirst = [...usedOffsets]
      .map(o => ({ offset: o, score: scored.find(s => s.offset === o)?.score ?? 0 }))
      .sort((a, b) => b.score - a.score)

    for (const { offset } of bestFirst) {
      if (doubleStack.length >= needed) break
      doubleStack.push({ offset, hour: secondaryHour })
    }
  }

  // ── Merge + sort chronologically ─────────────────────────────────────────
  return [...primary, ...doubleStack]
    .sort((a, b) => (a.offset - b.offset) || (a.hour - b.hour))
    .slice(0, count)
    .map(({ offset, hour }) => new Date(yr, mo, dt + offset, hour, 0, 0))
}
