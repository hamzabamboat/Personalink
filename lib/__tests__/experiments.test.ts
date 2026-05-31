import { describe, it, expect } from 'vitest'
import {
  assignVariant, hashToUnitInterval,
  computeLift, evaluateGuardrails, EXPERIMENT_THRESHOLDS,
  applyTreatmentToGeneration, assertSupportedDimension,
} from '../experiments'

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

describe('EXPERIMENT_THRESHOLDS (v1 defaults)', () => {
  it('exposes the ship-now numbers', () => {
    expect(EXPERIMENT_THRESHOLDS).toEqual({
      MIN_SAMPLE: 6,
      WIN_LIFT: 0.10,
      ROLLBACK_LIFT: -0.10,
      MIN_CONFIDENCE: 0.6,
      MATURE_DAYS: 21,
    })
  })
})

describe('computeLift', () => {
  it('positive lift when treatment mean exceeds baseline mean', () => {
    const r = computeLift([10, 10, 10, 10], [12, 12, 12, 12])
    expect(r.lift).toBeCloseTo(0.2, 6) // (12-10)/10
    expect(r.n).toBe(4)
    expect(r.confidence).toBe(1) // zero variance, clean separation
  })

  it('negative lift when treatment underperforms', () => {
    const r = computeLift([10, 10, 10], [8, 8, 8])
    expect(r.lift).toBeCloseTo(-0.2, 6)
    expect(r.n).toBe(3)
  })

  it('n is the smaller of the two arms', () => {
    const r = computeLift([10, 10, 10, 10, 10], [12, 12])
    expect(r.n).toBe(2)
  })

  it('lift is 0 when baseline mean is non-positive', () => {
    expect(computeLift([0, 0], [5, 5]).lift).toBe(0)
  })

  it('confidence is 0 with fewer than 2 usable points', () => {
    expect(computeLift([10], [12]).confidence).toBe(0)
  })

  it('noisy data yields lower confidence than clean data for the same lift', () => {
    const clean = computeLift([10, 10, 10, 10], [11, 11, 11, 11])
    const noisy = computeLift([2, 18, 5, 15], [1, 21, 6, 16])
    expect(clean.lift).toBeCloseTo(noisy.lift, 1)
    expect(clean.confidence).toBeGreaterThan(noisy.confidence)
  })

  it('ignores null/NaN entries when computing means', () => {
    const r = computeLift([10, null as unknown as number, 10], [12, 12, NaN])
    expect(r.lift).toBeCloseTo(0.2, 6)
  })
})

describe('evaluateGuardrails', () => {
  it('tiny N → keep_running, no rollback (never judge on too little data)', () => {
    expect(evaluateGuardrails({ n: 3, lift: 0.5, confidence: 0.99, matured: true }))
      .toEqual({ decision: 'keep_running', rollback: false })
  })

  it('clear win → won, no rollback', () => {
    expect(evaluateGuardrails({ n: 10, lift: 0.25, confidence: 0.8, matured: false }))
      .toEqual({ decision: 'won', rollback: false })
  })

  it('clear loss → lost, rollback true', () => {
    expect(evaluateGuardrails({ n: 10, lift: -0.30, confidence: 0.8, matured: false }))
      .toEqual({ decision: 'lost', rollback: true })
  })

  it('a bad lift with low confidence does NOT roll back until matured', () => {
    expect(evaluateGuardrails({ n: 10, lift: -0.30, confidence: 0.3, matured: false }))
      .toEqual({ decision: 'keep_running', rollback: false })
  })

  it('matured but neither win nor loss → inconclusive, rollback to control', () => {
    expect(evaluateGuardrails({ n: 10, lift: 0.02, confidence: 0.9, matured: true }))
      .toEqual({ decision: 'inconclusive', rollback: true })
  })

  it('small positive lift, not matured → keep_running', () => {
    expect(evaluateGuardrails({ n: 10, lift: 0.05, confidence: 0.9, matured: false }))
      .toEqual({ decision: 'keep_running', rollback: false })
  })
})

describe('assertSupportedDimension', () => {
  it('accepts timing, pillar, and format (v1 supported dimensions)', () => {
    expect(() => assertSupportedDimension('timing')).not.toThrow()
    expect(() => assertSupportedDimension('pillar')).not.toThrow()
    expect(() => assertSupportedDimension('format')).not.toThrow()
  })

  it('rejects hook — promptSuffix is not yet threaded into generation (Phase 2 follow-up)', () => {
    expect(() => assertSupportedDimension('hook')).toThrowError(/hook.*length.*Phase 2/i)
  })

  it('rejects length — targetWords is not yet threaded into generation (Phase 2 follow-up)', () => {
    expect(() => assertSupportedDimension('length')).toThrowError(/hook.*length.*Phase 2/i)
  })
})

describe('applyTreatmentToGeneration', () => {
  const base = { pillar: 'Industry Trends', format: 'insight', promptSuffix: '', targetWords: null as number | null }

  it('control arm returns the base config unchanged', () => {
    const exp = { dimension: 'pillar' as const, treatment: { pillar: 'Founder Lessons' } }
    expect(applyTreatmentToGeneration(base, exp, 'control')).toEqual(base)
  })

  it('pillar treatment overrides the pillar for the treatment arm', () => {
    const exp = { dimension: 'pillar' as const, treatment: { pillar: 'Founder Lessons' } }
    const out = applyTreatmentToGeneration(base, exp, 'treatment')
    expect(out.pillar).toBe('Founder Lessons')
    expect(out.format).toBe('insight') // untouched
  })

  it('format treatment overrides the format', () => {
    const exp = { dimension: 'format' as const, treatment: { format: 'story' } }
    expect(applyTreatmentToGeneration(base, exp, 'treatment').format).toBe('story')
  })

  it('hook treatment appends a hook-style instruction to the prompt suffix', () => {
    const exp = { dimension: 'hook' as const, treatment: { hook_style: 'question' } }
    const out = applyTreatmentToGeneration(base, exp, 'treatment')
    expect(out.promptSuffix).toContain('question')
    expect(out.promptSuffix.length).toBeGreaterThan(0)
  })

  it('length treatment sets targetWords', () => {
    const exp = { dimension: 'length' as const, treatment: { target_words: 90 } }
    expect(applyTreatmentToGeneration(base, exp, 'treatment').targetWords).toBe(90)
  })

  it('timing treatment does NOT alter generation config (timing acts via the scheduler)', () => {
    const exp = { dimension: 'timing' as const, treatment: { day: 'Tue', hour: 9 } }
    expect(applyTreatmentToGeneration(base, exp, 'treatment')).toEqual(base)
  })

  it('a null/absent experiment returns the base config (no experiment running)', () => {
    expect(applyTreatmentToGeneration(base, null, 'control')).toEqual(base)
  })
})
