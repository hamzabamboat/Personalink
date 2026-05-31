import { supabaseAdmin } from './supabase-admin'
import type { MetricSource } from './supabase'

/** v1 pooling strength. Calibrated in Task 11. */
export const GROWTH_K = 10

/** v1 sub-score weights (sum to 1.0). Calibrated in Task 11. */
export const GROWTH_WEIGHTS = {
  reach: 0.3,
  audience: 0.3,
  resonance: 0.25,
  authority: 0.15,
} as const

/** The user's rolling baseline length, in days. */
export const BASELINE_WINDOW_DAYS = 28

export function clamp0_100(x: number): number {
  if (x < 0) return 0
  if (x > 100) return 100
  return x
}

/**
 * Improvement of a current metric vs the user's own prior baseline, 0–100.
 * - baseline absent/zero → null (no signal to measure against; excluded from the mean)
 * - holding the baseline (current == baseline) → 100
 * - beating it clamps at 100; falling short scales down to 0
 */
export function ratioScore(current: number | null, baseline: number | null): number | null {
  if (baseline == null || baseline <= 0) return null
  const c = current ?? 0
  return clamp0_100((c / baseline) * 100)
}
