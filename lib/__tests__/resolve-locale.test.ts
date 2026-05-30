import { describe, it, expect, vi } from 'vitest'

const { isEnabled } = vi.hoisted(() => ({ isEnabled: vi.fn() }))
vi.mock('../posthog-server', () => ({
  getPostHogClient: () => ({ isFeatureEnabled: (..._a: unknown[]) => isEnabled(..._a) }),
}))

import { isLanguageModesEnabled } from '../flags'

describe('isLanguageModesEnabled', () => {
  it('returns true when PostHog enables the flag', async () => {
    isEnabled.mockResolvedValueOnce(true)
    expect(await isLanguageModesEnabled('user-1')).toBe(true)
  })
  it('returns false when the flag is off or undefined', async () => {
    isEnabled.mockResolvedValueOnce(undefined)
    expect(await isLanguageModesEnabled('user-1')).toBe(false)
  })
  it('fails closed to false if PostHog throws', async () => {
    isEnabled.mockRejectedValueOnce(new Error('network'))
    expect(await isLanguageModesEnabled('user-1')).toBe(false)
  })
})
