// Pure helpers for carousels: build the Claude prompt and parse its slides JSON.
// No network/SDK here so it's unit-testable. CarouselSlide lives in lib/supabase.

import type { CarouselSlide } from '@/lib/supabase'

export const MIN_SLIDES = 4
export const MAX_SLIDES = 10
export const DEFAULT_SLIDES = 6

export function clampSlideCount(n: number | undefined | null): number {
  if (!n || n < MIN_SLIDES) return n && n > 0 && n < MIN_SLIDES ? MIN_SLIDES : DEFAULT_SLIDES
  return Math.min(MAX_SLIDES, Math.floor(n))
}

export function buildCarouselPrompt(source: string, slideCount: number): string {
  return `Create a LinkedIn carousel of exactly ${slideCount} slides from the material below.
- Slide 1: a scroll-stopping COVER — punchy title + one-line subtitle.
- Middle slides: each makes ONE clear point — short title + 1-2 short sentences.
- Final slide: a call-to-action (follow / comment / save / DM).
Keep every slide short enough to fit a phone screen. No hashtags, no emojis.

MATERIAL:
"${source.slice(0, 1200)}"

Respond with ONLY valid JSON: {"slides":[{"headline":"...","body":"..."}, ...]} with exactly ${slideCount} items.`
}

/** Defensive parse of Claude's response into CarouselSlide[]; [] if unusable. */
export function parseCarouselSlides(raw: string): CarouselSlide[] {
  try {
    const stripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) return []
    const obj = JSON.parse(match[0]) as { slides?: unknown }
    const arr = Array.isArray(obj.slides) ? obj.slides : []

    const slides: CarouselSlide[] = arr
      .map(s => (s && typeof s === 'object' ? (s as Record<string, unknown>) : null))
      .filter((s): s is Record<string, unknown> => !!s && typeof s.headline === 'string' && (s.headline as string).trim().length > 0)
      .map(s => ({
        kind: 'body' as const,
        headline: (s.headline as string).trim(),
        body: typeof s.body === 'string' ? (s.body as string).trim() : undefined,
      }))

    if (slides.length < 2) return []

    const capped = slides.slice(0, MAX_SLIDES)
    capped[0].kind = 'cover'
    capped[capped.length - 1].kind = 'cta'
    return capped
  } catch {
    return []
  }
}
