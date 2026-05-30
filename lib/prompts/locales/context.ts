import type { LocaleId } from './types'
import { getLocale } from './index'
import { selectExamples } from './examples'

/** Renders the rotating few-shot example block (or '' for english / none). */
function renderExamples(locale: LocaleId, exampleCount: number, seed?: number): string {
  const mod = getLocale(locale)
  const examples = selectExamples(locale, exampleCount, seed)
  if (!examples.length) return ''
  const body = examples
    .map((e, i) => `Register example ${i + 1} (${e.topic}):\n"""\n${e.text}\n"""`)
    .join('\n\n')
  return `\n\nExamples of ${mod.label} register — study the LANGUAGE and switching, NOT the voice (keep the author's voice):\n\n${body}`
}

/**
 * Full single-string locale context: register + examples + QA self-check.
 * Convenient form used in tests; production splits register into its own cached block.
 */
export function buildLocaleContext(locale: LocaleId, exampleCount: number, seed?: number): string {
  if (locale === 'english') return ''
  const mod = getLocale(locale)
  return `${mod.register}${renderExamples(locale, exampleCount, seed)}\n\n${mod.qaPrefix}`
}

/**
 * Production dynamic tail: examples + QA only. The register lives in its own
 * cached content block, so it must NOT be repeated here.
 */
export function buildLocaleTail(locale: LocaleId, exampleCount: number, seed?: number): string {
  if (locale === 'english') return ''
  const mod = getLocale(locale)
  return `${renderExamples(locale, exampleCount, seed)}\n\n${mod.qaPrefix}`
}
