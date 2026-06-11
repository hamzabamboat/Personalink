import { describe, it, expect } from 'vitest'
import { buildCarouselPrompt, parseCarouselSlides, clampSlideCount, MAX_SLIDES } from '@/lib/images/carousel-content'

describe('carousel content', () => {
  it('prompt names the slide count and truncates the source', () => {
    const p = buildCarouselPrompt('x'.repeat(5000), 6)
    expect(p).toContain('6 slides')
    expect(p).toContain('JSON')
    expect(p.length).toBeLessThan(1700) // source truncated to 1200
  })

  it('clamps slide count into range', () => {
    expect(clampSlideCount(undefined)).toBe(6)
    expect(clampSlideCount(2)).toBe(4)
    expect(clampSlideCount(99)).toBe(MAX_SLIDES)
    expect(clampSlideCount(7)).toBe(7)
  })

  it('parses slides and labels first=cover, last=cta', () => {
    const raw = '{"slides":[{"headline":"Hook","body":"sub"},{"headline":"Point 1","body":"a"},{"headline":"Follow me","body":"for more"}]}'
    const s = parseCarouselSlides(raw)
    expect(s).toHaveLength(3)
    expect(s[0].kind).toBe('cover')
    expect(s[1].kind).toBe('body')
    expect(s[2].kind).toBe('cta')
    expect(s[0].headline).toBe('Hook')
  })

  it('handles code fences and drops empty-headline slides', () => {
    const raw = '```json\n{"slides":[{"headline":"A"},{"headline":""},{"headline":"B"}]}\n```'
    const s = parseCarouselSlides(raw)
    expect(s.map(x => x.headline)).toEqual(['A', 'B'])
  })

  it('caps at MAX_SLIDES', () => {
    const many = { slides: Array.from({ length: 20 }, (_, i) => ({ headline: 'h' + i })) }
    const s = parseCarouselSlides(JSON.stringify(many))
    expect(s).toHaveLength(MAX_SLIDES)
    expect(s[s.length - 1].kind).toBe('cta')
  })

  it('returns [] for garbage or too few slides', () => {
    expect(parseCarouselSlides('nope')).toEqual([])
    expect(parseCarouselSlides('{"slides":[{"headline":"only one"}]}')).toEqual([])
  })
})
