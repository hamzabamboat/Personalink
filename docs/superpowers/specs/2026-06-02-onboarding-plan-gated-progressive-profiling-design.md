# Onboarding: Plan-Gated Flow + Progressive Profiling

**Date:** 2026-06-02
**Status:** Draft — awaiting review
**Area:** Onboarding, payments, dashboard first-run

## Problem

Today onboarding is a linear 7-step wizard (`app/onboarding/page.tsx`, `TOTAL_STEPS = 7`) where users complete all personal profiling *before* reaching the dashboard, with plan selection as the final step (Step 7). The concern is **drop-off**: too many steps stand between a new user and being "in" the product.

The naive fix — move all profiling behind the paywall — is wrong for PersonaLink specifically, because the profiling *is* the product. Generation quality depends directly on the profiling data (`lib/anthropic.ts`): without the writing sample the prompt loses the "REAL WRITING BY THIS PERSON" block, without content pillars it falls back to a single hardcoded `['Professional Insights']` pillar, and without the MCQ answers it loses voice/goal steering. Deferring everything to after payment would make a user's *first post after paying* their weakest — the worst possible moment.

## Goal

Reduce time-to-value and onboarding drop-off **without** sacrificing the generation quality that justifies the product, by:

1. Capturing only the value-creating profiling before the dashboard.
2. Deferring pure configuration to progressive profiling on the dashboard.
3. Preserving the "this sounds like me" aha moment as a pre-payment conversion driver.

## Non-goals

- No change to the generation engine, pricing, or plan tiers.
- No LinkedIn API scraping/import (the "paste a recent post" option is a manual paste into a textarea, not an automated fetch).
- No redesign of the dashboard beyond the banner, the paid nudge card, and the "finish profile" entry point.

## Core principle

**Defer configuration, not value.** The writing sample (→ voice fingerprint) is always captured before the dashboard in every branch, so an incomplete profile produces posts that are *less tuned* (no pillar rotation, no quiz nuance), never *generic*. This is what makes a warn-only banner honest rather than a cover for broken output.

## Key architectural change: plan selection moves to the landing page

Plan choice currently lives **inside** onboarding as Step 7 (`form.plan`, default `'free'`, fork at `app/onboarding/page.tsx:178`). It moves to the **landing page**: CTAs route to `/onboarding?plan=<free|starter|standard|pro>`. The onboarding page reads `?plan=` on mount (alongside the existing cookie/sessionStorage init) and uses it to drive the branch. The in-wizard plan-selection step is removed. Missing/invalid `?plan=` defaults to the free branch.

## Step taxonomy

The existing 7 steps are re-bucketed:

**Core — always captured before the dashboard (both branches):**
- **Step 1 — Identity (trimmed):** `name`, `role`, `industry`, `linkedin_url`. `age` and `company` drop off the required path and become optional profile fields edited later.
- **Step 2 — Writing sample → preview:** the writing-sample textarea, plus a "paste a recent LinkedIn post instead of writing fresh" affordance. On submit, generate and display a **voice-matched preview post** ("Here's a post in your voice"). This is the aha moment.

**Config — deferrable (the "finish your profile" set):**
- Personality quiz (5 MCQs: `voice_style`, `main_goal`, `personal_stories`, `content_type`, `known_as`)
- Content pillars (pick exactly 3)
- Control preference (default `approve`)
- Monthly image brief — *informational only, collects no data; excluded from the completeness calculation*

## Branch 1 — Free plan

```
Landing "Start free" (?plan=free)
  → Step 1 (identity)
  → Step 2 (writing sample → preview)
  → save core + set onboarding_completed_at
  → free-tier dashboard
```

Config steps are **not** shown inline. They live behind the dashboard "finish your profile" entry and are surfaced by the warn-only banner.

## Branch 2 — Paid plan

```
Landing "Choose Starter/Standard/Pro" (?plan=starter|standard|pro)
  → Step 1 (identity)
  → Step 2 (writing sample → preview)   ← preview shown BEFORE charging
  → save core + set onboarding_completed_at
  → Payment (Razorpay modal [IN] / Dodo redirect [intl], 7-day trial)
  → plan activated via payment callback/webhook
  → resume into config steps inline (quiz → pillars → control pref → image brief)
  → dashboard
```

The preview appears **before** payment: it cements the purchase and, if it disappoints, the user bails *before* being charged rather than refunding after. If the user abandons after paying but before finishing config, they land on the dashboard as **paid-incomplete** (see nudges).

## Component reuse (required)

The four config steps (quiz, pillars, control preference, image brief) are built as **shared step components**, rendered identically in two places:
1. The paid inline config sequence (post-payment).
2. The dashboard "finish your profile" flow (free users, and paid users who abandoned config).

Each step is built once. Step 1 and Step 2 components are likewise reusable by the dashboard profile/settings edit surfaces where it makes sense.

## Completeness model

Two distinct signals — conflating them is the main correctness trap:

- **`onboarding_completed_at`** (`app/api/onboarding/save/route.ts:55`) — a binary flag that controls **routing** (e.g. the LinkedIn callback at `app/api/auth/linkedin/callback/route.ts:283` uses it to decide wizard vs dashboard). **Set this at core/minimal completion** (after Step 2 save) so returning users are never forced back through a wizard.
- **Profile completeness** — a **field-level** check (reuse the pattern in `lib/scoring.ts:51`) that drives the banner/nudge. "Complete" = MCQ answers present (all 5) **and** 3 content pillars **and** control preference set. (Identity + sample are always present post-core; image brief is informational and excluded.)

Derived states:
- **complete** — no banner, no nudge.
- **free-incomplete** — warn-only banner.
- **paid-incomplete** — stronger one-time nudge + banner (see below).

## Nudges

**Free-incomplete → warn-only banner.**
- Persistent, high-visibility banner on the dashboard **and** the generate screen.
- Copy warns, never blocks: e.g. *"Your posts get sharper once you finish your profile — add your content pillars, voice quiz, and preferences. [Finish profile →]"*
- "Finish profile →" routes into the shared config flow at the next unfilled step.

**Paid-incomplete → stronger one-time nudge + banner.**
- On the **first post-payment dashboard load** with an incomplete profile, show a **one-time, dismissible card** (more prominent than the banner, e.g. a modal/spotlight card): *"You're all set on [Plan] — take ~2 minutes to finish tuning your voice so every post sounds like you. [Finish now] [Later]"*.
- After dismissal, the standard banner remains until the profile is complete.
- Still **not** a hard gate — generation always works.
- Rationale: a paying customer with under-tuned output is a refund/churn risk, not just a lost freebie, so the nudge is louder than for free users.

## Payment-handling requirements

Because payment now sits *between* Step 2 and config, "has paid" and "profile complete" are separate events. To make the gap safe:

1. **Persist core before payment.** The save already runs before checkout (`app/onboarding/page.tsx:170`); make `/api/onboarding/save` accept **partial** (Step 1+2-only) data, with empty `mcq_answers`/`content_pillars`/`control_preference`. Voice fingerprint still generates from `writing_sample` (present), so voice is intact.
2. **Activate the plan from the payment callback/webhook, never from "finished onboarding."** Razorpay verify (`app/onboarding/page.tsx:215`); Dodo via webhook. The plan/trial must go active even if the user closes the tab immediately after paying. Conversely, the core save records the *selected* plan as intent only — the saved profile's actual entitlement stays **free-tier until the payment webhook/callback confirms**, so a user who abandons checkout is correctly treated as free-incomplete.
3. **Redirect post-payment into resume-config, not the dashboard.** Change the Razorpay success target (`app/onboarding/page.tsx:227`) to advance into config; set Dodo's return URL (in `/api/dodo/create-subscription`) to a resume route rather than `/dashboard`. This is the highest-leverage step for minimizing the paid-incomplete population — without it, intl (Dodo) users hit the dashboard+banner by default.
4. **Do not clear sessionStorage prematurely.** The `sessionStorage.removeItem(STORAGE_KEY)` at `app/onboarding/page.tsx:175` currently runs before checkout; move it so resume state survives until config is actually complete (or persist resume state server-side).
5. **Resume, never restart, never re-charge.** A "paid + config incomplete" state is distinct from "free + incomplete": the resume path skips the payment step entirely and drops the user at the next unfilled config step.

## Generation safety

Generation is never blocked by an incomplete profile. It already degrades gracefully (`lib/anthropic.ts`): falls back to the onboarding `writing_sample` as the voice exemplar and to `['Professional Insights']` when pillars are absent. Because the sample is always captured pre-dashboard, the voice fingerprint always exists; the banner/nudge accurately describes the remaining tuning gap.

## Analytics

Split the funnel so the two drop points are measured separately (they are different problems — revenue vs. quality/retention):
- `onboarding_started` (exists)
- `core_completed` / `minimal_completed` (new) — after Step 2 save
- `preview_generated` (new)
- `payment_completed` (paid branch)
- `config_completed` (new) — all config fields filled
- `profile_completed` event distinct from `onboarding_completed_at` routing flag

## Affected files / touch-points

- `app/onboarding/page.tsx` — split the linear 7-step machine into: core 2-step prelude → `?plan=` fork → (paid) payment after Step 2 → resumable config sequence. Read `?plan=` on mount. Remove the plan-selection step. Add preview rendering after Step 2.
- Landing page CTAs — route to `/onboarding?plan=…` (exact file to be confirmed in the plan).
- `app/api/onboarding/save/route.ts` — accept partial/staged saves; set `onboarding_completed_at` at core completion; expose field-level completeness.
- `/api/dodo/create-subscription` — return URL points at a resume route, not `/dashboard`.
- Preview generation — a lightweight call after Step 2 (identity + sample); confirm auth/runtime in the plan.
- Shared config step components — extract quiz / pillars / control-pref / image-brief steps for reuse.
- Banner component + missing-fields selector — dashboard + generate screen.
- Paid one-time nudge card — first post-payment dashboard load.
- Dashboard "finish your profile" entry — runs the shared config flow at the next unfilled step.
- `app/api/auth/linkedin/callback/route.ts` — routing keys off `onboarding_completed_at` (set at core completion), so behavior is preserved.

## Edge cases

- **Access codes** (`app/api/access-codes/apply`): a code unlocks a paid plan for free. Such users follow the **paid branch minus the payment call** (2 steps → activate via code → inline config), and get the paid-incomplete nudge if they bail. The "have a code?" entry moves to the landing page or an early step.
- **Payment failure / checkout abandonment:** core is already saved; the user lands on the **free-tier dashboard as free-incomplete** (warn-only banner) with a path to retry the upgrade. Never strand them.
- **Free → upgrade later:** when a free-incomplete user upgrades from the dashboard, treat it as a trigger for the stronger paid nudge.
- **Returning user (any branch):** `onboarding_completed_at` set at core completion → routed to dashboard, not the wizard; banner/nudge handles the rest.
- **Preview generation failure (transient API error):** Step 2 must not trap the user. Show a graceful fallback ("we'll generate your first post on the dashboard") and continue.
- **Missing/invalid `?plan=`:** default to the free branch.
- **Industry "Other":** existing custom-industry handling (`app/onboarding/page.tsx:107`) is preserved in the trimmed Step 1.

## Open questions to resolve during planning

- Exact endpoint/auth/runtime for the Step 2 preview generation (reuse `/api/posts/generate` vs. a trimmed preview-only path).
- Exact landing-page file(s) and CTA components to rewire.
- Precise field set and threshold for "profile complete" (proposed above: 5 MCQs + 3 pillars + control preference).
- Whether the paid nudge is a modal or an inline spotlight card (UX detail).

## Out of scope (YAGNI)

- LinkedIn auto-import / scraping.
- Changes to generation, pricing, or tier limits.
- Re-onboarding existing users (this targets new signups; existing users are governed by the same completeness model and will simply see the banner if their profile is incomplete).
