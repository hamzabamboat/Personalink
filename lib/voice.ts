import { supabaseAdmin } from './supabase-admin'
import { distillVoiceFingerprint } from './anthropic'

/**
 * Continuous voice learning.
 *
 * The voice corpus (`voice_samples`) holds only HUMAN-authored text from the
 * person — writing samples they add, drafts they edit, and voice-note
 * transcripts. We deliberately never store unedited AI output, because feeding
 * the model its own writing would reinforce AI patterns and erode the voice.
 *
 * On every generation we inject the strongest samples as few-shot exemplars,
 * and we periodically re-distil the voice fingerprint from the growing corpus.
 */

export type VoiceSampleSource = 'onboarding' | 'manual' | 'edit' | 'voice_note' | 'analyzer'

const SOURCE_WEIGHT: Record<VoiceSampleSource, number> = {
  edit: 3,        // human corrected an AI draft toward their voice — highest signal
  onboarding: 2,
  manual: 2,
  analyzer: 2,    // the 3 posts pasted into the public voice analyzer — real writing
  voice_note: 1,  // their actual words, but spoken register
}

const MIN_LEN = 80      // ignore trivially short text
const MAX_LEN = 4000    // cap stored length
const DISTILL_EVERY = 3 // re-distil the fingerprint every N new samples

/** v1 blend: combined = recency*(1-PERF_BLEND) + performance*PERF_BLEND. Calibrated in Task 8 doc. */
export const PERF_BLEND = 0.5
/** A post needs at least this many impressions before its performance is trusted. */
export const PERF_SAMPLE_MIN_IMPRESSIONS = 50
/** Engagement-rate ceiling for normalization (rates above this all map to 1.0). */
const PERF_ENGAGEMENT_CEILING = 0.1 // 10% engagement rate is exceptional on LinkedIn

export type SamplePostMetrics = {
  impressions: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
} | null

/**
 * Performance weight (0–1) of the post a voice sample came from, by engagement
 * rate, normalized against a ceiling. PURE.
 * - null metrics, or impressions below PERF_SAMPLE_MIN_IMPRESSIONS → null
 *   (untrusted → caller falls back to recency-only).
 */
export function performanceWeight(m: SamplePostMetrics): number | null {
  if (!m || m.impressions == null || m.impressions < PERF_SAMPLE_MIN_IMPRESSIONS) return null
  const eng = (m.reactions ?? 0) + (m.comments ?? 0) + (m.reshares ?? 0) + (m.saves ?? 0)
  const rate = eng / m.impressions
  return Math.max(0, Math.min(1, rate / PERF_ENGAGEMENT_CEILING))
}

/**
 * Combine a sample's normalized recency (0–1, newest=1) with its post's
 * performance (0–1, or null) into a single ranking weight. PURE.
 * - perf null → recency-only (don't penalize a sample for unknown performance).
 */
export function combinedWeight(args: { recencyNorm: number; perf: number | null }): number {
  const { recencyNorm, perf } = args
  if (perf == null) return recencyNorm
  return recencyNorm * (1 - PERF_BLEND) + perf * PERF_BLEND
}

/** Store a piece of the person's real writing in the voice corpus. */
export async function addVoiceSample(
  userId: string,
  text: string | null | undefined,
  source: VoiceSampleSource,
): Promise<void> {
  if (!userId || !text) return
  const clean = text.trim()
  if (clean.length < MIN_LEN) return
  const stored = clean.slice(0, MAX_LEN)

  try {
    // Skip if identical to the most recent sample (avoids dupes on re-saves)
    const { data: last } = await supabaseAdmin
      .from('voice_samples')
      .select('text')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (last?.text === stored) return

    await supabaseAdmin.from('voice_samples').insert({
      user_id: userId,
      text: stored,
      source,
      weight: SOURCE_WEIGHT[source] ?? 1,
      char_count: stored.length,
    })

    // Throttled auto re-distil so the fingerprint keeps sharpening over time
    const { count } = await supabaseAdmin
      .from('voice_samples')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (count && count % DISTILL_EVERY === 0) {
      refreshFingerprint(userId).catch(() => { /* non-fatal */ })
    }
  } catch (err) {
    console.error('[voice.addVoiceSample]', err)
  }
}

/**
 * Best few-shot exemplars of the person's real writing for the generation prompt.
 * Prefers higher-weight, more recent, sufficiently long samples; de-duplicates.
 */
export async function getVoiceExemplars(userId: string, limit = 4): Promise<string[]> {
  try {
    const { data } = await supabaseAdmin
      .from('voice_samples')
      .select('text, char_count')
      .eq('user_id', userId)
      .gte('char_count', 120)
      .order('weight', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit * 3)

    const seen = new Set<string>()
    const out: string[] = []
    for (const row of data || []) {
      const text = (row.text || '').trim()
      if (!text) continue
      const key = text.slice(0, 60).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(text.slice(0, 1200))
      if (out.length >= limit) break
    }
    return out
  } catch (err) {
    console.error('[voice.getVoiceExemplars]', err)
    return []
  }
}

/**
 * Re-distil the voice fingerprint from the current corpus and save it.
 *
 * Performance-aware: samples are ranked by combinedWeight (recency × the
 * engagement performance of the post each sample came from), so the voice
 * evolves toward what actually drives reach. Samples whose source post lacks
 * trustworthy metrics fall back to recency-only and are never dropped.
 *
 * Stays behind the existing DISTILL_EVERY trigger in addVoiceSample — this
 * function does not change WHEN we re-distil, only WHICH samples we feed.
 */
export async function refreshFingerprint(userId: string): Promise<string | null> {
  try {
    // Pull a generous candidate set with the columns we need to weight by.
    // post_id links a sample back to the post it came from (null for onboarding/
    // analyzer/voice_note samples that have no originating post).
    const { data } = await supabaseAdmin
      .from('voice_samples')
      .select('text, weight, created_at, post_id')
      .eq('user_id', userId)
      .order('weight', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(40)

    const rows = (data || []).filter(r => r.text) as Array<{
      text: string; weight: number | null; created_at: string; post_id: string | null
    }>
    if (!rows.length) return null

    // Fetch performance metrics for the posts these samples came from (one query).
    const postIds = [...new Set(rows.map(r => r.post_id).filter((id): id is string => !!id))]
    const metricsByPost = new Map<string, SamplePostMetrics>()
    if (postIds.length) {
      const { data: posts } = await supabaseAdmin
        .from('posts')
        .select('id, impressions, reactions, comments, reshares, saves')
        .in('id', postIds)
      for (const p of posts || []) {
        metricsByPost.set(p.id as string, {
          impressions: p.impressions, reactions: p.reactions, comments: p.comments,
          reshares: p.reshares, saves: p.saves,
        })
      }
    }

    // Normalize recency to 0–1 (newest = 1) over the candidate set.
    const times = rows.map(r => new Date(r.created_at).getTime())
    const minT = Math.min(...times)
    const maxT = Math.max(...times)
    const span = maxT - minT || 1

    const ranked = rows
      .map(r => {
        const recencyNorm = (new Date(r.created_at).getTime() - minT) / span
        const perf = r.post_id ? performanceWeight(metricsByPost.get(r.post_id) ?? null) : null
        // Keep the source-based `weight` as a gentle multiplier (edits still matter most).
        const sourceMult = (r.weight ?? 1) / 3 // SOURCE_WEIGHT max is 3 (edit)
        return { text: r.text, score: combinedWeight({ recencyNorm, perf }) * (0.5 + 0.5 * sourceMult) }
      })
      .sort((a, b) => b.score - a.score)

    const samples = ranked.map(r => r.text.trim()).filter(Boolean)
    if (!samples.length) return null

    const fingerprint = await distillVoiceFingerprint(samples)
    if (fingerprint) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ voice_fingerprint: fingerprint, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }
    return fingerprint || null
  } catch (err) {
    console.error('[voice.refreshFingerprint]', err)
    return null
  }
}
