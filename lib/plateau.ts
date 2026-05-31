import { supabaseAdmin } from './supabase-admin'
import type { ExperimentDimension } from '@/lib/supabase'
import { createExperiment } from '@/lib/experiments'

// ── v1 calibration constants ──────────────────────────────────────────────────
/** Number of consecutive flat windows required to declare a plateau. */
export const PLATEAU_WINDOWS = 3
/** Max |Δscore| considered "flat" (within the plateau band). */
export const PLATEAU_SCORE_DELTA = 2
/** Single-window score drop that triggers an immediate regression flag. */
export const REGRESSION_SCORE_DELTA = -5
/** Min follower growth rate (fraction) over the plateau window to override. */
export const PLATEAU_FOLLOWER_GROWTH_PCT = 0.01

// ── Pure detector ─────────────────────────────────────────────────────────────

export type PlateauVerdict = { plateaued: boolean; reason: string }

/**
 * Pure plateau/regression detector. PURE — no I/O.
 * @param scores  Chronological growth score points (one per window period).
 * @param followers Chronological follower counts (aligned to the same windows).
 */
export function detectPlateau(
  scores: number[],
  followers: number[],
): PlateauVerdict {
  // Need at least 2 points to compute any delta.
  if (scores.length < 2) {
    return { plateaued: false, reason: 'insufficient data (need 2+ score points)' }
  }

  const deltas = scores.slice(1).map((s, i) => s - scores[i])
  const lastDelta = deltas[deltas.length - 1]

  // 1. Regression — a sharp single-window drop, flagged immediately (needs only 2 points).
  if (lastDelta <= REGRESSION_SCORE_DELTA) {
    return { plateaued: true, reason: `regression: score dropped ${lastDelta} points in one window` }
  }

  // 2. Plateau — need a full run of PLATEAU_WINDOWS flat deltas.
  if (deltas.length < PLATEAU_WINDOWS) {
    return { plateaued: false, reason: 'insufficient data (not enough windows for a plateau)' }
  }

  const recent = deltas.slice(-PLATEAU_WINDOWS)
  const allFlat = recent.every(d => Math.abs(d) <= PLATEAU_SCORE_DELTA)
  if (!allFlat) return { plateaued: false, reason: 'score is still moving (not flat)' }

  // Check follower growth floor across the same span (last PLATEAU_WINDOWS+1 points).
  const span = PLATEAU_WINDOWS + 1
  const fStart = followers.length >= span ? followers[followers.length - span] : followers[0]
  const fEnd = followers.length ? followers[followers.length - 1] : 0
  const fGrowth = fStart && fStart > 0 ? (fEnd - fStart) / fStart : 0
  if (fGrowth >= PLATEAU_FOLLOWER_GROWTH_PCT) {
    return { plateaued: false, reason: 'follower growth is still healthy — not a plateau' }
  }

  return { plateaued: true, reason: `plateau: ${PLATEAU_WINDOWS} consecutive flat windows with stalled follower growth` }
}

// ── Thin wiring ───────────────────────────────────────────────────────────────

/** Map a plateau to the dimension we'll experiment on, seeded from attribution. */
function plateauTreatment(topPillar: string | null, bestSlot: { day: string; hour: number } | null): {
  dimension: ExperimentDimension
  control: Record<string, unknown>
  treatment: Record<string, unknown>
  hypothesis: string
} {
  if (bestSlot) {
    return {
      dimension: 'timing',
      control: { strategy: 'current_schedule' },
      treatment: { day: bestSlot.day, hour: bestSlot.hour },
      hypothesis: `Posting on ${bestSlot.day} ${bestSlot.hour}:00 (the user's best-performing slot) lifts reach off the plateau.`,
    }
  }
  return {
    dimension: 'pillar',
    control: { strategy: 'current_mix' },
    treatment: { pillar: topPillar ?? 'top_performing' },
    hypothesis: `Weighting toward the ${topPillar ?? 'best-performing'} pillar lifts reach off the plateau.`,
  }
}

/**
 * If the user is plateaued/regressing and has NO experiment currently running,
 * open one (seeded from their attribution) via Phase 2's createExperiment.
 * Idempotent: never opens a second concurrent experiment. Best-effort; returns
 * what it did. Thin glue — the decision is the pure detectPlateau.
 */
export async function maybeOpenPlateauExperiment(
  userId: string,
): Promise<{ opened: boolean; reason: string; experimentId?: string }> {
  const lookback = new Date(Date.now() - (PLATEAU_WINDOWS + 3) * 28 * 24 * 60 * 60 * 1000).toISOString()
  const [scoresRes, followersRes, runningRes] = await Promise.all([
    supabaseAdmin.from('growth_scores').select('score, captured_at')
      .eq('user_id', userId).gte('captured_at', lookback)
      .order('captured_at', { ascending: true }),
    supabaseAdmin.from('follower_snapshots').select('follower_count, snapshot_date')
      .eq('user_id', userId).order('snapshot_date', { ascending: true }),
    supabaseAdmin.from('experiments').select('id')
      .eq('user_id', userId).eq('status', 'running').limit(1).maybeSingle(),
  ])

  const scores = (scoresRes.data ?? []).map(r => r.score as number)
  const followers = (followersRes.data ?? []).map(r => (r.follower_count as number | null) ?? 0)
  const verdict = detectPlateau(scores, followers)
  if (!verdict.plateaued) return { opened: false, reason: verdict.reason }

  if (runningRes.data) return { opened: false, reason: 'experiment already running' }

  const { getUserInsights } = await import('./insights')
  const insights = await getUserInsights(userId)
  const topPillar = insights.attribution?.find(a => a.key !== 'Uncategorized' && a.followersGained > 0)?.key ?? null
  const bestSlot = insights.byTimeSlot?.[0] ? { day: insights.byTimeSlot[0].day, hour: insights.byTimeSlot[0].hour } : null
  const plan = plateauTreatment(topPillar, bestSlot)

  const experiment = await createExperiment({
    userId,
    hypothesis: plan.hypothesis,
    dimension: plan.dimension,
    control: plan.control,
    treatment: plan.treatment,
    baselineMetric: 'engagement_rate',
  })
  if (!experiment) return { opened: false, reason: 'createExperiment returned null' }
  return { opened: true, reason: verdict.reason, experimentId: experiment.id }
}
