import { describe, it, expect } from 'vitest'
import {
  performanceWeight, combinedWeight, PERF_BLEND, PERF_SAMPLE_MIN_IMPRESSIONS,
  selectSamplesForDistill, DISTILL_SAMPLE_LIMIT, type DistillCandidate,
} from '../voice'

describe('voice weighting — constants', () => {
  it('exposes the v1 blend factor + impressions floor', () => {
    expect(PERF_BLEND).toBeCloseTo(0.5, 10)
    expect(PERF_SAMPLE_MIN_IMPRESSIONS).toBe(50)
  })
})

describe('performanceWeight', () => {
  it('scores a post by engagement rate, normalized to 0–1', () => {
    // engagement rate = (reactions+comments+reshares+saves)/impressions, capped at a ceiling.
    const hi = performanceWeight({ impressions: 1000, reactions: 80, comments: 10, reshares: 5, saves: 5 })!
    const lo = performanceWeight({ impressions: 1000, reactions: 5, comments: 0, reshares: 0, saves: 0 })!
    expect(hi).toBeGreaterThan(lo)
    expect(hi).toBeLessThanOrEqual(1)
    expect(lo).toBeGreaterThanOrEqual(0)
  })

  it('returns null when metrics are missing or below the impressions floor (untrusted)', () => {
    expect(performanceWeight(null)).toBeNull()
    expect(performanceWeight({ impressions: null, reactions: 5, comments: 0, reshares: 0, saves: 0 })).toBeNull()
    expect(performanceWeight({ impressions: 10, reactions: 5, comments: 0, reshares: 0, saves: 0 })).toBeNull() // < 50 impressions
  })
})

describe('combinedWeight', () => {
  it('blends normalized recency and performance by PERF_BLEND', () => {
    // recency=1 (newest), performance=0 → 1*0.5 + 0*0.5 = 0.5
    expect(combinedWeight({ recencyNorm: 1, perf: 0 })).toBeCloseTo(0.5, 10)
    // recency=0, performance=1 → 0.5
    expect(combinedWeight({ recencyNorm: 0, perf: 1 })).toBeCloseTo(0.5, 10)
    // both high → high
    expect(combinedWeight({ recencyNorm: 1, perf: 1 })).toBeCloseTo(1, 10)
  })

  it('falls back to recency-only when performance is null (missing metrics)', () => {
    // perf null → weight is just recencyNorm (no performance penalty for unknown posts)
    expect(combinedWeight({ recencyNorm: 0.8, perf: null })).toBeCloseTo(0.8, 10)
    expect(combinedWeight({ recencyNorm: 0.2, perf: null })).toBeCloseTo(0.2, 10)
  })

  it('a high-performing sample outranks an equally-recent low-performing one', () => {
    const recent = 0.9
    const hi = combinedWeight({ recencyNorm: recent, perf: 0.9 })
    const lo = combinedWeight({ recencyNorm: recent, perf: 0.1 })
    expect(hi).toBeGreaterThan(lo)
  })
})

// ---------------------------------------------------------------------------
// Helpers for selectSamplesForDistill tests
// ---------------------------------------------------------------------------

/** Build a minimal DistillCandidate. `created_at` is an ISO string. */
function mkCandidate(
  text: string,
  weight: number,
  createdAt: string,
  postId: string | null = null,
  perf: number | null = null,
): DistillCandidate {
  return { text, weight, created_at: createdAt, post_id: postId, perf }
}

/** Produce N candidates with no perf data, already in DB order (weight DESC, created_at DESC). */
function noPerfRows(n: number): DistillCandidate[] {
  return Array.from({ length: n }, (_, i) => {
    const weight = n - i            // descending weight: n, n-1, …, 1
    const ts = new Date(2024, 0, n - i).toISOString() // descending date
    return mkCandidate(`sample-${i}`, weight, ts, null, null)
  })
}

describe('selectSamplesForDistill', () => {
  it('DISTILL_SAMPLE_LIMIT equals 10 (invariant)', () => {
    expect(DISTILL_SAMPLE_LIMIT).toBe(10)
  })

  describe('no performance data path', () => {
    it('returns the first 10 rows in input order — identical to old weight DESC, created_at DESC LIMIT 10', () => {
      const rows = noPerfRows(20)
      const selected = selectSamplesForDistill(rows)
      expect(selected).toHaveLength(10)
      // Order must be byte-identical to the first 10 of input
      selected.forEach((s, i) => {
        expect(s.text).toBe(rows[i].text)
      })
    })

    it('returns ALL rows when there are fewer than 10', () => {
      const rows = noPerfRows(5)
      const selected = selectSamplesForDistill(rows)
      expect(selected).toHaveLength(5)
      selected.forEach((s, i) => expect(s.text).toBe(rows[i].text))
    })

    it('returns at most `limit` rows when a custom limit is given', () => {
      const rows = noPerfRows(15)
      const selected = selectSamplesForDistill(rows, 3)
      expect(selected).toHaveLength(3)
      selected.forEach((s, i) => expect(s.text).toBe(rows[i].text))
    })

    it('handles empty input gracefully', () => {
      expect(selectSamplesForDistill([])).toHaveLength(0)
    })

    it('does NOT reorder samples when perf is undefined (treated as null)', () => {
      // Rows where the `perf` field is absent (undefined) — should still use input order.
      const rows: DistillCandidate[] = Array.from({ length: 12 }, (_, i) => ({
        text: `sample-${i}`,
        weight: 12 - i,
        created_at: new Date(2024, 0, 12 - i).toISOString(),
        post_id: null,
        // perf intentionally omitted
      }))
      const selected = selectSamplesForDistill(rows)
      expect(selected).toHaveLength(10)
      selected.forEach((s, i) => expect(s.text).toBe(rows[i].text))
    })
  })

  describe('with performance data path', () => {
    it('a high-performing recent sample ranks above an older low-performer (≤10 total)', () => {
      // Two candidates: the low-perf one comes first in DB order (higher weight),
      // but the high-perf one should win after re-ranking.
      const older = mkCandidate('old-low-perf', 3, '2023-01-01T00:00:00Z', 'post-A', 0.05)
      const newer = mkCandidate('new-high-perf', 2, '2024-06-01T00:00:00Z', 'post-B', 0.95)
      const rows = [older, newer] // DB order: older comes first (higher weight)
      const selected = selectSamplesForDistill(rows)
      expect(selected).toHaveLength(2)
      // newer (high perf + recency) should be ranked first
      expect(selected[0].text).toBe('new-high-perf')
      expect(selected[1].text).toBe('old-low-perf')
    })

    it('caps at limit even with perf data', () => {
      // 15 rows, alternating with/without perf data
      const rows: DistillCandidate[] = Array.from({ length: 15 }, (_, i) => {
        const hasPerf = i % 2 === 0
        return mkCandidate(
          `sample-${i}`,
          3,
          new Date(2024, 0, 15 - i).toISOString(),
          hasPerf ? `post-${i}` : null,
          hasPerf ? 0.5 : null,
        )
      })
      const selected = selectSamplesForDistill(rows)
      expect(selected.length).toBeLessThanOrEqual(10)
    })

    it('falls back to no-perf path when only null-perf posts are linked (no trusted metrics)', () => {
      // post_id present but performanceWeight returned null (insufficient impressions → caller passes null)
      const rows: DistillCandidate[] = Array.from({ length: 12 }, (_, i) =>
        mkCandidate(`sample-${i}`, 12 - i, new Date(2024, 0, 12 - i).toISOString(), `post-${i}`, null),
      )
      // All perf are null even though post_ids exist → treated as no-perf path
      const selected = selectSamplesForDistill(rows)
      expect(selected).toHaveLength(10)
      selected.forEach((s, i) => expect(s.text).toBe(rows[i].text))
    })
  })
})
