import { describe, it, expect } from 'vitest'
import { LEAD_DRIP_TEMPLATES, getLeadDripTemplate } from '../lead-drip-templates'

describe('getLeadDripTemplate', () => {
  it('has at least one template', () => {
    expect(LEAD_DRIP_TEMPLATES.length).toBeGreaterThan(0)
  })

  it('returns the template at the given index', () => {
    expect(getLeadDripTemplate(0)).toBe(LEAD_DRIP_TEMPLATES[0])
    expect(getLeadDripTemplate(1)).toBe(LEAD_DRIP_TEMPLATES[1])
  })

  it('wraps around once the template set is exhausted', () => {
    const n = LEAD_DRIP_TEMPLATES.length
    expect(getLeadDripTemplate(n)).toBe(LEAD_DRIP_TEMPLATES[0])
    expect(getLeadDripTemplate(n + 2)).toBe(LEAD_DRIP_TEMPLATES[2 % n])
  })
})
