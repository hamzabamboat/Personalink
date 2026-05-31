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
  if (scores.length < PLATEAU_WINDOWS + 1) {
    return { plateaued: false, reason: 'insufficient data — need at least PLATEAU_WINDOWS+1 points' }
  }

  // Regression: last two scores drop >= threshold in one step.
  const lastDelta = scores[scores.length - 1] - scores[scores.length - 2]
  if (lastDelta <= REGRESSION_SCORE_DELTA) {
    return { plateaued: true, reason: `regression: score dropped ${lastDelta} points in one window` }
  }

  // Plateau: the last PLATEAU_WINDOWS deltas are all within ±PLATEAU_SCORE_DELTA
  // AND follower growth over the same span is < PLATEAU_FOLLOWER_GROWTH_PCT.
  const windowDeltas = scores
    .slice(-(PLATEAU_WINDOWS + 1))
    .map((v, i, arr) => (i === 0 ? null : v - arr[i - 1]))
    .filter((d): d is number => d !== null)

  const allFlat = windowDeltas.every(d => Math.abs(d) <= PLATEAU_SCORE_DELTA)
  if (!allFlat) return { plateaued: false, reason: 'score is still moving (not flat)' }

  // Check follower growth floor.
  const oldestFollower = followers[followers.length - PLATEAU_WINDOWS - 1]
  const newestFollower = followers[followers.length - 1]
  if (oldestFollower && oldestFollower > 0) {
    const growthPct = (newestFollower - oldestFollower) / oldestFollower
    if (growthPct >= PLATEAU_FOLLOWER_GROWTH_PCT) {
      return { plateaued: false, reason: 'follower growth is still healthy — not a plateau' }
    }
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
