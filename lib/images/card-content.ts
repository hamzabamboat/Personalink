// Pure helpers for branded template cards: build the Claude extraction prompt
// and defensively parse its JSON response. No network/SDK here so it's unit-testable.

import type { TemplateType } from './presets'

export interface CardContent {
  type: TemplateType
  /** Small label above the headline (stat/title). */
  kicker?: string
  /** Main text. For 'myth' this is the myth; for 'stat' the number/phrase. */
  headline: string
  /** Supporting line. For 'myth' this is the reality; for 'title' the subtitle. */
  body?: string
  /** List items (only for 'list'). */
  lines?: string[]
}

const SHAPE: Record<TemplateType, string> = {
  quote: `{"headline": "the single most quotable line, <=90 chars"}`,
  stat: `{"kicker": "2-4 word label", "headline": "the number or stat, e.g. 5x or 12", "body": "<=60 char supporting line"}`,
  title: `{"kicker": "2-4 word label", "headline": "punchy title <=60 chars", "body": "<=70 char subtitle"}`,
  list: `{"headline": "list title <=48 chars", "lines": ["item 1", "item 2", "item 3"]}`,
  myth: `{"headline": "the myth, <=70 chars", "body": "the reality, <=70 chars"}`,
}

export function buildCardExtractionPrompt(postContent: string, type: TemplateType): string {
  return `You turn a LinkedIn post into a short ${type} graphic. Extract ONLY what fits a square card — short, punchy, no hashtags, no emojis.

POST:
"${postContent.slice(0, 800)}"

Respond with ONLY valid JSON in exactly this shape:
${SHAPE[type]}`
}

/** Defensive parse of Claude's response into CardContent, or null if unusable. */
export function parseCardContent(raw: string, type: TemplateType): CardContent | null {
  try {
    const stripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) return null
    const obj = JSON.parse(match[0]) as Record<string, unknown>

    const headline = typeof obj.headline === 'string' ? obj.headline.trim() : ''
    if (!headline) return null

    const lines = Array.isArray(obj.lines)
      ? obj.lines.filter((l): l is string => typeof l === 'string' && l.trim().length > 0).map(l => l.trim())
      : undefined

    // 'list' cards are meaningless without items
    if (type === 'list' && (!lines || lines.length === 0)) return null

    return {
      type,
      kicker: typeof obj.kicker === 'string' ? obj.kicker.trim() : undefined,
      headline,
      body: typeof obj.body === 'string' ? obj.body.trim() : undefined,
      lines,
    }
  } catch {
    return null
  }
}
