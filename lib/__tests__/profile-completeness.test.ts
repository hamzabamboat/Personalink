import { describe, it, expect } from 'vitest'
import { getProfileCompleteness, REQUIRED_MCQ_IDS } from '@/lib/profile-completeness'

const full = {
  mcq_answers: Object.fromEntries(REQUIRED_MCQ_IDS.map(id => [id, 'x'])),
  content_pillars: ['Leadership', 'Innovation', 'Career Advice'],
  control_preference: 'approve',
}

describe('getProfileCompleteness', () => {
  it('reports complete when quiz + 3 pillars + control preference are present', () => {
    const r = getProfileCompleteness(full)
    expect(r.complete).toBe(true)
    expect(r.missing).toEqual([])
  })
  it('flags missing quiz', () => {
    const r = getProfileCompleteness({ ...full, mcq_answers: {} })
    expect(r.complete).toBe(false)
    expect(r.missing).toContain('quiz')
  })
  it('flags fewer than 3 pillars', () => {
    const r = getProfileCompleteness({ ...full, content_pillars: ['Leadership'] })
    expect(r.missing).toContain('pillars')
  })
  it('flags missing control preference', () => {
    const r = getProfileCompleteness({ ...full, control_preference: '' })
    expect(r.missing).toContain('control')
  })
  it('treats null/undefined profile as fully incomplete', () => {
    const r = getProfileCompleteness(null)
    expect(r.complete).toBe(false)
    expect(r.missing).toEqual(['quiz', 'pillars', 'control'])
  })
  it('ignores image brief (informational) — not part of completeness', () => {
    expect(getProfileCompleteness(full).complete).toBe(true)
  })
})
