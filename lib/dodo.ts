import DodoPayments from 'dodopayments'
import { TIER_PRICING, DODO_PRODUCT_IDS, type BillingPeriod as PCBillingPeriod, type TierID } from './pricing-config'

export function getDodo() {
  return new DodoPayments({
    bearerToken: process.env.DODO_API_KEY!,
    environment: (process.env.DODO_ENVIRONMENT as 'live_mode' | 'test_mode') ?? 'test_mode',
  })
}

// Derived from lib/pricing-config.ts — do not edit prices or product IDs here.
export const DODO_PLANS = {
  starter: {
    USD: { price: TIER_PRICING.starter.USD.monthly, productId: DODO_PRODUCT_IDS.starter.monthly.USD },
    GBP: { price: TIER_PRICING.starter.GBP.monthly, productId: DODO_PRODUCT_IDS.starter.monthly.GBP },
    EUR: { price: TIER_PRICING.starter.EUR.monthly, productId: DODO_PRODUCT_IDS.starter.monthly.EUR },
  },
  standard: {
    USD: { price: TIER_PRICING.standard.USD.monthly, productId: DODO_PRODUCT_IDS.standard.monthly.USD },
    GBP: { price: TIER_PRICING.standard.GBP.monthly, productId: DODO_PRODUCT_IDS.standard.monthly.GBP },
    EUR: { price: TIER_PRICING.standard.EUR.monthly, productId: DODO_PRODUCT_IDS.standard.monthly.EUR },
  },
  pro: {
    USD: { price: TIER_PRICING.pro.USD.monthly, productId: DODO_PRODUCT_IDS.pro.monthly.USD },
    GBP: { price: TIER_PRICING.pro.GBP.monthly, productId: DODO_PRODUCT_IDS.pro.monthly.GBP },
    EUR: { price: TIER_PRICING.pro.EUR.monthly, productId: DODO_PRODUCT_IDS.pro.monthly.EUR },
  },
} as const

export const DODO_ANNUAL_PLANS = {
  starter: {
    USD: { price: TIER_PRICING.starter.USD.annual, productId: DODO_PRODUCT_IDS.starter.annual.USD },
    GBP: { price: TIER_PRICING.starter.GBP.annual, productId: DODO_PRODUCT_IDS.starter.annual.GBP },
    EUR: { price: TIER_PRICING.starter.EUR.annual, productId: DODO_PRODUCT_IDS.starter.annual.EUR },
  },
  standard: {
    USD: { price: TIER_PRICING.standard.USD.annual, productId: DODO_PRODUCT_IDS.standard.annual.USD },
    GBP: { price: TIER_PRICING.standard.GBP.annual, productId: DODO_PRODUCT_IDS.standard.annual.GBP },
    EUR: { price: TIER_PRICING.standard.EUR.annual, productId: DODO_PRODUCT_IDS.standard.annual.EUR },
  },
  pro: {
    USD: { price: TIER_PRICING.pro.USD.annual, productId: DODO_PRODUCT_IDS.pro.annual.USD },
    GBP: { price: TIER_PRICING.pro.GBP.annual, productId: DODO_PRODUCT_IDS.pro.annual.GBP },
    EUR: { price: TIER_PRICING.pro.EUR.annual, productId: DODO_PRODUCT_IDS.pro.annual.EUR },
  },
} as const

export type DodoPlan = Exclude<TierID, 'free' | 'agency'>
export type DodoCurrency = keyof typeof DODO_PLANS.starter
export type BillingPeriod = PCBillingPeriod
