import type { LocaleId, LocaleModule } from './types'
import { english } from './english'
import { indianEnglish } from './indian-english'
import { hinglish } from './hinglish'

export * from './types'
export { selectExamples } from './examples'

export const LOCALES: Record<LocaleId, LocaleModule> = {
  english,
  indian_english: indianEnglish,
  hinglish,
}

export function getLocale(id: LocaleId): LocaleModule {
  return LOCALES[id] ?? english
}

/** UI metadata in display order. */
export const LOCALE_OPTIONS: Array<{ id: LocaleId; label: string; blurb: string }> = [
  { id: 'english', label: english.label, blurb: english.blurb },
  { id: 'indian_english', label: indianEnglish.label, blurb: indianEnglish.blurb },
  { id: 'hinglish', label: hinglish.label, blurb: hinglish.blurb },
]
