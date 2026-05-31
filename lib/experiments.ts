import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  Experiment,
  ExperimentResult,
  Variant,
} from '@/lib/supabase'

/**
 * Deterministic hash of a string to a uniform value in [0, 1). FNV-1a 32-bit;
 * no crypto needed (this is bucketing, not security). Same input → same output,
 * so a post never flaps between arms across regenerations and tests need no RNG.
 */
export function hashToUnitInterval(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  // >>> 0 makes it unsigned; divide by 2^32 for [0,1)
  return (h >>> 0) / 0x100000000
}

/**
 * Assign a post to the control or treatment arm of an experiment, deterministically.
 * `treatmentShare` is the fraction routed to treatment (default 0.5 = even split).
 * Keyed on `${experiment.id}:${post.id}` so assignment is per-experiment.
 */
export function assignVariant(
  experiment: { id: string },
  post: { id: string },
  treatmentShare = 0.5,
): Variant {
  const x = hashToUnitInterval(`${experiment.id}:${post.id}`)
  return x < treatmentShare ? 'treatment' : 'control'
}

/** v1 decision thresholds. Calibrated in docs/.../2026-05-31-experiment-calibration.md. */
export const EXPERIMENT_THRESHOLDS = {
  MIN_SAMPLE: 6,        // min posts in the binding arm before any verdict
  WIN_LIFT: 0.10,       // +10% over baseline = a win (with confidence)
  ROLLBACK_LIFT: -0.10, // -10% under baseline = a loss → roll back (with confidence)
  MIN_CONFIDENCE: 0.6,  // heuristic confidence gate for win/loss
  MATURE_DAYS: 21,      // after this many days, force a terminal verdict
} as const

function cleanNumbers(xs: Array<number | null | undefined>): number[] {
  return xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
}

/** Population variance of the pooled arms (used only for the heuristic confidence). */
function pooledSd(a: number[], b: number[]): number {
  const all = [...a, ...b]
  if (all.length < 2) return 0
  const m = mean(all)
  const variance = all.reduce((acc, x) => acc + (x - m) ** 2, 0) / all.length
  return Math.sqrt(variance)
}

function clamp01(x: number): number {
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

/**
 * Effect size + sample-aware HEURISTIC confidence (NOT a p-value).
 *   lift       = (meanT - meanB) / meanB        (0 when meanB <= 0)
 *   n          = min(|baseline|, |treatment|)    (the binding sample count)
 *   confidence = 1 - exp(-z/2),  z = |meanT-meanB| / (sd / sqrt(n))
 *               (z is a Welch-ish signal-to-noise; sd is the pooled stdev)
 * Edge rules: n<2 → confidence 0; sd==0 with a real difference → confidence 1.
 * Monotonic in both effect size and n, bounded to [0,1], no stats library needed.
 * The calibration doc defines when to swap this for a bootstrap CI.
 */
export function computeLift(
  baselineSeries: Array<number | null | undefined>,
  treatmentSeries: Array<number | null | undefined>,
): { lift: number; confidence: number; n: number } {
  const b = cleanNumbers(baselineSeries)
  const t = cleanNumbers(treatmentSeries)
  const n = Math.min(b.length, t.length)
  const meanB = mean(b)
  const meanT = mean(t)
  const lift = meanB > 0 ? (meanT - meanB) / meanB : 0

  if (n < 2) return { lift, confidence: 0, n }

  const sd = pooledSd(b, t)
  const diff = Math.abs(meanT - meanB)
  let confidence: number
  if (sd === 0) {
    confidence = diff > 0 ? 1 : 0
  } else {
    const z = diff / (sd / Math.sqrt(n))
    confidence = clamp01(1 - Math.exp(-z / 2))
  }
  return { lift, confidence, n }
}

/**
 * Turn a lift result into a lifecycle decision under the v1 guardrails.
 * `matured` = the experiment has run >= MATURE_DAYS (the cron computes it).
 *   n < MIN_SAMPLE                          → keep_running (no judgement yet)
 *   clear loss (lift<=ROLLBACK, conf>=MIN)  → lost,  rollback
 *   clear win  (lift>=WIN,      conf>=MIN)  → won,   keep
 *   matured, neither                        → inconclusive, rollback (revert to control)
 *   not matured, neither                    → keep_running
 */
export function evaluateGuardrails(args: {
  n: number
  lift: number
  confidence: number
  matured: boolean
}): { decision: ExperimentResult['decision']; rollback: boolean } {
  const T = EXPERIMENT_THRESHOLDS
  if (args.n < T.MIN_SAMPLE) return { decision: 'keep_running', rollback: false }

  const confident = args.confidence >= T.MIN_CONFIDENCE
  if (confident && args.lift <= T.ROLLBACK_LIFT) return { decision: 'lost', rollback: true }
  if (confident && args.lift >= T.WIN_LIFT) return { decision: 'won', rollback: false }

  if (args.matured) return { decision: 'inconclusive', rollback: true }
  return { decision: 'keep_running', rollback: false }
}

// ── Silence the unused import of supabaseAdmin until DB wrappers are added ───
// (The import is intentional — it will be used in a later unit. The mock stub
// in tests resolves it to an empty object so tests run without real env vars.)
void supabaseAdmin
void (undefined as unknown as Experiment)
