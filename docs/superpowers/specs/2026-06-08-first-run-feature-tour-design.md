# First-Run Feature Tour — Design

**Date:** 2026-06-08
**Status:** Approved design, pending implementation plan
**Author:** Brainstormed with Hamza

## Goal

The first time a user reaches the dashboard, give them a guided, spotlight-style
walkthrough of the product's core features. The screen dims, one real control is
spotlighted at a time, and a coach card explains it. Advancing navigates the user
into each feature's real screen so they learn *how* to use it, not just where it
lives.

This is distinct from the existing `/onboarding` flow, which is a data-collection
wizard (identity + writing sample). The tour runs *after* onboarding, on the
dashboard itself.

## Decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| Scope | **Core tour — 7 stops** (not all ~11 nav items) |
| Behavior | **Walkthrough** — "Next" navigates into each feature's real screen and spotlights the real control |
| Start trigger | **Auto-start** on first dashboard visit, with a persistent **Skip tour** on every step |
| Remember state | **Account-level** — a `tour_completed_at` column on `user_profiles` (not localStorage) |
| Replay | **"Replay tour"** entry in the Help menu |
| Locked features | **Centered info card** (no navigation) describing the feature + soft "unlock on Standard" nudge |
| Build approach | **Custom engine** using framer-motion (already a dependency); no tour library |

## The 7 stops

Each stop targets a **stable, always-present** layout anchor on its page (not a
dynamic list item), because a brand-new user has empty states — no posts, no
suggestions yet. Targets are marked with `data-tour="…"` attributes added to real
elements.

| # | Stop | Route | Spotlight target | Card copy (draft) |
| --- | --- | --- | --- | --- |
| 1 | Welcome | `/dashboard` | *centered, no target* | "Welcome to PersonaLink, {firstName} — here's a 60-second tour." |
| 2 | Generate | `/dashboard/generate` | idea input (`data-tour="generate-input"`) | "Describe any idea in a line — we write the full post in your voice." |
| 3 | Posts | `/dashboard/posts` | posts panel/header (`data-tour="posts-panel"`) | "Every draft lands here to review, edit, and approve before it goes out." |
| 4 | Calendar | `/dashboard/calendar` | calendar view (`data-tour="calendar"`) | "Schedule posts across the week and keep a steady cadence." |
| 5 | Analytics | `/dashboard/analytics` | analytics panel (`data-tour="analytics"`) — **gated** | standard+: "Track reach and engagement on every post." free: centered info card + "Unlock on Standard." |
| 6 | Trending ideas | `/dashboard/suggestions` | suggestions panel (`data-tour="suggestions"`) | "Stuck for ideas? Fresh, trend-based prompts show up here." |
| 7 | Voice & profile | `/dashboard/profile` | voice settings (`data-tour="voice"`) | "Tune your voice, tone, and language anytime." |
| — | Closing | *(stays on last route)* | *centered, no target* | "You're all set! Generate your first post →" (CTA → `/dashboard/generate`). "Replay anytime from Help." |

**Plan adaptation:** any stop whose feature is locked for the current plan
(`minPlan` from `lib/pricing-config.ts`) is rendered as a centered info card and
does **not** navigate into the locked page (which would bounce to `/dashboard/upgrade`).
Currently this affects stop 5 (Analytics, `minPlan: standard`).

## Architecture

A small custom engine. No tour library — driver.js et al. are built for
single-page tours, and driving them across Next.js route changes plus restyling
their popovers to match the design tokens is more work than building exactly what
we need.

### Components (new — under `components/tour/`)

- **`TourProvider.tsx`** — React context + state machine. Holds `currentStepIndex`,
  `isActive`. Exposes `start()`, `next()`, `back()`, `skip()`, `finish()`. On
  step change: if the step's `route` differs from the current path, calls
  `router.push(route)`, then waits for the target element to mount before handing
  off to the overlay. Mounted inside `app/dashboard/layout.tsx`, fed `profile`.
- **`TourOverlay.tsx`** — the visual layer (framer-motion). Renders a full-viewport
  fixed dim with a "cutout" around the target rect (SVG mask or 4-rect frame),
  plus the coach card anchored near the target. Renders nothing when `!isActive`.
- **`use-tour.ts`** — `useTour()` hook for consumers (e.g., the Replay button).

### Config (new)

- **`lib/tour/steps.ts`** — the ordered step array:
  `{ id, route, target: string | 'center', title, body, placement?, requiresPlan? }`.
  Single source of truth for the tour; easy to reorder or extend.

### Targeting & navigation

- Real elements get `data-tour="…"` attributes on stable containers (see table).
- Between steps the engine navigates, then polls / observes for the target
  (timeout ~1.5s). The dashboard animates route changes via framer-motion
  `AnimatePresence mode="wait"` on `<main key={pathname}>`, so the engine must wait
  for the new page's target rather than measuring immediately.
- **Target missing → graceful fallback:** if the target never appears (page
  changed, empty state, element removed), the step falls back to a centered card
  with the same copy. The tour never traps the user on a missing anchor.

### Positioning

Lightweight, no new dependency. Measure the target's bounding rect, scroll it into
view, choose the side with the most room (sidebar items → right, topbar → below,
in-page → auto), clamp the card to the viewport, draw a small pointer toward the
target. Reposition on `resize` and `scroll`. Structured so a positioning lib
(`@floating-ui`) could be dropped in later if collision handling needs to be more
robust.

### Animation

framer-motion (existing): dim fades in, spotlight rect springs between targets,
card fades/slides in. Honors `prefers-reduced-motion` (instant transitions).

## Persistence & wiring

- **Migration** `supabase/migrations/20260608_add_tour_completed_at.sql` —
  `ALTER TABLE user_profiles ADD COLUMN tour_completed_at timestamptz;`
- **`lib/supabase.ts`** — add `tour_completed_at: string | null` to `UserProfile`.
- **`/api/me`** — no change needed; it already returns the profile via `select('*')`,
  so the new column flows to the client automatically.
- **Save endpoint** `app/api/me/tour/route.ts` (POST) — sets
  `tour_completed_at = now()` for the current user. Called on both finish and skip.
- **`app/dashboard/layout.tsx`** — mount `<TourProvider>` + `<TourOverlay>`; add
  auto-start effect; add a **"Replay tour"** action to the `WorkspaceSwitcher`
  dropdown menu, directly beneath the existing "Help & FAQ" item (it's an action
  that calls `start()`, not a route, so the dropdown is its natural home).

### Auto-start conditions

Fire once, when the dashboard first loads, only if **all** hold:

- `profile.tour_completed_at` is null (never finished/skipped), AND
- `profile.onboarding_completed_at` is set (they finished onboarding — don't tour a
  half-set-up account), AND
- not in agency mode (`agencyMode` is null — don't auto-launch while an agency is
  managing a client), AND
- the user is on the dashboard.

**Replay** calls `start()` directly; it does not require clearing the DB flag.

## Edge cases

- **Empty states:** new users have no posts/suggestions — targets are stable
  containers, with centered-card fallback if absent (covered above).
- **Resize / scroll:** overlay and card reposition live.
- **z-index:** the overlay sits above the sidebar, topbar, and their dropdowns
  (search/notifications are `z-50`); tour layer is above that.
- **Reduced motion:** transitions become instant.
- **Mobile:** the sidebar is a Sheet (hidden), so the tour relies on navigating to
  each page and spotlighting in-page controls — which works regardless of nav.
  Welcome/closing/locked cards are centered. Card is responsive (full-width-ish,
  bottom-anchored on small screens).
- **Navigation away mid-tour:** if the user manually navigates or closes, the tour
  pauses; it does not force-resume. (Skipping persists; pausing does not.)

## Files to add / change

**Add**
- `lib/tour/steps.ts`
- `components/tour/TourProvider.tsx`
- `components/tour/TourOverlay.tsx`
- `components/tour/use-tour.ts`
- `app/api/me/tour/route.ts`
- `supabase/migrations/20260608_add_tour_completed_at.sql`

**Change**
- `lib/supabase.ts` — add `tour_completed_at` to `UserProfile`
- `app/dashboard/layout.tsx` — mount provider/overlay, auto-start, Replay entry
- Target pages — add `data-tour` attributes to stable anchors:
  `app/dashboard/generate/page.tsx`, `app/dashboard/posts/page.tsx`,
  `app/dashboard/calendar/page.tsx`, `app/dashboard/analytics/page.tsx`,
  `app/dashboard/suggestions/page.tsx`, `app/dashboard/profile/page.tsx`

## Out of scope (YAGNI)

- Tours for secondary features (Story bank, Image library, Profile Beautifier,
  Settings) — Core tour only. The step config makes adding them later trivial.
- Branching/conditional tours beyond the plan-gating rule.
- Analytics events for tour funnel (could add `posthog.capture('tour_…')` later;
  not required for v1).
- Per-feature "tooltip hints" outside the guided tour.

## Testing approach

- Unit: step-advancement logic in `TourProvider` (next/back/skip bounds, plan
  gating selects info-card vs navigate, target-missing → fallback).
- Manual/preview: run the tour end-to-end on a fresh free-tier account (locked
  Analytics → info card) and a standard account (Analytics navigates), on desktop
  and mobile widths; verify Skip persists, Replay works, reduced-motion is honored.
