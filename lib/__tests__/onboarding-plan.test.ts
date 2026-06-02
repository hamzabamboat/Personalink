import { describe, it, expect } from 'vitest'
import { resolvePlanFromParam } from '@/lib/onboarding-plan'

describe('resolvePlanFromParam', () => {
  it('accepts valid plans', () => {
    expect(resolvePlanFromParam('starter')).toEqual({ plan: 'starter', isPaid: true })
    expect(resolvePlanFromParam('standard')).toEqual({ plan: 'standard', isPaid: true })
    expect(resolvePlanFromParam('pro')).toEqual({ plan: 'pro', isPaid: true })
    expect(resolvePlanFromParam('free')).toEqual({ plan: 'free', isPaid: false })
  })
  it('defaults missing/invalid to free', () => {
    expect(resolvePlanFromParam(null)).toEqual({ plan: 'free', isPaid: false })
    expect(resolvePlanFromParam(undefined)).toEqual({ plan: 'free', isPaid: false })
    expect(resolvePlanFromParam('bogus')).toEqual({ plan: 'free', isPaid: false })
  })
})
