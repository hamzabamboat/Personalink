/**
 * Deterministic "de-tell" pass.
 *
 * Strips the mechanical typographic fingerprints that AI text detectors and
 * sharp-eyed readers latch onto, without changing the meaning of the post.
 * Pure string operations: no API calls, no added cost. Runs on every
 * AI-generated post before it is saved. (Never run this on the user's own
 * writing, only on model output.)
 */
export function humanizeText(input: string | null | undefined): string {
  if (!input) return ''
  let s = input

  // Smart punctuation LLMs love but humans typing on LinkedIn rarely produce
  s = s.replace(/[‘’‚‛]/g, "'")  // curly single quotes -> '
  s = s.replace(/[“”„‟]/g, '"')  // curly double quotes -> "
  s = s.replace(/…/g, '...')                      // ellipsis char -> ...
  s = s.replace(/ /g, ' ')                        // non-breaking space -> space
  s = s.replace(/[​-‍﻿]/g, '')         // zero-width / BOM chars

  // The em/en-dash habit is the single biggest typographic AI tell.
  // Convert clause-joining dashes to commas, which reads naturally. Regular
  // hyphens ("-", used in lists/compound words) are left untouched.
  s = s.replace(/\s*[—–]\s*/g, ', ')

  // Clean up artefacts and AI spacing tics
  s = s.replace(/,\s*,/g, ',')           // double commas from the dash swap
  s = s.replace(/\s+([,.!?;:])/g, '$1')  // space before punctuation
  s = s.replace(/[ \t]{2,}/g, ' ')       // runs of spaces
  s = s.replace(/[ \t]+\n/g, '\n')       // trailing spaces on a line
  s = s.replace(/\n{3,}/g, '\n\n')       // 3+ blank lines -> one blank line

  return s.trim()
}
