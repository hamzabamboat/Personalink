import { describe, it, expect } from 'vitest'
import { paymentToInr } from '@/lib/affiliate'
import { CURRENCY_TO_INR } from '@/lib/pricing-config'

describe('paymentToInr', () => {
  it('converts USD at the supplied live rate (not the stale static 84)', () => {
    expect(paymentToInr('USD', 60, 94)).toBe(5640) // 60 * 94
    expect(paymentToInr('USD', 100, 88)).toBe(8800) // tracks whatever live rate is passed
    // proves USD no longer uses the hardcoded CURRENCY_TO_INR.USD (84)
    expect(paymentToInr('USD', 100, 94)).not.toBe(Math.round(100 * CURRENCY_TO_INR.USD))
  })

  it('converts GBP/EUR at the static map, ignoring the USD live rate', () => {
    expect(paymentToInr('GBP', 50, 94)).toBe(Math.round(50 * CURRENCY_TO_INR.GBP))
    expect(paymentToInr('EUR', 100, 94)).toBe(Math.round(100 * CURRENCY_TO_INR.EUR))
    // a wildly different USD rate must not affect non-USD conversions
    expect(paymentToInr('GBP', 50, 9999)).toBe(Math.round(50 * CURRENCY_TO_INR.GBP))
  })

  it('treats INR as identity', () => {
    expect(paymentToInr('INR', 999, 94)).toBe(999)
  })
})
