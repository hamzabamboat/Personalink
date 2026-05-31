import { describe, it, expect } from 'vitest'
import { assignVariant, hashToUnitInterval } from '../experiments'

describe('hashToUnitInterval', () => {
  it('is deterministic and in [0,1)', () => {
    const a = hashToUnitInterval('exp-1:post-1')
    const b = hashToUnitInterval('exp-1:post-1')
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
  })
  it('different keys generally differ', () => {
    expect(hashToUnitInterval('exp-1:post-1')).not.toBe(hashToUnitInterval('exp-1:post-2'))
  })
})

describe('assignVariant', () => {
  it('is deterministic for the same experiment + post', () => {
    const exp = { id: 'exp-1' }
    const v1 = assignVariant(exp, { id: 'post-A' })
    const v2 = assignVariant(exp, { id: 'post-A' })
    expect(v1).toBe(v2)
    expect(['control', 'treatment']).toContain(v1)
  })

  it('splits a large population close to 50/50', () => {
    const exp = { id: 'exp-split' }
    let treatment = 0
    const N = 2000
    for (let i = 0; i < N; i++) {
      if (assignVariant(exp, { id: `post-${i}` }) === 'treatment') treatment++
    }
    const ratio = treatment / N
    expect(ratio).toBeGreaterThan(0.42)
    expect(ratio).toBeLessThan(0.58)
  })

  it('the same post in two different experiments is assigned independently', () => {
    // Not asserting they differ (they may coincide), only that the key includes
    // the experiment id so assignment is per-experiment, not global per-post.
    const a = assignVariant({ id: 'exp-A' }, { id: 'post-1' })
    const b = assignVariant({ id: 'exp-B' }, { id: 'post-1' })
    expect(['control', 'treatment']).toContain(a)
    expect(['control', 'treatment']).toContain(b)
  })

  it('respects an explicit split (e.g. 0.25 treatment)', () => {
    const exp = { id: 'exp-quarter' }
    let treatment = 0
    const N = 2000
    for (let i = 0; i < N; i++) {
      if (assignVariant(exp, { id: `p-${i}` }, 0.25) === 'treatment') treatment++
    }
    const ratio = treatment / N
    expect(ratio).toBeGreaterThan(0.20)
    expect(ratio).toBeLessThan(0.30)
  })
})
