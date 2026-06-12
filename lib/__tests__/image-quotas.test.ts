import { describe, it, expect } from 'vitest'
import { TIER_LIMITS, FEATURE_LABELS } from '@/lib/pricing-config'

describe('image generation quotas', () => {
  it('AI photo generations per tier (0/5/25/50)', () => {
    expect(TIER_LIMITS.free.perFeature.ai_image_generations).toBe(0)
    expect(TIER_LIMITS.starter.perFeature.ai_image_generations).toBe(5)
    expect(TIER_LIMITS.standard.perFeature.ai_image_generations).toBe(25)
    expect(TIER_LIMITS.pro.perFeature.ai_image_generations).toBe(50)
  })

  it('carousels per tier (0/0/10/25)', () => {
    expect(TIER_LIMITS.free.perFeature.carousels).toBe(0)
    expect(TIER_LIMITS.starter.perFeature.carousels).toBe(0)
    expect(TIER_LIMITS.standard.perFeature.carousels).toBe(10)
    expect(TIER_LIMITS.pro.perFeature.carousels).toBe(25)
  })

  it('template graphics are generous (>= AI photos) on paid tiers', () => {
    for (const tier of ['standard', 'pro'] as const) {
      expect(TIER_LIMITS[tier].perFeature.template_graphics).toBeGreaterThanOrEqual(
        TIER_LIMITS[tier].perFeature.ai_image_generations,
      )
    }
  })

  it('new features have human labels', () => {
    expect(FEATURE_LABELS.carousels).toBeTruthy()
    expect(FEATURE_LABELS.template_graphics).toBeTruthy()
  })
})
