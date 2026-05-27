/**
 * Country → currency map for /upgrade and /pricing surfaces.
 * Returned object preserves the legacy shape (starter/standard/pro + annualStarter/etc.)
 * so existing callers keep working. New code should import TIER_PRICING from pricing-config.
 */
import {
  TIER_PRICING,
  CURRENCY_SYMBOL,
  CURRENCY_TO_INR as PC_CURRENCY_TO_INR,
  detectCurrencyByCountry,
  getPaymentProcessor as pcGetPaymentProcessor,
  type Currency,
} from './pricing-config'

export type CountryCode = keyof typeof CURRENCIES

export interface CurrencyView {
  code: Currency
  symbol: string
  starter: number
  standard: number
  pro: number
  annualStarter: number
  annualStandard: number
  annualPro: number
}

function viewFor(currency: Currency): CurrencyView {
  return {
    code: currency,
    symbol: CURRENCY_SYMBOL[currency],
    starter: TIER_PRICING.starter[currency].monthly,
    standard: TIER_PRICING.standard[currency].monthly,
    pro: TIER_PRICING.pro[currency].monthly,
    annualStarter: TIER_PRICING.starter[currency].annual,
    annualStandard: TIER_PRICING.standard[currency].annual,
    annualPro: TIER_PRICING.pro[currency].annual,
  }
}

export function getCurrency(country: string | undefined): CurrencyView {
  return viewFor(detectCurrencyByCountry(country))
}

export function getPaymentProcessor(countryCode: string): 'razorpay' | 'dodo' {
  return pcGetPaymentProcessor(detectCurrencyByCountry(countryCode))
}

export function formatPrice(symbol: string, amount: number) {
  return `${symbol}${amount.toLocaleString()}`
}

// Backward-compat: legacy callers (competitor-data.ts, blog) read CURRENCIES.IN.starter etc.
export const CURRENCIES = {
  IN: viewFor('INR'),
  US: viewFor('USD'),
  GB: viewFor('GBP'),
  DE: viewFor('EUR'),
  FR: viewFor('EUR'),
  IT: viewFor('EUR'),
  NL: viewFor('EUR'),
  ES: viewFor('EUR'),
  BE: viewFor('EUR'),
  AT: viewFor('EUR'),
  PT: viewFor('EUR'),
  IE: viewFor('EUR'),
  FI: viewFor('EUR'),
  GR: viewFor('EUR'),
  LU: viewFor('EUR'),
  SK: viewFor('EUR'),
  SI: viewFor('EUR'),
  EE: viewFor('EUR'),
  LV: viewFor('EUR'),
  LT: viewFor('EUR'),
  CY: viewFor('EUR'),
  MT: viewFor('EUR'),
  HR: viewFor('EUR'),
  DEFAULT: viewFor('USD'),
}

export const CURRENCY_TO_INR = PC_CURRENCY_TO_INR as unknown as Record<string, number>
