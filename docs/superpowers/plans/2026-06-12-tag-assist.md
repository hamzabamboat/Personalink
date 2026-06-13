# Tag-assist — implementation plan

Spec: `docs/superpowers/specs/2026-06-12-manual-mention-assist-design.md`
Base: `origin/main` @ c0d1bd7 (post #14 + #16 + image-engine merge).

## Scope (this PR)

Manual tag-assist on the **canonical posts page** + reusable helper + server status support.
Generate-editor button and per-post "Mark as posted" in the row are **deferred** (noted) —
the posts page (row icon + edit dialog) fully delivers the feature.

## Files & tasks (TDD where it applies)

1. **`lib/share-to-linkedin.ts`** (new) — `shareToLinkedIn(text): Promise<'shared'|'copied'|'cancelled'|'failed'>`.
   - Mobile/PWA: `navigator.share({ text })` → `'shared'`; `AbortError` → `'cancelled'`; other error → fall through.
   - Fallback: `navigator.clipboard.writeText(text)` + `window.open('https://www.linkedin.com/feed/?shareActive=true','_blank','noopener')` → `'copied'`; throw → `'failed'`.
2. **`lib/__tests__/share-to-linkedin.test.ts`** (new) — RED first: share present/abort/error, no-share fallback, clipboard failure.
3. **`app/api/posts/[id]/update/route.ts`** — extend PATCH: accept `status` (whitelist `'draft'|'published'` only); set `published_at = now` when `status==='published'`. Reuses existing user-scope + calendar cleanup (unschedule = `{status:'draft', scheduled_at:null}`).
4. **`app/dashboard/posts/page.tsx`**:
   - `tagAndPost(post)`: `shareToLinkedIn(post.content)`; if `post.status==='scheduled'` → PATCH `{status:'draft', scheduled_at:null}` (avoid cron double-post) + update local state; toast keyed on result (`shared`→quiet, `copied`→"copied, paste in LinkedIn & type @ to tag", `cancelled`→quiet, `failed`→error).
   - `markPosted(post)`: PATCH `{status:'published'}`; update local state; toast.
   - List row: compact `AtSign` icon button → `tagAndPost`.
   - Edit dialog footer: "Tag & post on LinkedIn" (full) + "Mark as posted" (full; hidden when already `published`).
   - Imports: add `AtSign`, `CheckCheck` from lucide-react.

## Verify
`npm test` (incl. new helper tests) · `npx tsc --noEmit` (posts/lib clean) · `npm run build` · lint delta zero.
