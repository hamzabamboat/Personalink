import { describe, it, expect } from 'vitest'
import { LOCALE_IDS, isLocaleId } from '../prompts/locales/types'
import { getLocale, LOCALE_OPTIONS } from '../prompts/locales'

describe('locale ids', () => {
  it('exposes exactly the three supported locales', () => {
    expect(LOCALE_IDS).toEqual(['english', 'indian_english', 'hinglish'])
  })

  it('isLocaleId accepts valid ids and rejects everything else', () => {
    expect(isLocaleId('english')).toBe(true)
    expect(isLocaleId('indian_english')).toBe(true)
    expect(isLocaleId('hinglish')).toBe(true)
    expect(isLocaleId('spanish')).toBe(false)
    expect(isLocaleId('')).toBe(false)
    expect(isLocaleId(undefined)).toBe(false)
    expect(isLocaleId(42)).toBe(false)
  })
})

describe('locale registry', () => {
  it('returns a module per id with matching id', () => {
    for (const id of LOCALE_IDS) {
      expect(getLocale(id).id).toBe(id)
    }
  })

  it('english injects no examples and has empty register/qa', () => {
    const en = getLocale('english')
    expect(en.exampleCount).toBe(0)
    expect(en.register).toBe('')
    expect(en.qaPrefix).toBe('')
  })

  it('non-english locales have register text, a QA self-check, and inject examples', () => {
    for (const id of ['indian_english', 'hinglish'] as const) {
      const m = getLocale(id)
      expect(m.register.length).toBeGreaterThan(200)
      expect(m.qaPrefix.toLowerCase()).toContain('natural')
      expect(m.exampleCount).toBeGreaterThanOrEqual(2)
    }
  })

  it('hinglish register forbids full Hindi sentences and caricature; indian-english near-bans "do the needful"', () => {
    expect(getLocale('hinglish').register.toLowerCase()).toContain('do not write full hindi sentences')
    expect(getLocale('indian_english').register.toLowerCase()).toContain('do the needful')
  })

  it('LOCALE_OPTIONS has a label+blurb per id for the UI', () => {
    expect(LOCALE_OPTIONS.map(o => o.id)).toEqual(['english', 'indian_english', 'hinglish'])
    for (const o of LOCALE_OPTIONS) { expect(o.label).toBeTruthy(); expect(o.blurb).toBeTruthy() }
  })
})
