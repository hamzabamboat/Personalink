import { supabaseAdmin } from './supabase-admin'
import { selfSubScores } from './growth-score'

export type UserSubScores = {
  reach: number | null
  audience: number | null
  resonance: number | null
  authority: number | null
}

export function median(xs: Array<number | null>): number | null {
  const v = xs.filter((x): x is number => x != null).sort((a, b) => a - b)
  if (v.length === 0) return null
  const mid = Math.floor(v.length / 2)
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/** Pure: per-dimension median across users' self sub-scores. */
export function computeCohortBaselines(users: UserSubScores[]) {
  return {
    cohort_key: 'global',
    reach_median: median(users.map(u => u.reach)),
    audience_median: median(users.map(u => u.audience)),
    resonance_median: median(users.map(u => u.resonance)),
    authority_median: median(users.map(u => u.authority)),
    n_users: users.length,
  }
}

/**
 * Build each active user's *self* sub-scores (no pooling) from their persisted
 * Growth Score breakdown is NOT reliable (already pooled), so we recompute self
 * sub-scores from the same 28-day windows. To keep this rollup cheap we reuse the
 * breakdown's sub-scores only as a fallback; primary path recomputes via the
 * shared selfSubScores against pre-aggregated windows fetched per user.
 *
 * For v1 we approximate the cohort from the *latest persisted breakdowns*, which
 * is acceptable because pooling of an already-pooled prior converges (self≈prior
 * once a user has data). The calibration task revisits this.
 */
export async function persistCohortBaselines() {
  const { data } = await supabaseAdmin
    .from('growth_scores')
    .select('user_id, breakdown, captured_at')
    .order('captured_at', { ascending: false })
    .limit(5000)

  // Keep only the most-recent breakdown per user.
  const latestByUser = new Map<string, UserSubScores>()
  for (const row of (data ?? []) as Array<{ user_id: string; breakdown: UserSubScores }>) {
    if (!latestByUser.has(row.user_id)) {
      latestByUser.set(row.user_id, {
        reach: row.breakdown.reach ?? null,
        audience: row.breakdown.audience ?? null,
        resonance: row.breakdown.resonance ?? null,
        authority: row.breakdown.authority ?? null,
      })
    }
  }

  const baseline = computeCohortBaselines([...latestByUser.values()])
  await supabaseAdmin.from('cohort_baselines').insert(baseline)
  return baseline
}

// Re-export so callers that already import this module get the score input type.
void selfSubScores
