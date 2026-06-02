# Onboarding Plan-Gated Flow + Progressive Profiling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure onboarding so only value-creating profiling (identity + writing sample → preview) precedes the dashboard, deferring configuration to progressive profiling, with a plan-gated branch and a warn-only banner / paid nudge for incomplete profiles.

**Architecture:** Plan choice moves to the landing page (`?plan=`) and forks onboarding. Both branches always capture the writing sample before the dashboard (so voice is never missing). Free users go straight to the dashboard; paid users see a preview, pay, then finish config. Incomplete profiles are surfaced by a warn-only banner (free) and a stronger one-time nudge (paid) — both reusing the same config-step components and a shared completeness helper. Risk is isolated by shipping the free branch end-to-end **before** any payment-wiring change; the post-payment redirect cutover is the final, separately-verified phase.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Supabase · Razorpay (IN) + Dodo (intl) · PostHog · Vitest (logic unit tests) · Checkly (`__checks__/` prod monitors).

**Spec:** `docs/superpowers/specs/2026-06-02-onboarding-plan-gated-progressive-profiling-design.md`

---

## Verification conventions (every task)

- Logic units: `npm test` (vitest run). New logic tests live in `lib/__tests__/*.test.ts`.
- Types: `npm run build` must stay clean (repo invariant — tsc is kept green).
- Lint: `npm run lint`.
- UI/flow: harness preview workflow (`preview_start`, navigate, `preview_snapshot`, `preview_console_logs`) — no manual "please check" handoffs.
- Do not break existing Checkly checks: `__checks__/post-generation.spec.ts`, `linkedin-login.spec.ts`, `google-login.spec.ts`, `scheduling.spec.ts`.
- Each task commits with a conventional message ending in the trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Each **phase** leaves `main` shippable (onboarding + checkout fully working).

## File structure (created / modified)

**Created**
- `lib/profile-completeness.ts` — pure completeness helper (one responsibility: given a profile, what's missing).
- `lib/__tests__/profile-completeness.test.ts`
- `lib/onboarding-plan.ts` — pure `resolvePlanFromParam` helper.
- `lib/__tests__/onboarding-plan.test.ts`
- `components/onboarding/StepIdentity.tsx`, `StepWritingSample.tsx`, `StepPersonalityQuiz.tsx`, `StepContentPillars.tsx`, `StepControlPreference.tsx`, `StepImageBrief.tsx` — shared step components (each: one step, props = form slice + onChange).
- `components/dashboard/IncompleteProfileBanner.tsx` — warn-only banner.
- `components/dashboard/FinishProfileNudge.tsx` — paid one-time nudge card.
- `app/dashboard/finish-profile/page.tsx` — resumable config flow (reuses shared step components).
- `app/api/onboarding/preview/route.ts` — single voice-matched preview post from in-progress profile.

**Modified**
- `app/onboarding/page.tsx` — render shared components; read `?plan=`; core-first restructure; branch; remove in-wizard plan step.
- `app/api/onboarding/save/route.ts` — accept partial payloads; set `onboarding_completed_at` at core completion; entitlement stays free until payment confirms.
- Landing page CTA component(s) — route to `/onboarding?plan=…` (exact file located in Task C1).
- `app/dashboard/page.tsx` + generate screen — mount banner/nudge.
- `app/api/dodo/create-subscription/route.ts` — return URL (Phase D only).

---

## Phase A — Foundations (no user-visible behavior change)

Ships a tested completeness helper, extracted reusable step components, and a partial-save-capable API. Behavior identical to today.

### Task A1: Profile-completeness helper (TDD)

**Files:**
- Create: `lib/profile-completeness.ts`
- Test: `lib/__tests__/profile-completeness.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/profile-completeness.test.ts
import { describe, it, expect } from 'vitest'
import { getProfileCompleteness, REQUIRED_MCQ_IDS } from '@/lib/profile-completeness'

const full = {
  mcq_answers: Object.fromEntries(REQUIRED_MCQ_IDS.map(id => [id, 'x'])),
  content_pillars: ['Leadership', 'Innovation', 'Career Advice'],
  control_preference: 'approve',
}

describe('getProfileCompleteness', () => {
  it('reports complete when quiz + 3 pillars + control preference are present', () => {
    const r = getProfileCompleteness(full)
    expect(r.complete).toBe(true)
    expect(r.missing).toEqual([])
  })
  it('flags missing quiz', () => {
    const r = getProfileCompleteness({ ...full, mcq_answers: {} })
    expect(r.complete).toBe(false)
    expect(r.missing).toContain('quiz')
  })
  it('flags fewer than 3 pillars', () => {
    const r = getProfileCompleteness({ ...full, content_pillars: ['Leadership'] })
    expect(r.missing).toContain('pillars')
  })
  it('flags missing control preference', () => {
    const r = getProfileCompleteness({ ...full, control_preference: '' })
    expect(r.missing).toContain('control')
  })
  it('treats null/undefined profile as fully incomplete', () => {
    const r = getProfileCompleteness(null)
    expect(r.complete).toBe(false)
    expect(r.missing).toEqual(['quiz', 'pillars', 'control'])
  })
  it('ignores image brief (informational) — not part of completeness', () => {
    // full has no image-brief field; still complete
    expect(getProfileCompleteness(full).complete).toBe(true)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- profile-completeness`
Expected: FAIL (module not found / `getProfileCompleteness` undefined).

- [ ] **Step 3: Implement**

```ts
// lib/profile-completeness.ts
import { MCQ_QUESTIONS } from '@/lib/onboarding-questions'

// Derive required quiz ids from the single source of truth.
export const REQUIRED_MCQ_IDS: string[] = MCQ_QUESTIONS.map(q => q.id)

export type CompletenessGroup = 'quiz' | 'pillars' | 'control'

export interface Completeness {
  complete: boolean
  missing: CompletenessGroup[]
}

interface ProfileLike {
  mcq_answers?: Record<string, unknown> | null
  content_pillars?: string[] | null
  control_preference?: string | null
}

function quizDone(p: ProfileLike): boolean {
  const a = p.mcq_answers || {}
  return REQUIRED_MCQ_IDS.every(id => {
    const v = (a as Record<string, unknown>)[id]
    return Array.isArray(v) ? v.length > 0 : Boolean(v)
  })
}

export function getProfileCompleteness(profile: ProfileLike | null | undefined): Completeness {
  const p = profile || {}
  const missing: CompletenessGroup[] = []
  if (!quizDone(p)) missing.push('quiz')
  if ((p.content_pillars?.length ?? 0) < 3) missing.push('pillars')
  if (!p.control_preference) missing.push('control')
  return { complete: missing.length === 0, missing }
}
```

> Note: if `MCQ_QUESTIONS` items use a key other than `id`, the executor adjusts `REQUIRED_MCQ_IDS` to that key (confirm against `lib/onboarding-questions.ts`). The 5 ids are: `voice_style`, `main_goal`, `personal_stories`, `content_type`, `known_as`.

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- profile-completeness` → PASS. Then `npm run build` → clean.

- [ ] **Step 5: Commit**

```bash
git add lib/profile-completeness.ts lib/__tests__/profile-completeness.test.ts
git commit -m "feat(onboarding): add profile-completeness helper" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task A2: Extract shared step components (refactor, no behavior change)

**Files:**
- Read: `app/onboarding/page.tsx` (the JSX render block for steps 1–6 and `lib/onboarding-questions.ts`).
- Create: `components/onboarding/StepIdentity.tsx`, `StepWritingSample.tsx`, `StepPersonalityQuiz.tsx`, `StepContentPillars.tsx`, `StepControlPreference.tsx`, `StepImageBrief.tsx`.
- Modify: `app/onboarding/page.tsx` (replace inline JSX with the components).

**Contract for each component:** props are the relevant `form` slice plus typed change handlers already present in the page (`toggleMcq`, `togglePillar`, identity field setters). No data fetching, no routing — presentational + local interaction only. Example signature:

```tsx
// components/onboarding/StepContentPillars.tsx
export function StepContentPillars(props: {
  selected: string[]
  onToggle: (pillar: string) => void
}) { /* extract existing pillar grid JSX verbatim */ }
```

- [ ] **Step 1:** Read the current step JSX in `app/onboarding/page.tsx`; create one component per step, moving JSX verbatim and wiring props to existing handlers/state.
- [ ] **Step 2:** Replace the inline JSX in `app/onboarding/page.tsx` with the new components; keep `TOTAL_STEPS`, ordering, and `handleFinish` unchanged.
- [ ] **Step 3:** Verify no behavior change — `npm run build` clean, `npm run lint` clean.
- [ ] **Step 4:** Preview-verify the full existing 7-step flow renders and advances identically (`preview_start`, navigate `/onboarding`, step through, `preview_snapshot` each step, `preview_console_logs` clean).
- [ ] **Step 5: Commit**

```bash
git add components/onboarding app/onboarding/page.tsx
git commit -m "refactor(onboarding): extract reusable step components" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

### Task A3: Partial-save support in the onboarding save API

**Files:**
- Modify: `app/api/onboarding/save/route.ts`

**Change:** accept a payload that may omit config fields (`mcq_answers`, `content_pillars`, `control_preference`). Persist whatever is present without overwriting existing values with empties. Set `onboarding_completed_at` once the **core** is present (name, role, industry, linkedin_url, writing_sample) — not gated on config. Record the selected `plan` as intent only; do **not** grant paid entitlement here (entitlement comes from the payment webhook/verify path).

- [ ] **Step 1:** Read the current save route; identify the upsert payload.
- [ ] **Step 2:** Make config fields optional in the write (omit-if-absent, don't null out existing). Set `onboarding_completed_at` when core fields are present.
- [ ] **Step 3:** Keep entitlement/plan tier unchanged unless a verified payment has set it (free remains free here).
- [ ] **Step 4:** `npm run build` clean; verify a partial POST (core only) succeeds and a full POST still behaves as before (preview/network check, or a small vitest if the route logic is extracted to a pure function).
- [ ] **Step 5: Commit**

```bash
git add app/api/onboarding/save/route.ts
git commit -m "feat(onboarding): partial/staged save; complete-at-core" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase B — Progressive profiling on the dashboard

Adds the banner, the paid nudge, and the resumable "finish profile" flow. Additive — does not touch the onboarding wizard or payments. After this phase, any incomplete profile (including existing users) is surfaced and fixable.

### Task B1: Warn-only incomplete-profile banner

**Files:**
- Create: `components/dashboard/IncompleteProfileBanner.tsx`
- Modify: `app/dashboard/page.tsx` and the generate screen to mount it.

**Contract:** given the current profile, compute `getProfileCompleteness`; if incomplete and plan is free, render a persistent dismissible-per-session banner: *"Your posts get sharper once you finish your profile — add your content pillars, voice quiz, and preferences."* with a "Finish profile →" link to `/dashboard/finish-profile`. Never blocks anything.

- [ ] **Step 1:** Build the component (props: `missing: CompletenessGroup[]`).
- [ ] **Step 2:** Mount on dashboard + generate screen, gated on `!complete && plan === 'free'`.
- [ ] **Step 3:** `npm run build`/`lint` clean.
- [ ] **Step 4:** Preview-verify: with an incomplete free profile the banner shows on both surfaces; with a complete profile it does not.
- [ ] **Step 5: Commit** (`feat(dashboard): warn-only incomplete-profile banner` + trailer).

### Task B2: Paid one-time nudge card

**Files:**
- Create: `components/dashboard/FinishProfileNudge.tsx`
- Modify: `app/dashboard/page.tsx`

**Contract:** when plan is paid AND profile incomplete AND the nudge has not yet been shown (persist a `finish_profile_nudge_seen` flag — localStorage keyed by user, or a profile column), show a prominent dismissible card on first dashboard load: *"You're all set on [Plan] — take ~2 minutes to finish tuning your voice."* with [Finish now] → `/dashboard/finish-profile` and [Later]. After dismissal, fall back to the standard banner (extend B1's gate to also show the banner for paid-incomplete once the nudge is dismissed).

- [ ] **Step 1:** Build the nudge card + seen-flag persistence.
- [ ] **Step 2:** Wire show-once logic; on dismiss, banner takes over for paid-incomplete.
- [ ] **Step 3:** build/lint clean.
- [ ] **Step 4:** Preview-verify show-once + dismiss→banner handoff (simulate paid-incomplete).
- [ ] **Step 5: Commit** (`feat(dashboard): one-time finish-profile nudge for paid-incomplete` + trailer).

### Task B3: Resumable "finish profile" flow

**Files:**
- Create: `app/dashboard/finish-profile/page.tsx`

**Contract:** render only the missing config steps (from `getProfileCompleteness().missing`) using the Phase-A shared components, starting at the first unfilled step. On completion, POST to `/api/onboarding/save` (partial). On finish, route to `/dashboard`; banner/nudge disappear because completeness is now true.

- [ ] **Step 1:** Build the page reusing shared components; sequence = missing groups in canonical order (quiz → pillars → control → image brief).
- [ ] **Step 2:** Save via partial save; handle the all-complete case (redirect straight back).
- [ ] **Step 3:** build/lint clean.
- [ ] **Step 4:** Preview-verify: incomplete profile → only missing steps shown → save → banner gone.
- [ ] **Step 5: Commit** (`feat(dashboard): resumable finish-profile flow` + trailer).

---

## Phase C — Plan-gated onboarding + Step-2 preview (free branch fully live)

Moves plan selection to the landing page, restructures onboarding to core-first, adds the preview, and ships the free branch end-to-end. Paid users, after preview, go through the **existing** payment path and land on `/dashboard`, where the Phase-B nudge finishes their config — so **no payment-redirect change is needed yet**.

### Task C1: Landing plan param + `resolvePlanFromParam` helper (TDD)

**Files:**
- Create: `lib/onboarding-plan.ts`, `lib/__tests__/onboarding-plan.test.ts`
- Modify: landing-page CTA component(s) (located via grep in Step 1).

- [ ] **Step 1: Write failing test**

```ts
// lib/__tests__/onboarding-plan.test.ts
import { describe, it, expect } from 'vitest'
import { resolvePlanFromParam } from '@/lib/onboarding-plan'

describe('resolvePlanFromParam', () => {
  it('accepts valid plans', () => {
    expect(resolvePlanFromParam('starter')).toEqual({ plan: 'starter', isPaid: true })
    expect(resolvePlanFromParam('free')).toEqual({ plan: 'free', isPaid: false })
  })
  it('defaults missing/invalid to free', () => {
    expect(resolvePlanFromParam(null)).toEqual({ plan: 'free', isPaid: false })
    expect(resolvePlanFromParam('bogus')).toEqual({ plan: 'free', isPaid: false })
  })
})
```

- [ ] **Step 2:** Run `npm test -- onboarding-plan` → FAIL.
- [ ] **Step 3: Implement**

```ts
// lib/onboarding-plan.ts
const PAID = ['starter', 'standard', 'pro'] as const
const ALL = ['free', ...PAID] as const
export type PlanId = typeof ALL[number]

export function resolvePlanFromParam(param: string | null | undefined): { plan: PlanId; isPaid: boolean } {
  const plan = (ALL as readonly string[]).includes(param ?? '') ? (param as PlanId) : 'free'
  return { plan, isPaid: (PAID as readonly string[]).includes(plan) }
}
```

- [ ] **Step 4:** `npm test -- onboarding-plan` → PASS; grep landing CTAs and point them at `/onboarding?plan=<id>`; build clean.
- [ ] **Step 5: Commit** (`feat(onboarding): plan param helper + landing CTAs` + trailer).

### Task C2: Core-first onboarding restructure + branch

**Files:**
- Modify: `app/onboarding/page.tsx`

**Change:** read `?plan=` on mount via `resolvePlanFromParam` (alongside existing cookie/sessionStorage init). New sequence: Step 1 Identity (trim `age`/`company` from required) → Step 2 Writing Sample → preview (Task C3). Remove the in-wizard plan-selection step. Branch on `isPaid`: free → save core (partial) → `/dashboard`; paid → save core → preview → existing payment (`handleFinish` payment logic) → on success `/dashboard` (unchanged redirect target for now). Config steps for paid are handled post-payment by the Phase-B nudge in this phase.

- [ ] **Step 1:** Add `?plan=` read + branch state.
- [ ] **Step 2:** Reorder to core-first; remove plan step UI; trim identity required fields.
- [ ] **Step 3:** Free path: partial-save core → dashboard. Paid path: partial-save core → preview → existing payment call → dashboard.
- [ ] **Step 4:** build/lint clean; preview-verify the **free** branch end-to-end (`/onboarding?plan=free` → 2 steps → dashboard, banner present until finished).
- [ ] **Step 5: Commit** (`feat(onboarding): core-first plan-gated flow` + trailer).

### Task C3: Step-2 voice-matched preview

**Files:**
- Create: `app/api/onboarding/preview/route.ts`
- Modify: `app/onboarding/page.tsx` (render preview after Step 2)

**Contract:** authenticated route; takes in-progress identity + writing_sample; calls the existing generation (`generateLinkedInPosts` in `lib/anthropic.ts`) for a **single** post; returns it. On transient failure, the UI shows a graceful fallback ("we'll generate your first post on the dashboard") and lets the user continue — never traps Step 2. Fires `preview_generated` (PostHog).

- [ ] **Step 1:** Build the route (reuse generation; cap to 1 post; pass partial profile).
- [ ] **Step 2:** Render preview card after Step 2 with loading + fallback states.
- [ ] **Step 3:** build/lint clean.
- [ ] **Step 4:** Preview-verify: sample → preview renders; simulate API error → fallback + continue works.
- [ ] **Step 5: Commit** (`feat(onboarding): step-2 voice-matched preview` + trailer).

### Task C4: Analytics + access-code path

**Files:**
- Modify: `app/onboarding/page.tsx`, access-code apply usage.

- [ ] **Step 1:** Emit `core_completed`, `preview_generated`, `payment_completed`, `config_completed` (PostHog), distinct from `onboarding_completed_at`.
- [ ] **Step 2:** Access-code users follow the paid branch minus the payment call (activate via code, then dashboard + nudge).
- [ ] **Step 3:** build/lint clean; preview-verify code path.
- [ ] **Step 4: Commit** (`feat(onboarding): funnel analytics + access-code branch` + trailer).

---

## Phase D — Paid inline-resume polish (isolated payment-wiring change — LAST)

Optional refinement: instead of paid users finishing config via the dashboard nudge, resume config **inline** right after payment. This is the only phase that edits payment redirect/return wiring; defer/skip safely if needed — the Phase-B nudge already covers paid-incomplete users.

### Task D1: Resume config after payment

**Files:**
- Modify: `app/onboarding/page.tsx` (Razorpay success handler at ~`:227`), `app/api/dodo/create-subscription/route.ts` (return URL).

**Change:** Razorpay success → advance into inline config steps instead of `window.location.href='/dashboard'`. Dodo return URL → a resume route (e.g. `/onboarding?resume=config`) instead of `/dashboard`. Do not clear `sessionStorage` (`:175`) until config completes. Resume drops the user at the next unfilled step; resume path never re-invokes payment.

- [ ] **Step 1:** Move/guard the `sessionStorage.removeItem` so resume state survives checkout.
- [ ] **Step 2:** Razorpay success → inline config sequence; "paid + incomplete" state never re-charges.
- [ ] **Step 3:** Dodo return URL → resume route; onboarding handles `?resume=config`.
- [ ] **Step 4:** build/lint clean; **verify with payment test/sandbox keys** — Razorpay test mode and Dodo test mode: pay → resume config → finish → dashboard (no banner). Confirm tab-close right after pay still lands paid-incomplete with nudge (fallback intact). Do not run against live keys.
- [ ] **Step 5: Commit** (`feat(onboarding): resume config inline after payment` + trailer).

---

## Self-review (spec coverage)

- Plan→landing, branch fork → C1, C2. ✓
- Trimmed identity, sample→preview core → C2, C3. ✓
- Free branch → C2; paid branch (preview→pay→config) → C2 + Phase-B nudge, refined by D1. ✓
- Completeness model (distinct from `onboarding_completed_at`) → A1, A3. ✓
- Warn-only banner (free) + stronger nudge (paid) → B1, B2. ✓
- Component reuse → A2 (extract), B3/C2 (consume). ✓
- Partial save, entitlement-via-webhook, resume-not-restart, redirect cutover → A3, C2, D1. ✓
- Generation safety (never blocks; voice always present) → C3 fallback; sample captured in core. ✓
- Analytics split → C4. ✓
- Edge cases: access codes → C4; payment failure → C2 (free-tier fallback) ; returning user → A3 (`onboarding_completed_at` at core); preview failure → C3; missing `?plan=` → C1. ✓

**Open items confirmed during execution (not placeholders — require reading live code):** exact landing CTA file (C1 Step 1); exact MCQ id key (A1 note); whether nudge "seen" flag is localStorage vs profile column (B2); preview route auth wiring (C3).
