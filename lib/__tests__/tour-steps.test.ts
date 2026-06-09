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

  it('covers the 6 core feature stops between welcome and done', () => {
    const ids = TOUR_STEPS.map(s => s.id)
    for (const id of ['generate', 'posts', 'calendar', 'analytics', 'suggestions', 'voice']) {
      expect(ids).toContain(id)
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

  it('analytics is gated to the standard plan and has locked copy', () => {
    const analytics = TOUR_STEPS.find(s => s.id === 'analytics')!
    expect(analytics.requiresPlan).toBe('standard')
    expect(analytics.lockedBody).toBeTruthy()
  })

  it('the done step provides a call-to-action', () => {
    const done = TOUR_STEPS.find(s => s.id === 'done')!
    expect(done.cta?.route).toBe('/dashboard/generate')
  })
})
