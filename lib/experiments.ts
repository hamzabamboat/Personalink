import { supabaseAdmin } from './supabase-admin'
import type {
  Experiment,
  ExperimentResult,
  Variant,
} from '@/lib/supabase'
import {
  DOW_WEIGHT,
  SLOT_WEIGHT_K,
  slotPerformanceToDowWeights,
  mergeSlotWeights,
} from '@/lib/linkedin-schedule'

/** Lazy import of Plan 1's pure insight helpers (keeps the import graph thin). */
async function loadInsights() {
  const mod = await import('@/lib/insights')
  return { perTimeSlotPerformance: mod.perTimeSlotPerformance, type: undefined }
}

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

/**
 * Within-group pooled standard deviation (used only for the heuristic confidence).
 * Uses the average of each arm's population variance, then sqrt. When both arms
 * are internally uniform (e.g. [10,10,10] vs [12,12,12]), sd=0 so the caller's
 * sd==0 guard fires and returns confidence=1 (clean separation).
 */
function pooledSd(a: number[], b: number[]): number {
  if (a.length < 2 && b.length < 2) return 0
  const variance = (xs: number[]) => {
    if (xs.length < 2) return 0
    const m = mean(xs)
    return xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / xs.length
  }
  return Math.sqrt((variance(a) + variance(b)) / 2)
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

/** The generation knobs an experiment treatment can turn. */
export type GenerationConfig = {
  pillar: string
  format: string
  promptSuffix: string
  targetWords: number | null
}

type TreatmentExperiment = {
  dimension: Experiment['dimension']
  treatment: Record<string, unknown>
}

/**
 * Apply an experiment's treatment to a post's generation config — PURELY.
 * - control arm (or null experiment) → base config UNCHANGED (byte-identical to today)
 * - treatment arm → only the field(s) for that dimension are overridden
 * - timing acts via the scheduler (learned weights), so it is a no-op here
 */
export function applyTreatmentToGeneration(
  base: GenerationConfig,
  experiment: TreatmentExperiment | null,
  variant: Variant,
): GenerationConfig {
  if (!experiment || variant !== 'treatment') return base
  const t = experiment.treatment
  switch (experiment.dimension) {
    case 'pillar':
      return typeof t.pillar === 'string' ? { ...base, pillar: t.pillar } : base
    case 'format':
      return typeof t.format === 'string' ? { ...base, format: t.format } : base
    case 'hook':
      // NOTE: promptSuffix is computed here but NOT yet threaded into generation.
      // The generate-batch consumer reads only `applied.pillar` and `applied.format`.
      // Phase 2 follow-up will inject promptSuffix into the prompt pre-generation.
      return typeof t.hook_style === 'string'
        ? { ...base, promptSuffix: `${base.promptSuffix}\nOpen with a ${t.hook_style} hook.`.trim() }
        : base
    case 'length':
      // NOTE: targetWords is computed here but NOT yet threaded into generation.
      // The generate-batch consumer reads only `applied.pillar` and `applied.format`.
      // Phase 2 follow-up will inject targetWords into the prompt pre-generation.
      return typeof t.target_words === 'number' ? { ...base, targetWords: t.target_words } : base
    case 'timing':
    default:
      return base
  }
}

// ── Thin DB wrappers ─────────────────────────────────────────────────────────

/**
 * Pure validator for v1-supported experiment dimensions.
 * 'hook' and 'length' are valid ExperimentDimension types (reserved for a
 * Phase 2 follow-up that threads promptSuffix/targetWords into generation
 * pre-prompt), but cannot be wired up yet — the generate-batch consumer only
 * reads `applied.pillar` and `applied.format`, so a hook/length experiment
 * would track arms but generate identical content, measuring ~zero lift and
 * auto-rolling-back after MATURE_DAYS without ever testing the hypothesis.
 *
 * Throws for hook/length so callers get a clear message instead of silently
 * running an inert experiment.
 */
export function assertSupportedDimension(dimension: Experiment['dimension']): void {
  if (dimension === 'hook' || dimension === 'length') {
    throw new Error(
      "v1 experiments support 'timing' | 'pillar' | 'format'; " +
      "'hook'/'length' need prompt-level treatment (Phase 2 follow-up)",
    )
  }
}

/** Create a running experiment for a user. Returns the inserted row. */
export async function createExperiment(args: {
  userId: string
  hypothesis: string
  dimension: Experiment['dimension']
  treatment: Record<string, unknown>
  control?: Record<string, unknown>
  baselineMetric?: string
}): Promise<Experiment | null> {
  assertSupportedDimension(args.dimension)
  const { data } = await supabaseAdmin
    .from('experiments')
    .insert({
      user_id: args.userId,
      hypothesis: args.hypothesis,
      dimension: args.dimension,
      control: args.control ?? {},
      treatment: args.treatment,
      baseline_metric: args.baselineMetric ?? 'engagement_rate',
      status: 'running',
    })
    .select()
    .single()
  return (data as Experiment) ?? null
}

/**
 * The single running experiment for a user (if any). v1 runs ONE change at a
 * time per user (the framework forbids conflicting experiments on a dimension),
 * so we take the most-recently-started running row.
 */
export async function getActiveExperiment(userId: string): Promise<Experiment | null> {
  const { data } = await supabaseAdmin
    .from('experiments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Experiment) ?? null
}

/**
 * Per-user learned day-of-week weights for the scheduler, or null to use the
 * global DOW_WEIGHT. Only returns learned weights when the user has a timing
 * experiment that is running or won (the timing intervention is itself gated by
 * an experiment — no silent global change). Reads Plan 1's perTimeSlotPerformance.
 */
export async function getUserSlotWeights(userId: string): Promise<Record<number, number> | null> {
  const { perTimeSlotPerformance } = await loadInsights()

  const { data: timingExp } = await supabaseAdmin
    .from('experiments')
    .select('id, status')
    .eq('user_id', userId)
    .eq('dimension', 'timing')
    .in('status', ['running', 'won'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!timingExp) return null

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('content_pillar, format, published_at, impressions, reactions, comments, reshares, saves')
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', ninetyDaysAgo)

  const slots = perTimeSlotPerformance((posts ?? []) as unknown as Parameters<typeof perTimeSlotPerformance>[0])
  const { weights, counts } = slotPerformanceToDowWeights(slots)
  if (Object.keys(counts).length === 0) return null
  return mergeSlotWeights(DOW_WEIGHT, { weights, counts }, SLOT_WEIGHT_K)
}

/**
 * Build the per-post engagement-rate series for one arm of an experiment, within
 * the experiment's lifetime. engagement rate = (reactions+comments+reshares+saves)
 * / impressions, computed per post (posts with 0 impressions are dropped).
 */
function engagementRateSeries(
  rows: Array<{
    impressions: number | null
    reactions: number | null
    comments: number | null
    reshares: number | null
    saves: number | null
  }>,
): number[] {
  const out: number[] = []
  for (const r of rows) {
    const impr = r.impressions ?? 0
    if (impr <= 0) continue
    const eng = (r.reactions ?? 0) + (r.comments ?? 0) + (r.reshares ?? 0) + (r.saves ?? 0)
    out.push(eng / impr)
  }
  return out
}

/**
 * Evaluate one experiment: gather treatment-arm posts vs the user's pre-experiment
 * baseline (the same metric over the 28 days BEFORE started_at, control-equivalent
 * behavior), compute lift, apply guardrails, persist status/result, and on rollback
 * mark the experiment terminal so future generation stops applying the treatment.
 * Returns the result written.
 */
export async function evaluateExperiment(
  experimentId: string,
  now: Date = new Date(),
): Promise<ExperimentResult | null> {
  const { data: exp } = await supabaseAdmin
    .from('experiments')
    .select('*')
    .eq('id', experimentId)
    .maybeSingle()
  if (!exp || (exp as Experiment).status !== 'running') return null
  const e = exp as Experiment

  const startedAt = new Date(e.started_at)
  const baselineStart = new Date(startedAt.getTime() - 28 * 24 * 60 * 60 * 1000)
  const cols = 'impressions, reactions, comments, reshares, saves'

  const [treatmentRes, baselineRes] = await Promise.all([
    // Treatment arm: posts in this experiment tagged treatment, published since start.
    supabaseAdmin.from('posts').select(cols)
      .eq('user_id', e.user_id).eq('experiment_id', e.id).eq('variant', 'treatment')
      .eq('status', 'published').gte('published_at', e.started_at),
    // Baseline: the user's published posts in the 28 days before the experiment
    // began (their own pre-experiment behavior = the control reference).
    supabaseAdmin.from('posts').select(cols)
      .eq('user_id', e.user_id).eq('status', 'published')
      .gte('published_at', baselineStart.toISOString()).lt('published_at', e.started_at),
  ])

  const treatmentSeries = engagementRateSeries((treatmentRes.data ?? []) as Parameters<typeof engagementRateSeries>[0])
  const baselineSeries = engagementRateSeries((baselineRes.data ?? []) as Parameters<typeof engagementRateSeries>[0])

  const { lift, confidence, n } = computeLift(baselineSeries, treatmentSeries)
  const ageDays = (now.getTime() - startedAt.getTime()) / (24 * 60 * 60 * 1000)
  const matured = ageDays >= EXPERIMENT_THRESHOLDS.MATURE_DAYS
  const { decision, rollback } = evaluateGuardrails({ n, lift, confidence, matured })

  const result: ExperimentResult = {
    lift, confidence, n, decision, rollback, evaluated_at: now.toISOString(),
  }

  // Persist. keep_running leaves status unchanged; a verdict ends the experiment.
  const terminal = decision !== 'keep_running'
  await supabaseAdmin.from('experiments').update({
    result,
    ...(terminal
      ? { status: decision as Experiment['status'], ended_at: now.toISOString() }
      : {}),
  }).eq('id', e.id)

  // Rollback: clear future treatment application. The treatment stops being
  // applied automatically because the experiment is no longer `running`
  // (getActiveExperiment only returns running rows). No posts are mutated; this
  // is purely "stop doing the new thing going forward".
  return result
}
