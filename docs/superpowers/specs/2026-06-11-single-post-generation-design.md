# Single-post generation — design

- **Date:** 2026-06-11
- **Status:** Approved (pending spec review)
- **Area:** Dashboard → Generate (single-post flow)
- **Author:** Hamza (with Claude)

## Problem

Generating a post from the Generate page produces **three** posts from one prompt
and **schedules all three** at three different times. The three are near-redundant
variants of the same idea, the user never asked for three, and on `autopilot` the
publish cron pushes all three live.

Root cause is entirely server-side:

- `generateLinkedInPosts()` instructs Claude to *"Write 3 different LinkedIn post
  options"* and parses the reply on `---POST N---` markers
  ([lib/anthropic.ts:294](../../../lib/anthropic.ts)).
- `/api/posts/generate` then runs the anti-AI-detection gate on all three, assigns
  each its own schedule slot, and inserts all three with a status derived from
  `control_preference` ([app/api/posts/generate/route.ts:202-311](../../../app/api/posts/generate/route.ts)).

The page already has an "Option 1 / 2 / 3 → choose a version" chooser, but it is
misleading: every option is *already saved and scheduled* before the user picks one.

## Decision

One prompt produces **one** post. That post is saved as a **draft** with a
**suggested time pre-filled**; nothing is scheduled until the user clicks
**Schedule**. (Chosen over a "3 options, pick 1" model after a cost analysis showed
the three variants come from a single Sonnet call, so the savings from dropping to
one come from output tokens — ~44% per generation — while a chooser added UI and
quota complexity for little benefit.)

## Goals

- A single prompt yields a single generated post.
- The post is **never auto-scheduled** from the Generate page; the user explicitly
  schedules it.
- The user can edit the post and the suggested time before scheduling.
- A clear one-click **Regenerate** for "try again."
- ~44% lower AI cost per generation (≈ ₹1.4 cold cache / ₹0.7 warm, down from ≈ ₹2.5).

## Non-goals (out of scope)

- The **bulk "plan a month"** generator (`/api/posts/generate-batch`) — it is meant
  to produce many posts and is unchanged.
- The **repurpose engine** (`repurposePost`, 3 angles) — different feature, unchanged.
- Re-tuning per-tier quota numbers (see Follow-ups).
- Mobile responsiveness and @mention tagging — separate workstreams.

## Design

### 1. Generation — `lib/anthropic.ts`

`generateLinkedInPosts()` is **shared** by five callers (single-generate, bulk
`generate-batch`, `bulk-generate`, `zapier/webhook`, `onboarding/preview`), so it
must not change behavior for them. Instead of hard-coding one post, add an optional
**`count`** to `GeneratePostOptions` (default `3`, preserving today's behavior for
every existing caller). Only the single-generate route passes `count: 1`.

- When `count === 1`: the user prompt asks for *"one LinkedIn post … return only the
  post text, no preamble, no labels"* and drops the `---POST N---` format. The existing
  splitter already collapses to one element when no markers are present, so the parser
  needs no change.
- When `count > 1`: unchanged multi-option prompt + `---POST N---` parsing.
- `max_tokens` scales with count (`count === 1` → ~1200; else 2500), trimming the
  ceiling for single posts.
- Return type stays `Promise<string[]>`; for `count: 1` it's a one-element array.
- Model/params otherwise unchanged (`claude-sonnet-4-5`, `temperature: 0.85`); the
  cached BASE_RULES + per-user system prompt is unchanged.

### 2. API — `app/api/posts/generate/route.ts`

The route already iterates over the returned array, so one post flows through
naturally (one gate run, one slot computed, one insert). Two behavioral changes:

- **Save as draft, do not auto-schedule.** Insert the post with `status: 'draft'`
  and `scheduled_at: null`, regardless of `control_preference`. Remove the
  `control_preference → status` branch and the immediate Google-Calendar sync from
  this path (sync happens later, when the user schedules via the existing
  `/api/posts/[id]/schedule`).
- **Return a suggested time.** Still call `buildScheduleSlots(now, 1, …)` to compute
  the next free slot, but return it as `suggestedScheduledAt` in the response
  instead of committing it. The publish cron only acts on `status = 'scheduled'`, so
  a draft never publishes — this is what makes "nothing hits the calendar" true.
  The suggested time is a **transient convenience** for the immediate editor session
  (used to pre-fill the picker); it is not persisted on the draft row. A draft opened
  later from All Posts simply has no pre-filled time, which is fine.
- **Quota unchanged.** `incrementUsage('posts_generated')` and
  `posts_used_this_month += 1` still fire once per generation (the metered unit is
  the AI call). See Follow-ups for the value-per-quota implication.
- Per-post follow-up work (humanizer gate, topic extraction, memory extraction,
  story-bank "converted" marking) is unchanged — it just runs once now.

Response shape: **keep** `{ posts: [<savedDraft>] }` (a one-element array) and **add**
`suggestedScheduledAt: <iso|null>`. Keeping the `posts` array means the other route
consumer — `app/welcome/_components/first-post.tsx`, which reads `data.posts[0]` —
needs **no change** (it just receives one post instead of three).

### 3. Page — `app/dashboard/generate/page.tsx`

- **Skip the chooser.** In `handleGenerate`, after the post returns, always
  `selectPost(post)` and pre-fill `scheduleDate` from `suggestedScheduledAt`. The
  "Option 1 / 2 / 3" chooser block ([page.tsx:1116-1143](../../../app/dashboard/generate/page.tsx))
  becomes unreachable in the normal path and is removed.
- **Reword the editor.** The selected-post view ([page.tsx:1146-1277](../../../app/dashboard/generate/page.tsx))
  stays, but:
  - The "Auto-scheduled to post …" banner ([page.tsx:1161-1174](../../../app/dashboard/generate/page.tsx))
    is replaced with a lighter "Suggested time — pick a time and hit **Schedule**"
    hint, since the draft is not scheduled yet.
  - The "← Choose different" button ([page.tsx:1150](../../../app/dashboard/generate/page.tsx))
    becomes **Regenerate**, which re-runs `handleGenerate` (one generation, one
    quota unit, same as today's Generate button).
- **Scheduling is unchanged.** Clicking **Schedule** still calls `/update` then
  `/schedule` on the draft's id, setting `scheduled_at` + `status = 'scheduled'`.
  "Send Approval Email Now" still works on the draft id.

### End-to-end flow

1. User enters a prompt (or voice note / story) and clicks **Generate**.
2. API: one Sonnet call → one post → humanizer gate (once) → insert as
   `draft`, `scheduled_at = null` → respond with the draft + `suggestedScheduledAt`.
3. Page opens the draft directly in the editor, time pre-filled.
4. User edits text/time and clicks **Schedule** → draft becomes `scheduled`; calendar
   syncs. Or clicks **Regenerate** to try again. Or leaves it as a draft in All Posts.

## What stays the same

- Humanizer gate ([lib/ai-detector.ts](../../../lib/ai-detector.ts)), topic and memory
  extraction, image suggestions, image attachment.
- `/api/posts/[id]/update`, `/schedule`, `/send-approval`.
- Bulk generator and repurpose engine.
- Rate limiter, circuit breaker, compliance scoring.

## Cost impact

One Sonnet call with ~one post's worth of output instead of three, plus the gate and
tagging running once. ≈ **₹1.4 / generation (cold cache), ≈ ₹0.7 (warm)** — down
~44% from ≈ ₹2.5 today. (Assumes Anthropic list pricing, ~2,400-token cached system
prompt, ~200-word posts, ₹84/$.)

## Consequences / follow-ups (flagged, not in this change)

- **Posts-per-quota drops 3×.** Today one generation inserts three posts; after this
  it inserts one. A free user (`posts_generated: 3`) goes from up to 9 posts/month to
  3. The three were near-duplicate variants, so the *useful* output is arguably
  similar, but the per-tier numbers (3 / 12 / 22 / 50) may want revisiting as a
  packaging decision. Raising them ~3× would roughly restore output but also ~3× the
  AI spend, eroding the savings — a deliberate trade for Hamza to make.
- **Abandoned drafts.** Generating without scheduling leaves a draft in All Posts.
  Treated as a feature (recoverable drafts), not clutter; revisit only if it becomes
  noisy.
- **Spend tracker undercount (pre-existing).** `trackAndCheckSpend` logs only the one
  Sonnet call per generation and ignores the Haiku gate / tagging calls
  ([lib/circuit-breaker.ts:91](../../../lib/circuit-breaker.ts)), so dashboards
  understate real AI cost. Out of scope here; noted for accuracy.

## Testing

- Unit: `generateLinkedInPosts` returns exactly one post for prompt, voice, and story
  inputs (mock the Anthropic client).
- API: `/api/posts/generate` inserts exactly one row with `status='draft'` and
  `scheduled_at=null`; response includes `suggestedScheduledAt`; quota increments by 1.
- Verify the publish cron does not pick up the draft (status gate).
- Manual: Generate → lands in editor with time pre-filled, nothing on calendar →
  Schedule → appears on calendar once → Regenerate replaces the draft view.
