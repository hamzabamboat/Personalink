import { describe, it, expect } from 'vitest'
import { getCompetitor, getAllCompetitors, calcYearOne, COMPETITOR_PLANS, COMPETITOR_SLUGS } from '@/lib/competitor-data'

describe('rate-parameterized competitor data', () => {
  it('taplio mid-tier price row reflects the rate', () => {
    const t = getCompetitor('taplio', 85)
    const row = t.features.find(f => f.label === 'Mid-tier monthly price')!
    expect(String(row.competitor)).toContain('₹5,525') // 65 * 85
  })
  it('a different rate yields a different ₹', () => {
    const row = getCompetitor('taplio', 90).features.find(f => f.label === 'Mid-tier monthly price')!
    expect(String(row.competitor)).toContain('₹5,850') // 65 * 90
  })
  it('calcYearOne uses the live rate for lifetime competitors', () => {
    const kleo = getCompetitor('kleo', 90)
    expect(calcYearOne(kleo, 10, 90).competitor.yearOneInr).toBe(8910) // 99 * 90
  })
  it('calcYearOne uses the live rate for recurring competitors', () => {
    const sg = getCompetitor('supergrow', 80)
    // Solo $19/mo covers 30 posts → 19*80*12
    expect(calcYearOne(sg, 10, 80).competitor.yearOneInr).toBe(18240)
  })
  it('plans are rate-independent raw USD', () => {
    expect(COMPETITOR_PLANS.taplio.find(p => p.name === 'Pro')?.monthlyUsd).toBe(65)
    expect(COMPETITOR_PLANS.kleo[0].oneTimeUsd).toBe(99)
  })
  it('getAllCompetitors returns all slugs', () => {
    expect(getAllCompetitors(85).map(c => c.slug).sort()).toEqual([...COMPETITOR_SLUGS].sort())
  })
})
