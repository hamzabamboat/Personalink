/**
 * Anti-AI-detection gate.
 *
 * Catches the structural patterns AI detectors (GPTZero, Originality.ai,
 * ZeroGPT, Copyleaks) flag — triadic anaphora, aphoristic closers, symmetric
 * callbacks, hedging openers, etc. These are rhetorical patterns, not
 * vocabulary, so they slip past the cliché-based compliance scoring in
 * lib/compliance.ts.
 *
 * Flow: humanizeText -> detectAIStructures -> (rewriteToHumanize x up to 2)
 * Run on every AI-generated draft via cleanThroughAIGate.
 */
import type { UserProfile } from './supabase'
import { humanizeText } from './humanize'
import { anthropic } from './anthropic'
import type { LocaleId } from './prompts/locales/types'

export type AIDetectionResult = {
  score: number
  patterns: string[]
}

export type GateResult = {
  content: string
  finalScore: number
  patternsAtSave: string[]
  rewriteAttempts: number
}

const SCORE_THRESHOLD = 20

// Patterns with weight >= 15. The gate only fires when the post has at least
// one of these — stacking weak signals alone (hedging + tricolon + abstraction)
// is too noisy to act on. This kills false positives without weakening on the
// big structural tells.
const STRONG_PATTERNS = new Set([
  'triadic_anaphora',
  'aphoristic_closer',
  'symmetric_callback',
  'numbered_listicle',
])

export function shouldRewrite(score: number, patterns: string[]): boolean {
  if (score < SCORE_THRESHOLD) return false
  return patterns.some(p => STRONG_PATTERNS.has(p))
}

// ── Helpers ──────────────────────────────────────────────────────

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function firstWord(s: string): string {
  const match = s.match(/^[\W_]*([A-Za-z']+)/)
  return match ? match[1].toLowerCase() : ''
}

// ── Pattern detectors ────────────────────────────────────────────

function detectTriadicAnaphora(sentences: string[]): boolean {
  if (sentences.length < 3) return false
  for (let i = 0; i <= sentences.length - 3; i++) {
    const w1 = firstWord(sentences[i])
    const w2 = firstWord(sentences[i + 1])
    const w3 = firstWord(sentences[i + 2])
    if (w1 && w1.length > 1 && w1 === w2 && w2 === w3) return true
  }
  return false
}

function detectAphoristicCloser(sentences: string[]): boolean {
  if (sentences.length === 0) return false
  // Look across the last 4 sentences — the aphorism is often 2nd or 3rd from
  // last, with a short button after it.
  const tail = sentences.slice(-4).join(' ')

  const patterns = [
    /\bsometimes\b[^.]{2,120}\b(is|are|was)\s+(actually|really|just)\b/i,
    /\bthe truth is\b/i,
    /\bat the end of the day\b/i,
    /\bin the end\b/i,
    /\bwhat (i'?ve|i have) learned\b/i,
    /\bthe (real )?lesson (is|here)\b/i,
    /\b(is|are|was)\s+just\b[^.]{2,60}\bin (disguise|hiding)\b/i,
    /\b(is|are|was)\s+(actually|really)\b[^.]{2,80}\b(wearing|disguised|in disguise)\b/i,
    /\bwearing (a |an )?(disguise|mask)\b/i,
    /\bit turns out\b/i,
    /\bturns out,?\b/i,
    /\b(maybe|perhaps)\b[^.]{2,80}\b(is|are|was)\b[^.]{2,60}\bafter all\b/i,
  ]
  for (const p of patterns) {
    if (p.test(tail)) return true
  }

  // Standalone abstract wisdom line within the last 2 sentences.
  // Tight match: only the exact aphoristic openers, not "The thing that broke
  // me when I was 13" (concrete) etc.
  for (const s of sentences.slice(-2)) {
    if (s.length >= 120) continue
    if (
      /^sometimes\b/i.test(s) ||
      /^(maybe|perhaps)\b[^.]*\bis\b/i.test(s) ||
      /^the truth (is|was)\b/i.test(s) ||
      /^the (real )?lesson\b/i.test(s) ||
      /^the thing is\b/i.test(s) ||
      /^in the end\b/i.test(s)
    ) {
      return true
    }
  }

  return false
}

function detectSymmetricCallback(sentences: string[]): boolean {
  for (let i = 0; i < sentences.length - 1; i++) {
    const a = sentences[i]
    const b = sentences[i + 1]
    if (a.length < 10 || b.length < 10) continue

    const aWords = a.toLowerCase().replace(/[^a-z\s']/g, '').split(/\s+/).filter(Boolean)
    const bWords = b.toLowerCase().replace(/[^a-z\s']/g, '').split(/\s+/).filter(Boolean)

    // First 3 words match positionally
    let positional = 0
    const cmpLen = Math.min(aWords.length, bWords.length, 4)
    for (let j = 0; j < cmpLen; j++) {
      if (aWords[j] === bWords[j]) positional++
    }
    if (positional >= 3) return true

    // Or: 3+ of the first 5 meaningful tokens overlap (covers "I wasn't the kid who X / I definitely wasn't the kid who Y")
    const aHead = aWords.slice(0, 5).filter(w => w.length > 1)
    const bHead = bWords.slice(0, 6).filter(w => w.length > 1)
    if (aHead.length >= 3 && bHead.length >= 3) {
      const aSet = new Set(aHead)
      let overlap = 0
      for (const w of bHead) if (aSet.has(w)) overlap++
      if (overlap >= 3) return true
    }
  }
  return false
}

const HEDGING_OPENERS = [
  /\bfunny how\b/i,
  /\bhere'?s the thing\b/i,
  /\bthe thing is\b/i,
  /\bplot twist\b/i,
  /\b(it'?s|its)\s+worth (noting|mentioning|remembering)\b/i,
  /\b(it'?s|its)\s+important to (note|remember|understand|consider)\b/i,
  /\blet me be honest\b/i,
  /\bi'?ll be honest\b/i,
  /\breal talk\b/i,
  /\bhot take\b/i,
  /\bunpopular opinion\b/i,
  /\bcontroversial opinion\b/i,
  /\bfriendly reminder\b/i,
  /\bgentle reminder\b/i,
]

function detectHedgingOpeners(text: string): boolean {
  return HEDGING_OPENERS.some(p => p.test(text))
}

function detectNotXItsY(text: string): boolean {
  const patterns = [
    /\bnot just\b[^.]{2,40}[,.]\s*(it'?s|but|it is)\b/i,
    /\bit'?s not (about |just )?[^.]{2,30}[,.]\s*(it'?s|but)\b/i,
    /\bnot about\b[^.]{2,40}[,.]\s*(it'?s|but)\b/i,
    /\bisn'?t (about |just )?[^.]{2,30}[,.]\s*(it'?s|but)\b/i,
    /\bnot a\b[^.]{2,30}[,.]\s*(it'?s a|but a)\b/i,
  ]
  return patterns.some(p => p.test(text))
}

function detectLowBurstiness(sentences: string[]): boolean {
  const usable = sentences
    .map(s => s.split(/\s+/).filter(Boolean).length)
    .filter(n => n > 4)
  if (usable.length < 5) return false
  const mean = usable.reduce((a, b) => a + b, 0) / usable.length
  const variance = usable.reduce((sum, l) => sum + (l - mean) ** 2, 0) / usable.length
  const stdDev = Math.sqrt(variance)
  return stdDev < 4 && mean >= 8
}

function detectTricolonDensity(text: string): boolean {
  // "A, B, and C" form (Oxford comma optional)
  const andTricolons = text.match(/\b\w+(?:\s+\w+){0,3},\s+\w+(?:\s+\w+){0,3},?\s+and\s+\w+(?:\s+\w+){0,3}\b/gi) || []
  // "verb-phrase, verb-phrase, verb-phrase" — three comma-joined parallel clauses with no "and"
  // e.g. "pitch to strangers, speak at events, cold call potential clients"
  const commaTricolons = text.match(/\b\w+\s+\w+(?:\s+\w+){0,3},\s+\w+\s+\w+(?:\s+\w+){0,3},\s+\w+\s+\w+(?:\s+\w+){0,4}\b/gi) || []
  return andTricolons.length >= 2 || (andTricolons.length + commaTricolons.length) >= 2
}

function detectNumberedListicle(text: string): boolean {
  // 3+ lines starting with "1.", "2.", "3." (or "1)", "2)", "3)")
  const numberedLines = text.split('\n').filter(l => /^\s*\d+[.)]\s+\S/.test(l))
  return numberedLines.length >= 3
}

const VAGUE_NOUNS = new Set([
  'people', 'person', 'thing', 'things', 'moment', 'moments',
  'lesson', 'lessons', 'idea', 'ideas', 'stuff', 'situation', 'situations',
  'experience', 'experiences', 'journey', 'journeys', 'opportunity', 'opportunities',
  'mindset', 'perspective', 'perspectives', 'way', 'ways', 'time', 'times',
  'world', 'worlds', 'words', 'space', 'spaces', 'reality', 'truth', 'meaning',
])

function detectGenericAbstraction(text: string): boolean {
  const words = text.toLowerCase().match(/\b[a-z']+\b/g) || []
  let vagueCount = 0
  for (const w of words) if (VAGUE_NOUNS.has(w)) vagueCount++

  const concreteSignals =
    (text.match(/\b\d+\b/g) || []).length +
    (text.match(/[$₹€£]\s?\d/g) || []).length +
    (text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi) || []).length +
    ((text.match(/(?:[a-z][^.!?\n]*?)\s([A-Z][a-z]+)/g) || []).length)

  return vagueCount >= 5 && concreteSignals <= 2
}

function detectPunctuationResidue(text: string): boolean {
  return /[—–]/.test(text) || /[‘’“”]/.test(text)
}

// ── Main detector ────────────────────────────────────────────────

export function detectAIStructures(text: string): AIDetectionResult {
  const sentences = splitSentences(text)
  const patterns: string[] = []
  let score = 0

  if (detectTriadicAnaphora(sentences))     { patterns.push('triadic_anaphora');    score += 25 }
  if (detectAphoristicCloser(sentences))    { patterns.push('aphoristic_closer');   score += 25 }
  if (detectSymmetricCallback(sentences))   { patterns.push('symmetric_callback');  score += 20 }
  if (detectNumberedListicle(text))         { patterns.push('numbered_listicle');   score += 15 }
  if (detectHedgingOpeners(text))           { patterns.push('hedging_opener');      score += 10 }
  if (detectNotXItsY(text))                 { patterns.push('not_x_its_y');         score += 10 }
  if (detectLowBurstiness(sentences))       { patterns.push('low_burstiness');      score += 10 }
  if (detectTricolonDensity(text))          { patterns.push('tricolon_density');    score += 8 }
  if (detectGenericAbstraction(text))       { patterns.push('generic_abstraction'); score += 5 }
  if (detectPunctuationResidue(text))       { patterns.push('punctuation_residue'); score += 5 }

  return { score: Math.min(score, 100), patterns }
}

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  triadic_anaphora:    'Triadic anaphora — 3+ consecutive sentences starting with the same word (e.g., "When you... When your... When nobody...")',
  aphoristic_closer:   'Aphoristic closer — wisdom-statement ending (e.g., "Sometimes the worst thing is the best thing wearing a disguise")',
  symmetric_callback:  'Symmetric callback — back-to-back sentences with near-identical scaffolding (e.g., "None of that happens if X. None of that happens if Y.")',
  numbered_listicle:   'Numbered listicle — 3+ numbered points (1. 2. 3.); LinkedIn AI tell',
  hedging_opener:      'Hedging / pivot opener (e.g., "Funny how X works", "Here\'s the thing", "It\'s worth noting")',
  not_x_its_y:         '"Not X, it\'s Y" pivot — classic AI rhetorical turn',
  low_burstiness:      'Low burstiness — sentence lengths too uniform; real writing varies more',
  tricolon_density:    'Tricolon overuse — "A, B, and C" rhythm appears 2+ times in the post',
  generic_abstraction: 'Generic abstraction — too many vague nouns ("people", "things", "moments") without concrete grounding (names, dates, numbers)',
  punctuation_residue: 'Em-dash or smart-quote residue (should have been stripped earlier)',
}

// ── Haiku rewrite pass ───────────────────────────────────────────

export async function rewriteToHumanize(
  text: string,
  patterns: string[],
  options: { profile: UserProfile; voiceExemplars?: string[]; attempt: 1 | 2; locale?: LocaleId }
): Promise<string> {
  const { voiceExemplars, attempt, locale = 'english' } = options

  const patternList = patterns
    .map(p => `- ${PATTERN_DESCRIPTIONS[p] || p}`)
    .join('\n')

  const exemplarBlock = voiceExemplars?.length
    ? `\n\nReal writing from this person — match this rhythm and texture:\n${
        voiceExemplars
          .filter(s => s && s.trim().length > 40)
          .slice(0, 2)
          .map((s, i) => `Example ${i + 1}:\n"""\n${s.trim().slice(0, 400)}\n"""`)
          .join('\n\n')
      }`
    : ''

  const stricter = attempt === 2
    ? `\n\nIMPORTANT: a previous rewrite still triggered: ${patterns.join(', ')}. Be more aggressive. Break the rhythm completely. Use uneven sentence lengths. Add a concrete, slightly weird detail. Avoid any tidy parallel structures or symmetrical sentences.`
    : ''

  const dialectClause = locale === 'indian_english'
    ? `\n\nThis post is written in Indian English register. PRESERVE that register and any India-specific references (GST, RBI, lakh/crore, city tiers). Do NOT Americanise it and do NOT add "kindly" or "do the needful".`
    : locale === 'hinglish'
    ? `\n\nThis post is written in Hinglish (English base with natural Hindi code-switching, occasional Devanagari). PRESERVE every Hindi word, the code-switching, and any Devanagari exactly as written. Do NOT translate it to standard English or strip the Hindi. Only remove the flagged structural patterns.`
    : ''

  const prompt = `You are rewriting a LinkedIn post that AI detectors flagged.

The post:
"""
${text}
"""

The exact patterns flagged:
${patternList}${exemplarBlock}

Rewrite the post to remove those specific patterns while keeping the story, the facts, and the meaning. Don't reach for new clever metaphors. Don't add a tidy closing line. Don't make the rewrite shorter or longer than the original by more than 20%.

If the original ended with hashtags, keep them. If not, do not add any.${dialectClause}${stricter}

Return ONLY the rewritten post. No preamble. No commentary.`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })

  const out = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return out.trim() || text
}

// ── Public gate ──────────────────────────────────────────────────

export async function cleanThroughAIGate(
  draft: string,
  options: { profile: UserProfile; voiceExemplars?: string[]; locale?: LocaleId }
): Promise<GateResult> {
  const initialContent = humanizeText(draft)
  const initial = detectAIStructures(initialContent)

  // Skip the gate if the initial content is already clean or only carries
  // weak-signal noise (no strong pattern present).
  if (!shouldRewrite(initial.score, initial.patterns)) {
    return {
      content: initialContent,
      finalScore: initial.score,
      patternsAtSave: initial.patterns,
      rewriteAttempts: 0,
    }
  }

  // Best-version tracking — we NEVER save a rewrite that scored worse than
  // what we had. If both rewrites regress, we keep the initial content.
  let bestContent = initialContent
  let bestScore = initial.score
  let bestPatterns = initial.patterns
  let attempts = 0

  for (const attempt of [1, 2] as const) {
    attempts = attempt
    try {
      const rewritten = await rewriteToHumanize(bestContent, bestPatterns, { ...options, attempt })
      const cleaned = humanizeText(rewritten)
      const { score, patterns } = detectAIStructures(cleaned)
      // Only keep the rewrite if it strictly improved the score
      if (score < bestScore) {
        bestContent = cleaned
        bestScore = score
        bestPatterns = patterns
      }
    } catch (err) {
      console.error(`[ai-detector] rewrite attempt ${attempt} failed:`, err)
      break
    }
    // Done early if the best version no longer needs rewriting
    if (!shouldRewrite(bestScore, bestPatterns)) break
  }

  return {
    content: bestContent,
    finalScore: bestScore,
    patternsAtSave: bestPatterns,
    rewriteAttempts: attempts,
  }
}
