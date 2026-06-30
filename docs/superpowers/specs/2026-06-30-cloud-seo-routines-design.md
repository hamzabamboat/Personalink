# Cloud SEO routines — design

**Date:** 2026-06-30
**Status:** Approved (brainstorm)

## Goal

Replace the two **local** Claude scheduled tasks (`weekly-seo-blog-post`, `weekly-seo-email`) with two **server-side Vercel Cron jobs** so they run on Vercel regardless of whether the user's machine or the Claude app is open.

These recreate the user's original "other-account" routines:
1. Auto-publish one SEO blog post every Monday morning.
2. Email a weekly off-page SEO digest every Monday morning — now also including a short brief of the post that was just published, for review.

**No new secrets required.** Reuses the existing `supabaseAdmin` (service role), `ANTHROPIC_API_KEY` (`lib/anthropic.ts`), Resend (`sendAdminAlert` → `ADMIN_EMAIL` = `hamzabamboat@gmail.com`), and `CRON_SECRET`.

## Decisions locked during brainstorm

- **Publish path:** DB-backed (not GitHub-commit, not PR). A serverless function can't do the local task's `git worktree`, and generating compilable TSX weekly risks failed prod builds. Storing posts in the DB and rendering them dynamically is the robust serverless design and goes live instantly.
- **Blog model:** Hybrid. Existing hand-built static TSX posts are left untouched; auto-generated posts live in the DB. No migration of existing posts.
- **Local tasks:** Disabled/deleted once the cloud version ships, to avoid duplicate posts/emails.

## 1. Data model

New Supabase table `blog_posts` (auto-generated posts; distinct from the static TSX posts in `lib/blog-posts.ts`):

| column | type | notes |
|---|---|---|
| `id` | uuid | pk, default `gen_random_uuid()` |
| `slug` | text | unique, not null |
| `title` | text | not null |
| `excerpt` | text | |
| `body_markdown` | text | not null |
| `tags` | text[] | default `'{}'` |
| `read_time` | text | e.g. "6 min read" |
| `published` | boolean | default `true` |
| `source` | text | default `'auto'` |
| `created_at` | timestamptz | default `now()` |

- Migration SQL added under `supabase/` following the existing migration/`schema.sql` pattern.
- RLS: public `SELECT` restricted to `published = true`; all writes via service role only (no anon/auth insert/update/delete policy).
- Index on `slug` (unique constraint provides it) and on `created_at` for ordering.

## 2. Blog rendering (hybrid)

- **New dynamic route** `app/blog/[slug]/page.tsx` (async server component): loads a published DB post by slug via the shared helper; `notFound()` if missing/unpublished. Renders title + meta + `body_markdown` via `react-markdown` (+ `remark-gfm`), styled to match existing posts' prose. Includes `generateMetadata` for SEO (title/description from the row). Static dirs under `app/blog/*` take precedence in the App Router, so this route only ever serves DB slugs — no conflict with existing static posts.
- **Blog index** `app/blog/page.tsx`: becomes `async`; merges static `BLOG_POSTS` with published DB posts, dedups by slug, sorts newest first.
- **Sitemap** `app/sitemap.ts`: becomes `async`; appends DB post slugs alongside the static ones.
- **Shared helper** `lib/blog-db.ts`: `getPublishedDbPosts()` and `getDbPostBySlug(slug)` — single interface consumed by the route, index, and sitemap. Returns a shape compatible with the existing `BlogPost` type plus `body_markdown`.

`react-markdown` is configured WITHOUT raw-HTML passthrough (default), so model output is escaped/sanitized — no XSS surface from generated content.

## 3. Cron — `/api/cron/seo-blog`

Schedule: `30 3 * * 1` (UTC) = **Monday 09:00 IST**.

1. Auth: reject unless `Authorization: Bearer ${CRON_SECRET}` (same as existing crons).
2. Idempotency: insert into `cron_locks` keyed `job_name='seo-blog'`, `run_date=<today>`; if the row exists, return `{skipped:true}` (mirrors `app/api/cron/weekly-digest/route.ts`).
3. Topic selection: read `docs/seo/keyword-universe.md` and `docs/seo/off-page-authority-playbook.md` for guidance; collect existing slugs from static `BLOG_POSTS` + DB to avoid duplicates.
4. Generation: call Claude (`claude-sonnet-4-5` via `lib/anthropic.ts`) to return structured JSON `{ slug, title, excerpt, tags[], readTime, body_markdown }`. Prompt constraints: India/INR angle where relevant; original and genuinely useful; **no fabricated product-usage / "in our data" statistics** (cite external sources); target a real, not-yet-covered keyword.
5. Validate: slug is unique and URL-safe, `body_markdown` non-empty. On failure, log and return 500.
6. Insert the row into `blog_posts`. Post is live immediately at `https://personalink.in/blog/<slug>`.
7. Return `{ ok:true, slug, title }` for observability.

## 4. Cron — `/api/cron/seo-digest-email`

Schedule: `45 3 * * 1` (UTC) = **Monday 09:15 IST**. The 15-minute gap ensures the post row exists before the email reads it.

1. Auth + idempotency lock `job_name='seo-digest-email'`.
2. **Section A — off-page digest:** Claude composes this week's prioritized off-page / authority action guide for PersonaLink, using `docs/seo/off-page-authority-playbook.md` as the framework (backlinks/digital PR, directory & review-site citations + NAP consistency, disambiguation from the unrelated `personalink.me` exec-search firm, E-E-A-T / social proof). 3–6 concrete prioritized moves; estimates labelled as estimates; no fabricated metrics.
3. **Section B — blog brief:** fetch the latest published `blog_posts` row created today; build a short brief (title, target keyword/angle, 3–4 bullets, live URL). If none found, include a "this week's post was not detected" note.
4. Send via `sendAdminAlert({ subject, body })` (Resend → `hamzabamboat@gmail.com`). Subject: `PersonaLink — weekly off-page SEO digest + this week's blog brief (<YYYY-MM-DD>)`. Body is clean HTML with both sections.
5. Return `{ ok:true }`.

## 5. Registration & cleanup

- Add both cron entries to `vercel.json` `crons`.
- After deploy is verified, disable/delete the two local scheduled tasks (`weekly-seo-blog-post`, `weekly-seo-email`) so content isn't duplicated.

## 6. Error handling

- Both crons wrap work in try/catch, log failures, return 500 on error; idempotency locks prevent double-runs/double-sends on a given day.
- Email cron always sends the off-page digest even if no post is found (Section B degrades to a note).
- Blog cron failure leaves no partial row (insert is the last step after validation).

## 7. Testing

- Unit tests for `lib/blog-db.ts` helpers and both cron handlers, with mocked `anthropic` / `supabaseAdmin` / email, following existing repo test patterns.
- Manual verification: `curl` each route with the `CRON_SECRET` bearer against a preview deploy → confirm row insert, `/blog/<slug>` renders, sitemap/index include it, and the email arrives.

## 8. New dependencies

- `react-markdown` + `remark-gfm` — compute-only rendering, no per-call paid API; stays cost-neutral per the graphics/cost constraint.

## Out of scope (YAGNI)

- Migrating existing static TSX posts into the DB.
- An admin UI for editing/unpublishing auto-posts (can be done directly in Supabase; a `published` flag exists for manual takedown).
- Image generation for auto-posts.
