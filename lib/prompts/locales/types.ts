export const LOCALE_IDS = ['english', 'indian_english', 'hinglish'] as const
export type LocaleId = (typeof LOCALE_IDS)[number]

export function isLocaleId(value: unknown): value is LocaleId {
  return typeof value === 'string' && (LOCALE_IDS as readonly string[]).includes(value)
}

/** One example post in a single locale. */
export type LocaleExample = {
  id: string
  topic: string
  pillar: string
  text: string
}

export interface LocaleModule {
  id: LocaleId
  /** Human label for UI. */
  label: string
  /** Short UI blurb. */
  blurb: string
  /**
   * Static, cacheable register instructions: how this dialect phrases, switches,
   * and what it references. Empty string for english (model default).
   */
  register: string
  /** Inline self-check appended to the dynamic tail. Empty string for english. */
  qaPrefix: string
  /** How many rotating few-shot examples to inject (english = 0). */
  exampleCount: number
}
