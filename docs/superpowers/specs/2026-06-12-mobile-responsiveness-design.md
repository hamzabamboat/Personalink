# Mobile / responsive hardening — design

- **Date:** 2026-06-12
- **Status:** Draft for review (designed autonomously; scope calls made by Claude — confirm on return)
- **Area:** Dashboard-wide CSS (`app/globals.css`) + specific screens (calendar, generate, posts, settings, story-bank, analytics, upload)
- **Author:** Hamza (with Claude)

## Problem

On small screens, content **bleeds and overflows**. The reported case (screenshots):
the Calendar day-detail panel runs post text off the right edge. The goal is broader —
*"the entire app should look good on any phone / tablet / laptop: no text bleeding, no
overlap, alignments fit."*

## Audit (from earlier exploration)

- **Styling system:** Tailwind + design-token CSS, with `app/globals.css` authoritative
  for the dashboard (`.db-screen`, `.pt-row`, calendar, etc.). `public/dashboard.css` and
  `public/styles.css` are **legacy/unused** (not linked). Viewport meta is correct
  (`width=device-width`). Breakpoints are Tailwind defaults; safe-area insets handled.
- **Root cause of the reported bleed:** the Calendar **day-detail panel** renders post
  text with **no word-break / overflow-wrap**, so a long unbroken string overflows the
  panel's right edge on narrow screens (`app/dashboard/calendar/page.tsx`, post-content
  paragraph in the slide-in panel). The in-grid day cells already `truncate`, so they're
  fine; the panel is the offender.
- **Secondary risks:** inline fixed widths and flex children without `min-width: 0`
  scattered across screens (a flex child with long text won't shrink, forcing overflow);
  the generate page's two-column grid on very narrow widths; tables that rely on media
  queries (mostly OK).

## Approach

A **defensive global layer first, then targeted per-screen fixes** — cheapest path to
"nothing bleeds anywhere," then polish.

### 1. Global safety net (`app/globals.css`)

- **No horizontal page scroll:** ensure the dashboard scroll container uses
  `overflow-x: clip` (not `visible`) and `max-width: 100%`.
- **Text wrapping:** apply `overflow-wrap: anywhere` (and `word-break: break-word` where
  needed) to long-form text containers (post content, titles, `.pt-title em`, panel text).
  Add a small utility class (e.g. `.wrap-anywhere`) for reuse instead of per-element inline
  styles.
- **Flex shrink:** add `min-width: 0` to flex children that contain text (the classic
  "flex item won't shrink → overflow" fix), especially `.pt-row` cells and card rows.
- **Media imagery / code blocks:** `max-width: 100%` on images and pre/code.

These are low-risk, additive rules that fix the majority of bleed without touching JSX.

### 2. Targeted fixes

- **Calendar day-detail panel** (`calendar/page.tsx`): add `overflow-wrap: anywhere` +
  `max-width: 100%` to the post-content paragraph and its wrapper; ensure the panel itself
  is `max-width: 100vw` on mobile.
- **Generate page** (`generate/page.tsx`): verify the `gen-grid` collapses to one column
  below `sm`, and the editor textarea / option cards don't force width.
- **Posts list** (`posts/page.tsx`): confirm `.pt-row` columns wrap/scroll gracefully at
  narrow widths (the table→card media query exists; verify the new overdue rows + badges
  fit).

### 3. Per-screen sweep

Walk each dashboard screen at representative widths and fix any remaining overflow /
overlap / misalignment: **calendar, posts, generate, settings, story-bank, analytics,
upload, home/overview**. The implementation plan will enumerate concrete fixes per screen
(this is the iterative part).

## Verification

Manual at representative widths: **320, 375, 414, 768, 1024, 1440 px** (iPhone SE →
laptop). For each: no horizontal scrollbar, no text past the viewport edge, no overlapping
controls, aligned rows. (No e2e/visual-test harness exists in the repo; verification is
manual + build/typecheck. A Playwright screenshot pass is a possible later addition.)

## Non-goals

- Visual redesign / restyling — this is overflow & fit, not a facelift.
- Removing the unused `public/*.css` legacy files (noted as separate cleanup).
- New breakpoints or a CSS framework change.

## Sequencing (important)

The per-screen fixes touch `posts/page.tsx` and `generate/page.tsx` — the files changed by
open PRs **#14** and **#16**. To avoid merge conflicts, implement **after #14/#16 land**.
The **global safety-net layer (`globals.css`)** is independent of those PRs and can go
first as its own small PR if desired. The implementation plan should be written against the
post-merge `main` so its line anchors are accurate.

## Open scope call (for Hamza to confirm)

I scoped this as **"eliminate bleed/overflow/overlap across all dashboard screens"** — a
correctness/fit pass, not a redesign. If you want it to also include spacing/typography
polish or specific screens prioritized, say so and I'll fold it in.
