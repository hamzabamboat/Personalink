import { describe, it, expect } from 'vitest'
import { TOUR_STEPS } from '@/lib/tour/steps'

describe('TOUR_STEPS', () => {
  it('starts with welcome and ends with done', () => {
    expect(TOUR_STEPS[0].id).toBe('welcome')
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].id).toBe('done')
  })

  it('has unique step ids', () => {
    const ids = TOUR_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is a short, focused first-run tour (welcome → generate → posts → done)', () => {
    // The cold-start tour deliberately covers only the core path to first value.
    // Secondary features are surfaced contextually in the app, not in the tour.
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(5)
    const ids = TOUR_STEPS.map(s => s.id)
    expect(ids).toContain('generate')
    expect(ids).toContain('posts')
  })

  it('does not detour through secondary features before first value', () => {
    const ids = TOUR_STEPS.map(s => s.id)
    for (const id of ['analytics', 'carousel', 'banner', 'library', 'brandkit', 'suggestions']) {
      expect(ids).not.toContain(id)
    }
  })

  it('every route, when present, is under /dashboard', () => {
    for (const s of TOUR_STEPS) {
      if (s.route) expect(s.route.startsWith('/dashboard')).toBe(true)
    }
  })

  it('non-center steps declare a data-tour target', () => {
    for (const s of TOUR_STEPS) {
      if (s.target !== 'center') expect(typeof s.target).toBe('string')
    }
  })

  it('the done step provides a call-to-action to generate', () => {
    const done = TOUR_STEPS.find(s => s.id === 'done')!
    expect(done.cta?.route).toBe('/dashboard/generate')
  })
})
