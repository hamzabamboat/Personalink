# Overdue / Failed Posts ("Needs attention") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface stuck posts (scheduled-but-past, or failed) in the posts list as a distinct red "Needs attention" group, separated from healthy posts, each with a working Reschedule action.

**Architecture:** A pure helper classifies each post (`overdue` | `failed` | `null`). The posts page uses it to add a "Needs attention" filter, exclude overdue posts from the healthy "Scheduled" tab, pin stuck posts to the top, and render them red. Reschedule reuses the existing edit dialog's "Approve & Schedule" path (extended to accept `scheduled`/`failed` statuses) plus a one-line allow-list change in `/api/posts/[id]/schedule`.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-12-overdue-posts-design.md`

> **Execution note (parallel sessions):** `app/dashboard/posts/page.tsx`, `app/dashboard/calendar/page.tsx`, and `lib/supabase.ts` are currently dirty in the main checkout (a parallel session's WIP, unrelated to status/filter logic). Run this plan in an isolated worktree **off origin/main** (via `superpowers:using-git-worktrees`). `posts/page.tsx` is identical on origin/main and HEAD, so the edits below apply cleanly. The dedicated `/dashboard/calendar` page is intentionally **out of scope** here (it's dirty with parallel work) — see Follow-ups.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `lib/posts-attention.ts` | Classify a post as overdue / failed / healthy | Create |
| `lib/__tests__/posts-attention.test.ts` | Unit tests for the classifier | Create |
| `app/api/posts/[id]/schedule/route.ts` | Schedule/reschedule a post | Allow `scheduled` + `failed` statuses |
| `app/dashboard/posts/page.tsx` | Posts list + edit dialog | "Needs attention" filter, exclude overdue from Scheduled, pin + red styling, Reschedule button, dialog reschedule |

No schema change, no migration. Detection is computed client-side from data the page already loads.

---

### Task 1: `postAttentionKind` classifier

**Files:**
- Create: `lib/posts-attention.ts`
- Test: `lib/__tests__/posts-attention.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/posts-attention.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { postAttentionKind } from '../posts-attention'

const NOW = new Date('2026-06-12T12:00:00Z')
const past = '2026-06-10T09:00:00Z'
const future = '2026-06-20T09:00:00Z'

describe('postAttentionKind', () => {
  it('overdue: scheduled with a past time', () => {
    expect(postAttentionKind({ status: 'scheduled', scheduled_at: past }, NOW)).toBe('overdue')
  })
  it('null: scheduled in the future', () => {
    expect(postAttentionKind({ status: 'scheduled', scheduled_at: future }, NOW)).toBe(null)
  })
  it('null: scheduled exactly at now (boundary = upcoming)', () => {
    expect(postAttentionKind({ status: 'scheduled', scheduled_at: NOW.toISOString() }, NOW)).toBe(null)
  })
  it('failed: any failed post, regardless of time', () => {
    expect(postAttentionKind({ status: 'failed', scheduled_at: past }, NOW)).toBe('failed')
    expect(postAttentionKind({ status: 'failed', scheduled_at: null }, NOW)).toBe('failed')
  })
  it('null: healthy/other statuses', () => {
    expect(postAttentionKind({ status: 'draft', scheduled_at: null }, NOW)).toBe(null)
    expect(postAttentionKind({ status: 'published', scheduled_at: past }, NOW)).toBe(null)
    expect(postAttentionKind({ status: 'pending_approval', scheduled_at: past }, NOW)).toBe(null)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/posts-attention.test.ts`
Expected: FAIL — `Cannot find module '../posts-attention'`.

- [ ] **Step 3: Create the helper**

Create `lib/posts-attention.ts`:

```ts
export type AttentionKind = 'overdue' | 'failed' | null

/**
 * Classify a post that needs the user's attention:
 * - 'failed'  — publishing failed (status === 'failed')
 * - 'overdue' — still marked 'scheduled' but its time has already passed
 * - null      — healthy (upcoming scheduled, draft, published, pending_approval, …)
 */
export function postAttentionKind(
  post: { status: string; scheduled_at: string | null },
  now: Date = new Date(),
): AttentionKind {
  if (post.status === 'failed') return 'failed'
  if (post.status === 'scheduled' && post.scheduled_at && new Date(post.scheduled_at) < now) {
    return 'overdue'
  }
  return null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/posts-attention.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/posts-attention.ts lib/__tests__/posts-attention.test.ts
git commit -m "feat(posts): add postAttentionKind classifier (overdue/failed)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Allow rescheduling stuck posts in the schedule endpoint

**Files:**
- Modify: `app/api/posts/[id]/schedule/route.ts:29-34`

- [ ] **Step 1: Widen the allowed-status guard**

Replace lines 29-34. Old:

```ts
    if (!['approved', 'draft', 'pending_approval'].includes(post.status)) {
      return NextResponse.json(
        { error: 'Only approved or draft posts can be scheduled' },
        { status: 400 }
      )
    }
```

New:

```ts
    // Includes 'scheduled' (overdue) and 'failed' so the Reschedule action works.
    // The "≥ 30 minutes from now" check above guarantees a future time.
    if (!['approved', 'draft', 'pending_approval', 'scheduled', 'failed'].includes(post.status)) {
      return NextResponse.json(
        { error: "This post can't be scheduled from its current state." },
        { status: 400 }
      )
    }
```

The endpoint already sets `status='scheduled'`, the new `scheduled_at`, `human_approved=true`, and syncs Google Calendar — so a failed/overdue post becomes a clean queued post.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/posts/[id]/schedule/route.ts"
git commit -m "feat(posts): allow rescheduling scheduled/failed posts via /schedule

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Posts page — "Needs attention" filter, counts, ordering

**Files:**
- Modify: `app/dashboard/posts/page.tsx` (imports ~15-18; `FilterStatus` line 58; `filtered` 200-209; `tabCounts` 218-223; filter tabs 390-401; empty message 429-433)

- [ ] **Step 1: Import the classifier and two icons**

Replace the lucide import block (lines 15-18). Old:

```tsx
import {
  Plus, Zap, List, Calendar, FileText, ThumbsUp, Eye, MessageCircle,
  Pencil, Trash2, Sparkles, ImageIcon, X, CheckCircle2,
} from 'lucide-react'
```

New:

```tsx
import {
  Plus, Zap, List, Calendar, FileText, ThumbsUp, Eye, MessageCircle,
  Pencil, Trash2, Sparkles, ImageIcon, X, CheckCircle2, AlertTriangle, CalendarClock,
} from 'lucide-react'
import { postAttentionKind } from '@/lib/posts-attention'
```

- [ ] **Step 2: Add `attention` to the filter type**

Replace line 58. Old:

```tsx
type FilterStatus = 'all' | 'scheduled' | 'draft' | 'published'
```

New:

```tsx
type FilterStatus = 'all' | 'attention' | 'scheduled' | 'draft' | 'published'
```

- [ ] **Step 3: Compute `now`, add the `attention` filter, exclude overdue from Scheduled, pin stuck to top**

Replace the `filtered` block (lines 200-209). Old:

```tsx
  const filtered = sortedPosts.filter(p => {
    if (filter === 'all') return true
    if (filter === 'scheduled') return p.status === 'scheduled'
    if (filter === 'draft') return ['draft', 'pending_approval'].includes(p.status)
    if (filter === 'published') return p.status === 'published'
    return true
  }).filter(p => {
    if (!search.trim()) return true
    return p.content.toLowerCase().includes(search.toLowerCase())
  })
```

New:

```tsx
  const now = new Date()
  const filtered = sortedPosts
    .filter(p => {
      if (filter === 'all') return true
      if (filter === 'attention') return postAttentionKind(p, now) !== null
      // Healthy "Scheduled" excludes overdue posts (they live under Needs attention).
      if (filter === 'scheduled') return p.status === 'scheduled' && postAttentionKind(p, now) === null
      if (filter === 'draft') return ['draft', 'pending_approval'].includes(p.status)
      if (filter === 'published') return p.status === 'published'
      return true
    })
    .filter(p => !search.trim() || p.content.toLowerCase().includes(search.toLowerCase()))
    // Pin stuck posts to the top (stable within each group — time order preserved).
    .sort((a, b) => (postAttentionKind(a, now) ? 0 : 1) - (postAttentionKind(b, now) ? 0 : 1))
```

- [ ] **Step 4: Add the attention count to `tabCounts`**

Replace `tabCounts` (lines 218-223). Old:

```tsx
  const tabCounts: Record<FilterStatus, number> = {
    all: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    draft: posts.filter(p => ['draft', 'pending_approval'].includes(p.status)).length,
    published: posts.filter(p => p.status === 'published').length,
  }
```

New:

```tsx
  const tabCounts: Record<FilterStatus, number> = {
    all: posts.length,
    attention: posts.filter(p => postAttentionKind(p, now) !== null).length,
    scheduled: posts.filter(p => p.status === 'scheduled' && postAttentionKind(p, now) === null).length,
    draft: posts.filter(p => ['draft', 'pending_approval'].includes(p.status)).length,
    published: posts.filter(p => p.status === 'published').length,
  }
```

- [ ] **Step 5: Render the red "Needs attention" tab (only when there is something stuck)**

Replace the filter-tabs block (lines 390-401). Old:

```tsx
        <div className="filter-tabs">
          {(['all', 'scheduled', 'draft', 'published'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`ft${filter === f ? ' is-on' : ''}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <em>{tabCounts[f]}</em>
            </button>
          ))}
        </div>
```

New:

```tsx
        <div className="filter-tabs">
          {((tabCounts.attention > 0
            ? ['all', 'attention', 'scheduled', 'draft', 'published']
            : ['all', 'scheduled', 'draft', 'published']) as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`ft${filter === f ? ' is-on' : ''}`}
              style={f === 'attention' ? { color: '#ef4444' } : undefined}
            >
              {f === 'attention' && <AlertTriangle style={{ width: 13, height: 13, marginRight: 4, verticalAlign: '-2px' }} />}
              {f === 'attention' ? 'Needs attention' : f.charAt(0).toUpperCase() + f.slice(1)}
              <em>{tabCounts[f]}</em>
            </button>
          ))}
        </div>
```

- [ ] **Step 6: Friendly empty-state for the attention filter**

Replace the empty-message expression (lines 429-433). Old:

```tsx
                {filter !== 'all'
                  ? `No ${filter} posts yet.`
                  : search
                  ? 'No posts match your search.'
                  : 'Generate your first post to get started.'}
```

New:

```tsx
                {filter === 'attention'
                  ? 'Nothing needs attention — all your scheduled posts are on track.'
                  : filter !== 'all'
                  ? `No ${filter} posts yet.`
                  : search
                  ? 'No posts match your search.'
                  : 'Generate your first post to get started.'}
```

- [ ] **Step 7: Typecheck + commit**

Run: `npx tsc --noEmit`  → no errors.

```bash
git add app/dashboard/posts/page.tsx
git commit -m "feat(posts): Needs-attention filter, exclude overdue from Scheduled, pin stuck

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Posts page — red row styling + Reschedule (list view + edit dialog)

**Files:**
- Modify: `app/dashboard/posts/page.tsx` (`openEdit` 97-102; list row 466-490 + 505-515; dialog button 319-334)

- [ ] **Step 1: `openEdit` suggests a future slot for stuck posts**

Replace `openEdit` (lines 97-102). Old:

```tsx
  function openEdit(post: Post) {
    setEditingPost(post)
    setEditContent(post.content)
    setEditSchedule(post.scheduled_at ? utcToLocalInput(post.scheduled_at) : '')
    setEditImages([])
  }
```

New:

```tsx
  function openEdit(post: Post) {
    setEditingPost(post)
    setEditContent(post.content)
    // Stuck posts (overdue/failed) have a useless past time — suggest tomorrow 09:00.
    const stuck = postAttentionKind(post, new Date()) !== null
    if (post.scheduled_at && !stuck) {
      setEditSchedule(utcToLocalInput(post.scheduled_at))
    } else {
      const s = new Date()
      s.setDate(s.getDate() + 1)
      s.setHours(9, 0, 0, 0)
      setEditSchedule(utcToLocalInput(s.toISOString()))
    }
    setEditImages([])
  }
```

- [ ] **Step 2: Classify the row + red row tint + failure reason**

Replace the start of the row render (lines 466-472). Old:

```tsx
              return (
                <div key={post.id} className="pt-row">
                  {/* Title + snippet */}
                  <div className="pt-title">
                    <strong>{post.content_pillar || 'Post'}</strong>
                    <em>{post.content}</em>
                  </div>
```

New:

```tsx
              const kind = postAttentionKind(post, now)
              return (
                <div key={post.id} className="pt-row" style={kind ? { borderLeft: '3px solid #ef4444', background: 'color-mix(in oklab, #ef4444 5%, transparent)' } : undefined}>
                  {/* Title + snippet */}
                  <div className="pt-title">
                    <strong>{post.content_pillar || 'Post'}</strong>
                    <em>{post.content}</em>
                    {kind === 'failed' && post.failure_reason && (
                      <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 500 }}>⚠ {post.failure_reason}</span>
                    )}
                  </div>
```

- [ ] **Step 3: Red date for overdue**

Replace the scheduled-date block (lines 474-480). Old:

```tsx
                  {/* Scheduled date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{scheduledDate}</span>
                    {scheduledTime && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{scheduledTime}</span>
                    )}
                  </div>
```

New:

```tsx
                  {/* Scheduled date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ color: kind === 'overdue' ? '#ef4444' : 'var(--ink-2)', fontWeight: 500 }}>{scheduledDate}</span>
                    {scheduledTime && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: kind === 'overdue' ? '#ef4444' : 'var(--ink-4)' }}>{scheduledTime}</span>
                    )}
                  </div>
```

- [ ] **Step 4: Red "Overdue"/"Failed" badge**

Replace the status badge (lines 487-490). Old:

```tsx
                  {/* Status badge */}
                  <span className={statusStateClass(post.status)}>
                    {STATUS_LABEL[post.status] || post.status}
                  </span>
```

New:

```tsx
                  {/* Status badge */}
                  {kind ? (
                    <span className="state state--review" style={{ color: '#ef4444', background: 'color-mix(in oklab, #ef4444 12%, transparent)' }}>
                      {kind === 'overdue' ? 'Overdue' : 'Failed'}
                    </span>
                  ) : (
                    <span className={statusStateClass(post.status)}>
                      {STATUS_LABEL[post.status] || post.status}
                    </span>
                  )}
```

- [ ] **Step 5: Reschedule button on stuck rows**

Replace the start of the actions block (lines 505-515). Old:

```tsx
                  <div className="pt-more" style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
                    {['pending_approval', 'draft', 'approved'].includes(post.status) && (
                      <button
                        onClick={() => approveSchedule(post)}
                        className="btn-dash btn-dash--sm"
                        title="Approve & schedule"
                        style={{ background: '#10b981', color: '#fff', border: 'none' }}
                      >
                        <CheckCircle2 />
                      </button>
                    )}
```

New:

```tsx
                  <div className="pt-more" style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
                    {kind && (
                      <button
                        onClick={() => openEdit(post)}
                        className="btn-dash btn-dash--sm"
                        title="Reschedule"
                        style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                      >
                        <CalendarClock />
                      </button>
                    )}
                    {['pending_approval', 'draft', 'approved'].includes(post.status) && (
                      <button
                        onClick={() => approveSchedule(post)}
                        className="btn-dash btn-dash--sm"
                        title="Approve & schedule"
                        style={{ background: '#10b981', color: '#fff', border: 'none' }}
                      >
                        <CheckCircle2 />
                      </button>
                    )}
```

- [ ] **Step 6: Make the dialog's primary button reschedule stuck posts**

Replace the dialog primary button (lines 319-334). Old:

```tsx
            {editingPost && ['draft', 'pending_approval', 'approved'].includes(editingPost.status) && (
              <button
                onClick={saveAndSchedule}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 transition-opacity"
                style={{
                  background: '#10b981', color: '#fff',
                  borderRadius: 'var(--r-sm)', padding: '10px 16px',
                  fontSize: 14, fontWeight: 600,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                {saving ? 'Working…' : 'Approve & Schedule'}
              </button>
            )}
```

New:

```tsx
            {editingPost && ['draft', 'pending_approval', 'approved', 'scheduled', 'failed'].includes(editingPost.status) && (
              <button
                onClick={saveAndSchedule}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 transition-opacity"
                style={{
                  background: '#10b981', color: '#fff',
                  borderRadius: 'var(--r-sm)', padding: '10px 16px',
                  fontSize: 14, fontWeight: 600,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                {saving ? 'Working…' : ['scheduled', 'failed'].includes(editingPost.status) ? 'Reschedule' : 'Approve & Schedule'}
              </button>
            )}
```

`saveAndSchedule` already calls `/update` then `/schedule`; with Task 2's allow-list change, rescheduling a `scheduled`/`failed` post now succeeds (status reset to `scheduled` at the new time).

- [ ] **Step 7: Typecheck + commit**

Run: `npx tsc --noEmit`  → no errors.

```bash
git add app/dashboard/posts/page.tsx
git commit -m "feat(posts): red Overdue/Failed rows + Reschedule action in list and dialog

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Posts page — red badge in the in-page calendar view

**Files:**
- Modify: `app/dashboard/posts/page.tsx` (calendar-view status badge, lines 580-583)

- [ ] **Step 1: Red Overdue/Failed badge in the calendar view**

Replace the calendar-view status badge (lines 580-583). Old:

```tsx
                      <span className={statusStateClass(post.status)}>
                        {STATUS_LABEL[post.status]}
                      </span>
```

New:

```tsx
                      {postAttentionKind(post, now) ? (
                        <span className="state state--review" style={{ color: '#ef4444', background: 'color-mix(in oklab, #ef4444 12%, transparent)' }}>
                          {postAttentionKind(post, now) === 'overdue' ? 'Overdue' : 'Failed'}
                        </span>
                      ) : (
                        <span className={statusStateClass(post.status)}>
                          {STATUS_LABEL[post.status]}
                        </span>
                      )}
```

(The pencil Edit button already present on these rows opens the dialog, which now offers Reschedule — so no separate button is needed here.)

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit`  → no errors.

```bash
git add app/dashboard/posts/page.tsx
git commit -m "feat(posts): red Overdue/Failed badge in the calendar view too

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all pass, including `posts-attention.test.ts` (5 tests).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit` → clean.

- [ ] **Step 3: Build**

Run: `npm run build` (symlink `.env.local` from the main checkout first if collection fails on env: `ln -s /Users/hamza/Personalink/.env.local .env.local`).
Expected: build succeeds.

- [ ] **Step 4: Lint delta (no new errors)**

Run: `npx eslint app/dashboard/posts/page.tsx` and confirm no *new* errors versus the base (the file already has pre-existing `// label` `react/jsx-no-comment-textnodes` warnings; your changes should add none).

- [ ] **Step 5: Manual smoke**

With a post that is `scheduled` in the past (or `failed`):
1. Posts page shows a red **"Needs attention (N)"** tab; the post appears there and is **pinned at the top** of "All", with a red row, an **"Overdue"**/**"Failed"** badge, and (for failed) its reason.
2. It no longer appears under the plain **"Scheduled"** tab.
3. Click **Reschedule** (red calendar button) → dialog opens with tomorrow 09:00 pre-filled → confirm → the post leaves "Needs attention" and shows as a normal upcoming Scheduled post.
4. The in-page **Calendar** view shows the same red badge.

---

## Self-Review

**Spec coverage:**
- Overdue + failed both treated → Task 1 classifier (`'overdue'`/`'failed'`); used everywhere. ✓
- Separated from healthy → Task 3 (attention filter + Scheduled excludes overdue + pin-to-top). ✓
- Marked red → Task 4 (row tint, badge, date) + Task 5 (calendar badge). ✓
- Reschedule action → Task 4 (row button + dialog button) + Task 2 (endpoint allow-list). ✓
- Failure reason surfaced → Task 4 Step 2. ✓
- No schema change → confirmed (client-side classification). ✓

**Placeholder scan:** none — every step shows exact old/new code and exact commands.

**Type consistency:** `postAttentionKind(post, now)` signature is identical across helper, posts page, and tests; `AttentionKind` values `'overdue' | 'failed' | null` are used consistently; `FilterStatus` includes `'attention'` everywhere it's referenced (`filtered`, `tabCounts`, tab list).

**Follow-ups (not in this plan):**
- The dedicated `/dashboard/calendar` page red styling — deferred (that file has parallel WIP; doing it here would risk a merge conflict). Cheap to add later via the same `postAttentionKind` helper.
- A "Reconnect LinkedIn" inline hint when `failure_reason` is a token/auth issue (spec mentions it; can be a small enhancement on Task 4 Step 2).
- Optionally have the publish cron itself flag/skip long-overdue posts.
