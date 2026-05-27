/**
 * One-shot: update name + description on every Dodo product so the
 * checkout copy reflects the new tier post quotas. Reads product IDs
 * from env vars (the same ones lib/pricing-config.ts resolves).
 *
 * Run with: npx tsx --env-file=.env.local scripts/update-dodo-descriptions.ts
 */

import 'dotenv/config'
import DodoPayments from 'dodopayments'

type PaidTier = 'starter' | 'standard' | 'pro'
type Currency = 'USD' | 'EUR' | 'GBP'
type Period = 'monthly' | 'annual'

const CURRENCY_TAG: Record<Currency, string> = { USD: 'USD', EUR: 'EUR', GBP: 'GBP' }

function nameFor(tier: PaidTier, currency: Currency, period: Period): string {
  const tierName = tier[0].toUpperCase() + tier.slice(1)
  const periodTag = period === 'annual' ? 'Annual' : 'Monthly'
  return `PersonaLink ${tierName} — ${periodTag} ${CURRENCY_TAG[currency]}`
}

function descriptionFor(tier: PaidTier, period: Period): string {
  const annualSuffix = period === 'annual' ? ' Save 25% paying yearly.' : ''
  switch (tier) {
    case 'starter':
      return `12 LinkedIn posts/month in your voice. Scheduling. No watermark.${annualSuffix} Includes 7-day free trial.`
    case 'standard':
      return `22 posts/month · 3 voice fingerprints · carousel generator · Hinglish + WhatsApp delivery.${annualSuffix} Includes 7-day free trial.`
    case 'pro':
      return `50 posts/month · unlimited voice fingerprints · priority queue · Zapier + API · repurpose engine.${annualSuffix} Includes 7-day free trial.`
  }
}

const ENV_MAP: Array<{ tier: PaidTier; currency: Currency; period: Period; envVar: string }> = [
  // Monthly
  { tier: 'starter',  currency: 'USD', period: 'monthly', envVar: 'DODO_PRODUCT_STARTER_USD' },
  { tier: 'starter',  currency: 'EUR', period: 'monthly', envVar: 'DODO_PRODUCT_STARTER_EUR' },
  { tier: 'starter',  currency: 'GBP', period: 'monthly', envVar: 'DODO_PRODUCT_STARTER_GBP' },
  { tier: 'standard', currency: 'USD', period: 'monthly', envVar: 'DODO_PRODUCT_STANDARD_USD' },
  { tier: 'standard', currency: 'EUR', period: 'monthly', envVar: 'DODO_PRODUCT_STANDARD_EUR' },
  { tier: 'standard', currency: 'GBP', period: 'monthly', envVar: 'DODO_PRODUCT_STANDARD_GBP' },
  { tier: 'pro',      currency: 'USD', period: 'monthly', envVar: 'DODO_PRODUCT_PRO_USD' },
  { tier: 'pro',      currency: 'EUR', period: 'monthly', envVar: 'DODO_PRODUCT_PRO_EUR' },
  { tier: 'pro',      currency: 'GBP', period: 'monthly', envVar: 'DODO_PRODUCT_PRO_GBP' },
  // Annual
  { tier: 'starter',  currency: 'USD', period: 'annual', envVar: 'DODO_PRODUCT_STARTER_USD_ANNUAL' },
  { tier: 'starter',  currency: 'EUR', period: 'annual', envVar: 'DODO_PRODUCT_STARTER_EUR_ANNUAL' },
  { tier: 'starter',  currency: 'GBP', period: 'annual', envVar: 'DODO_PRODUCT_STARTER_GBP_ANNUAL' },
  { tier: 'standard', currency: 'USD', period: 'annual', envVar: 'DODO_PRODUCT_STANDARD_USD_ANNUAL' },
  { tier: 'standard', currency: 'EUR', period: 'annual', envVar: 'DODO_PRODUCT_STANDARD_EUR_ANNUAL' },
  { tier: 'standard', currency: 'GBP', period: 'annual', envVar: 'DODO_PRODUCT_STANDARD_GBP_ANNUAL' },
  { tier: 'pro',      currency: 'USD', period: 'annual', envVar: 'DODO_PRODUCT_PRO_USD_ANNUAL' },
  { tier: 'pro',      currency: 'EUR', period: 'annual', envVar: 'DODO_PRODUCT_PRO_EUR_ANNUAL' },
  { tier: 'pro',      currency: 'GBP', period: 'annual', envVar: 'DODO_PRODUCT_PRO_GBP_ANNUAL' },
]

async function main() {
  const dd = new DodoPayments({
    bearerToken: process.env.DODO_API_KEY!,
    environment: (process.env.DODO_ENVIRONMENT as 'live_mode' | 'test_mode') ?? 'live_mode',
  })

  console.log(`Dodo env: ${process.env.DODO_ENVIRONMENT ?? 'live_mode'} · updating ${ENV_MAP.length} products\n`)

  let ok = 0
  let fail = 0
  let skip = 0

  for (const row of ENV_MAP) {
    const productId = process.env[row.envVar]
    if (!productId) {
      console.log(`[skip] ${row.envVar} not set`)
      skip++
      continue
    }

    const newName = nameFor(row.tier, row.currency, row.period)
    const newDescription = descriptionFor(row.tier, row.period)

    try {
      const before = await dd.products.retrieve(productId)
      // The Dodo SDK update method accepts the same shape as create (partial)
      await dd.products.update(productId, {
        name: newName,
        description: newDescription,
      } as Parameters<typeof dd.products.update>[1])

      const after = await dd.products.retrieve(productId)
      console.log(`[ok] ${row.tier} ${row.currency} ${row.period} (${productId})`)
      if (before.name !== after.name) console.log(`     name:        "${before.name}" → "${after.name}"`)
      if (before.description !== after.description) console.log(`     description: ${JSON.stringify(before.description)} → ${JSON.stringify(after.description)}`)
      ok++
    } catch (err) {
      const e = err as { message?: string; status?: number; error?: unknown }
      console.error(`[fail] ${row.tier} ${row.currency} ${row.period} (${productId}):`, e.message ?? e.error ?? err)
      fail++
    }
  }

  console.log(`\nDone — ${ok} updated · ${fail} failed · ${skip} skipped`)
}

main().then(() => process.exit(0)).catch(err => {
  console.error('fatal:', err)
  process.exit(1)
})
