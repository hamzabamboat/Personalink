# Overdue / failed posts — "Needs attention" — design

- **Date:** 2026-06-12
- **Status:** Approved (pending spec review)
- **Area:** Dashboard → Posts (+ a small Calendar touch, + one endpoint tweak)
- **Author:** Hamza (with Claude)

## Problem

A scheduled post whose time has passed but never published sits in the posts list
looking identical to a healthy upcoming post — same colour, same "Scheduled" badge —
and can only be Edited or Deleted. There's no way to tell a *missed* post from a
*queued* one, and no quick way to put it back on the calendar. Posts that outright
**failed** to publish have the same problem and are only visible under the "All" tab.

## Scope / definition

A post **needs attention** (is "stuck") when either:

- **Overdue** — `status === 'scheduled'` AND `scheduled_at` is in the past (and, by
  definition of `scheduled`, never published), OR
- **Failed** — `status === 'failed'`.

Out of scope: `pending_approval` posts (they have their own approval flow and an
existing amber "Awaiting Approval" treatment).

## Why it happens (context, not changed here)

The publish cron ([app/api/cron/publish/route.ts](../../../app/api/cron/publish/route.ts))
only acts on `status='scheduled'` posts that are due. On failure it flips them to
`failed` (token expired, API error) or `pending_approval` (spam/risk) but leaves the
past `scheduled_at`; if it never publishes them (e.g. LinkedIn not connected) they
linger as `scheduled` with a past date. Either way nothing flags them. This change
**surfaces** the stuck posts and lets the user act — it does not change the cron.

## Design

### 1. Detection — pure, testable helper

New `lib/posts-attention.ts`:

```ts
export type AttentionKind = 'overdue' | 'failed' | null
export function postAttentionKind(
  post: { status: string; scheduled_at: string | null },
  now: Date,
): AttentionKind
```

- `'overdue'` when `status === 'scheduled' && scheduled_at && new Date(scheduled_at) < now`
- `'failed'` when `status === 'failed'`
- `null` otherwise (healthy upcoming, draft, published, pending_approval)

Boundary: a post scheduled exactly at/after `now` is **not** overdue. No schema
change, no migration — detection is computed from data the page already has.

### 2. Posts page — `app/dashboard/posts/page.tsx`

- **Clean the healthy "Scheduled" view:** the `scheduled` filter shows only healthy
  upcoming posts (`status==='scheduled' && scheduled_at >= now`). Overdue posts no
  longer mix in with queued ones.
- **New "⚠ Needs attention (N)" filter chip** in the filter row (red), where `N` is
  the stuck count. Selecting it lists overdue + failed posts.
- **Pin stuck posts at the top of the "All" view**, under a red header:
  *"⚠ Needs attention — these missed their time and won't post until you reschedule."*
  Each stuck post appears **once**, in this pinned group — it is removed from its
  normal chronological position in the list (no duplicates).
- **Per stuck row:** red left-accent + a red badge — **"Overdue"** for overdue,
  **"Failed"** for failed; the date renders in red. For failed posts, show
  `failure_reason` (e.g. "LinkedIn token expired"). Row actions become **Reschedule**
  (primary) + Edit + Delete.

### 3. Reschedule action

- The Reschedule button opens a date/time picker pre-filled with a suggested next slot
  (the user's next preferred day/hour, at least 30 minutes out). Implementation may
  reuse the existing edit dialog with an added `datetime-local`, or a small dedicated
  dialog — the plan decides.
- On confirm → `POST /api/posts/[id]/schedule { scheduledAt }`.
- After success the post leaves "Needs attention" and appears as a healthy upcoming
  scheduled post.

### 4. Endpoint tweak — `app/api/posts/[id]/schedule/route.ts`

The allowed-status guard currently accepts only `['approved','draft','pending_approval']`,
so it rejects `scheduled` and `failed`. **Add `'scheduled'` and `'failed'`** to that
list. The endpoint already sets `status='scheduled'`, `scheduled_at`,
`human_approved=true`, and syncs Google Calendar — exactly the desired result (a failed
or overdue post becomes a clean, queued post again). Keep the existing "≥ 30 minutes
from now" validation.

### 5. Calendar — small, secondary

In [app/dashboard/calendar/page.tsx](../../../app/dashboard/calendar/page.tsx),
past-dated `scheduled` posts and `failed` posts render in red on the grid, matching the
posts-page treatment so the two views agree. Lower priority than the posts page; if it
adds risk it can ship as a follow-up.

## What stays the same

- The publish cron, the `posts` schema, `/api/posts/[id]/update`, delete/edit flows.
- Healthy scheduled / draft / published rendering and the existing status colours.

## Caveat (surfaced in the UI)

Rescheduling a **failed** post simply queues it again; if the root cause persists
(e.g. an expired LinkedIn token) it can fail again. So failed rows show
`failure_reason`, and when the reason looks like an auth/token issue the row adds a
"Reconnect LinkedIn" hint — nudging the user to fix the cause, not just retry.

## Testing

- **Unit (vitest)** for `postAttentionKind`: `'overdue'` for scheduled+past, `'failed'`
  for failed, `null` for upcoming/draft/published/pending_approval; boundary at exactly
  `now` is not overdue.
- **Endpoint:** rescheduling a `scheduled` or `failed` post is now accepted; a time
  < 30 minutes out is still rejected.
- **Manual:** an overdue post appears only under "Needs attention" (not in healthy
  Scheduled); Reschedule moves it to a future slot and out of the group; a failed post
  shows its reason; the calendar shows past-due posts in red.

## Out of scope / follow-ups

- Auto-/bulk-rescheduling, overdue notifications/emails, and the cron auto-resetting
  failed posts. This change is **surface + manual reschedule** only.
