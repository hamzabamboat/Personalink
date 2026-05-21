/**
 * Voice match: how closely a person's actual posts resemble their reference
 * writing sample, measured with lightweight stylometric features (no AI call).
 *
 * Returns a 0–100 overall score plus per-dimension scores, or null when there
 * isn't enough data to make an honest comparison (no reference text, or no
 * posts to compare against).
 */

const VOICE_DIMENSION_KEYS = ['rhythm', 'vocab', 'opening', 'phrases', 'emotion', 'punctuation'] as const
export type VoiceDimensionKey = (typeof VOICE_DIMENSION_KEYS)[number]

export type VoiceMatch = {
  score: number
  dimensions: Record<VoiceDimensionKey, number>
  postCount: number
}

type Features = {
  avgSentenceLen: number     // words per sentence
  avgWordLen: number         // chars per word
  ttr: number                // type-token ratio (vocabulary richness)
  punctDensity: number       // punctuation marks per word
  questionExclaimRatio: number // (? + !) per sentence
  firstLineWords: number     // words in the opening line
}

function extractFeatures(text: string): Features | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const words = trimmed.toLowerCase().match(/[a-z0-9']+/g) || []
  if (words.length < 5) return null

  const sentences = trimmed.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  const sentenceCount = Math.max(sentences.length, 1)

  const uniqueWords = new Set(words)
  const charCount = words.reduce((sum, w) => sum + w.length, 0)
  const punctCount = (trimmed.match(/[.,;:!?—-]/g) || []).length
  const qeCount = (trimmed.match(/[?!]/g) || []).length
  const firstLine = trimmed.split('\n').find(l => l.trim().length > 0) || ''

  return {
    avgSentenceLen: words.length / sentenceCount,
    avgWordLen: charCount / words.length,
    ttr: uniqueWords.size / words.length,
    punctDensity: punctCount / words.length,
    questionExclaimRatio: qeCount / sentenceCount,
    firstLineWords: (firstLine.match(/[a-z0-9']+/gi) || []).length,
  }
}

// Similarity of two scalar features: 1 when identical, →0 as they diverge.
function sim(a: number, b: number): number {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-6)
  return Math.max(0, 1 - Math.abs(a - b) / denom)
}

function compareDimensions(ref: Features, post: Features): Record<VoiceDimensionKey, number> {
  return {
    rhythm: sim(ref.avgSentenceLen, post.avgSentenceLen) * 100,
    vocab: sim(ref.ttr, post.ttr) * 100,
    opening: sim(ref.firstLineWords, post.firstLineWords) * 100,
    phrases: sim(ref.avgWordLen, post.avgWordLen) * 100,
    emotion: sim(ref.questionExclaimRatio, post.questionExclaimRatio) * 100,
    punctuation: sim(ref.punctDensity, post.punctDensity) * 100,
  }
}

/**
 * @param reference  The user's writing sample (their natural voice).
 * @param posts      Their actual published/approved post bodies.
 */
export function computeVoiceMatch(reference: string | null | undefined, posts: string[]): VoiceMatch | null {
  const refFeatures = reference ? extractFeatures(reference) : null
  if (!refFeatures) return null

  const postFeatures = posts.map(extractFeatures).filter((f): f is Features => f !== null)
  if (postFeatures.length === 0) return null

  const totals: Record<VoiceDimensionKey, number> = {
    rhythm: 0, vocab: 0, opening: 0, phrases: 0, emotion: 0, punctuation: 0,
  }
  for (const pf of postFeatures) {
    const dims = compareDimensions(refFeatures, pf)
    for (const key of VOICE_DIMENSION_KEYS) totals[key] += dims[key]
  }

  const dimensions = {} as Record<VoiceDimensionKey, number>
  for (const key of VOICE_DIMENSION_KEYS) {
    dimensions[key] = Math.round(totals[key] / postFeatures.length)
  }

  const score = Math.round(
    VOICE_DIMENSION_KEYS.reduce((sum, key) => sum + dimensions[key], 0) / VOICE_DIMENSION_KEYS.length
  )

  return { score, dimensions, postCount: postFeatures.length }
}
