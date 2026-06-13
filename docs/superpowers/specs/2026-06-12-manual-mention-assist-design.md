# Manual mention assist — "Tag & post on LinkedIn" — design

- **Date:** 2026-06-12
- **Status:** Approved (pending spec review) — see "Sequencing" before implementing
- **Area:** Dashboard → Generate editor + Posts list (+ small post-status server support)
- **Author:** Hamza (with Claude)

## Why this exists (feasibility background)

Automated @mentions are **not possible** for PersonaLink's use case. Tagging a person
needs their `urn:li:person:…`, resolvable only via LinkedIn's **People Typeahead API**
— "restricted… granted to select developers only," requiring `r_organization_followers`
+ company-page admin, and only over an org's *own followers*. Tagging an arbitrary
company is the same: the **Organization Lookup API** needs `rw_organization_admin` +
ADMINISTRATOR role of that company. PersonaLink posts as individuals via `w_member_social`
on the legacy `ugcPosts` API — none of that access applies. (Sources: LinkedIn People
Typeahead API; Organization Lookup API, learn.microsoft.com, 2026.)

So the only robust way to let users tag **anyone** (people or companies) is to hand the
post to LinkedIn's **native composer**, which resolves mentions for the user.

## What we're building

A **"Tag & post on LinkedIn"** action that gets the post text into LinkedIn's composer,
plus a **"Mark as posted"** action to record the result. No LinkedIn API change.

### Action 1 — "Tag & post on LinkedIn"

Client helper `shareToLinkedIn(text)`:

- **Mobile / PWA** (`navigator.share` available): `navigator.share({ text })` → OS share
  sheet → user taps **LinkedIn** → LinkedIn composer opens with the text in it → user
  types `@` to tag and posts. Swallow `AbortError` (user-cancelled share) silently.
- **Desktop** (no `navigator.share`): `navigator.clipboard.writeText(text)`, then
  `window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank')`, then a
  toast: *"Post copied. In LinkedIn: paste (⌘/Ctrl+V), type @ to tag people, then post."*

The button calls the helper, then **auto-unschedules** the post to avoid the publish
cron sending a duplicate plain-text copy: set `status='draft'`, `scheduled_at=null`.
Toast: *"Taken off auto-schedule so it won't post twice — finish posting it on LinkedIn."*
(If the post was already `draft`/`published`, skip the unschedule.)

### Action 2 — "Mark as posted"

After posting manually on LinkedIn, the user clicks **Mark as posted**: set
`status='published'`, `published_at=now`. Toast: *"Marked as posted."* Available on any
non-published post (so it also doubles as a "record a manual post" control).

### Server support

Both actions are status transitions the current endpoints don't fully cover
(`/update` changes content/time but not status; `/schedule` only forward-schedules).
The plan will either extend `/api/posts/[id]/update` to accept an optional `status`
(+ `published_at`, `scheduled_at: null`) or add two tiny endpoints
(`/unschedule`, `/mark-posted`). Decide during writing-plans after reading the routes;
keep it minimal and guarded (user owns the post).

### Surfaces

- **Generate editor** (`app/dashboard/generate/page.tsx`): a "Tag & post on LinkedIn"
  button beside Schedule / Send Approval.
- **Posts list rows** (`app/dashboard/posts/page.tsx`): a LinkedIn-tag action on
  draft/scheduled rows; "Mark as posted" on non-published rows.

The platform logic lives once in `lib/share-to-linkedin.ts` (or a small client util),
unit-tested; the surfaces just call it.

## Non-goals

- Automated person/company mentions (LinkedIn-gated — see background).
- Pre-filling the LinkedIn composer via a share URL (unreliable; LinkedIn ignores
  arbitrary text params).
- Bulk "tag & post." Detecting `@` in text and nudging is a possible later enhancement.

## Testing

- Unit (vitest): `shareToLinkedIn` calls `navigator.share` when present; falls back to
  clipboard + `window.open` when not; swallows `AbortError`. (Mock `navigator`/`window`.)
- Status transitions verified by typecheck + manual (no route-test harness in repo).
- Manual: on mobile, the action opens the share sheet with the post text; on desktop it
  copies + opens LinkedIn; a scheduled post becomes a draft after use; "Mark as posted"
  flips it to Published.

## Sequencing (important)

Both surfaces are files already modified by **open PRs from this same effort**:
`generate/page.tsx` (PR #14, single-post) and `posts/page.tsx` (PR #16, overdue posts),
and `posts/page.tsx` also has a parallel session's WIP. Building this feature off
`origin/main` now would **conflict with #14 and #16** on merge.

**Recommendation:** land #14 and #16 first, then implement this off the updated `main`.
This spec is captured now so nothing is lost; implementation is deferred to a clean base.
(Alternative: stack on top of #16's branch and accept a dependency + manual conflict
resolution — not recommended.)
