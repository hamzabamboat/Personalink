import { describe, it, expect } from 'vitest'
import { selectTipOfDay, GROWTH_TIP, GROWTH_TIP_EVERY_N_DAYS } from '@/lib/daily-tip'

const TIPS = ['tip-a', 'tip-b', 'tip-c', 'tip-d', 'tip-e']

describe('selectTipOfDay', () => {
  it('returns the growth tip on every Nth day', () => {
    expect(selectTipOfDay(0, TIPS)).toBe(GROWTH_TIP)
    expect(selectTipOfDay(GROWTH_TIP_EVERY_N_DAYS, TIPS)).toBe(GROWTH_TIP)
    expect(selectTipOfDay(GROWTH_TIP_EVERY_N_DAYS * 7, TIPS)).toBe(GROWTH_TIP)
  })

  it('returns a regular rotation tip on non-cadence days', () => {
    expect(TIPS).toContain(selectTipOfDay(1, TIPS))
    expect(TIPS).toContain(selectTipOfDay(2, TIPS))
    expect(TIPS).toContain(selectTipOfDay(3, TIPS))
  })

  it('cadence is no sparser than every 4 days (the requirement)', () => {
    expect(GROWTH_TIP_EVERY_N_DAYS).toBeLessThanOrEqual(4)
  })

  it('surfaces the growth tip at least once in EVERY window of N consecutive days, all year', () => {
    for (let start = 0; start < 366; start++) {
      const window = Array.from({ length: GROWTH_TIP_EVERY_N_DAYS }, (_, o) =>
        selectTipOfDay(start + o, TIPS),
      )
      expect(window).toContain(GROWTH_TIP)
    }
  })

  it('falls back to the growth tip if the rotation list is empty', () => {
    expect(selectTipOfDay(1, [])).toBe(GROWTH_TIP)
  })
})
