import { supabaseAdmin } from './supabase-admin'

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
 * v1: approximate the cohort from each user's *latest persisted* Growth Score
 * breakdown. Those sub-scores are already pooled, but pooling an already-pooled
 * prior converges (self ≈ prior once a user has data), so this is an acceptable
 * bootstrap. A later calibration task can recompute raw self sub-scores from each
 * user's 28-day windows for a non-circular cohort median.
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
