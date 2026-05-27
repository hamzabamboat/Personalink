'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TIER_LIMITS,
  TIER_PRICING,
  TIER_FEATURE_BULLETS,
  TIER_LABEL,
  CURRENCY_SYMBOL,
  detectCurrencyByCountry,
  type Currency,
  type BillingPeriod,
  type TierID,
} from '@/lib/pricing-config'
import { Check } from 'lucide-react'
import { WordMark } from '@/components/word-mark'

const CURRENCY_STORAGE_KEY = 'personalink_currency'
const BILLING_STORAGE_KEY = 'personalink_billing_period'
const CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'GBP']
const PAID_TIERS: Exclude<TierID, 'free' | 'agency'>[] = ['starter', 'standard', 'pro']

function readInitialCurrency(): Currency {
  if (typeof window === 'undefined') return 'USD'
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY) as Currency | null
  if (saved && CURRENCIES.includes(saved)) return saved
  const m = document.cookie.match(/user_country=([^;]+)/)
  return detectCurrencyByCountry(m?.[1])
}

function readInitialBilling(): BillingPeriod {
  if (typeof window === 'undefined') return 'monthly'
  const saved = localStorage.getItem(BILLING_STORAGE_KEY) as BillingPeriod | null
  return saved === 'annual' ? 'annual' : 'monthly'
}

function priceFor(tier: TierID, currency: Currency, period: BillingPeriod): number | null {
  if (tier === 'free' || tier === 'agency') return null
  const monthlyPrice = TIER_PRICING[tier][currency].monthly
  const annualPrice = TIER_PRICING[tier][currency].annual
  return period === 'annual' ? Math.round(annualPrice / 12) : monthlyPrice
}

function annualTotalFor(tier: TierID, currency: Currency): number | null {
  if (tier === 'free' || tier === 'agency') return null
  return TIER_PRICING[tier][currency].annual
}

function formatNum(currency: Currency, n: number): string {
  return n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US')
}

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>('USD')
  const [billing, setBilling] = useState<BillingPeriod>('monthly')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCurrency(readInitialCurrency())
    setBilling(readInitialBilling())
  }, [])

  useEffect(() => {
    if (mounted) localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
  }, [currency, mounted])

  useEffect(() => {
    if (mounted) localStorage.setItem(BILLING_STORAGE_KEY, billing)
  }, [billing, mounted])

  const cards = useMemo(() => {
    const tiers: TierID[] = ['free', 'starter', 'standard', 'pro', 'agency']
    return tiers.map(tier => {
      const price = priceFor(tier, currency, billing)
      const annualTotal = annualTotalFor(tier, currency)
      const postsPerMonth = TIER_LIMITS[tier].postsPerMonth
      return {
        id: tier,
        label: TIER_LABEL[tier],
        price,
        annualTotal,
        postsLabel: postsPerMonth == null ? (tier === 'agency' ? 'Custom volume' : 'Unlimited posts') : `${postsPerMonth} posts/month`,
        features: TIER_FEATURE_BULLETS[tier],
        popular: tier === 'standard',
        bestValue: tier === 'pro',
      }
    })
  }, [currency, billing])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="px-4 sm:px-6 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <div className="max-w-[1200px] mx-auto h-16 flex items-center justify-between">
          <Link href="/"><WordMark icon wordmark iconSize={28} /></Link>
          <Link href="/" className="text-[13px]" style={{ color: 'var(--ink-3)' }}>← Back to home</Link>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-[28px] md:text-[40px] font-bold tracking-tight mb-3" style={{ color: 'var(--ink)' }}>
            Simple, honest pricing
          </h1>
          <p className="text-[15px] md:text-base mb-7" style={{ color: 'var(--ink-4)' }}>
            Start free. Upgrade when you outgrow your plan. Cancel anytime.
          </p>

          <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
            {/* Currency switcher */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              {CURRENCIES.map(c => {
                const active = c === currency
                return (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className="px-3 py-1.5 text-[12px] font-semibold rounded-full transition-colors"
                    style={{
                      background: active ? 'var(--ink)' : 'transparent',
                      color: active ? 'var(--bg)' : 'var(--ink-3)',
                    }}
                  >
                    {CURRENCY_SYMBOL[c]} {c}
                  </button>
                )
              })}
            </div>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <button
                onClick={() => setBilling('monthly')}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-full transition-colors"
                style={{
                  background: billing === 'monthly' ? 'var(--ink)' : 'transparent',
                  color: billing === 'monthly' ? 'var(--bg)' : 'var(--ink-3)',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('annual')}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-full transition-colors flex items-center gap-1.5"
                style={{
                  background: billing === 'annual' ? 'var(--ink)' : 'transparent',
                  color: billing === 'annual' ? 'var(--bg)' : 'var(--ink-3)',
                }}
              >
                Annual
                <span className="px-1.5 rounded-full text-[10px] font-bold" style={{ background: '#16a34a', color: '#fff' }}>
                  Save 25%
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map(card => {
            const isAgency = card.id === 'agency'
            const isFree = card.id === 'free'
            return (
              <div
                key={card.id}
                className="relative flex flex-col rounded-2xl p-5"
                style={{
                  background: card.popular ? 'var(--pl-accent)' : 'var(--surface)',
                  border: card.popular ? 'none' : '1px solid var(--line)',
                  color: card.popular ? '#fff' : 'var(--ink)',
                  boxShadow: card.popular ? 'var(--sh-3)' : 'var(--sh-1)',
                }}
              >
                {card.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap"
                    style={{ background: '#f59e0b', color: '#fff' }}>
                    Most Popular
                  </span>
                )}
                {card.bestValue && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap"
                    style={{ background: '#7c3aed', color: '#fff' }}>
                    Best Value
                  </span>
                )}

                <div className="mb-3">
                  <div className="text-[13px] font-semibold" style={{ color: card.popular ? 'rgba(255,255,255,.7)' : 'var(--ink-3)' }}>
                    {card.label}
                  </div>
                </div>

                <div className="mb-1">
                  {isAgency ? (
                    <div className="text-[24px] font-bold leading-none">Custom</div>
                  ) : isFree ? (
                    <div className="text-[36px] font-bold leading-none">{CURRENCY_SYMBOL[currency]}0</div>
                  ) : (
                    <div className="text-[36px] font-bold leading-none">
                      {CURRENCY_SYMBOL[currency]}{formatNum(currency, card.price ?? 0)}
                      <span className="text-[13px] font-normal" style={{ color: card.popular ? 'rgba(255,255,255,.6)' : 'var(--ink-4)' }}>
                        /mo
                      </span>
                    </div>
                  )}
                </div>

                {billing === 'annual' && !isFree && !isAgency && card.annualTotal != null && (
                  <div className="text-[11px] mb-3" style={{ color: card.popular ? 'rgba(255,255,255,.6)' : 'var(--ink-4)' }}>
                    Billed {CURRENCY_SYMBOL[currency]}{formatNum(currency, card.annualTotal)}/yr
                  </div>
                )}

                <div className="text-[12px] mb-4" style={{ color: card.popular ? 'rgba(255,255,255,.7)' : 'var(--ink-4)' }}>
                  {card.postsLabel}
                </div>

                <ul className="flex-1 flex flex-col gap-1.5 mb-5">
                  {card.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[12.5px] leading-snug" style={{ color: card.popular ? 'rgba(255,255,255,.85)' : 'var(--ink-2)' }}>
                      <Check className="w-3 h-3 mt-0.5 shrink-0" style={{ color: card.popular ? '#fff' : 'var(--pl-accent)' }} strokeWidth={2.5} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isAgency ? (
                  <Link
                    href="/for-agencies"
                    className="text-center py-2.5 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--ink)', color: 'var(--bg)' }}
                  >
                    Contact us
                  </Link>
                ) : (
                  <Link
                    href={isFree ? '/onboarding' : `/upgrade?plan=${card.id}&billing=${billing}&currency=${currency}`}
                    className="text-center py-2.5 rounded-xl text-[13px] font-bold transition-opacity hover:opacity-90"
                    style={{
                      background: card.popular ? '#fff' : 'var(--ink)',
                      color: card.popular ? 'var(--ink)' : 'var(--bg)',
                    }}
                  >
                    {isFree ? 'Start free' : 'Start 7-day free trial'}
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center mt-10 text-[12px]" style={{ color: 'var(--ink-4)' }}>
          All paid plans include a 7-day free trial. Indian users billed in INR via Razorpay (GST invoice included). Everyone else billed via Dodo Payments.
        </p>
      </main>
    </div>
  )
}
