# Live USD:INR Exchange Rate — Design

**Date:** 2026-06-09
**Status:** Approved design, pending implementation plan
**Author:** Brainstormed with Hamza

## Goal

Replace the hardcoded USD→INR rate (`84`) with a single **live rate, refreshed weekly**,
driving every ₹ figure that is *derived from a USD price* — across customer-facing
marketing/comparison pages, the pricing page, the calculators, blog-post prose, **and**
the admin dashboard (MRR/affiliate).

## Decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| Freshness model | **Live runtime rate + weekly ISR** (not build-time bump) |
| Fetch mechanism | **Next-cached weekly fetch — no cron, no DB.** `fetch(..., { next: { revalidate: 604800 } })` is literally "fetched once a week." |
| Scope | **All USD-derived ₹**: pricing page, `/vs/*`, `/cheap-linkedin-ai-tool-india`, calculators, the ~18 hand-typed ₹ literals in blog/landing pages, **and** admin MRR/affiliate |
| Rate source | Free **keyless** API: `https://open.er-api.com/v6/latest/USD` → `rates.INR` |
| Out of scope | PersonaLink's ₹-native prices (`TIER_PRICING.INR`/`PL_PLANS`), affiliate **payout** ₹ amounts, narrative ₹ illustrations, and non-INR currency conversion paths (EUR/GBP constants unchanged) |

## Architecture

### `lib/fx.ts` — single source of truth (new)

```
FX_FALLBACK_USD_INR = 94            // used if the live fetch fails or is out of band
FX_API_URL = 'https://open.er-api.com/v6/latest/USD'
FX_MIN = 60, FX_MAX = 120           // sane-band validation

parseUsdInrRate(json: unknown): number | null   // pure: extract rates.INR, validate band, else null
getUsdInrRate(): Promise<number>                  // fetch w/ { next: { revalidate: 604800 } } → parse → fallback
inrFromUsd(usd: number, rate: number): number     // pure: Math.round(usd * rate)
```

- `getUsdInrRate()` is the only thing that touches the network. Weekly Next data-cache
  revalidation = the "once a week" fetch. On any failure (network, non-200, malformed,
  out-of-band) it returns `FX_FALLBACK_USD_INR` so pages never break.
- Existing `inr()` formatter (in `competitor-data.ts`) is reused for display.

### `app/api/fx-rate/route.ts` — client access (new)

`GET` → `{ usdInr: number }`. Calls `getUsdInrRate()`. Route segment revalidates weekly.
Consumed by the `'use client'` surfaces, which fall back to `FX_FALLBACK_USD_INR` while the
request is in flight.

### `lib/competitor-data.ts` — de-bake the rate (refactor)

Today ~14 values are computed at **import time** with `× USD_TO_INR`. Convert every
rate-derived export into a **function that takes `rate`** so nothing is baked at module load:

- Comparison rows, `headlineSavings`, and the FAQ answer strings → builder functions
  `buildComparison(slug, rate)` / `getCompetitor(slug, rate)` returning the same shapes.
- `calcYearOne(plan)` → `calcYearOne(plan, rate)`.
- Keep raw USD (`monthlyUsd`/`oneTimeUsd`) as the source of truth.
- Remove the exported `USD_TO_INR` constant; anything still needing a static default imports
  `FX_FALLBACK_USD_INR` from `lib/fx.ts`.

### Consumers

**Server / static pages → weekly ISR + async rate:**
`export const revalidate = 604800`; `const rate = await getUsdInrRate()`; render ₹ from `rate`.
Replace the **18 hand-typed ₹ literals** with `inrFromUsd(usd, rate)` using their known USD
amounts (inventory below). Affected: `app/vs/taplio` (+ any other `/vs/*`),
`app/cheap-linkedin-ai-tool-india`, `app/ai-linkedin-automation-tool`, and the blog pages
`best-taplio-alternatives`, `cheapest-ai-linkedin-tools-india`,
`best-ai-linkedin-post-generators-for-indian-professionals-2026`, plus any `features/*` page
citing a competitor ₹. (ISR keeps these SEO-fast: pre-rendered, cached, regenerated weekly.)

**Client components → fetch `/api/fx-rate`:**
- `app/pricing/page.tsx`: `convertUsdTo` uses the fetched rate instead of `CURRENCY_TO_INR.USD`
  for the INR path (fallback constant while loading).
- `components/comparison/SavingsCalculator.tsx`: replace the hardcoded `84`.
- `components/tools/CostCalculator.tsx`: pass the fetched rate into `calcYearOne(plan, rate)`.

**Admin (now in scope):**
- `app/admin/*` MRR/affiliate conversion uses the live rate (server-read `getUsdInrRate()` or
  client fetch — admin is auth-gated, so dynamic rendering is fine, no ISR needed).
- Replace the `CURRENCY_TO_INR.USD = 84` usage on the USD→INR path with the live rate.

### "Updated weekly" wording

Where pages currently say "exchange rate ₹84/USD" / "as of 2026" (e.g. SavingsCalculator
note, blog table footnotes), replace with a neutral "converted at the current rate, refreshed
weekly" note so the copy matches reality.

## USD-derived ₹ literal inventory (to replace with `inrFromUsd(usd, rate)`)

| File | ₹ literal(s) → USD source |
| --- | --- |
| `app/cheap-linkedin-ai-tool-india/page.tsx` | ₹1,596 ($19), ₹3,276 ($39), ₹8,316 once ($99) |
| `app/blog/best-taplio-alternatives/page.tsx` | ₹1,596 ($19), ₹1,676 ($19.95), ₹8,316 ($99), ₹1,260 ($15), ₹1,764 ($21) |
| `app/blog/cheapest-ai-linkedin-tools-india/page.tsx` | ₹1,259 ($14.99), ₹1,260 ($15), ₹1,596 ($19), ₹3,276 ($39), ₹8,316 ($99) + inline ₹1,596 / ₹3,276 |
| `app/blog/best-ai-linkedin-post-generators-...-2026/page.tsx` | ₹5,700+ ($69+) |

Computed sites that update automatically once `competitor-data.ts` is rate-parameterized:
`lib/competitor-data.ts` (lines ~142,145–147,170,239,331,334–335,360,443–444),
`app/pricing/page.tsx` (Taplio/Kleo rows + savings box), the two calculators.

## Fallback, validation, error handling

- Fetch wrapped; non-200 / timeout / malformed JSON / `rates.INR` missing or outside
  60–120 → `FX_FALLBACK_USD_INR`. Log once server-side.
- The fallback (94) is a recent, realistic rate, so worst case is a slightly-stale-but-sane
  price — never a broken page or an absurd value.

## Testing

- `lib/__tests__/fx.test.ts` (node): `parseUsdInrRate` (valid; out-of-band high/low → null;
  missing `rates.INR` → null; malformed → null), `inrFromUsd` rounding.
- `lib/__tests__/competitor-data.test.ts`: a couple of builder functions return expected ₹
  for a given rate (e.g. Taplio Pro at rate 85 → ₹5,525/mo).
- Manual: run app — pricing/vs/blog/admin show the live rate; simulate fetch failure →
  fallback renders; confirm ISR pages carry `revalidate`.

## Fold-in

The staged **Standard/Kleo pricing-table copy fix** (`app/pricing/page.tsx`: Pro→Standard row
+ Kleo line anchored on Standard) ships on this branch as part of the work.
