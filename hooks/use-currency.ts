'use client'
import { useEffect, useState } from 'react'
import { getCurrency, CURRENCIES, CountryCode } from '@/lib/currency'

type CurrencyEntry = typeof CURRENCIES[CountryCode]

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyEntry>(CURRENCIES.IN)

  useEffect(() => {
    const country = document.cookie.split(';').find(c => c.trim().startsWith('user_country='))?.split('=')[1] ?? 'IN'
    setCurrency(getCurrency(country) as CurrencyEntry)
  }, [])

  return currency
}
