import { describe, it, expect } from 'vitest'
import { isStepLocked, resolveStepView, shouldNavigate } from '@/lib/tour/gating'
import { TOUR_STEPS, type TourStep } from '@/lib/tour/steps'

const step = (id: string): TourStep => TOUR_STEPS.find(s => s.id === id)!

describe('isStepLocked', () => {
  it('locks analytics for a free user', () => {
    expect(isStepLocked(step('analytics'), 'free')).toBe(true)
  })
  it('unlocks analytics for a standard user', () => {
    expect(isStepLocked(step('analytics'), 'standard')).toBe(false)
  })
  it('unlocks analytics for a higher plan (pro)', () => {
    expect(isStepLocked(step('analytics'), 'pro')).toBe(false)
  })
  it('never locks a step without requiresPlan', () => {
    expect(isStepLocked(step('generate'), 'free')).toBe(false)
  })
})

describe('resolveStepView', () => {
  it('renders a locked step as a centered info card with lockedBody', () => {
    const v = resolveStepView(step('analytics'), 'free')
    expect(v.mode).toBe('center')
    expect(v.body).toBe(step('analytics').lockedBody)
  })
  it('renders an unlocked gated step as a spotlight', () => {
    const v = resolveStepView(step('analytics'), 'standard')
    expect(v.mode).toBe('spotlight')
    if (v.mode === 'spotlight') expect(v.target).toBe('analytics')
  })
  it('renders a center-target step as center regardless of plan', () => {
    expect(resolveStepView(step('welcome'), 'pro').mode).toBe('center')
  })
  it('renders a normal step as a spotlight on its target', () => {
    const v = resolveStepView(step('generate'), 'free')
    expect(v.mode).toBe('spotlight')
    if (v.mode === 'spotlight') expect(v.target).toBe('generate-input')
  })
})

describe('shouldNavigate', () => {
  it('navigates when the step route differs from the current path', () => {
    expect(shouldNavigate(step('generate'), 'free', '/dashboard')).toBe(true)
  })
  it('does not navigate when already on the step route', () => {
    expect(shouldNavigate(step('generate'), 'free', '/dashboard/generate')).toBe(false)
  })
  it('does not navigate into a locked feature', () => {
    expect(shouldNavigate(step('analytics'), 'free', '/dashboard')).toBe(false)
  })
  it('does not navigate for a routeless step (done)', () => {
    expect(shouldNavigate(step('done'), 'free', '/dashboard/profile')).toBe(false)
  })
})
