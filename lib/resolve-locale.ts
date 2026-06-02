import { isLocaleId, type LocaleId } from './prompts/locales/types'

/**
 * Effective locale for a generation request.
 * - Flag off  -> always english (clean rollout).
 * - Flag on   -> valid per-request override, else stored profile value, else english.
 */
export function resolveLocale(input: {
  flagEnabled: boolean
  override?: unknown
  stored?: unknown
}): LocaleId {
  if (!input.flagEnabled) return 'english'
  if (isLocaleId(input.override)) return input.override
  if (isLocaleId(input.stored)) return input.stored
  return 'english'
}
