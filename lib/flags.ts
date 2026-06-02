import { getPostHogClient } from './posthog-server'

export const LANGUAGE_MODES_FLAG = 'language_modes'

/**
 * Rollout gate for language modes. Evaluate once per request. Fails closed
 * (false) on any error so a PostHog outage never breaks generation.
 */
export async function isLanguageModesEnabled(distinctId: string): Promise<boolean> {
  try {
    const enabled = await getPostHogClient().isFeatureEnabled(LANGUAGE_MODES_FLAG, distinctId)
    return enabled === true
  } catch {
    return false
  }
}
