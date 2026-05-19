export const CURRENCIES = {
  IN: { code: 'INR', symbol: '₹', starter: 999, standard: 2499, pro: 4999 },
  US: { code: 'USD', symbol: '$', starter: 12, standard: 30, pro: 60 },
  GB: { code: 'GBP', symbol: '£', starter: 10, standard: 25, pro: 50 },
  DE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  FR: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  IT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  NL: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  ES: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  BE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  AT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  PT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  IE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  FI: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  GR: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  LU: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  SK: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  SI: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  EE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  LV: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  LT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  CY: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  MT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  HR: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  DEFAULT: { code: 'USD', symbol: '$', starter: 12, standard: 30, pro: 60 },
} as const

export type CountryCode = keyof typeof CURRENCIES

export function getCurrency(country: string | undefined) {
  if (!country) return CURRENCIES.DEFAULT
  return (CURRENCIES as Record<string, typeof CURRENCIES.DEFAULT>)[country] ?? CURRENCIES.DEFAULT
}

export function getPaymentProcessor(countryCode: string): 'razorpay' | 'dodo' {
  return countryCode === 'IN' ? 'razorpay' : 'dodo'
}

export function formatPrice(symbol: string, amount: number) {
  return `${symbol}${amount.toLocaleString()}`
}

// Fixed approximate rates (update periodically). Used for INR-equivalent MRR display.
export const CURRENCY_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 84,
  GBP: 107,
  EUR: 90,
}
