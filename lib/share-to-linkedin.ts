// Manual mention assist: get a post's text into LinkedIn's native composer, where
// the user can type "@" to tag people/companies (the LinkedIn API can't resolve
// person/company URNs for personal-feed posts — see
// docs/superpowers/specs/2026-06-12-manual-mention-assist-design.md).

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

const LINKEDIN_COMPOSER_URL = 'https://www.linkedin.com/feed/?shareActive=true'

/**
 * Hand `text` to LinkedIn so the user can add real @mentions there.
 *
 * - Mobile / PWA: the native share sheet (`navigator.share`) lets the user pick
 *   LinkedIn, which opens its composer pre-filled with the text.
 * - Desktop / no share API: copy the text to the clipboard and open LinkedIn's
 *   composer in a new tab; the caller tells the user to paste and type "@".
 *
 * Returns what happened so the caller can show the right toast.
 */
export async function shareToLinkedIn(text: string): Promise<ShareResult> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined

  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ text })
      return 'shared'
    } catch (err) {
      // User dismissed the share sheet — stop quietly, don't fall back.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
      // Any other share failure → fall through to the clipboard path.
    }
  }

  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text)
    }
    if (typeof window !== 'undefined') {
      window.open(LINKEDIN_COMPOSER_URL, '_blank', 'noopener')
    }
    return 'copied'
  } catch {
    return 'failed'
  }
}
