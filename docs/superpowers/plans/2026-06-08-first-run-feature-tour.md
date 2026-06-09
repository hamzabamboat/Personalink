# First-Run Feature Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auto-starting, spotlight-style guided tour that walks a first-time user through the dashboard's core features (Generate → Posts → Calendar → Analytics → Trending ideas → Voice), navigating into each real screen.

**Architecture:** A small custom tour engine. Pure logic (step config, plan-gating, card positioning) lives in `lib/tour/` and is unit-tested in node (the project's test env). The React layer (`components/tour/`) — a context provider that drives navigation + measures targets, and an overlay that renders the dim/spotlight/coach-card with framer-motion — is verified by running the app. State persists to a new `user_profiles.tour_completed_at` column.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, framer-motion (already installed), Supabase (`supabaseAdmin`), vitest (node env), Tailwind + CSS-variable design tokens.

---

## Testing reality (read first)

`vitest.config.ts` uses `environment: 'node'` and only includes `lib/__tests__/**/*.test.ts`. There is **no React/DOM test harness**. So:

- **Unit-tested (TDD):** everything in `lib/tour/` — pure functions over plain data.
- **Type-checked:** run `npx tsc --noEmit` after React/route changes (fast, no DOM needed).
- **Manually verified:** the provider, overlay, layout wiring, and `data-tour` attributes — via Task 11's runbook.

Type-check command used throughout: `npx tsc --noEmit` (expect: no output, exit 0).

## File structure

**Create**
- `lib/tour/steps.ts` — `TourStep` type + `TOUR_STEPS` config (single source of truth).
- `lib/tour/gating.ts` — `isStepLocked`, `resolveStepView`, `shouldNavigate` (plan-aware, pure).
- `lib/tour/positioning.ts` — `computeCardPosition` (pure geometry).
- `lib/__tests__/tour-steps.test.ts`, `lib/__tests__/tour-gating.test.ts`, `lib/__tests__/tour-positioning.test.ts`.
- `components/tour/tour-context.ts` — `TourContext` + `useTour()` hook + `TourContextValue` type.
- `components/tour/TourProvider.tsx` — state machine, navigation, target measuring, persistence.
- `components/tour/TourOverlay.tsx` — dim + spotlight + coach card (framer-motion).
- `app/api/me/tour/route.ts` — POST sets `tour_completed_at`.
- `supabase/migrations/20260608_add_tour_completed_at.sql` — schema.

**Modify**
- `lib/supabase.ts` — add `tour_completed_at` to `UserProfile`.
- `app/dashboard/layout.tsx` — mount provider+overlay, auto-start, "Replay tour" menu item.
- 6 dashboard pages — add one `data-tour` attribute each.

---

## Task 1: Database migration + UserProfile type

**Files:**
- Create: `supabase/migrations/20260608_add_tour_completed_at.sql`
- Modify: `lib/supabase.ts` (UserProfile type, after `onboarding_completed_at`)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260608_add_tour_completed_at.sql`:

```sql
-- First-run feature tour: track when a user finished or skipped the tour.
-- NULL = never seen (eligible for auto-start). Non-NULL = don't auto-start.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;
```

- [ ] **Step 2: Apply the migration**

Run it against the dev/linked Supabase DB the same way other migrations in this repo are applied (e.g. via the Supabase SQL editor or CLI). If unsure, paste the SQL into the Supabase dashboard SQL editor for this project and run it. Confirm the column exists:

Run (SQL editor): `select column_name from information_schema.columns where table_name='user_profiles' and column_name='tour_completed_at';`
Expected: one row, `tour_completed_at`.

- [ ] **Step 3: Add the field to the UserProfile type**

In `lib/supabase.ts`, find:

```ts
  plan: Plan | null
  onboarding_completed_at: string | null
  posts_used_this_month: number
```

Replace with:

```ts
  plan: Plan | null
  onboarding_completed_at: string | null
  tour_completed_at: string | null
  posts_used_this_month: number
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260608_add_tour_completed_at.sql lib/supabase.ts
git commit -m "feat(tour): add tour_completed_at column and UserProfile field

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Tour step config

**Files:**
- Create: `lib/tour/steps.ts`
- Test: `lib/__tests__/tour-steps.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/tour-steps.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { TOUR_STEPS } from '@/lib/tour/steps'

describe('TOUR_STEPS', () => {
  it('starts with welcome and ends with done', () => {
    expect(TOUR_STEPS[0].id).toBe('welcome')
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].id).toBe('done')
  })

  it('has unique step ids', () => {
    const ids = TOUR_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers the 6 core feature stops between welcome and done', () => {
    const ids = TOUR_STEPS.map(s => s.id)
    for (const id of ['generate', 'posts', 'calendar', 'analytics', 'suggestions', 'voice']) {
      expect(ids).toContain(id)
    }
  })

  it('every route, when present, is under /dashboard', () => {
    for (const s of TOUR_STEPS) {
      if (s.route) expect(s.route.startsWith('/dashboard')).toBe(true)
    }
  })

  it('non-center steps declare a data-tour target', () => {
    for (const s of TOUR_STEPS) {
      if (s.target !== 'center') expect(typeof s.target).toBe('string')
    }
  })

  it('analytics is gated to the standard plan and has locked copy', () => {
    const analytics = TOUR_STEPS.find(s => s.id === 'analytics')!
    expect(analytics.requiresPlan).toBe('standard')
    expect(analytics.lockedBody).toBeTruthy()
  })

  it('the done step provides a call-to-action', () => {
    const done = TOUR_STEPS.find(s => s.id === 'done')!
    expect(done.cta?.route).toBe('/dashboard/generate')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/tour-steps.test.ts`
Expected: FAIL — cannot find module `@/lib/tour/steps`.

- [ ] **Step 3: Write the implementation**

Create `lib/tour/steps.ts`:

```ts
import type { TierID } from '@/lib/pricing-config'

export type TourStepId =
  | 'welcome'
  | 'generate'
  | 'posts'
  | 'calendar'
  | 'analytics'
  | 'suggestions'
  | 'voice'
  | 'done'

export type TourPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right'

export interface TourStep {
  id: TourStepId
  /** Route this step lives on. Omit to stay on the current page (used by `done`). */
  route?: string
  /** `data-tour` value to spotlight, or 'center' for a centered card with no spotlight. */
  target: string | 'center'
  title: string
  body: string
  placement?: TourPlacement
  /** Minimum plan to access the real feature. Below it, the step is a centered info card and does NOT navigate. */
  requiresPlan?: TierID
  /** Body shown instead of `body` when the step is locked for the user's plan. */
  lockedBody?: string
  /** Optional call-to-action button (used by the closing `done` step). */
  cta?: { label: string; route: string }
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    route: '/dashboard',
    target: 'center',
    title: 'Welcome to PersonaLink 👋',
    body: "Here's a 60-second tour of the essentials. You can skip anytime.",
  },
  {
    id: 'generate',
    route: '/dashboard/generate',
    target: 'generate-input',
    placement: 'auto',
    title: 'Generate your first post',
    body: 'Describe any idea in a line — a meeting, a lesson, a hot take — and we write the full post in your voice.',
  },
  {
    id: 'posts',
    route: '/dashboard/posts',
    target: 'posts-panel',
    placement: 'auto',
    title: 'Review and approve',
    body: 'Every draft lands here for you to review, edit, and approve before it goes out.',
  },
  {
    id: 'calendar',
    route: '/dashboard/calendar',
    target: 'calendar',
    placement: 'auto',
    title: 'Plan your week',
    body: 'Schedule posts across the week and keep a steady, consistent cadence.',
  },
  {
    id: 'analytics',
    route: '/dashboard/analytics',
    target: 'analytics',
    placement: 'auto',
    requiresPlan: 'standard',
    title: 'See what is working',
    body: 'Track reach and engagement on every post so you can double down on what lands.',
    lockedBody: 'Track reach and engagement on every post. Analytics is included on the Standard plan — upgrade anytime to unlock it.',
  },
  {
    id: 'suggestions',
    route: '/dashboard/suggestions',
    target: 'suggestions',
    placement: 'auto',
    title: 'Never run out of ideas',
    body: 'Stuck for something to say? Fresh, trend-based post angles for your industry show up here.',
  },
  {
    id: 'voice',
    route: '/dashboard/profile',
    target: 'voice',
    placement: 'auto',
    title: 'Tune your voice',
    body: 'Adjust your tone, voice, and language anytime — every post is generated to match.',
  },
  {
    id: 'done',
    target: 'center',
    title: "You're all set 🎉",
    body: 'That\'s the tour. Generate your first post now, or replay this anytime from the Help menu.',
    cta: { label: 'Generate your first post →', route: '/dashboard/generate' },
  },
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/tour-steps.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tour/steps.ts lib/__tests__/tour-steps.test.ts
git commit -m "feat(tour): add tour step config

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Plan-gating logic

**Files:**
- Create: `lib/tour/gating.ts`
- Test: `lib/__tests__/tour-gating.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/tour-gating.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isStepLocked, resolveStepView, shouldNavigate } from '@/lib/tour/gating'
import { TOUR_STEPS, type TourStep } from '@/lib/tour/steps'

const step = (id: string): TourStep => TOUR_STEPS.find(s => s.id === id)!

describe('isStepLocked', () => {
  it('locks analytics for a free user', () => {
    expect(isStepLocked(step('analytics'), 'free')).toBe(true)
  })
  it('unlocks analytics for a standard user', () => {
    expect(isStepLocked(step('analytics'), 'standard')).toBe(false)
  })
  it('unlocks analytics for a higher plan (pro)', () => {
    expect(isStepLocked(step('analytics'), 'pro')).toBe(false)
  })
  it('never locks a step without requiresPlan', () => {
    expect(isStepLocked(step('generate'), 'free')).toBe(false)
  })
})

describe('resolveStepView', () => {
  it('renders a locked step as a centered info card with lockedBody', () => {
    const v = resolveStepView(step('analytics'), 'free')
    expect(v.mode).toBe('center')
    expect(v.body).toBe(step('analytics').lockedBody)
  })
  it('renders an unlocked gated step as a spotlight', () => {
    const v = resolveStepView(step('analytics'), 'standard')
    expect(v.mode).toBe('spotlight')
    if (v.mode === 'spotlight') expect(v.target).toBe('analytics')
  })
  it('renders a center-target step as center regardless of plan', () => {
    expect(resolveStepView(step('welcome'), 'pro').mode).toBe('center')
  })
  it('renders a normal step as a spotlight on its target', () => {
    const v = resolveStepView(step('generate'), 'free')
    expect(v.mode).toBe('spotlight')
    if (v.mode === 'spotlight') expect(v.target).toBe('generate-input')
  })
})

describe('shouldNavigate', () => {
  it('navigates when the step route differs from the current path', () => {
    expect(shouldNavigate(step('generate'), 'free', '/dashboard')).toBe(true)
  })
  it('does not navigate when already on the step route', () => {
    expect(shouldNavigate(step('generate'), 'free', '/dashboard/generate')).toBe(false)
  })
  it('does not navigate into a locked feature', () => {
    expect(shouldNavigate(step('analytics'), 'free', '/dashboard')).toBe(false)
  })
  it('does not navigate for a routeless step (done)', () => {
    expect(shouldNavigate(step('done'), 'free', '/dashboard/profile')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/tour-gating.test.ts`
Expected: FAIL — cannot find module `@/lib/tour/gating`.

- [ ] **Step 3: Write the implementation**

Create `lib/tour/gating.ts`:

```ts
import { tierRank, type TierID } from '@/lib/pricing-config'
import type { TourStep } from '@/lib/tour/steps'

type PlanLike = TierID | string | null | undefined

/** True when the step's feature is above the user's plan. */
export function isStepLocked(step: TourStep, plan: PlanLike): boolean {
  if (!step.requiresPlan) return false
  return tierRank(plan) < tierRank(step.requiresPlan)
}

export type StepView =
  | { mode: 'spotlight'; target: string; title: string; body: string }
  | { mode: 'center'; title: string; body: string }

/** Resolve how a step should render for a given plan. */
export function resolveStepView(step: TourStep, plan: PlanLike): StepView {
  if (isStepLocked(step, plan)) {
    return { mode: 'center', title: step.title, body: step.lockedBody ?? step.body }
  }
  if (step.target === 'center') {
    return { mode: 'center', title: step.title, body: step.body }
  }
  return { mode: 'spotlight', target: step.target, title: step.title, body: step.body }
}

/** Whether the engine should route to this step's page. */
export function shouldNavigate(step: TourStep, plan: PlanLike, currentPath: string): boolean {
  if (isStepLocked(step, plan)) return false
  if (!step.route) return false
  return step.route !== currentPath
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/tour-gating.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/tour/gating.ts lib/__tests__/tour-gating.test.ts
git commit -m "feat(tour): add plan-gating + step-view resolution

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Card positioning geometry

**Files:**
- Create: `lib/tour/positioning.ts`
- Test: `lib/__tests__/tour-positioning.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/tour-positioning.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeCardPosition } from '@/lib/tour/positioning'

const card = { width: 320, height: 180 }
const vp = { width: 1024, height: 768 }

describe('computeCardPosition', () => {
  it('places the card to the right of a target near the left edge', () => {
    const pos = computeCardPosition({ top: 300, left: 0, width: 80, height: 40 }, card, vp)
    expect(pos.side).toBe('right')
    expect(pos.left).toBe(80 + 14) // target right edge + gap
  })

  it('falls back to the left side when there is no room on the right or bottom', () => {
    const tallCard = { width: 320, height: 700 }
    const pos = computeCardPosition({ top: 300, left: 944, width: 80, height: 40 }, tallCard, vp)
    expect(pos.side).toBe('left')
  })

  it('clamps the card inside the viewport (never negative top)', () => {
    const tallCard = { width: 320, height: 700 }
    const pos = computeCardPosition({ top: 300, left: 944, width: 80, height: 40 }, tallCard, vp)
    expect(pos.top).toBeGreaterThanOrEqual(12)
    expect(pos.left).toBeGreaterThanOrEqual(12)
  })

  it('clamps a bottom-placed card horizontally within the viewport', () => {
    const pos = computeCardPosition({ top: 10, left: 990, width: 24, height: 24 }, card, vp)
    expect(pos.left + card.width).toBeLessThanOrEqual(vp.width - 12)
  })

  it('honors a fitting preferred side', () => {
    const pos = computeCardPosition({ top: 300, left: 400, width: 80, height: 40 }, card, vp, { preferred: 'bottom' })
    expect(pos.side).toBe('bottom')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/tour-positioning.test.ts`
Expected: FAIL — cannot find module `@/lib/tour/positioning`.

- [ ] **Step 3: Write the implementation**

Create `lib/tour/positioning.ts`:

```ts
export interface TourRect { top: number; left: number; width: number; height: number }
export interface Size { width: number; height: number }
export interface Viewport { width: number; height: number }
export type TourSide = 'top' | 'bottom' | 'left' | 'right'
export interface CardPosition { top: number; left: number; side: TourSide }

interface Opts {
  gap?: number
  margin?: number
  preferred?: 'auto' | TourSide
}

/**
 * Pick the side of `target` with room for `card` and return clamped fixed
 * coordinates. Preference order: explicit `preferred`, then right, bottom,
 * left, top; if none fit, the side with the most free space wins.
 */
export function computeCardPosition(
  target: TourRect,
  card: Size,
  viewport: Viewport,
  opts: Opts = {},
): CardPosition {
  const gap = opts.gap ?? 14
  const margin = opts.margin ?? 12
  const preferred = opts.preferred ?? 'auto'

  const space: Record<TourSide, number> = {
    right: viewport.width - (target.left + target.width),
    left: target.left,
    bottom: viewport.height - (target.top + target.height),
    top: target.top,
  }

  const needsHoriz = card.width + gap + margin
  const needsVert = card.height + gap + margin
  const fits = (side: TourSide): boolean =>
    side === 'right' || side === 'left' ? space[side] >= needsHoriz : space[side] >= needsVert

  const order: TourSide[] =
    preferred !== 'auto'
      ? ([preferred, 'right', 'bottom', 'left', 'top'].filter((s, i, a) => a.indexOf(s) === i) as TourSide[])
      : (['right', 'bottom', 'left', 'top'] as TourSide[])

  const side: TourSide =
    order.find(fits) ??
    (['right', 'bottom', 'left', 'top'] as TourSide[]).reduce((best, s) => (space[s] > space[best] ? s : best), 'right')

  let top: number
  let left: number
  if (side === 'right') {
    left = target.left + target.width + gap
    top = target.top + target.height / 2 - card.height / 2
  } else if (side === 'left') {
    left = target.left - card.width - gap
    top = target.top + target.height / 2 - card.height / 2
  } else if (side === 'bottom') {
    top = target.top + target.height + gap
    left = target.left + target.width / 2 - card.width / 2
  } else {
    top = target.top - card.height - gap
    left = target.left + target.width / 2 - card.width / 2
  }

  left = Math.max(margin, Math.min(left, viewport.width - card.width - margin))
  top = Math.max(margin, Math.min(top, viewport.height - card.height - margin))

  return { top, left, side }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/tour-positioning.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full lib test suite (no regressions)**

Run: `npm test`
Expected: all suites pass, including the 3 new tour suites.

- [ ] **Step 6: Commit**

```bash
git add lib/tour/positioning.ts lib/__tests__/tour-positioning.test.ts
git commit -m "feat(tour): add coach-card positioning geometry

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Persistence endpoint

**Files:**
- Create: `app/api/me/tour/route.ts`

- [ ] **Step 1: Write the route**

Create `app/api/me/tour/route.ts` (mirrors the auth + `supabaseAdmin` pattern in `app/api/onboarding/save/route.ts`):

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Marks the first-run tour as finished/skipped so it never auto-starts again.
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ tour_completed_at: now, updated_at: now })
    .eq('user_id', user.id)

  if (error) {
    console.error('[me/tour]', error)
    return NextResponse.json({ error: 'Failed to save tour state' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/api/me/tour/route.ts
git commit -m "feat(tour): add POST /api/me/tour to persist completion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Tour context + hook

**Files:**
- Create: `components/tour/tour-context.ts`

- [ ] **Step 1: Write the context module**

Create `components/tour/tour-context.ts`:

```ts
'use client'

import { createContext, useContext } from 'react'
import type { TourStepId } from '@/lib/tour/steps'
import type { StepView } from '@/lib/tour/gating'
import type { TourRect } from '@/lib/tour/positioning'

export interface TourContextValue {
  isActive: boolean
  stepId: TourStepId | null
  view: StepView | null
  /** Measured rect of the spotlight target, or null (center / still resolving). */
  targetRect: TourRect | null
  /** 1-based progress among the visible stops (welcome..voice), or null on the done card. */
  progress: { current: number; total: number } | null
  isFirst: boolean
  cta: { label: string; route: string } | null
  start: () => void
  next: () => void
  back: () => void
  skip: () => void
  finish: () => void
}

export const TourContext = createContext<TourContextValue | null>(null)

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within <TourProvider>')
  return ctx
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/tour/tour-context.ts
git commit -m "feat(tour): add tour context + useTour hook

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: TourProvider (state machine + navigation + persistence)

**Files:**
- Create: `components/tour/TourProvider.tsx`

- [ ] **Step 1: Write the provider**

Create `components/tour/TourProvider.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TOUR_STEPS } from '@/lib/tour/steps'
import { isStepLocked, resolveStepView, shouldNavigate } from '@/lib/tour/gating'
import type { TourRect } from '@/lib/tour/positioning'
import { TourContext, type TourContextValue } from '@/components/tour/tour-context'

const VISIBLE_STOPS = TOUR_STEPS.filter(s => s.id !== 'done').length
const TARGET_WAIT_MS = 1500

export function TourProvider({
  plan,
  autoStart,
  children,
}: {
  plan: string
  autoStart: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [stepIndex, setStepIndex] = useState<number | null>(null)
  const [targetRect, setTargetRect] = useState<TourRect | null>(null)
  const startedRef = useRef(false)
  const persistedRef = useRef(false)

  const start = useCallback(() => {
    persistedRef.current = false
    setTargetRect(null)
    setStepIndex(0)
  }, [])

  const persist = useCallback(() => {
    if (persistedRef.current) return
    persistedRef.current = true
    fetch('/api/me/tour', { method: 'POST' }).catch(() => {})
  }, [])

  const close = useCallback(() => {
    setStepIndex(null)
    setTargetRect(null)
  }, [])

  const finish = useCallback(() => {
    persist()
    close()
  }, [persist, close])

  const skip = useCallback(() => {
    persist()
    close()
  }, [persist, close])

  const next = useCallback(() => {
    setStepIndex(i => {
      if (i === null) return i
      if (i >= TOUR_STEPS.length - 1) {
        persist()
        return null
      }
      return i + 1
    })
    setTargetRect(null)
  }, [persist])

  const back = useCallback(() => {
    setStepIndex(i => (i === null ? i : Math.max(0, i - 1)))
    setTargetRect(null)
  }, [])

  // Auto-start once when eligible.
  useEffect(() => {
    if (autoStart && !startedRef.current && stepIndex === null) {
      startedRef.current = true
      start()
    }
  }, [autoStart, stepIndex, start])

  const step = stepIndex === null ? null : TOUR_STEPS[stepIndex]

  // Navigate to the step's page, then measure its spotlight target.
  useEffect(() => {
    if (stepIndex === null || !step) return

    if (shouldNavigate(step, plan, pathname)) {
      router.push(step.route!)
      return // re-runs when pathname updates
    }

    const view = resolveStepView(step, plan)
    if (view.mode === 'center') {
      setTargetRect(null)
      return
    }

    let cancelled = false
    const selector = `[data-tour="${view.target}"]`
    const startedAt = performance.now()

    const tick = () => {
      if (cancelled) return
      const el = document.querySelector(selector) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        const r = el.getBoundingClientRect()
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        return
      }
      if (performance.now() - startedAt > TARGET_WAIT_MS) {
        setTargetRect(null) // graceful fallback → overlay shows a centered card
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => {
      cancelled = true
    }
  }, [stepIndex, step, pathname, plan, router])

  // Keep the spotlight aligned on resize / scroll.
  useEffect(() => {
    if (stepIndex === null || !step) return
    const view = resolveStepView(step, plan)
    if (view.mode !== 'spotlight') return
    const selector = `[data-tour="${view.target}"]`
    const remeasure = () => {
      const el = document.querySelector(selector) as HTMLElement | null
      if (el) {
        const r = el.getBoundingClientRect()
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      }
    }
    window.addEventListener('resize', remeasure)
    window.addEventListener('scroll', remeasure, true)
    return () => {
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('scroll', remeasure, true)
    }
  }, [stepIndex, step, plan])

  const value = useMemo<TourContextValue>(() => {
    if (stepIndex === null || !step) {
      return {
        isActive: false, stepId: null, view: null, targetRect: null, progress: null,
        isFirst: true, cta: null, start, next, back, skip, finish,
      }
    }
    return {
      isActive: true,
      stepId: step.id,
      view: resolveStepView(step, plan),
      targetRect,
      progress: step.id === 'done' ? null : { current: stepIndex + 1, total: VISIBLE_STOPS },
      isFirst: stepIndex === 0,
      cta: step.cta ?? null,
      start, next, back, skip, finish,
    }
  }, [stepIndex, step, plan, targetRect, start, next, back, skip, finish])

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0. (If `isStepLocked` shows as unused, remove it from the import — it's only used transitively; keep the import list to what's referenced: `resolveStepView`, `shouldNavigate`.)

- [ ] **Step 3: Fix the import if tsc/eslint flags `isStepLocked` unused**

If flagged, change the import line to:

```tsx
import { resolveStepView, shouldNavigate } from '@/lib/tour/gating'
```

- [ ] **Step 4: Commit**

```bash
git add components/tour/TourProvider.tsx
git commit -m "feat(tour): add TourProvider state machine + navigation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: TourOverlay (dim + spotlight + coach card)

**Files:**
- Create: `components/tour/TourOverlay.tsx`

- [ ] **Step 1: Write the overlay**

Create `components/tour/TourOverlay.tsx`:

```tsx
'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTour } from '@/components/tour/tour-context'
import { computeCardPosition, type TourSide } from '@/lib/tour/positioning'

const CARD_WIDTH = 320
const PAD = 8 // inflate the spotlight around the target

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function TourOverlay() {
  const tour = useTour()
  const router = useRouter()
  const reduced = usePrefersReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ width: 1024, height: 768 })
  const [cardHeight, setCardHeight] = useState(180)

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.getBoundingClientRect().height)
  }, [tour.stepId, tour.targetRect, tour.view])

  if (!tour.isActive || !tour.view) return null

  const isMobile = viewport.width < 640
  const spotlightRect = tour.view.mode === 'spotlight' ? tour.targetRect : null
  const hasSpotlight = !!spotlightRect

  // Card position
  let cardStyle: React.CSSProperties
  if (isMobile) {
    cardStyle = { left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }
  } else if (hasSpotlight && spotlightRect) {
    const inflated = {
      top: spotlightRect.top - PAD,
      left: spotlightRect.left - PAD,
      width: spotlightRect.width + PAD * 2,
      height: spotlightRect.height + PAD * 2,
    }
    const pos = computeCardPosition(inflated, { width: CARD_WIDTH, height: cardHeight }, viewport, {
      preferred: 'auto',
    })
    cardStyle = { top: pos.top, left: pos.left, width: CARD_WIDTH }
  } else {
    // centered
    cardStyle = {
      top: '50%',
      left: '50%',
      width: Math.min(CARD_WIDTH + 40, viewport.width - 24),
      transform: 'translate(-50%, -50%)',
    }
  }

  const spring = reduced
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 320, damping: 32 } as const)
  const fade = reduced ? { duration: 0 } : { duration: 0.2 }

  const onDone = () => {
    if (tour.cta) router.push(tour.cta.route)
    tour.finish()
  }

  return (
    <AnimatePresence>
      <motion.div
        key="tour-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fade}
        style={{ position: 'fixed', inset: 0, zIndex: 100 }}
      >
        {/* Click-blocker / dim. Transparent when a spotlight provides its own dim. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: hasSpotlight ? 'transparent' : 'rgba(12,18,32,0.72)',
          }}
        />

        {/* Spotlight: a box whose huge spread box-shadow forms the dim with a hole. */}
        {hasSpotlight && spotlightRect && (
          <motion.div
            aria-hidden
            initial={false}
            animate={{
              top: spotlightRect.top - PAD,
              left: spotlightRect.left - PAD,
              width: spotlightRect.width + PAD * 2,
              height: spotlightRect.height + PAD * 2,
            }}
            transition={spring}
            style={{
              position: 'absolute',
              borderRadius: 12,
              pointerEvents: 'none',
              boxShadow: '0 0 0 9999px rgba(12,18,32,0.72), 0 0 0 3px var(--pl-accent)',
            }}
          />
        )}

        {/* Coach card */}
        <motion.div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={tour.view.title}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fade}
          style={{
            position: 'fixed',
            zIndex: 102,
            ...cardStyle,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--sh-3)',
            padding: 18,
          }}
        >
          {/* Progress */}
          {tour.progress && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {Array.from({ length: tour.progress.total }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: i < tour.progress!.current ? 'var(--pl-accent)' : 'var(--line-2)',
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 10, letterSpacing: '.07em', color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                STEP {tour.progress.current} / {tour.progress.total}
              </span>
            </div>
          )}

          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontFamily: 'var(--f-sans)' }}>
            {tour.view.title}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', marginBottom: 16, fontFamily: 'var(--f-sans)' }}>
            {tour.view.body}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {tour.stepId === 'done' ? (
              <>
                <button onClick={tour.finish} style={btnGhost}>Maybe later</button>
                <button onClick={onDone} style={btnPrimary}>{tour.cta?.label ?? 'Done'}</button>
              </>
            ) : (
              <>
                <button onClick={tour.skip} style={{ fontSize: 12, color: 'var(--ink-4)', background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'var(--f-sans)' }}>
                  Skip tour
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!tour.isFirst && <button onClick={tour.back} style={btnGhost}>Back</button>}
                  <button onClick={tour.next} style={btnPrimary}>Next →</button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const btnPrimary: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--bg)', background: 'var(--pl-accent)',
  padding: '7px 16px', borderRadius: 8, border: 0, cursor: 'pointer', fontFamily: 'var(--f-sans)',
}
const btnGhost: React.CSSProperties = {
  fontSize: 12, color: 'var(--ink-3)', background: 'transparent',
  padding: '7px 14px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'var(--f-sans)',
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0. (If `TourSide` is reported unused, drop it from the import: `import { computeCardPosition } from '@/lib/tour/positioning'`.)

- [ ] **Step 3: Commit**

```bash
git add components/tour/TourOverlay.tsx
git commit -m "feat(tour): add TourOverlay with spotlight + coach card

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Wire into the dashboard layout

**Files:**
- Modify: `app/dashboard/layout.tsx`

The layout already loads `profile` and `agencyMode` and computes `plan`. We add the provider/overlay, an auto-start flag, and a "Replay tour" item in the workspace dropdown.

- [ ] **Step 1: Add imports**

At the top of `app/dashboard/layout.tsx`, after the existing component imports (e.g. after the `WordMark` import), add:

```tsx
import { TourProvider } from '@/components/tour/TourProvider'
import { TourOverlay } from '@/components/tour/TourOverlay'
import { useTour } from '@/components/tour/tour-context'
```

In the `lucide-react` import block, add `Compass` to the icon list (used by the Replay button).

- [ ] **Step 2: Add the "Replay tour" button to WorkspaceSwitcher**

In `WorkspaceSwitcher`, locate the "Help & FAQ" link:

```tsx
            <Link href="/dashboard/settings?tab=help" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-surface-3"
              style={{ color: 'var(--ink-2)' }}>
              <HelpCircle size={14} style={{ color: 'var(--ink-4)' }} className="shrink-0" />
              Help &amp; FAQ
            </Link>
```

Immediately AFTER that `</Link>`, add:

```tsx
            <ReplayTourButton onNavigate={() => setOpen(false)} />
```

- [ ] **Step 3: Define the ReplayTourButton component**

Add this small component in `app/dashboard/layout.tsx` (e.g. just above `WorkspaceSwitcher`). It calls `useTour()`, so it only renders inside `TourProvider`:

```tsx
/* ── Replay tour (Help menu) ─────────────────────────────── */
function ReplayTourButton({ onNavigate }: { onNavigate: () => void }) {
  const tour = useTour()
  return (
    <button
      onClick={() => { onNavigate(); tour.start() }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors hover:bg-surface-3"
      style={{ color: 'var(--ink-2)' }}
    >
      <Compass size={14} style={{ color: 'var(--ink-4)' }} className="shrink-0" />
      Replay tour
    </button>
  )
}
```

- [ ] **Step 4: Wrap the layout in TourProvider and mount the overlay**

In `DashboardLayout`, find the start of the returned JSX:

```tsx
  const plan = profile?.plan || 'starter'
  const sidebarProps = { user, profile, plan, pathname }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
```

Replace with:

```tsx
  const plan = profile?.plan || 'starter'
  const sidebarProps = { user, profile, plan, pathname }

  // Auto-start the first-run tour: onboarding finished, tour never seen, not in agency mode.
  const tourAutoStart =
    !!profile && !profile.tour_completed_at && !!profile.onboarding_completed_at && !agencyMode

  return (
    <TourProvider plan={plan} autoStart={tourAutoStart}>
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
```

- [ ] **Step 5: Close the provider and mount the overlay**

At the END of `DashboardLayout`'s returned JSX, find the final closing `</div>` that matches the opening `<div className="flex min-h-screen" ...>` (it's the last line before the function's closing `)`). Immediately before that closing `</div>`, add the overlay; immediately after it, close the provider. The tail of the return should read:

```tsx
      </Sheet>

      <TourOverlay />
    </div>
    </TourProvider>
  )
}
```

(The `</Sheet>` shown is the existing "More sheet" that currently ends the layout — add `<TourOverlay />` after it, then `</div>`, then `</TourProvider>`.)

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 7: Build to catch any RSC/client boundary issues**

Run: `npm run build`
Expected: build succeeds. (The layout is already `'use client'`, so the new client imports are fine.)

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat(tour): mount tour in dashboard layout + Replay in Help menu

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Add data-tour attributes to the 6 target pages

Each step is a single-attribute edit on a stable container. Add the attribute, then type-check, then commit once at the end.

- [ ] **Step 1: Generate page**

In `app/dashboard/generate/page.tsx`, find:

```tsx
                <textarea
                  id="topic" value={topic} onChange={e => setTopic(e.target.value)}
```

Replace with:

```tsx
                <textarea
                  id="topic" data-tour="generate-input" value={topic} onChange={e => setTopic(e.target.value)}
```

- [ ] **Step 2: Posts page**

In `app/dashboard/posts/page.tsx`, find:

```tsx
  return (
    <div className="db-screen">
      {/* Edit post dialog — preserved exactly */}
```

Replace with:

```tsx
  return (
    <div className="db-screen" data-tour="posts-panel">
      {/* Edit post dialog — preserved exactly */}
```

- [ ] **Step 3: Calendar page**

In `app/dashboard/calendar/page.tsx`, find:

```tsx
      {/* Calendar card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
```

Replace with:

```tsx
      {/* Calendar card */}
      <div data-tour="calendar" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
```

- [ ] **Step 4: Analytics page**

In `app/dashboard/analytics/page.tsx`, find:

```tsx
  return (
    <div className="p-4 sm:p-5 md:p-7 max-w-4xl">
```

Replace with:

```tsx
  return (
    <div className="p-4 sm:p-5 md:p-7 max-w-4xl" data-tour="analytics">
```

- [ ] **Step 5: Suggestions page**

In `app/dashboard/suggestions/page.tsx`, find:

```tsx
  return (
    <div className="p-3 sm:p-4 md:p-7 w-full">
      {/* Header */}
```

Replace with:

```tsx
  return (
    <div className="p-3 sm:p-4 md:p-7 w-full" data-tour="suggestions">
      {/* Header */}
```

- [ ] **Step 6: Profile page**

In `app/dashboard/profile/page.tsx`, find:

```tsx
        {/* ── Voice dimensions ── */}
        <div className="prof-lg" style={{
```

Replace with:

```tsx
        {/* ── Voice dimensions ── */}
        <div className="prof-lg" data-tour="voice" style={{
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 8: Commit**

```bash
git add app/dashboard/generate/page.tsx app/dashboard/posts/page.tsx app/dashboard/calendar/page.tsx app/dashboard/analytics/page.tsx app/dashboard/suggestions/page.tsx app/dashboard/profile/page.tsx
git commit -m "feat(tour): add data-tour anchors to core dashboard pages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Manual end-to-end verification

No code — confirm the feature works. Use the `run` skill (or `npm run dev`) to launch the app.

- [ ] **Step 1: Free-tier, desktop**

Log in as / simulate a user whose profile has `onboarding_completed_at` set and `tour_completed_at = NULL`, plan `free`. Load `/dashboard`.
Expected: tour auto-starts on the Welcome card. Next → navigates to Generate and spotlights the idea box. Continue through Posts, Calendar. At **Analytics**, expect a **centered info card** (no navigation, since free is below `standard`) with the "unlock on Standard" copy. Continue through Trending ideas, Voice, then the closing card with "Generate your first post →".

- [ ] **Step 2: Skip + persistence**

Reload `/dashboard`. Expected: tour does NOT auto-start again (because finishing/skipping POSTed `tour_completed_at`). Verify in DB: `tour_completed_at` is non-null.

- [ ] **Step 3: Replay**

Open the workspace dropdown (top-left avatar) → click **Replay tour**. Expected: the tour starts again from Welcome.

- [ ] **Step 4: Standard-tier, Analytics navigates**

As a `standard`+ user, run the tour. Expected: the Analytics stop now **navigates** into `/dashboard/analytics` and spotlights the analytics panel (not the info card).

- [ ] **Step 5: Mobile width**

Narrow the viewport (< 640px) or use device emulation. Expected: the coach card anchors to the bottom of the screen; spotlight still highlights in-page controls; Next still navigates between pages.

- [ ] **Step 6: Reduced motion**

Enable "Reduce motion" in OS settings. Expected: transitions are instant (no spring/slide), tour still fully functional.

- [ ] **Step 7: Agency mode**

While managing a client (agency mode banner visible), load `/dashboard`. Expected: tour does NOT auto-start.

- [ ] **Step 8: Final regression check**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass, no type errors.

---

## Self-review checklist (completed during planning)

- **Spec coverage:** 7 stops + closing (Task 2); walkthrough navigation (Task 7); auto-start w/ conditions (Task 9 Step 4); Skip on every step (Task 8); account persistence (Tasks 1 & 5); Replay in Help (Task 9 Steps 2–3); locked-feature info card (Task 3 + verified Task 11 Step 1); reduced-motion + mobile (Task 8); stable anchors / empty-state safety (Task 10, targets are containers). ✓
- **Type consistency:** `TourStep`, `StepView`, `TourRect`, `TourContextValue` names match across tasks; `computeCardPosition` signature matches its call in Task 8; `useTour` shape matches the overlay's usage. ✓
- **Placeholders:** none — every code step contains complete code; the two "if tsc flags unused import" steps are conditional cleanups, not placeholders. ✓
