# Single-Post Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Generate page produce **one** post per prompt, saved as an unscheduled draft with a suggested time the user confirms — instead of three posts auto-scheduled at three times.

**Architecture:** Add an optional `count` to the shared `generateLinkedInPosts()` (default 3, so bulk/Zapier/onboarding are untouched); the single-generate route passes `count: 1`, saves the one post as a `draft` with `scheduled_at = null`, and returns a non-committal `suggestedScheduledAt`. The Generate page opens that draft directly in its existing editor with the time pre-filled; the user edits and clicks **Schedule** (which already exists) to commit it. The publish cron only acts on `status = 'scheduled'`, so nothing reaches the calendar until the user acts.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Supabase, Anthropic SDK, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-11-single-post-generation-design.md`

> **Execution note (parallel sessions):** another session may share this working
> directory. Execute this plan in an isolated git worktree/branch (via
> `superpowers:using-git-worktrees`) and commit there — do not commit piecemeal into
> the shared tree. Bring the spec + this plan into the worktree as the first commit.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `lib/anthropic.ts` | `generateLinkedInPosts()` — builds the Claude prompt and parses variants | Add `count` option; branch prompt + `max_tokens` on it |
| `lib/__tests__/generate-post-count.test.ts` | Unit test for the `count` behavior | Create |
| `app/api/posts/generate/route.ts` | Single-post generation endpoint | Pass `count: 1`; save one `draft` (`scheduled_at = null`); return `suggestedScheduledAt`; drop control-pref status + immediate calendar sync |
| `app/dashboard/generate/page.tsx` | Generate UI | Auto-open the single draft in the editor; pre-fill suggested time; "Choose different" → "Regenerate"; remove the now-dead chooser |

**Unaffected on purpose:** `generate-batch`, `bulk-generate`, `zapier/webhook`, `onboarding/preview` (all omit `count` → keep getting 3), and `app/welcome/_components/first-post.tsx` (keeps reading `data.posts[0]`).

---

### Task 1: Add `count` option to `generateLinkedInPosts`

**Files:**
- Modify: `lib/anthropic.ts` (type `GeneratePostOptions` ~lines 20-35; function body lines 239-320)
- Test: `lib/__tests__/generate-post-count.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/generate-post-count.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.mock is hoisted; create the spy via vi.hoisted so the factory can close over it.
const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(async (..._args: unknown[]) => ({
    content: [{ type: 'text', text: 'A single generated post body.' }],
  })),
}))

// Mock the Anthropic SDK so `new Anthropic()` yields our spy and no real API/key is needed.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: (...a: unknown[]) => createMock(...a) }
  },
}))
// Insurance: keep the supabase value-import (UserProfile is type-only) from initialising a client.
vi.mock('../supabase', () => ({}))

import { generateLinkedInPosts } from '../anthropic'
import type { UserProfile } from '../supabase'

const profile = {
  name: 'Test', role: 'Founder', industry: 'SaaS', content_pillars: ['Leadership'],
} as unknown as UserProfile

function lastCall() {
  return createMock.mock.calls[0][0] as { max_tokens: number; messages: { content: string }[] }
}

beforeEach(() => createMock.mockClear())

describe('generateLinkedInPosts count', () => {
  it('count: 1 asks for a single post and returns exactly one element', async () => {
    const posts = await generateLinkedInPosts({ profile, topic: 'startup pricing', count: 1 })
    const userPrompt = lastCall().messages[0].content.toLowerCase()
    expect(userPrompt).toContain('one linkedin post')
    expect(userPrompt).not.toContain('3 different')
    expect(lastCall().max_tokens).toBeLessThanOrEqual(1200)
    expect(posts).toHaveLength(1)
    expect(posts[0]).toBe('A single generated post body.')
  })

  it('default (no count) keeps the 3-option behavior', async () => {
    await generateLinkedInPosts({ profile, topic: 'startup pricing' })
    expect(lastCall().messages[0].content).toContain('3 different')
    expect(lastCall().max_tokens).toBe(2500)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/generate-post-count.test.ts`
Expected: the `count: 1` test FAILS — the current prompt always says "3 different" and `max_tokens` is 2500, so `expect(userPrompt).toContain('one linkedin post')` fails.
(If it instead errors on *import/module load*, add `vi.mock('./prompts/base-rules', () => ({ BASE_RULES: 'rules' }))` — but the supabase mock above should be enough.)

- [ ] **Step 3: Add `count` to the options type**

In `lib/anthropic.ts`, in `type GeneratePostOptions` (ends ~line 35), add the field before the closing brace:

```ts
  /** Language mode applied additively on top of the voice fingerprint. */
  locale?: LocaleId
  /** How many post variants to generate. Default 3 (bulk/other callers). Single-generate passes 1. */
  count?: number
}
```

- [ ] **Step 4: Branch the prompt and max_tokens on `count`**

In `generateLinkedInPosts`, update the destructure (line 240) to include `count`:

```ts
  const { profile, topic, transcript, storyText, additionalContext, trendingContext, recentTopics, recentTopicsByPillar, userMemories, imageContext, voiceExemplars, locale = 'english', count = 3 } = options
```

Then replace the `userPrompt` block and the `max_tokens` line (lines 290-311). Old:

```ts
  const userPrompt = `${sourceContext}
${additionalContext ? `\nAdditional instructions: ${additionalContext}` : ''}
${trendingContext ? `\nTrending context to weave in naturally: ${trendingContext}` : ''}

Write 3 different LinkedIn post options with different angles/hooks. Format:

---POST 1---
[post content]

---POST 2---
[post content]

---POST 3---
[post content]`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2500,
    temperature: 0.85,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  })
```

New:

```ts
  const promptHead = `${sourceContext}
${additionalContext ? `\nAdditional instructions: ${additionalContext}` : ''}
${trendingContext ? `\nTrending context to weave in naturally: ${trendingContext}` : ''}`

  const variantInstruction = count === 1
    ? `\n\nWrite one LinkedIn post. Return only the post text — no preamble, no labels, no options.`
    : `\n\nWrite ${count} different LinkedIn post options with different angles/hooks. Format:\n\n${
        Array.from({ length: count }, (_, i) => `---POST ${i + 1}---\n[post content]`).join('\n\n')
      }`

  const userPrompt = promptHead + variantInstruction

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: count === 1 ? 1200 : 2500,
    temperature: 0.85,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  })
```

The parser below (`responseText.split(/---POST \d+---/)…`) is unchanged: with no markers it returns `[responseText.trim()]` — exactly one element.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/generate-post-count.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add lib/anthropic.ts lib/__tests__/generate-post-count.test.ts
git commit -m "feat(generate): add count option to generateLinkedInPosts (default 3)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Single-generate route returns one draft + a suggested time

**Files:**
- Modify: `app/api/posts/generate/route.ts` (lines 191-198, 232, 234-311, 363)

> No unit test: this route depends on Supabase, auth, trends, the AI gate, and the
> circuit breaker, and the repo has no route-test harness (all tests are pure-function).
> Verified by typecheck + manual run in Task 4. Keep the change minimal and exact.

- [ ] **Step 1: Request a single variant**

Replace the `generateLinkedInPosts({…})` call (lines 191-198):

```ts
  const posts = await generateLinkedInPosts({
    profile, topic, transcript, storyText, additionalContext, trendingContext,
    recentTopics, recentTopicsByPillar,
    userMemories: userMemories || undefined,
    imageContext,
    voiceExemplars,
    locale,
    count: 1,
  })
```

- [ ] **Step 2: Compute a suggested slot instead of committing slots**

Replace line 232. Old:

```ts
  const slots = buildScheduleSlots(now, validPosts.length, preferredHour, preferredDays, takenDateStrings, timezone)
```

New:

```ts
  // Suggested time only — pre-fills the editor's picker. NOT committed to the post.
  const suggestedSlots = buildScheduleSlots(now, 1, preferredHour, preferredDays, takenDateStrings, timezone)
  const suggestedScheduledAt = suggestedSlots[0]?.toISOString() ?? null
```

- [ ] **Step 3: Always save as a draft (drop control-preference status)**

Replace the control-preference block (lines 234-242). Old:

```ts
  // Mirror generate-batch's behavior: respect the user's control_preference.
  // autopilot → posts go straight to 'scheduled' and the publish cron handles them.
  // suggest  → posts stay as 'draft' (user has to act).
  // approve  → posts wait for the approval email link (or dashboard click).
  const controlPreference: string = (profile.control_preference as string) || 'approve'
  const postStatus: 'scheduled' | 'draft' | 'pending_approval' =
    controlPreference === 'autopilot' ? 'scheduled'
    : controlPreference === 'suggest' ? 'draft'
    : 'pending_approval'
```

New:

```ts
  // Single-generate always saves an unscheduled DRAFT. Nothing reaches the calendar
  // until the user clicks Schedule in the editor. Hands-off automation lives in the
  // bulk/month flow, not here.
  const postStatus = 'draft' as const
```

- [ ] **Step 4: Insert the draft with no committed schedule, and drop the calendar sync**

In the `validPosts.map(async (gate, idx) => {…})` block (lines 246-310):

(a) Change the callback signature and remove the `scheduledAt` line. Old:

```ts
    validPosts.map(async (gate, idx) => {
      const content = gate.content
      const scores = analyzeContent(content)
      const similarityScore = calculateSimilarityScore(content, recentContents)
      const scheduledAt = slots[idx]?.toISOString() ?? null
```

New:

```ts
    validPosts.map(async (gate) => {
      const content = gate.content
      const scores = analyzeContent(content)
      const similarityScore = calculateSimilarityScore(content, recentContents)
      const scheduledAt = null
```

(b) `fullRow` and `minimalRow` already use `status: postStatus` and `scheduled_at: scheduledAt` — now `'draft'` and `null` respectively, so they need no further edit.

(c) Remove the Google-Calendar sync block (lines 299-307), since drafts have no schedule:

```ts
      // Sync to Google Calendar immediately (non-blocking)
      if (scheduledAt && result.data) {
        syncPostToCalendar(user.id, {
          id: result.data.id,
          content: result.data.content,
          scheduled_at: scheduledAt,
          google_calendar_event_id: null,
        })
      }

```

Delete that block entirely. (Calendar sync happens later via the existing `/api/posts/[id]/schedule` when the user schedules.)

- [ ] **Step 5: Return the suggested time alongside the post**

Replace the success return (line 363). Old:

```ts
  return NextResponse.json({ posts: savedPosts })
```

New:

```ts
  return NextResponse.json({ posts: savedPosts, suggestedScheduledAt })
```

- [ ] **Step 6: Remove the now-unused import (if the linter flags it)**

`syncPostToCalendar` (imported at line 17) is no longer used in this file. Remove its import line:

```ts
import { syncPostToCalendar } from '@/lib/google-calendar'
```

(Verify with `npx eslint app/api/posts/generate/route.ts` — delete the import only if it reports `syncPostToCalendar` unused.)

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `app/api/posts/generate/route.ts`.

- [ ] **Step 8: Commit**

```bash
git add app/api/posts/generate/route.ts
git commit -m "feat(generate): single-generate saves one unscheduled draft + suggested time

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Generate page opens the draft directly, with Regenerate

**Files:**
- Modify: `app/dashboard/generate/page.tsx` (`selectPost` ~703; `handleGenerate` ~692-696; editor header ~1150; suggested-time banner ~1161-1174; chooser block ~1116-1143)

- [ ] **Step 1: Let `selectPost` accept a suggested time**

Replace the `selectPost` signature + the `setScheduleDate` line (lines 703-707). Old:

```ts
  function selectPost(post: { id: string; content: string; scheduled_at?: string | null; image_urls?: string[] | null }) {
    setSelectedPost(post)
    setEditContent(post.content)
    setActionResult('')
    setScheduleDate(post.scheduled_at ? utcToLocalInput(post.scheduled_at) : '')
```

New:

```ts
  function selectPost(post: { id: string; content: string; scheduled_at?: string | null; image_urls?: string[] | null }, suggestedScheduledAt?: string | null) {
    setSelectedPost(post)
    setEditContent(post.content)
    setActionResult('')
    setScheduleDate(
      post.scheduled_at ? utcToLocalInput(post.scheduled_at)
      : suggestedScheduledAt ? utcToLocalInput(suggestedScheduledAt)
      : ''
    )
```

- [ ] **Step 2: Auto-open the single post after generation**

Replace the tail of `handleGenerate` (lines 692-696). Old:

```ts
      const posts = data.posts as Array<{ id: string; content: string }> | undefined
      if (!posts?.length) { setError('No posts generated. Please try again.'); return }
      setGeneratedPosts(posts)
      posthog.capture('language_mode_selected', { locale, surface: 'generator' })
      if (overrideStoryId || initStoryId) selectPost(posts[0])
```

New:

```ts
      const posts = data.posts as Array<{ id: string; content: string }> | undefined
      if (!posts?.length) { setError('No posts generated. Please try again.'); return }
      setGeneratedPosts(posts)
      posthog.capture('language_mode_selected', { locale, surface: 'generator' })
      // One post per prompt: open it straight in the editor with the suggested time
      // pre-filled. It's a draft — nothing is scheduled until the user hits Schedule.
      selectPost(posts[0], (data.suggestedScheduledAt as string | null) ?? null)
```

- [ ] **Step 3: Turn "Choose different" into "Regenerate"**

Replace the editor-header button (lines 1150-1152). Old:

```tsx
                <button onClick={() => { posthog.capture('post_skipped', { post_id: selectedPost.id }); setSelectedPost(null) }} className="btn-dash btn-dash--ghost btn-dash--sm">
                  <ArrowLeft size={12} /> Choose different
                </button>
```

New:

```tsx
                <button onClick={() => { posthog.capture('post_regenerated', { post_id: selectedPost.id }); handleGenerate() }} disabled={loading} className="btn-dash btn-dash--ghost btn-dash--sm">
                  <Sparkles size={12} /> Regenerate
                </button>
```

(`Sparkles` and `handleGenerate` are already in scope. `handleGenerate` resets `selectedPost` and re-runs from the current inputs.)

- [ ] **Step 4: Reword the schedule banner as a non-committal suggestion**

Replace the banner block (lines 1161-1174). Old:

```tsx
              {/* Scheduled date banner */}
              {selectedPost?.scheduled_at && actionResult !== 'scheduled' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <CalendarClock size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af' }}>Auto-scheduled to post</div>
                    <div style={{ fontSize: 12, color: '#1d4ed8' }}>
                      {new Date(selectedPost.scheduled_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {' at '}
                      {new Date(selectedPost.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      {' · Approval email sent 1–2 hrs before'}
                    </div>
                  </div>
                </div>
              )}
```

New:

```tsx
              {/* Suggested-time hint — the post is a draft until the user schedules it */}
              {scheduleDate && actionResult !== 'scheduled' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <CalendarClock size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: '#1d4ed8' }}>
                    Suggested time below — this is a <strong>draft</strong>. Nothing posts until you hit <strong>Schedule</strong>.
                  </div>
                </div>
              )}
```

- [ ] **Step 5: Remove the dead "choose a version" chooser**

The chooser only rendered when `generatedPosts.length > 0 && !selectedPost`, which can no longer happen (we auto-select). Delete the entire block (lines 1116-1143):

```tsx
          {/* Generated post chooser */}
          {generatedPosts.length > 0 && !selectedPost && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="db-label">// choose a version</label>
              {generatedPosts.map((post, i) => (
                <div key={post.id} onClick={() => selectPost(post)}
                  className="gen-card"
                  style={{ cursor: 'pointer', transition: 'transform .15s, box-shadow .15s, border-color .15s', borderColor: 'var(--line)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--sh-2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
                  <div className="oc-head">
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Option {i + 1}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-4)' }}>Select <ArrowRight size={11} /></span>
                  </div>
                  {post.scheduled_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 4 }}>
                      <CalendarClock size={12} style={{ color: '#2563eb', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 500 }}>
                        Scheduled: {new Date(post.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(post.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                  )}
                  <div className="oc-post">
                    <p>{post.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

```

Keep `generatedPosts` state and the loading/empty-state blocks below it (they still read `generatedPosts.length === 0`).

- [ ] **Step 6: Typecheck + lint the page**

Run: `npx tsc --noEmit && npx eslint app/dashboard/generate/page.tsx`
Expected: no errors. If `ArrowRight` is now unused in this file, remove it from the `lucide-react` import (only if eslint flags it).

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/generate/page.tsx
git commit -m "feat(generate): open the single draft directly; add Regenerate; drop chooser

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all tests pass, including `generate-post-count.test.ts`.

- [ ] **Step 2: Typecheck the project**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual smoke (dev server or Claude Preview)**

1. Go to **Generate → From a prompt**, enter a topic, click **Generate Post**.
2. Expect: exactly **one** post opens in the editor; the time picker is pre-filled; the **calendar shows nothing new** yet.
3. Click **Regenerate** → a fresh single post replaces it (no extra calendar entries).
4. Set/confirm a time, click **Schedule** → the post appears **once** on the calendar and in All Posts as scheduled.
5. Generate again but **don't** schedule → it sits in All Posts as a **draft**, nothing on the calendar.

- [ ] **Step 5: Confirm the shared callers are unaffected**

Spot-check that none of these pass `count` (so they still get 3 / their existing behavior): `app/api/posts/generate-batch/route.ts`, `app/api/posts/bulk-generate/route.ts`, `app/api/zapier/webhook/route.ts`, `app/api/onboarding/preview/route.ts`. And `app/welcome/_components/first-post.tsx` still reads `data.posts[0]` (works with the one-element array).

Run: `rg -n "count:" app/api/posts/generate-batch/route.ts app/api/posts/bulk-generate/route.ts app/api/zapier/webhook/route.ts app/api/onboarding/preview/route.ts`
Expected: no `count:` passed to `generateLinkedInPosts` in any of them.

---

## Self-Review

**Spec coverage:**
- One post per prompt → Task 1 (`count: 1`) + Task 2 (`count: 1` call). ✓
- Saved as draft, never auto-scheduled → Task 2 (`status: 'draft'`, `scheduled_at: null`, calendar sync removed). ✓
- Suggested time pre-filled → Task 2 (`suggestedScheduledAt`) + Task 3 (`selectPost` pre-fill, banner). ✓
- Regenerate escape hatch → Task 3 (button). ✓
- Bulk/repurpose untouched → `count` defaults to 3; Task 4 Step 5 verifies. ✓
- Other route consumer (`first-post.tsx`) unaffected → response keeps `posts` array; Task 4 Step 5. ✓

**Placeholder scan:** none — every code step shows the exact old/new code and exact commands.

**Type consistency:** `count?: number` added to `GeneratePostOptions` and consumed in the same function; `selectPost(post, suggestedScheduledAt?)` matches its single call site; response field `suggestedScheduledAt` (route) matches `data.suggestedScheduledAt` (page).

**Follow-ups (not in this plan, from the spec):** revisit per-tier quota numbers (one generation now = one post, not ~3); `generate-batch` only uses `variants[0]` so it could also pass `count: 1` for a free saving later; the spend tracker undercounts Haiku calls.
