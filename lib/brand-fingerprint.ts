/**
 * Angle fingerprinting + collision detection for the Brand Stories library.
 *
 * An "angle" is a discrete takeaway about a company. To guarantee two people
 * don't post the same thing at the same time, every angle carries a normalized
 * token fingerprint; a freshly-generated AI angle collides with a currently-
 * locked one when their token sets overlap past a threshold (Jaccard).
 *
 * Uses the same tokenization as lib/similarity.ts (lowercase, strip punctuation,
 * drop words <= 3 chars) so the two guards behave consistently.
 */

/** Default overlap above which a candidate angle is considered a duplicate. */
export const COLLISION_THRESHOLD = 0.5

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
}

/**
 * Deterministic, order-independent signature of an angle's title + summary:
 * the sorted set of its meaningful tokens joined by spaces. Stored on the row
 * and compared against locked angles' fingerprints.
 */
export function fingerprintAngle(title: string, summary: string): string {
  const tokens = new Set(tokenize(`${title} ${summary}`))
  return [...tokens].sort().join(' ')
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  const intersection = [...a].filter(x => b.has(x)).length
  const union = new Set([...a, ...b]).size
  return intersection / union
}

/**
 * True if `candidate` overlaps any of `lockedFingerprints` at or above the
 * threshold. Blank fingerprints in the locked set are ignored. Compare only
 * against *currently active* locks — freed angles are fair game to reuse.
 */
export function angleCollides(
  candidate: string,
  lockedFingerprints: string[],
  threshold = COLLISION_THRESHOLD,
): boolean {
  const candidateTokens = new Set(candidate.split(' ').filter(Boolean))
  if (candidateTokens.size === 0) return false

  for (const locked of lockedFingerprints) {
    if (!locked?.trim()) continue
    const lockedTokens = new Set(locked.split(' ').filter(Boolean))
    if (jaccard(candidateTokens, lockedTokens) >= threshold) return true
  }
  return false
}
