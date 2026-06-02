import { describe, it, expect } from 'vitest'
import { TRIPLETS } from '../prompts/locales/examples/triplets'
import { selectExamples } from '../prompts/locales/examples'

describe('triplets dataset', () => {
  it('has 30 triplets each with all three locale variants and unique ids', () => {
    expect(TRIPLETS).toHaveLength(30)
    const ids = new Set(TRIPLETS.map(t => t.id))
    expect(ids.size).toBe(30)
    for (const t of TRIPLETS) {
      expect(t.topic).toBeTruthy()
      expect(t.pillar).toBeTruthy()
      expect(t.english.trim().length).toBeGreaterThan(80)
      expect(t.indian_english.trim().length).toBeGreaterThan(80)
      expect(t.hinglish.trim().length).toBeGreaterThan(80)
    }
  })

  it('never uses the caricature phrase "do the needful" in any variant', () => {
    for (const t of TRIPLETS) {
      for (const v of [t.english, t.indian_english, t.hinglish]) {
        expect(v.toLowerCase()).not.toContain('do the needful')
      }
    }
  })
})

describe('selectExamples', () => {
  it('returns 0 for english regardless of n', () => {
    expect(selectExamples('english', 3, 0)).toEqual([])
  })

  it('returns n examples in the requested locale, deterministically by seed', () => {
    const a = selectExamples('hinglish', 3, 5)
    const b = selectExamples('hinglish', 3, 5)
    expect(a).toHaveLength(3)
    expect(a.map(e => e.id)).toEqual(b.map(e => e.id))
    expect(a.every(e => e.text.length > 0)).toBe(true)
  })

  it('rotates: different seeds yield a different starting example', () => {
    const a = selectExamples('indian_english', 3, 0)
    const c = selectExamples('indian_english', 3, 7)
    expect(a[0].id).not.toBe(c[0].id)
  })

  it('caps n at the dataset size and never returns duplicates', () => {
    const all = selectExamples('hinglish', 999, 0)
    expect(all.length).toBe(30)
    expect(new Set(all.map(e => e.id)).size).toBe(30)
  })
})
