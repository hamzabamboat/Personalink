# Live USD:INR Rate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded USD→INR rate (84) with one live rate, fetched at most once a week, driving every USD-derived ₹ figure across pricing, comparison pages, calculators, blog prose, and admin MRR.

**Architecture:** A single `lib/fx.ts` exposes `getUsdInrRate()` — a `fetch` cached weekly via Next's data cache (no cron, no DB), with validation + an `FX_FALLBACK_USD_INR = 94` fallback. Server pages `await` it and become weekly ISR; client components read it from a new `/api/fx-rate` route. `lib/competitor-data.ts` is de-baked: rate-derived values become functions of `rate`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, vitest (node env). No new dependencies.

---

## Testing reality

`vitest.config.ts` is node-only (`lib/__tests__/**/*.test.ts`). So: **pure logic is unit-tested** (`parseUsdInrRate`, `inrFromUsd`, the rate-parameterized competitor builders); React/route/ISR wiring is **type-checked** (`npx tsc --noEmit`) and **verified by running the app**. Type-check command: `npx tsc --noEmit` (expect exit 0, no output).

## File structure

**Create**
- `lib/fx.ts` — rate source: `FX_FALLBACK_USD_INR`, `parseUsdInrRate`, `inrFromUsd`, `getUsdInrRate`.
- `lib/__tests__/fx.test.ts`
- `app/api/fx-rate/route.ts` — GET `{ usdInr }` for client components.
- `lib/__tests__/competitor-data.test.ts`

**Modify**
- `lib/competitor-data.ts` — de-bake to rate-parameterized factories.
- `app/pricing/page.tsx` — `convertUsdTo` takes the live rate; fetch it; (also commit the already-staged Standard/Kleo copy fix).
- `components/tools/CostCalculator.tsx`, `components/comparison/SavingsCalculator.tsx` — fetch rate, pass into `getCompetitor`/`calcYearOne`.
- `app/vs/taplio/page.tsx`, `app/vs/kleo/page.tsx`, `app/vs/supergrow/page.tsx` — ISR + `getCompetitor(slug, rate)`.
- `app/cheap-linkedin-ai-tool-india/page.tsx`, `app/ai-linkedin-automation-tool/page.tsx` — ISR + replace ₹ literals.
- `app/blog/best-taplio-alternatives/page.tsx`, `app/blog/cheapest-ai-linkedin-tools-india/page.tsx`, `app/blog/best-ai-linkedin-post-generators-for-indian-professionals-2026/page.tsx` — ISR + replace ₹ literals.
- Admin MRR/affiliate USD→INR conversion → live rate.

---

## Task 1: FX rate core

**Files:** Create `lib/fx.ts`, `lib/__tests__/fx.test.ts`

- [ ] **Step 1: Write the failing test** — `lib/__tests__/fx.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseUsdInrRate, inrFromUsd, FX_FALLBACK_USD_INR } from '@/lib/fx'

describe('parseUsdInrRate', () => {
  it('extracts a valid INR rate', () => {
    expect(parseUsdInrRate({ rates: { INR: 85.2 } })).toBe(85.2)
  })
  it('rejects out-of-band (too high)', () => {
    expect(parseUsdInrRate({ rates: { INR: 5000 } })).toBeNull()
  })
  it('rejects out-of-band (too low)', () => {
    expect(parseUsdInrRate({ rates: { INR: 10 } })).toBeNull()
  })
  it('rejects missing INR', () => {
    expect(parseUsdInrRate({ rates: { EUR: 0.9 } })).toBeNull()
  })
  it('rejects malformed payloads', () => {
    expect(parseUsdInrRate(null)).toBeNull()
    expect(parseUsdInrRate('nope')).toBeNull()
    expect(parseUsdInrRate({})).toBeNull()
    expect(parseUsdInrRate({ rates: { INR: 'x' } })).toBeNull()
  })
})

describe('inrFromUsd', () => {
  it('rounds to whole rupees', () => {
    expect(inrFromUsd(39, 85)).toBe(3315)
    expect(inrFromUsd(19, 84.4)).toBe(1604) // 1603.6 → 1604
  })
})

describe('FX_FALLBACK_USD_INR', () => {
  it('is a sane recent default', () => {
    expect(FX_FALLBACK_USD_INR).toBe(94)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/fx.test.ts`
Expected: FAIL — cannot find module `@/lib/fx`.

- [ ] **Step 3: Write the implementation** — `lib/fx.ts`:

```ts
// Single source of truth for the live USD→INR exchange rate.
// `getUsdInrRate()` is fetched at most once a week via Next's data cache
// (no cron, no DB). Call it ONLY server-side; client components read /api/fx-rate.

export const FX_FALLBACK_USD_INR = 94
const FX_API_URL = 'https://open.er-api.com/v6/latest/USD'
const FX_MIN = 60
const FX_MAX = 120
const WEEK_SECONDS = 60 * 60 * 24 * 7

/** Extract + validate the USD→INR rate from the open.er-api.com payload. Null if absent/garbage. */
export function parseUsdInrRate(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const rates = (payload as { rates?: Record<string, unknown> }).rates
  const inr = rates?.INR
  if (typeof inr !== 'number' || !Number.isFinite(inr)) return null
  if (inr < FX_MIN || inr > FX_MAX) return null
  return inr
}

/** Round a USD amount to whole INR at the given rate. */
export function inrFromUsd(usd: number, rate: number): number {
  return Math.round(usd * rate)
}

/** Live USD→INR rate. Cached ~weekly by Next; falls back to FX_FALLBACK_USD_INR on any failure. */
export async function getUsdInrRate(): Promise<number> {
  try {
    const res = await fetch(FX_API_URL, { next: { revalidate: WEEK_SECONDS } })
    if (!res.ok) return FX_FALLBACK_USD_INR
    const json: unknown = await res.json()
    return parseUsdInrRate(json) ?? FX_FALLBACK_USD_INR
  } catch {
    return FX_FALLBACK_USD_INR
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/fx.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/fx.ts lib/__tests__/fx.test.ts
git commit -m "feat(fx): live USD:INR rate source with weekly cache + fallback

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `/api/fx-rate` route

**Files:** Create `app/api/fx-rate/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from 'next/server'
import { getUsdInrRate } from '@/lib/fx'

// Weekly-revalidated public rate for client components (pricing page, calculators).
export const revalidate = 604800

export async function GET() {
  const usdInr = await getUsdInrRate()
  return NextResponse.json({ usdInr })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/api/fx-rate/route.ts
git commit -m "feat(fx): add GET /api/fx-rate for client components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: De-bake `lib/competitor-data.ts`

Turn the import-time `× USD_TO_INR` computations into functions of `rate`. The competitor `plans` (raw USD) become a shared static export so rate-free consumers (pricing page) can read them.

**Files:** Modify `lib/competitor-data.ts`; Create `lib/__tests__/competitor-data.test.ts`

- [ ] **Step 1: Write the failing test** — `lib/__tests__/competitor-data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getCompetitor, getAllCompetitors, calcYearOne, COMPETITOR_PLANS, COMPETITOR_SLUGS } from '@/lib/competitor-data'

describe('rate-parameterized competitor data', () => {
  it('taplio mid-tier price row reflects the rate', () => {
    const t = getCompetitor('taplio', 85)
    const row = t.features.find(f => f.label === 'Mid-tier monthly price')!
    expect(String(row.competitor)).toContain('₹5,525') // 65 * 85
  })
  it('a different rate yields a different ₹', () => {
    const row = getCompetitor('taplio', 90).features.find(f => f.label === 'Mid-tier monthly price')!
    expect(String(row.competitor)).toContain('₹5,850') // 65 * 90
  })
  it('calcYearOne uses the live rate for lifetime competitors', () => {
    const kleo = getCompetitor('kleo', 90)
    expect(calcYearOne(kleo, 10, 90).competitor.yearOneInr).toBe(8910) // 99 * 90
  })
  it('calcYearOne uses the live rate for recurring competitors', () => {
    const sg = getCompetitor('supergrow', 80)
    // Solo $19/mo covers 30 posts → 19*80*12
    expect(calcYearOne(sg, 10, 80).competitor.yearOneInr).toBe(18240)
  })
  it('plans are rate-independent raw USD', () => {
    expect(COMPETITOR_PLANS.taplio.find(p => p.name === 'Pro')?.monthlyUsd).toBe(65)
    expect(COMPETITOR_PLANS.kleo[0].oneTimeUsd).toBe(99)
  })
  it('getAllCompetitors returns all slugs', () => {
    expect(getAllCompetitors(85).map(c => c.slug).sort()).toEqual([...COMPETITOR_SLUGS].sort())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/competitor-data.test.ts`
Expected: FAIL — `getCompetitor`/`COMPETITOR_PLANS` not exported.

- [ ] **Step 3: Refactor `lib/competitor-data.ts`**

Apply these exact changes (everything else in the file stays byte-for-byte):

1. **Delete** line 12: `export const USD_TO_INR = 84`.

2. **Add** (just below the `inr` helper at line 96) the shared raw-USD plans + slug list:

```ts
export type CompetitorSlug = Competitor['slug']
export const COMPETITOR_SLUGS: CompetitorSlug[] = ['taplio', 'kleo', 'supergrow']

/** Raw USD plans — rate-independent, the source of truth for prices. */
export const COMPETITOR_PLANS: Record<CompetitorSlug, CompetitorPlan[]> = {
  taplio: [
    { name: 'Standard', monthlyUsd: 39, postBudget: 30, seats: 1 },
    { name: 'Pro', monthlyUsd: 65, postBudget: 90, seats: 1 },
    { name: 'Agency', monthlyUsd: 199, postBudget: 300, seats: 5 },
  ],
  kleo: [
    { name: 'Lifetime', monthlyUsd: null, oneTimeUsd: 99, postBudget: 999, seats: 1 },
  ],
  supergrow: [
    { name: 'Solo', monthlyUsd: 19, postBudget: 30, seats: 1 },
    { name: 'Pro', monthlyUsd: 39, postBudget: 90, seats: 1 },
  ],
}
```

3. **Wrap each competitor object literal in a factory** taking `rate`, and reference the shared plans:
   - `const taplio: Competitor = {` → `function buildTaplio(rate: number): Competitor {\n  return {` … and a matching `  }\n}` at its closing brace. Inside, set `plans: COMPETITOR_PLANS.taplio,` (replacing the inline array) and replace every `USD_TO_INR` with `rate`.
   - Same for `const kleo` → `function buildKleo(rate: number)` (`plans: COMPETITOR_PLANS.kleo`), and `const supergrow` → `function buildSupergrow(rate: number)` (`plans: COMPETITOR_PLANS.supergrow`).
   - The `USD_TO_INR`→`rate` occurrences to change: in taplio `hero.headlineSavings` and the 3 price feature rows + the first FAQ answer (2 uses); in kleo the "Entry price" feature row (1 use); in supergrow `hero.headlineSavings`, the 2 price rows, and the first FAQ answer (2 uses).

4. **Replace** the old `COMPETITORS` registry block (the `export const COMPETITORS = { taplio, kleo, supergrow } as const` and the now-duplicate `CompetitorSlug`/`COMPETITOR_SLUGS` lines) with the accessors:

```ts
export function getCompetitor(slug: CompetitorSlug, rate: number): Competitor {
  switch (slug) {
    case 'taplio': return buildTaplio(rate)
    case 'kleo': return buildKleo(rate)
    case 'supergrow': return buildSupergrow(rate)
  }
}

export function getAllCompetitors(rate: number): Competitor[] {
  return COMPETITOR_SLUGS.map(s => getCompetitor(s, rate))
}
```

5. **Update `calcYearOne`** signature + body (lines ~436–444):

```ts
export function calcYearOne(competitor: Competitor, postsPerMonth: number, rate: number): YearOneBreakdown {
  const plId = pickPlPlanFor(postsPerMonth)
  const plMonthly = PL_PLANS[plId].inr
  const plYear = plMonthly * 12

  const cPlan = pickCompetitorPlanFor(competitor, postsPerMonth)
  const cYear = competitor.pricingModel === 'lifetime'
    ? (cPlan.oneTimeUsd ?? 0) * rate
    : (cPlan.monthlyUsd ?? 0) * rate * 12
  // ...rest of the return block is unchanged...
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run lib/__tests__/competitor-data.test.ts && npx tsc --noEmit`
Expected: 6 tests PASS; tsc clean. (tsc will now flag the consumers in Tasks 4–9 that still import `COMPETITORS` / call the old `calcYearOne` — that's expected; those are fixed next. If tsc noise blocks, proceed to Task 4 and re-run tsc after each consumer task.)

- [ ] **Step 5: Commit**

```bash
git add lib/competitor-data.ts lib/__tests__/competitor-data.test.ts
git commit -m "refactor(fx): rate-parameterize competitor-data (getCompetitor/calcYearOne take rate)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Pricing page (+ commit the staged copy fix)

**Files:** Modify `app/pricing/page.tsx`

The working tree already contains the **approved Standard/Kleo copy edit** (Pro→Standard table row + Kleo line). This task commits it and wires the live rate.

- [ ] **Step 1: Commit the already-staged copy fix first**

```bash
git add app/pricing/page.tsx
git commit -m "feat(pricing): comparison table shows Standard; Kleo line anchored on Standard

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 2: Change `convertUsdTo` to take the live rate** (lines 59–63):

```ts
function convertUsdTo(currency: Currency, usd: number, usdInr: number): number {
  if (currency === 'USD') return usd
  const inr = usd * usdInr
  return Math.round(inr / CURRENCY_TO_INR[currency])
}
```

- [ ] **Step 3: Swap the `COMPETITORS` import for the static plans + fetch the rate**

- Replace the import `import { COMPETITORS } from '@/lib/competitor-data'` with `import { COMPETITOR_PLANS } from '@/lib/competitor-data'`.
- Replace lines 21–22 with:
```ts
const TAPLIO_PRO_USD = COMPETITOR_PLANS.taplio.find(p => p.name === 'Pro')?.monthlyUsd ?? 65
const KLEO_LIFETIME_USD = COMPETITOR_PLANS.kleo[0].oneTimeUsd ?? 99
```
- Inside the `PricingPage` component, add a rate state seeded with the fallback and fetched on mount:
```ts
import { FX_FALLBACK_USD_INR } from '@/lib/fx'
// ...inside component:
const [usdInr, setUsdInr] = useState(FX_FALLBACK_USD_INR)
useEffect(() => {
  fetch('/api/fx-rate').then(r => r.json()).then(d => { if (typeof d?.usdInr === 'number') setUsdInr(d.usdInr) }).catch(() => {})
}, [])
```
- Update every `convertUsdTo(currency, X)` call in the file to `convertUsdTo(currency, X, usdInr)` (the Taplio/Kleo table rows ~321–334 and the savings-box block ~349–350).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/pricing/page.tsx
git commit -m "feat(fx): pricing page converts competitor USD at the live rate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Calculators (CostCalculator + SavingsCalculator)

Both are `'use client'` and call `calcYearOne` synchronously. Make them fetch the rate and thread it through.

**Files:** Modify `components/tools/CostCalculator.tsx`, `components/comparison/SavingsCalculator.tsx`

- [ ] **Step 1: CostCalculator** — replace its imports + the body lines 9–12:

```tsx
import { useEffect, useState } from 'react'
import { getCompetitor, COMPETITOR_SLUGS, calcYearOne, inr, type CompetitorSlug } from '@/lib/competitor-data'
import { FX_FALLBACK_USD_INR } from '@/lib/fx'
// ...
  const [slug, setSlug] = useState<CompetitorSlug>('taplio')
  const [posts, setPosts] = useState(22)
  const [usdInr, setUsdInr] = useState(FX_FALLBACK_USD_INR)
  useEffect(() => {
    fetch('/api/fx-rate').then(r => r.json()).then(d => { if (typeof d?.usdInr === 'number') setUsdInr(d.usdInr) }).catch(() => {})
  }, [])
  const c = getCompetitor(slug, usdInr)
  const r = calcYearOne(c, posts, usdInr)
```
- The selector buttons use `COMPETITORS[s].name`; replace with `getCompetitor(s, usdInr).name` (or, cheaper, a name lookup — but `getCompetitor(s, usdInr).name` is fine).
- Update the footnote (line ~58) text "(≈₹84/USD)" → "(at the current rate, refreshed weekly)".

- [ ] **Step 2: SavingsCalculator** — read `components/comparison/SavingsCalculator.tsx`. It currently hardcodes `84` (lines ~30–31) and calls `calcYearOne`/uses competitor data. Apply the same pattern: add `usdInr` state seeded from `FX_FALLBACK_USD_INR`, fetch `/api/fx-rate` on mount, replace every hardcoded `84` and `calcYearOne(..., posts)` with the rate (`calcYearOne(comp, posts, usdInr)`, `getCompetitor(slug, usdInr)`), and update the "₹84/USD" note (line ~131) to "current rate, refreshed weekly".

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/tools/CostCalculator.tsx components/comparison/SavingsCalculator.tsx
git commit -m "feat(fx): calculators use the live USD:INR rate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: `/vs/*` comparison pages (ISR + live rate)

**Files:** Modify `app/vs/taplio/page.tsx`, `app/vs/kleo/page.tsx`, `app/vs/supergrow/page.tsx`

Each page currently imports `COMPETITORS` and reads `COMPETITORS.<slug>`. For EACH page:

- [ ] **Step 1: Read the page**, then make it ISR + rate-driven:
  - Add at top level (module scope): `export const revalidate = 604800`.
  - Make the default export `async`.
  - Replace `import { COMPETITORS } from '@/lib/competitor-data'` with `import { getCompetitor } from '@/lib/competitor-data'` and `import { getUsdInrRate } from '@/lib/fx'`.
  - At the start of the component body: `const competitor = getCompetitor('<slug>', await getUsdInrRate())` and use `competitor` wherever `COMPETITORS.<slug>` was used.
  - If the page reads `COMPETITORS.<slug>.plans` only, that's fine via `competitor.plans`.
  - Repeat for `kleo` and `supergrow` (identical pattern, different slug).

- [ ] **Step 2: Type-check** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/vs/taplio/page.tsx app/vs/kleo/page.tsx app/vs/supergrow/page.tsx
git commit -m "feat(fx): /vs pages render competitor prices at the live rate (weekly ISR)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Landing pages with ₹ literals

**Files:** Modify `app/cheap-linkedin-ai-tool-india/page.tsx`, `app/ai-linkedin-automation-tool/page.tsx`

- [ ] **Step 1: `cheap-linkedin-ai-tool-india`** — make it ISR + async (`export const revalidate = 604800`; `const rate = await getUsdInrRate()`; import `getUsdInrRate` from `@/lib/fx` and `inrFromUsd` from `@/lib/fx`). In the `RIVALS` array (lines ~50–52) replace the hand-typed ₹ with computed values:
  - `'≈ ₹1,596 / mo'` → `` `≈ ${inr(inrFromUsd(19, rate))} / mo` `` ($19)
  - `'≈ ₹3,276 / mo'` → `` `≈ ${inr(inrFromUsd(39, rate))} / mo` `` ($39)
  - `'≈ ₹8,316 once'` → `` `≈ ${inr(inrFromUsd(99, rate))} once` `` ($99)
  (`inr` is exported from `@/lib/competitor-data`. If `RIVALS` is a module-scope const, move it inside the async component so it can read `rate`.) Update the "≈ ₹84/USD" comment (line ~39) to "current rate, refreshed weekly".

- [ ] **Step 2: `ai-linkedin-automation-tool`** — read the page; if it cites competitor ₹ derived from USD, apply the same ISR + `inrFromUsd(usd, rate)` treatment. If it has none, leave it (note that in your report).

- [ ] **Step 3: Type-check** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/cheap-linkedin-ai-tool-india/page.tsx app/ai-linkedin-automation-tool/page.tsx
git commit -m "feat(fx): landing pages compute competitor ₹ from the live rate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Blog pages with ₹ literals

**Files:** Modify `app/blog/best-taplio-alternatives/page.tsx`, `app/blog/cheapest-ai-linkedin-tools-india/page.tsx`, `app/blog/best-ai-linkedin-post-generators-for-indian-professionals-2026/page.tsx`

For each: add `export const revalidate = 604800`, make the default export `async`, `const rate = await getUsdInrRate()` (import `getUsdInrRate`, `inrFromUsd` from `@/lib/fx`; `inr` from `@/lib/competitor-data`), and replace the literals (move any module-scope data array used for these into the component so it can read `rate`):

- [ ] **Step 1: `best-taplio-alternatives`** (ALTS table, lines ~46–50):
  - ₹1,596 ($19) → `inr(inrFromUsd(19, rate))`
  - ₹1,676 ($19.95) → `inr(inrFromUsd(19.95, rate))`
  - ₹8,316 ($99) → `inr(inrFromUsd(99, rate))`
  - ₹1,260 ($15) → `inr(inrFromUsd(15, rate))`
  - ₹1,764 ($21) → `inr(inrFromUsd(21, rate))`
  - Update the "≈ ₹84/USD" note (line ~87) → "current rate, refreshed weekly".

- [ ] **Step 2: `cheapest-ai-linkedin-tools-india`** (TABLE lines ~44–48 + inline ~284/291):
  - ₹1,259 ($14.99) → `inr(inrFromUsd(14.99, rate))`
  - ₹1,260 ($15) → `inr(inrFromUsd(15, rate))`
  - ₹1,596 ($19) → `inr(inrFromUsd(19, rate))`
  - ₹3,276 ($39) → `inr(inrFromUsd(39, rate))`
  - ₹8,316 ($99) → `inr(inrFromUsd(99, rate))`
  - inline ₹1,596 (~line 284, $19) and ₹3,276 (~line 291, $39) → same.
  - Update the "≈ ₹84/USD" notes (lines ~67, ~205) → "current rate, refreshed weekly".

- [ ] **Step 3: `best-ai-linkedin-post-generators-...-2026`** (line ~107): `'₹5,700+'` ($69+) → `` `${inr(inrFromUsd(69, rate))}+` ``.

- [ ] **Step 4: Type-check** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/blog/best-taplio-alternatives/page.tsx app/blog/cheapest-ai-linkedin-tools-india/page.tsx app/blog/best-ai-linkedin-post-generators-for-indian-professionals-2026/page.tsx
git commit -m "feat(fx): blog competitor ₹ figures compute from the live rate (weekly ISR)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Admin MRR/affiliate on the live rate

**Files:** Modify the admin files that use `CURRENCY_TO_INR.USD` for USD→INR (per recon: `app/admin/page.tsx` and/or `app/admin/affiliates/page.tsx`)

- [ ] **Step 1: Read those admin files.** Wherever a USD amount is converted to INR via `CURRENCY_TO_INR.USD` (the `84`), replace that multiplier with the live rate:
  - If the admin page is a **server component**: `const usdInr = await getUsdInrRate()` (import from `@/lib/fx`; make the component async) and multiply by `usdInr`. Admin pages need NOT be ISR — they can render dynamically (`export const dynamic = 'force-dynamic'` is fine since they're auth-gated).
  - If **client**: fetch `/api/fx-rate` (same pattern as Task 5) and use the fetched rate.
  - Leave `CURRENCY_TO_INR` itself in place for GBP/EUR/INR conversions; only the USD→INR multiplier moves to the live rate.

- [ ] **Step 2: Type-check** — `npx tsc --noEmit` → exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/admin
git commit -m "feat(fx): admin MRR/affiliate USD→INR uses the live rate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Full verification

- [ ] **Step 1: Test + type-check + build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all tests pass (incl. fx + competitor-data suites), tsc clean, build succeeds. The build also confirms no remaining references to the removed `USD_TO_INR` / old `COMPETITORS` export.

- [ ] **Step 2: Grep for stragglers**

Run: `grep -rn "USD_TO_INR\|COMPETITORS\b\|CURRENCY_TO_INR.USD\|₹84" app components lib | grep -v __tests__ | grep -v node_modules`
Expected: no remaining USES of the removed symbols; any ₹84 left should only be the `FX_FALLBACK_USD_INR`/`CURRENCY_TO_INR.USD` definition lines, not consumers. Fix anything outstanding.

- [ ] **Step 3: Manual run**

Run the app; on `/pricing`, `/vs/taplio`, a blog page, and admin: confirm competitor ₹ reflect the live rate (≠ old 84-based values when the live rate differs). Temporarily point `FX_API_URL` at a bad URL to confirm the fallback (94) renders without breakage, then revert.

---

## Self-review (completed during planning)

- **Spec coverage:** single rate source + no-cron weekly fetch (Task 1); client access (Task 2); de-bake competitor-data (Task 3); pricing page incl. copy fix fold-in (Task 4); calculators (Task 5); /vs ISR (Task 6); landing + blog literals with USD mapping (Tasks 7–8); admin live rate (Task 9); fallback/validation (Task 1 + verified Task 10); ISR on static pages (Tasks 6–8). ✓
- **Type consistency:** `getUsdInrRate`/`parseUsdInrRate`/`inrFromUsd`/`FX_FALLBACK_USD_INR`, `getCompetitor(slug, rate)`, `calcYearOne(competitor, posts, rate)`, `COMPETITOR_PLANS`, `convertUsdTo(currency, usd, usdInr)` are used consistently across tasks. ✓
- **Placeholders:** none — core/refactor have complete code; consumer tasks give exact targets + the literal→USD mapping. The "read the file then apply this exact transformation" steps are concrete (mechanism + targets specified), not vague. ✓
