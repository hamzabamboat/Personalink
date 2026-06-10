'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TIER_LIMITS,
  TIER_PRICING,
  TIER_FEATURE_BULLETS,
  TIER_LABEL,
  CURRENCY_SYMBOL,
  CURRENCY_TO_INR,
  detectCurrencyByCountry,
  type Currency,
  type BillingPeriod,
  type TierID,
} from '@/lib/pricing-config'
import { COMPETITOR_PLANS } from '@/lib/competitor-data'
import { FX_FALLBACK_USD_INR } from '@/lib/fx'
import { Check } from 'lucide-react'
import { WordMark } from '@/components/word-mark'

const TAPLIO_PRO_USD = COMPETITOR_PLANS.taplio.find(p => p.name === 'Pro')?.monthlyUsd ?? 65
const KLEO_LIFETIME_USD = COMPETITOR_PLANS.kleo[0].oneTimeUsd ?? 99

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

function convertUsdTo(currency: Currency, usd: number, usdInr: number): number {
  if (currency === 'USD') return usd
  const inr = usd * usdInr
  return Math.round(inr / CURRENCY_TO_INR[currency])
}

function fmt(currency: Currency, n: number): string {
  return `${CURRENCY_SYMBOL[currency]}${formatNum(currency, n)}`
}

function pickPlTierForPosts(posts: number): Exclude<TierID, 'free' | 'agency'> {
  if (posts <= 12) return 'starter'
  if (posts <= 22) return 'standard'
  return 'pro'
}

function pickTaplioMonthlyUsdForPosts(posts: number): number {
  const fit = COMPETITOR_PLANS.taplio.find(p => posts <= p.postBudget)
  const plan = fit ?? COMPETITOR_PLANS.taplio[COMPETITOR_PLANS.taplio.length - 1]
  return plan.monthlyUsd ?? 0
}

// Static India pricing as machine-readable Offers so AI answers and rich results can
// extract the ₹999 entry price for "under ₹1000 / India" queries. Sourced from
// TIER_PRICING (the single source of truth) so the numbers can never drift from the UI.
const PRICING_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Product',
      name: 'PersonaLink',
      description:
        'AI LinkedIn tool for India — writes posts in your voice, auto-publishes on schedule, billed in INR with GST invoices. Free tier plus paid plans from ₹999/month.',
      brand: { '@type': 'Brand', name: 'PersonaLink' },
      url: 'https://personalink.in/pricing',
      offers: [
        { '@type': 'Offer', name: 'Starter', price: String(TIER_PRICING.starter.INR.monthly), priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: 'https://personalink.in/pricing' },
        { '@type': 'Offer', name: 'Standard', price: String(TIER_PRICING.standard.INR.monthly), priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: 'https://personalink.in/pricing' },
        { '@type': 'Offer', name: 'Pro', price: String(TIER_PRICING.pro.INR.monthly), priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: 'https://personalink.in/pricing' },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
        { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://personalink.in/pricing' },
      ],
    },
  ],
}

export default function PricingPage() {
  // Default SSR currency to INR (India-first): ensures ₹999 is in the crawlable
  // HTML for "under ₹1000 / India" queries. Client useEffect corrects to the
  // visitor's real currency on mount (no hydration mismatch — same initial).
  const [currency, setCurrency] = useState<Currency>('INR')
  const [billing, setBilling] = useState<BillingPeriod>('monthly')
  const [posts, setPosts] = useState(22)
  const [mounted, setMounted] = useState(false)
  const [usdInr, setUsdInr] = useState(FX_FALLBACK_USD_INR)

  useEffect(() => {
    setMounted(true)
    setCurrency(readInitialCurrency())
    setBilling(readInitialBilling())
  }, [])

  useEffect(() => {
    fetch('/api/fx-rate').then(r => r.json()).then(d => { if (typeof d?.usdInr === 'number') setUsdInr(d.usdInr) }).catch(() => {})
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
        postsLabel: tier === 'agency'
          ? 'For agencies managing 3+ client accounts. Custom white-label deal.'
          : postsPerMonth == null
            ? 'Unlimited posts'
            : `${postsPerMonth} posts/month`,
        features: TIER_FEATURE_BULLETS[tier],
        popular: tier === 'standard',
        bestValue: tier === 'pro',
      }
    })
  }, [currency, billing])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PRICING_JSONLD) }} />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map(card => {
            const isAgency = card.id === 'agency'
            const isFree = card.id === 'free'
            return (
              <div
                key={card.id}
                className={`relative flex flex-col rounded-2xl p-5 ${isAgency ? 'md:col-span-2 lg:col-span-1' : ''}`}
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

        {/* ─── Competitor anchor + savings calculator ─── */}
        <section className="mt-16 md:mt-24">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-[22px] md:text-[28px] font-bold tracking-tight mb-2" style={{ color: 'var(--ink)' }}>
              Cheaper than Taplio. Deeper than Kleo.
            </h2>
            <p className="text-[14px] md:text-[15px]" style={{ color: 'var(--ink-4)' }}>
              Same features. INR billing, GST invoices, India-aware AI. Real money saved.
            </p>
          </div>

          {/* Comparison table */}
          <div className="rounded-2xl overflow-hidden max-w-[760px] mx-auto" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
            <div className="grid grid-cols-[1.4fr_1fr_1fr] text-[13px] md:text-[14px]">
              <div className="px-4 py-3 font-semibold text-[12px] uppercase tracking-wide" style={{ color: 'var(--ink-4)', background: 'var(--surface-2)' }}>Tool</div>
              <div className="px-4 py-3 font-semibold text-right text-[12px] uppercase tracking-wide" style={{ color: 'var(--ink-4)', background: 'var(--surface-2)' }}>Monthly</div>
              <div className="px-4 py-3 font-semibold text-right text-[12px] uppercase tracking-wide" style={{ color: 'var(--ink-4)', background: 'var(--surface-2)' }}>Year 1</div>

              <div className="px-4 py-3.5 font-bold border-t flex items-center gap-2" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--pl-accent)' }} />
                Personalink Standard
              </div>
              <div className="px-4 py-3.5 border-t text-right font-bold" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
                {fmt(currency, TIER_PRICING.standard[currency].monthly)}
              </div>
              <div className="px-4 py-3.5 border-t text-right font-bold" style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}>
                {fmt(currency, TIER_PRICING.standard[currency].monthly * 12)}
              </div>

              <div className="px-4 py-3.5 border-t" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                Taplio Pro
              </div>
              <div className="px-4 py-3.5 border-t text-right" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                {fmt(currency, convertUsdTo(currency, TAPLIO_PRO_USD, usdInr))}
              </div>
              <div className="px-4 py-3.5 border-t text-right" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                {fmt(currency, convertUsdTo(currency, TAPLIO_PRO_USD * 12, usdInr))}
              </div>

              <div className="px-4 py-3.5 border-t" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                Kleo Lifetime
              </div>
              <div className="px-4 py-3.5 border-t text-right" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                {fmt(currency, convertUsdTo(currency, KLEO_LIFETIME_USD, usdInr))} once
              </div>
              <div className="px-4 py-3.5 border-t text-right" style={{ borderColor: 'var(--line)', color: 'var(--ink-3)' }}>
                {fmt(currency, convertUsdTo(currency, KLEO_LIFETIME_USD, usdInr))}
              </div>
            </div>
          </div>

          {/* Savings calculator */}
          {(() => {
            const plTier = pickPlTierForPosts(posts)
            const plMonthly = billing === 'annual'
              ? Math.round(TIER_PRICING[plTier][currency].annual / 12)
              : TIER_PRICING[plTier][currency].monthly
            const plYearly = billing === 'annual'
              ? TIER_PRICING[plTier][currency].annual
              : TIER_PRICING[plTier][currency].monthly * 12
            const taplioMonthlyUsd = pickTaplioMonthlyUsdForPosts(posts)
            const taplioYearly = convertUsdTo(currency, taplioMonthlyUsd * 12, usdInr)
            const kleoYearly = convertUsdTo(currency, KLEO_LIFETIME_USD, usdInr)
            const savedVsTaplio = taplioYearly - plYearly
            const savedVsKleo = kleoYearly - plYearly
            return (
              <div className="mt-6 rounded-2xl p-5 md:p-6 max-w-[760px] mx-auto" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5">
                  <label htmlFor="posts-range" className="text-[13px] font-semibold flex-shrink-0" style={{ color: 'var(--ink-3)' }}>
                    I publish about
                  </label>
                  <input
                    id="posts-range"
                    type="range"
                    min={3}
                    max={100}
                    value={posts}
                    onChange={e => setPosts(parseInt(e.target.value, 10))}
                    className="flex-1 accent-current"
                    style={{ accentColor: 'var(--pl-accent)' as string }}
                    aria-label="Posts per month"
                  />
                  <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                    {posts} posts/month
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl px-4 py-3" style={{ background: 'var(--surface-2)' }}>
                    <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--ink-4)' }}>vs Taplio</div>
                    {savedVsTaplio > 0 ? (
                      <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>
                        You save <span style={{ color: 'var(--pl-accent)' }}>{fmt(currency, savedVsTaplio)}</span>/year on {TIER_LABEL[plTier]}
                      </div>
                    ) : (
                      <div className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
                        Taplio is cheaper at this volume — but no GST credit or Hinglish.
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl px-4 py-3" style={{ background: 'var(--surface-2)' }}>
                    <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--ink-4)' }}>vs Kleo</div>
                    {savedVsKleo > 0 ? (
                      <div className="text-[15px] font-bold" style={{ color: 'var(--ink)' }}>
                        Year 1 alone: <span style={{ color: 'var(--pl-accent)' }}>{fmt(currency, savedVsKleo)}</span> more on Kleo
                      </div>
                    ) : (
                      <div className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
                        Kleo&apos;s one-time {fmt(currency, kleoYearly)} is cheaper than Standard&apos;s {fmt(currency, TIER_PRICING.standard[currency].monthly * 12)} in Year 1 — but it&apos;s a static toolkit that stops improving after purchase.
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-center mt-4 text-[11px]" style={{ color: 'var(--ink-4)' }}>
                  Personalink billed {billing} at {fmt(currency, plMonthly)}/mo. Competitor pricing converted from USD at current rate.
                </p>
              </div>
            )
          })()}
        </section>

        {/* ─── Trust strip ─── */}
        <section className="mt-16 md:mt-20">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-[920px] mx-auto">
            {[
              'Razorpay & Dodo secure payments',
              'GST invoices for Indian businesses',
              'LinkedIn ToS-safe API',
              '7-day free trial, no card needed',
              'Full data export, anytime',
              'Cancel in one click',
            ].map(chip => (
              <div
                key={chip}
                className="flex items-center gap-2 px-3 py-2 rounded-full text-[12.5px]"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink-3)' }}
              >
                <Check className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--pl-accent)' }} strokeWidth={2.5} />
                <span>{chip}</span>
              </div>
            ))}
            <Link
              href="/affiliate"
              className="flex items-center gap-2 px-3 py-2 rounded-full text-[12.5px] font-semibold transition-transform hover:scale-[1.03]"
              style={{ background: 'var(--pl-accent)', border: '1px solid var(--pl-accent)', color: '#fff' }}
            >
              <span>Earn 27.5% as an affiliate</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        <p className="text-center mt-10 text-[12px]" style={{ color: 'var(--ink-4)' }}>
          All paid plans include a 7-day free trial. Indian users billed in INR via Razorpay (GST invoice included). Everyone else billed via Dodo Payments.
        </p>
      </main>
    </div>
  )
}
