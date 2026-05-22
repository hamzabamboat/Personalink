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

export type VoiceSampleSource = 'onboarding' | 'manual' | 'edit' | 'voice_note'

const SOURCE_WEIGHT: Record<VoiceSampleSource, number> = {
  edit: 3,        // human corrected an AI draft toward their voice — highest signal
  onboarding: 2,
  manual: 2,
  voice_note: 1,  // their actual words, but spoken register
}

const MIN_LEN = 80      // ignore trivially short text
const MAX_LEN = 4000    // cap stored length
const DISTILL_EVERY = 3 // re-distil the fingerprint every N new samples

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

/** Re-distil the voice fingerprint from the current corpus and save it. */
export async function refreshFingerprint(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('voice_samples')
      .select('text')
      .eq('user_id', userId)
      .order('weight', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10)

    const samples = (data || []).map(d => d.text).filter(Boolean) as string[]
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
