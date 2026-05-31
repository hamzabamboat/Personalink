import { describe, it, expect } from 'vitest'
import {
  pctChange, signedPct, signedInt, composeGrowthNarrative, REPORT_WINDOW_DAYS,
  type GrowthNarrativeInput,
} from '../growth-report'

describe('growth-report leaf helpers', () => {
  it('pctChange returns fractional change vs a prior value', () => {
    expect(pctChange(140, 100)).toBeCloseTo(0.4, 10)   // +40%
    expect(pctChange(50, 100)).toBeCloseTo(-0.5, 10)    // -50%
    expect(pctChange(100, 100)).toBe(0)
  })

  it('pctChange returns null when the prior is zero/absent (no baseline to compare)', () => {
    expect(pctChange(10, 0)).toBeNull()
    expect(pctChange(10, null)).toBeNull()
    expect(pctChange(null, 100)).toBe(-1) // had a baseline, now nothing → -100%
  })

  it('signedPct formats a fraction as a +/- percentage string', () => {
    expect(signedPct(0.4)).toBe('+40%')
    expect(signedPct(-0.5)).toBe('-50%')
    expect(signedPct(0)).toBe('+0%')
    expect(signedPct(null)).toBe('—')
  })

  it('signedInt formats a signed integer with thousands separators', () => {
    expect(signedInt(120)).toBe('+120')
    expect(signedInt(-3)).toBe('-3')
    expect(signedInt(0)).toBe('+0')
    expect(signedInt(1200)).toBe('+1,200')
    expect(signedInt(null)).toBe('—')
  })

  it('exposes the v1 report window', () => {
    expect(REPORT_WINDOW_DAYS).toBe(28)
  })
})

function baseInput(): GrowthNarrativeInput {
  return {
    firstName: 'Sam',
    windowDays: 28,
    current: { score: 72, impressions: 14000, followers: 1320 },
    prior:   { score: 60, impressions: 10000, followers: 1200 },
    // attribution: the pillar that drove the most followers + the best time slot
    topDriver: {
      pillar: 'founder-story',
      followersGained: 120,
      bestSlot: { day: 'Tue', hour: 9 },
    },
  }
}

describe('composeGrowthNarrative — growth UP', () => {
  it('leads with the headline gain and attributes it to the driver + time slot', () => {
    const { subject, body } = composeGrowthNarrative(baseInput())
    expect(body.trend).toBe('up')
    expect(subject).toContain('+40%')           // impressions delta in the subject
    expect(subject.toLowerCase()).toContain('sam')
    // headline mentions both impressions % and follower count delta
    expect(body.headline).toContain('+40%')
    expect(body.headline).toContain('+120')
    // attribution sentence names the pillar AND the day it moved them to
    expect(body.attribution).toMatch(/founder-story/i)
    expect(body.attribution).toMatch(/Tue/)
    expect(body.scoreLine).toContain('72')      // current score shown
    expect(body.cta.href).toContain('/dashboard/analytics')
  })
})

describe('composeGrowthNarrative — FLAT', () => {
  it('frames a held-steady week honestly (no fake gain) and nudges the next experiment', () => {
    const input = baseInput()
    input.current = { score: 61, impressions: 10100, followers: 1205 }
    input.prior = { score: 60, impressions: 10000, followers: 1200 }
    const { body } = composeGrowthNarrative(input)
    expect(body.trend).toBe('flat')
    expect(body.headline.toLowerCase()).toMatch(/steady|holding|consistent/)
    // never claims a big jump when there isn't one
    expect(body.headline).not.toContain('+40%')
  })
})

describe('composeGrowthNarrative — DOWN', () => {
  it('is candid about the dip and orients toward recovery, not blame', () => {
    const input = baseInput()
    input.current = { score: 48, impressions: 7000, followers: 1180 }
    input.prior = { score: 60, impressions: 10000, followers: 1200 }
    const { subject, body } = composeGrowthNarrative(input)
    expect(body.trend).toBe('down')
    expect(body.headline).toMatch(/-30%/)       // impressions fell 30%
    expect(body.recovery).toBeTruthy()          // a recovery suggestion is present
    expect(subject.toLowerCase()).not.toMatch(/congrat|great week/)
  })
})

describe('composeGrowthNarrative — INSUFFICIENT DATA', () => {
  it('returns the no-baseline variant when the prior window is empty', () => {
    const { subject, body } = composeGrowthNarrative({
      firstName: 'Sam',
      windowDays: 28,
      current: { score: 55, impressions: 800, followers: 40 },
      prior: { score: null, impressions: null, followers: null },
      topDriver: null,
    })
    expect(body.trend).toBe('insufficient')
    expect(body.headline.toLowerCase()).toMatch(/first|baseline|getting started|keep posting/)
    expect(body.attribution).toBeNull()         // nothing to attribute yet
    expect(subject.toLowerCase()).not.toContain('—') // subject is still human
  })

  it('echoes the window length passed in', () => {
    const { body } = composeGrowthNarrative({ ...baseInput(), windowDays: REPORT_WINDOW_DAYS })
    expect(body.windowDays).toBe(28)
  })
})
