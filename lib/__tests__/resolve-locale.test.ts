import { describe, it, expect, vi } from 'vitest'

const { isEnabled } = vi.hoisted(() => ({ isEnabled: vi.fn() }))
vi.mock('../posthog-server', () => ({
  getPostHogClient: () => ({ isFeatureEnabled: (..._a: unknown[]) => isEnabled(..._a) }),
}))

import { isLanguageModesEnabled } from '../flags'
import { resolveLocale } from '../resolve-locale'

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

describe('resolveLocale', () => {
  it('forces english when the flag is disabled, ignoring stored/override', () => {
    expect(resolveLocale({ flagEnabled: false, override: 'hinglish', stored: 'hinglish' })).toBe('english')
  })
  it('prefers a valid per-request override when enabled', () => {
    expect(resolveLocale({ flagEnabled: true, override: 'hinglish', stored: 'english' })).toBe('hinglish')
  })
  it('falls back to the stored profile value when no override', () => {
    expect(resolveLocale({ flagEnabled: true, override: undefined, stored: 'indian_english' })).toBe('indian_english')
  })
  it('defaults to english for invalid values', () => {
    expect(resolveLocale({ flagEnabled: true, override: 'klingon', stored: null })).toBe('english')
  })
})
