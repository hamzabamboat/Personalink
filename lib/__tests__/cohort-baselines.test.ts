import { describe, it, expect } from 'vitest'
import { median, computeCohortBaselines, type UserSubScores } from '../cohort-baselines'

describe('median', () => {
  it('odd + even length, ignores nulls', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([5, null, 1])).toBe(3)
  })
  it('null when empty/all-null', () => {
    expect(median([])).toBeNull()
    expect(median([null, null])).toBeNull()
  })
})

describe('computeCohortBaselines', () => {
  it('takes the per-sub-score median across users', () => {
    const users: UserSubScores[] = [
      { reach: 80, audience: 40, resonance: 60, authority: 20 },
      { reach: 60, audience: 50, resonance: 50, authority: 30 },
      { reach: 40, audience: 60, resonance: 70, authority: 40 },
    ]
    const out = computeCohortBaselines(users)
    expect(out).toEqual({
      cohort_key: 'global',
      reach_median: 60, audience_median: 50, resonance_median: 60, authority_median: 30,
      n_users: 3,
    })
  })
  it('excludes null sub-scores per dimension and reports n_users', () => {
    const out = computeCohortBaselines([
      { reach: 100, audience: null, resonance: 50, authority: null },
      { reach: 50, audience: 40, resonance: null, authority: null },
    ])
    expect(out.reach_median).toBe(75)
    expect(out.audience_median).toBe(40)
    expect(out.resonance_median).toBe(50)
    expect(out.authority_median).toBeNull()
    expect(out.n_users).toBe(2)
  })
})
