import { describe, it, expect } from 'vitest'
import {
  STYLE_PRESETS,
  THEMES,
  ASPECT_RATIOS,
  gptImageSize,
  resolveStylePreset,
  resolveTheme,
  resolveAspectRatio,
  clampVariations,
} from '@/lib/images/presets'

describe('image presets', () => {
  it('every template preset has a templateType; every ai_photo has a promptHint', () => {
    for (const p of STYLE_PRESETS) {
      if (p.kind === 'template') expect(p.templateType).toBeTruthy()
      if (p.kind === 'ai_photo') expect(p.promptHint).toBeTruthy()
    }
  })

  it('offers at least 8 styles (matches/beats competitor count)', () => {
    expect(STYLE_PRESETS.length).toBeGreaterThanOrEqual(8)
  })

  it('maps aspect ratios to the right gpt-image size by orientation', () => {
    expect(gptImageSize('1080x1350')).toBe('1024x1536') // portrait
    expect(gptImageSize('1080x1080')).toBe('1024x1024') // square
    expect(gptImageSize('1200x627')).toBe('1536x1024') // landscape
  })

  it('resolvers fall back to sane defaults', () => {
    expect(resolveStylePreset('nope').id).toBe(STYLE_PRESETS[0].id)
    expect(resolveTheme(undefined).id).toBe('midnight')
    expect(resolveAspectRatio('garbage')).toBe('1080x1350')
  })

  it('clamps variations to 1..4', () => {
    expect(clampVariations(0)).toBe(1)
    expect(clampVariations(undefined)).toBe(1)
    expect(clampVariations(9)).toBe(4)
    expect(clampVariations(2)).toBe(2)
  })

  it('has the three LinkedIn aspect ratios and three themes', () => {
    expect(Object.keys(ASPECT_RATIOS)).toHaveLength(3)
    expect(THEMES.map(t => t.id).sort()).toEqual(['ink', 'midnight', 'mist'])
  })
})
