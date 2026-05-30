import { describe, it, expect } from 'vitest'
import { LOCALE_IDS, isLocaleId } from '../prompts/locales/types'

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
