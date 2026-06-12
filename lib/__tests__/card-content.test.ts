import { describe, it, expect } from 'vitest'
import { buildCardExtractionPrompt, parseCardContent } from '@/lib/images/card-content'

describe('card content extraction', () => {
  it('prompt includes the card type and (truncated) post and asks for JSON', () => {
    const p = buildCardExtractionPrompt('x'.repeat(2000), 'quote')
    expect(p).toContain('quote')
    expect(p).toContain('JSON')
    expect(p.length).toBeLessThan(1200) // post is truncated to 800 chars
  })

  it('parses a clean quote response', () => {
    const c = parseCardContent('{"headline":"Consistency beats genius."}', 'quote')
    expect(c?.headline).toBe('Consistency beats genius.')
    expect(c?.type).toBe('quote')
  })

  it('parses JSON wrapped in code fences', () => {
    const c = parseCardContent('```json\n{"kicker":"THE MATH","headline":"12","body":"drafts"}\n```', 'stat')
    expect(c?.kicker).toBe('THE MATH')
    expect(c?.headline).toBe('12')
  })

  it('returns null for a list with no items', () => {
    expect(parseCardContent('{"headline":"3 hooks"}', 'list')).toBeNull()
  })

  it('keeps non-empty list items', () => {
    const c = parseCardContent('{"headline":"3 hooks","lines":["a","","b"]}', 'list')
    expect(c?.lines).toEqual(['a', 'b'])
  })

  it('returns null on garbage', () => {
    expect(parseCardContent('not json', 'quote')).toBeNull()
    expect(parseCardContent('{"headline":""}', 'quote')).toBeNull()
  })
})
