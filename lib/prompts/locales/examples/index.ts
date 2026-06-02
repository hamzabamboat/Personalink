import type { LocaleId, LocaleExample } from '../types'
import { TRIPLETS } from './triplets'

/**
 * Pick `n` examples in the target locale, starting at a rotating offset.
 * Deterministic when `seed` is provided (tests + harness); random otherwise.
 * Returns [] for english or n <= 0.
 */
export function selectExamples(locale: LocaleId, n: number, seed?: number): LocaleExample[] {
  if (locale === 'english' || n <= 0) return []
  const total = TRIPLETS.length
  const count = Math.min(n, total)
  const start = ((seed ?? Math.floor(Math.random() * total)) % total + total) % total
  const out: LocaleExample[] = []
  for (let i = 0; i < count; i++) {
    const t = TRIPLETS[(start + i) % total]
    out.push({ id: t.id, topic: t.topic, pillar: t.pillar, text: t[locale] })
  }
  return out
}
