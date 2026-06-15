import { describe, it, expect } from 'vitest'
import { isStepLocked, resolveStepView, shouldNavigate } from '@/lib/tour/gating'
import { TOUR_STEPS, type TourStep } from '@/lib/tour/steps'

const step = (id: string): TourStep => TOUR_STEPS.find(s => s.id === id)!

// The default first-run tour no longer routes through plan-gated features, but
// the gating helpers stay general-purpose (used wherever a step declares a
// requiresPlan). Test them against an explicit fixture rather than a specific
// tour step so coverage doesn't depend on the tour's contents.
const gatedStep: TourStep = {
  id: 'analytics',
  route: '/dashboard/analytics',
  target: 'analytics',
  requiresPlan: 'standard',
  title: 'See what is working',
  body: 'Track reach and engagement on every post.',
  lockedBody: 'Analytics is on the Standard plan — upgrade anytime to unlock it.',
}

describe('isStepLocked', () => {
  it('locks a standard-gated step for a free user', () => {
    expect(isStepLocked(gatedStep, 'free')).toBe(true)
  })
  it('unlocks a standard-gated step for a standard user', () => {
    expect(isStepLocked(gatedStep, 'standard')).toBe(false)
  })
  it('unlocks a standard-gated step for a higher plan (pro)', () => {
    expect(isStepLocked(gatedStep, 'pro')).toBe(false)
  })
  it('never locks a step without requiresPlan', () => {
    expect(isStepLocked(step('generate'), 'free')).toBe(false)
  })
})

describe('resolveStepView', () => {
  it('renders a locked step as a centered info card with lockedBody', () => {
    const v = resolveStepView(gatedStep, 'free')
    expect(v.mode).toBe('center')
    expect(v.body).toBe(gatedStep.lockedBody)
  })
  it('renders an unlocked gated step as a spotlight', () => {
    const v = resolveStepView(gatedStep, 'standard')
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
    expect(shouldNavigate(gatedStep, 'free', '/dashboard')).toBe(false)
  })
  it('does not navigate for a routeless step (done)', () => {
    expect(shouldNavigate(step('done'), 'free', '/dashboard/profile')).toBe(false)
  })
})
