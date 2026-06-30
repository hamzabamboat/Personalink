# Cloud SEO Routines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two local Claude scheduled tasks with two server-side Vercel Cron jobs that (1) auto-publish a DB-backed SEO blog post every Monday 09:00 IST and (2) email an off-page SEO digest + a brief of that post at 09:15 IST.

**Architecture:** Auto-generated posts are stored in a new Supabase `blog_posts` table and rendered by a new dynamic `app/blog/[slug]` route; existing static TSX posts are untouched and merged into the index + sitemap. Two cron routes under `app/api/cron/` (authed via `CRON_SECRET`, idempotent via `cron_locks`) call Claude through the existing `lib/anthropic.ts` client and send email via the existing `sendAdminAlert` Resend helper. Pure logic (parsing, validation, merging, prompt/email building) lives in `lib/` modules with unit tests; routes are thin orchestrators verified manually.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (`supabaseAdmin` service role), `@anthropic-ai/sdk` (`claude-sonnet-4-5`), Resend, `react-markdown` + `remark-gfm`, Vitest.

**Deviation from spec:** Guidance for generation is embedded as constants in `lib/seo-blog.ts` / `lib/seo-digest.ts` (distilled from `docs/seo/off-page-authority-playbook.md` + `docs/seo/keyword-universe.md`) rather than read from disk at runtime, because Vercel serverless functions don't reliably include untraced repo files.

**Conventions to follow (verified in repo):**
- Cron routes export `export { handler as GET, handler as POST }`, set `export const runtime = 'nodejs'` and `export const maxDuration = 300`, auth with `if (authHeader !== \`Bearer ${process.env.CRON_SECRET}\`)`.
- Idempotency: insert into `cron_locks` (`job_name`, `run_date`, `lock_id`); a duplicate insert errors → return `{skipped:true}`; on success update `completed_at`.
- `supabaseAdmin` from `@/lib/supabase-admin`; `anthropic` and helpers from `@/lib/anthropic`; `sendAdminAlert` from `@/lib/email`.
- Tests are pure-function Vitest specs under `lib/__tests__/*.test.ts` (`import { describe, it, expect } from 'vitest'`). Run with `npx vitest run <path>`.
- Path alias `@/*` is configured.

---

### Task 1: Add markdown rendering dependencies

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install deps**

Run:
```bash
cd ~/Personalink && npm install react-markdown@^9 remark-gfm@^4
```
Expected: `package.json` + `package-lock.json` updated, no peer-dep errors that block install.

- [ ] **Step 2: Verify they resolve**

Run:
```bash
node -e "require.resolve('react-markdown'); require.resolve('remark-gfm'); console.log('ok')"
```
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(blog): add react-markdown + remark-gfm for DB-backed posts"
```

---

### Task 2: Create the `blog_posts` table migration

**Files:**
- Create: `supabase/migrations/20260630_blog_posts.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260630_blog_posts.sql`:
```sql
-- Auto-generated SEO blog posts, written weekly by /api/cron/seo-blog and rendered
-- by app/blog/[slug]/page.tsx. Kept separate from the hand-built static TSX posts
-- declared in lib/blog-posts.ts.
DROP TABLE IF EXISTS blog_posts CASCADE;
CREATE TABLE blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text DEFAULT '',
  body_markdown text NOT NULL,
  tags text[] DEFAULT '{}',
  read_time text DEFAULT '5 min read',
  published boolean DEFAULT true,
  source text DEFAULT 'auto',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_blog_posts_created ON blog_posts(created_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public/anon may read only published rows. All writes happen through the
-- service-role key (which bypasses RLS), so no insert/update policy is needed.
DROP POLICY IF EXISTS "blog_posts public read published" ON blog_posts;
CREATE POLICY "blog_posts public read published" ON blog_posts
  FOR SELECT USING (published = true);
```

- [ ] **Step 2: Apply to the Supabase project**

If the Supabase CLI is linked:
```bash
cd ~/Personalink && supabase db push
```
Otherwise paste the file contents into the Supabase dashboard SQL editor and run it.
Expected: table `blog_posts` exists. Verify:
```bash
cd ~/Personalink && supabase db execute "select count(*) from blog_posts" 2>/dev/null || echo "verify in dashboard"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260630_blog_posts.sql
git commit -m "feat(blog): blog_posts table for auto-generated SEO posts"
```

---

### Task 3: Pure helpers in `lib/blog-db.ts` (TDD)

**Files:**
- Create: `lib/blog-db.ts`
- Test: `lib/__tests__/blog-db.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/blog-db.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isValidSlug, parseGeneratedPost, mergeBlogPosts } from '../blog-db'
import type { BlogPost } from '../blog-posts'

describe('isValidSlug', () => {
  it('accepts kebab-case slugs', () => {
    expect(isValidSlug('linkedin-growth-2026')).toBe(true)
  })
  it('rejects spaces, uppercase, leading/trailing dashes, too-short', () => {
    expect(isValidSlug('Bad Slug')).toBe(false)
    expect(isValidSlug('-lead')).toBe(false)
    expect(isValidSlug('ab')).toBe(false)
    expect(isValidSlug('UPPER-case')).toBe(false)
  })
})

describe('parseGeneratedPost', () => {
  const good = JSON.stringify({
    slug: 'how-to-rank-on-linkedin-india',
    title: 'How to rank on LinkedIn in India',
    excerpt: 'A practical guide.',
    tags: ['LinkedIn', 'SEO'],
    readTime: '6 min read',
    body_markdown: '## Intro\n' + 'x'.repeat(300),
  })

  it('parses a valid object', () => {
    const p = parseGeneratedPost(good)
    expect(p.slug).toBe('how-to-rank-on-linkedin-india')
    expect(p.tags).toEqual(['LinkedIn', 'SEO'])
  })
  it('strips ```json fences', () => {
    const p = parseGeneratedPost('```json\n' + good + '\n```')
    expect(p.title).toContain('rank on LinkedIn')
  })
  it('throws on invalid slug', () => {
    expect(() => parseGeneratedPost(JSON.stringify({ ...JSON.parse(good), slug: 'Bad Slug' }))).toThrow()
  })
  it('throws on too-short body', () => {
    expect(() => parseGeneratedPost(JSON.stringify({ ...JSON.parse(good), body_markdown: 'tiny' }))).toThrow()
  })
  it('throws on non-JSON', () => {
    expect(() => parseGeneratedPost('not json at all')).toThrow()
  })
})

describe('mergeBlogPosts', () => {
  const staticPosts: BlogPost[] = [
    { slug: 'a', title: 'A', excerpt: 'ea', tags: ['t'], date: 'May 2026', readTime: '5 min read' },
  ]
  const dbPosts = [
    { slug: 'b', title: 'B', excerpt: 'eb', body_markdown: 'body', tags: ['u'], read_time: '6 min read', created_at: '2026-06-30T03:30:00Z' },
  ]
  it('puts DB posts first and keeps static posts', () => {
    const merged = mergeBlogPosts(staticPosts, dbPosts as any)
    expect(merged.map(p => p.slug)).toEqual(['b', 'a'])
    expect(merged[0].date).toMatch(/June 2026/)
  })
  it('dedups by slug (static wins on collision)', () => {
    const collide = [{ ...dbPosts[0], slug: 'a' }]
    const merged = mergeBlogPosts(staticPosts, collide as any)
    expect(merged.filter(p => p.slug === 'a')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/blog-db.test.ts`
Expected: FAIL — cannot import from `../blog-db` (module not found).

- [ ] **Step 3: Write `lib/blog-db.ts`**

Create `lib/blog-db.ts`:
```ts
import { supabaseAdmin } from '@/lib/supabase-admin'
import { type BlogPost } from '@/lib/blog-posts'

export type DbBlogPost = {
  slug: string
  title: string
  excerpt: string
  body_markdown: string
  tags: string[]
  read_time: string
  created_at: string
}

// Unified shape consumed by the blog index + sitemap.
export type BlogListItem = {
  slug: string
  title: string
  excerpt: string
  tags: string[]
  date: string
  readTime: string
}

export type GeneratedPost = {
  slug: string
  title: string
  excerpt: string
  tags: string[]
  readTime: string
  body_markdown: string
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSlug(slug: string): boolean {
  return typeof slug === 'string' && slug.length >= 3 && slug.length <= 96 && SLUG_RE.test(slug)
}

// Parse + validate the JSON object the generation model returns. Throws on any
// malformed/missing field so the cron fails loudly without a partial insert.
export function parseGeneratedPost(raw: string): GeneratedPost {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  let obj: any
  try {
    obj = JSON.parse(cleaned)
  } catch {
    throw new Error('parseGeneratedPost: response was not valid JSON')
  }
  const slug = String(obj.slug ?? '').trim()
  const title = String(obj.title ?? '').trim()
  const excerpt = String(obj.excerpt ?? '').trim()
  const readTime = String(obj.readTime ?? '5 min read').trim()
  const body_markdown = String(obj.body_markdown ?? '').trim()
  const tags = Array.isArray(obj.tags)
    ? obj.tags.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 5)
    : []
  if (!isValidSlug(slug)) throw new Error(`parseGeneratedPost: invalid slug "${slug}"`)
  if (!title) throw new Error('parseGeneratedPost: missing title')
  if (body_markdown.length < 200) throw new Error('parseGeneratedPost: body_markdown too short')
  return { slug, title, excerpt, tags, readTime, body_markdown }
}

function formatMonthYear(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// DB posts (newest auto-generated content) surface on top; static posts follow.
// Dedup by slug — a static slug always wins a collision.
export function mergeBlogPosts(staticPosts: BlogPost[], dbPosts: DbBlogPost[]): BlogListItem[] {
  const seen = new Set<string>(staticPosts.map(p => p.slug))
  const out: BlogListItem[] = []
  for (const p of dbPosts) {
    if (seen.has(p.slug)) continue
    seen.add(p.slug)
    out.push({
      slug: p.slug, title: p.title, excerpt: p.excerpt,
      tags: p.tags ?? [], date: formatMonthYear(p.created_at), readTime: p.read_time,
    })
  }
  for (const p of staticPosts) {
    out.push({ slug: p.slug, title: p.title, excerpt: p.excerpt, tags: p.tags, date: p.date, readTime: p.readTime })
  }
  return out
}

export async function getPublishedDbPosts(): Promise<DbBlogPost[]> {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('slug,title,excerpt,body_markdown,tags,read_time,created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getPublishedDbPosts', error)
    return []
  }
  return (data ?? []) as DbBlogPost[]
}

export async function getDbPostBySlug(slug: string): Promise<DbBlogPost | null> {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('slug,title,excerpt,body_markdown,tags,read_time,created_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  if (error) {
    console.error('getDbPostBySlug', error)
    return null
  }
  return (data as DbBlogPost) ?? null
}
```
NOTE on the merge test: the static post `a` is dated "May 2026" and appears after DB post `b`; the dedup test relies on `seen` being pre-seeded with static slugs so a colliding DB slug is skipped (static wins).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/blog-db.test.ts`
Expected: PASS (all specs green).

- [ ] **Step 5: Commit**

```bash
git add lib/blog-db.ts lib/__tests__/blog-db.test.ts
git commit -m "feat(blog): blog-db helpers (slug validation, post parsing, static+DB merge)"
```

---

### Task 4: Dynamic blog route `app/blog/[slug]/page.tsx`

**Files:**
- Create: `app/blog/[slug]/page.tsx`

- [ ] **Step 1: Write the route**

Create `app/blog/[slug]/page.tsx`:
```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { WordMark } from '@/components/word-mark'
import { getDbPostBySlug } from '@/lib/blog-db'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getDbPostBySlug(slug)
  if (!post) return { title: 'Post not found | PersonaLink' }
  const url = `https://personalink.in/blog/${post.slug}`
  return {
    title: `${post.title} | PersonaLink`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: 'article', locale: 'en_IN', url, siteName: 'PersonaLink',
      title: post.title, description: post.excerpt,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: post.title }],
    },
  }
}

const md = {
  h1: (p: any) => <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--ink)', margin: '32px 0 16px' }} {...p} />,
  h2: (p: any) => <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '36px 0 14px' }} {...p} />,
  h3: (p: any) => <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', margin: '28px 0 10px' }} {...p} />,
  p: (p: any) => <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)', margin: '0 0 18px' }} {...p} />,
  ul: (p: any) => <ul style={{ margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', lineHeight: 1.7 }} {...p} />,
  ol: (p: any) => <ol style={{ margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', lineHeight: 1.7 }} {...p} />,
  li: (p: any) => <li style={{ marginBottom: 8, fontSize: 17 }} {...p} />,
  a: (p: any) => <a style={{ color: 'var(--pl-accent)', textDecoration: 'underline' }} {...p} />,
  strong: (p: any) => <strong style={{ color: 'var(--ink)', fontWeight: 600 }} {...p} />,
  blockquote: (p: any) => <blockquote style={{ borderLeft: '3px solid var(--pl-accent)', margin: '0 0 18px', padding: '4px 0 4px 16px', color: 'var(--ink-3)', fontStyle: 'italic' }} {...p} />,
  code: (p: any) => <code style={{ fontFamily: 'var(--f-mono)', fontSize: 14, background: 'var(--surface)', padding: '2px 6px', borderRadius: 6 }} {...p} />,
}

export default async function DbBlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getDbPostBySlug(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
      <nav style={{ background: 'color-mix(in srgb, var(--surface) 95%, transparent)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/"><WordMark icon wordmark iconSize={30} /></Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/#pricing" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/blog" style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-accent)', textDecoration: 'none' }}>Blog</Link>
          </div>
        </div>
      </nav>

      <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' }}>
        <Link href="/blog" style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', textDecoration: 'none' }}>← all posts</Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '24px 0 14px' }}>
          {post.tags.map(tag => (
            <span key={tag} style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, letterSpacing: '.04em', padding: '3px 10px', borderRadius: 999, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: '1px solid color-mix(in oklab, var(--pl-accent) 20%, transparent)' }}>{tag}</span>
          ))}
        </div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--ink)', margin: '0 0 12px' }}>{post.title}</h1>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 36 }}>{post.read_time}</div>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{post.body_markdown}</ReactMarkdown>
      </article>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd ~/Personalink && npx tsc --noEmit`
Expected: no errors referencing `app/blog/[slug]/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "app/blog/[slug]/page.tsx"
git commit -m "feat(blog): dynamic [slug] route rendering DB posts via react-markdown"
```

---

### Task 5: Merge DB posts into the blog index

**Files:**
- Modify: `app/blog/page.tsx`

- [ ] **Step 1: Update the index to async + merged source**

In `app/blog/page.tsx`:
1. Replace the import line `import { BLOG_POSTS as ARTICLES } from '@/lib/blog-posts'` with:
```tsx
import { BLOG_POSTS } from '@/lib/blog-posts'
import { getPublishedDbPosts, mergeBlogPosts } from '@/lib/blog-db'
```
2. Add `export const revalidate = 3600` directly above the `export const metadata` block.
3. Change the component signature from `export default function BlogPage() {` to:
```tsx
export default async function BlogPage() {
  const dbPosts = await getPublishedDbPosts()
  const ARTICLES = mergeBlogPosts(BLOG_POSTS, dbPosts)
```
Leave the rest of the JSX (the `{ARTICLES.map(article => ( ... ))}` block) exactly as-is — `BlogListItem` has the same `slug/title/excerpt/tags/date/readTime` fields the JSX already reads.

- [ ] **Step 2: Typecheck**

Run: `cd ~/Personalink && npx tsc --noEmit`
Expected: no errors in `app/blog/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/blog/page.tsx
git commit -m "feat(blog): merge DB posts into the blog index"
```

---

### Task 6: Include DB posts in the sitemap

**Files:**
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Update sitemap to async + merged source**

In `app/sitemap.ts`:
1. Add import below the existing `BLOG_POSTS` import:
```ts
import { getPublishedDbPosts, mergeBlogPosts } from '@/lib/blog-db'
```
2. Add `export const revalidate = 3600` below the `const BASE = ...` line.
3. Change the signature to async and build the merged blog list:
```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const dbPosts = await getPublishedDbPosts()
  const allBlog = mergeBlogPosts(BLOG_POSTS, dbPosts)
```
4. Replace the `blogPosts` mapping to use `allBlog`:
```ts
  const blogPosts: MetadataRoute.Sitemap = allBlog.map(post => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))
```
Leave the `vsPages` block and the final return array unchanged.

- [ ] **Step 2: Typecheck**

Run: `cd ~/Personalink && npx tsc --noEmit`
Expected: no errors in `app/sitemap.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(seo): include DB blog posts in sitemap"
```

---

### Task 7: Blog generation module `lib/seo-blog.ts` (TDD for pure parts)

**Files:**
- Create: `lib/seo-blog.ts`
- Test: `lib/__tests__/seo-blog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/seo-blog.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildBlogSystemPrompt, buildBlogUserPrompt } from '../seo-blog'

describe('buildBlogSystemPrompt', () => {
  it('states the JSON contract and the no-fabricated-stats rule', () => {
    const s = buildBlogSystemPrompt()
    expect(s).toMatch(/JSON/i)
    expect(s).toMatch(/body_markdown/)
    expect(s.toLowerCase()).toMatch(/do not (fabricate|invent)/)
  })
})

describe('buildBlogUserPrompt', () => {
  it('lists existing slugs to avoid and includes guidance', () => {
    const p = buildBlogUserPrompt(['post-a', 'post-b'], 'KEYWORD GUIDANCE HERE')
    expect(p).toContain('post-a')
    expect(p).toContain('post-b')
    expect(p).toContain('KEYWORD GUIDANCE HERE')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/seo-blog.test.ts`
Expected: FAIL — module `../seo-blog` not found.

- [ ] **Step 3: Write `lib/seo-blog.ts`**

Create `lib/seo-blog.ts`:
```ts
import { anthropic } from '@/lib/anthropic'
import { parseGeneratedPost, type GeneratedPost } from '@/lib/blog-db'

// Distilled from docs/seo/keyword-universe.md + off-page-authority-playbook.md.
// Kept inline (not read from disk) so it ships reliably in the serverless bundle.
export const TOPIC_GUIDANCE = `PersonaLink (personalink.in) is an AI LinkedIn CONTENT tool for India: write, schedule,
and auto-publish posts in your own voice; Hinglish support; INR/GST-friendly pricing.
NOT an outreach/DM tool. Audience: Indian founders, consultants, recruiters, jobseekers, and creators.

Pick ONE specific, search-driven topic the blog does not already cover. Favour these lanes:
- "how to" + LinkedIn growth/content/personal-branding for Indian professionals
- comparisons & alternatives (e.g. India angle on Taplio/Supergrow/AuthoredUp/MagicPost) — honest, no fake metrics
- LinkedIn algorithm / posting cadence / best time to post in India
- Hinglish, GST/invoicing for solopreneurs, India-specific creator economy angles
- AI content humanisation, anti-AI-detection, voice/tone

Constraints: original and genuinely useful; concrete examples; India/INR context where relevant;
British/Indian English is fine. Cite reputable EXTERNAL sources for any statistic.`

export function buildBlogSystemPrompt(): string {
  return `You are the editorial engine for the PersonaLink blog. You write one complete, publish-ready SEO article per call.

Return ONLY a single JSON object (no prose, no code fences) with EXACTLY these keys:
{
  "slug": "kebab-case-url-slug",          // lowercase a-z 0-9 and single dashes only
  "title": "Compelling, keyword-led H1",
  "excerpt": "One-sentence summary (<= 200 chars)",
  "tags": ["2-4 short topic tags"],
  "readTime": "N min read",
  "body_markdown": "The full article in GitHub-flavoured Markdown, 700-1100 words, with ## and ### headings, lists, and a short intro + conclusion. Do NOT repeat the H1 title as a heading."
}

Rules:
- Do NOT fabricate or invent product-usage statistics or "in our data" numbers — PersonaLink has no proprietary usage stats. Cite reputable external sources for any figure.
- The slug must be unique and must not collide with the existing slugs provided.
- No fenced code blocks around the JSON. Output must be parseable by JSON.parse.`
}

export function buildBlogUserPrompt(existingSlugs: string[], guidance: string): string {
  return `${guidance || TOPIC_GUIDANCE}

Existing slugs already published (DO NOT reuse or pick a near-duplicate topic):
${existingSlugs.map(s => `- ${s}`).join('\n')}

Write this week's article now. Output the single JSON object only.`
}

export async function generateBlogPost(existingSlugs: string[], guidance = TOPIC_GUIDANCE): Promise<GeneratedPost> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4000,
    temperature: 0.8,
    system: buildBlogSystemPrompt(),
    messages: [{ role: 'user', content: buildBlogUserPrompt(existingSlugs, guidance) }],
  })
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseGeneratedPost(text)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/seo-blog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/seo-blog.ts lib/__tests__/seo-blog.test.ts
git commit -m "feat(seo): blog generation prompts + generateBlogPost (claude-sonnet-4-5)"
```

---

### Task 8: Blog cron route `app/api/cron/seo-blog/route.ts`

**Files:**
- Create: `app/api/cron/seo-blog/route.ts`

- [ ] **Step 1: Write the route**

Create `app/api/cron/seo-blog/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { BLOG_POSTS } from '@/lib/blog-posts'
import { getPublishedDbPosts } from '@/lib/blog-db'
import { generateBlogPost } from '@/lib/seo-blog'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 300

async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'seo-blog', run_date: today, lock_id: lockId })
  if (lockError) {
    return NextResponse.json({ skipped: true, reason: 'already_ran_today', date: today })
  }

  try {
    const dbPosts = await getPublishedDbPosts()
    const existingSlugs = [...BLOG_POSTS.map(p => p.slug), ...dbPosts.map(p => p.slug)]

    const post = await generateBlogPost(existingSlugs)
    if (existingSlugs.includes(post.slug)) {
      throw new Error(`generated slug already exists: ${post.slug}`)
    }

    const { error: insErr } = await supabaseAdmin.from('blog_posts').insert({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body_markdown: post.body_markdown,
      tags: post.tags,
      read_time: post.readTime,
    })
    if (insErr) throw new Error(`insert failed: ${insErr.message}`)

    await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)

    return NextResponse.json({
      ok: true,
      slug: post.slug,
      title: post.title,
      url: `https://personalink.in/blog/${post.slug}`,
    })
  } catch (err) {
    console.error('seo-blog cron failed', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export { handler as GET, handler as POST }
```

- [ ] **Step 2: Typecheck**

Run: `cd ~/Personalink && npx tsc --noEmit`
Expected: no errors in the new route.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/seo-blog/route.ts
git commit -m "feat(seo): weekly cron to generate + publish a DB blog post"
```

---

### Task 9: Digest module `lib/seo-digest.ts` (TDD for pure parts)

**Files:**
- Create: `lib/seo-digest.ts`
- Test: `lib/__tests__/seo-digest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/seo-digest.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildOffPagePrompt, buildBlogBrief, buildDigestEmail } from '../seo-digest'

describe('buildOffPagePrompt', () => {
  it('mentions off-page pillars and the brand-collision disambiguation', () => {
    const p = buildOffPagePrompt()
    expect(p.toLowerCase()).toMatch(/off-page|backlink|citation/)
    expect(p).toMatch(/personalink\.me/)
  })
})

describe('buildBlogBrief', () => {
  it('returns a not-detected note when no post', () => {
    expect(buildBlogBrief(null).toLowerCase()).toContain('not detected')
  })
  it('includes title and live URL when a post exists', () => {
    const brief = buildBlogBrief({
      slug: 'my-post', title: 'My Post', excerpt: 'hi', body_markdown: 'x',
      tags: ['SEO'], read_time: '5 min read', created_at: '2026-06-30T03:30:00Z',
    })
    expect(brief).toContain('My Post')
    expect(brief).toContain('https://personalink.in/blog/my-post')
  })
})

describe('buildDigestEmail', () => {
  it('builds a subject with the date and a body with both sections', () => {
    const { subject, body } = buildDigestEmail({ date: '2026-06-30', offPage: 'OFFPAGE', brief: 'BRIEF' })
    expect(subject).toContain('2026-06-30')
    expect(subject.toLowerCase()).toContain('off-page')
    expect(body).toContain('OFFPAGE')
    expect(body).toContain('BRIEF')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/seo-digest.test.ts`
Expected: FAIL — module `../seo-digest` not found.

- [ ] **Step 3: Write `lib/seo-digest.ts`**

Create `lib/seo-digest.ts`:
```ts
import { anthropic } from '@/lib/anthropic'
import type { DbBlogPost } from '@/lib/blog-db'

// Distilled from docs/seo/off-page-authority-playbook.md. Inline for serverless reliability.
export const OFFPAGE_FRAMEWORK = `PersonaLink (personalink.in) — AI LinkedIn content tool for India. Off-page priorities:
1. Indexation & crawlability: ensure Googlebot + AI crawlers (GPTBot/ClaudeBot) reach the site; no WAF/robots blocks.
2. Brand disambiguation: PersonaLink is distinct from the unrelated personalink.me executive-search firm — Organization schema sameAs, Crunchbase/Wikidata entries, consistent NAP, social profiles, push for a Google knowledge panel.
3. Backlinks & digital PR: directory listings (Indian SaaS/startup directories), review sites (G2/Capterra/Product Hunt), founder guest posts, HARO-style citations.
4. Citations & listings: consistent name/URL across review and listing sites; AI/LLM tool roundups for "best AI LinkedIn tools India".
5. E-E-A-T & social proof: founder authorship, about/team pages, testimonials, case studies (no fabricated metrics).`

export function buildOffPagePrompt(): string {
  return `${OFFPAGE_FRAMEWORK}

Using the framework above, write THIS WEEK'S prioritised off-page / authority action guide for PersonaLink.
Give 3-6 concrete, prioritised moves (each with rough effort and impact). Be specific and actionable.
Do NOT fabricate metrics — label any estimates as estimates. Plain text or light markdown, ~250-400 words.`
}

export async function generateOffPageDigest(): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1800,
    temperature: 0.6,
    messages: [{ role: 'user', content: buildOffPagePrompt() }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

export function buildBlogBrief(post: DbBlogPost | null): string {
  if (!post) {
    return "This week's blog post was not detected — check the Supabase blog_posts table or the seo-blog cron logs."
  }
  const url = `https://personalink.in/blog/${post.slug}`
  return [
    `Title: ${post.title}`,
    `Tags: ${(post.tags || []).join(', ')}`,
    `URL: ${url}`,
    '',
    post.excerpt,
  ].join('\n')
}

export function buildDigestEmail(opts: { date: string; offPage: string; brief: string }): { subject: string; body: string } {
  const subject = `PersonaLink — weekly off-page SEO digest + this week's blog brief (${opts.date})`
  const body = [
    '=== OFF-PAGE SEO — THIS WEEK ===',
    '',
    opts.offPage.trim(),
    '',
    '',
    '=== NEW BLOG POST (review) ===',
    '',
    opts.brief.trim(),
  ].join('\n')
  return { subject, body }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/seo-digest.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/seo-digest.ts lib/__tests__/seo-digest.test.ts
git commit -m "feat(seo): off-page digest generation + email composition helpers"
```

---

### Task 10: Digest cron route `app/api/cron/seo-digest-email/route.ts`

**Files:**
- Create: `app/api/cron/seo-digest-email/route.ts`

- [ ] **Step 1: Write the route**

Create `app/api/cron/seo-digest-email/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAdminAlert } from '@/lib/email'
import type { DbBlogPost } from '@/lib/blog-db'
import { generateOffPageDigest, buildBlogBrief, buildDigestEmail } from '@/lib/seo-digest'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 300

async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'seo-digest-email', run_date: today, lock_id: lockId })
  if (lockError) {
    return NextResponse.json({ skipped: true, reason: 'already_ran_today', date: today })
  }

  try {
    const offPage = await generateOffPageDigest()

    // Latest published post created today (the seo-blog cron ran 15 min earlier).
    const { data } = await supabaseAdmin
      .from('blog_posts')
      .select('slug,title,excerpt,body_markdown,tags,read_time,created_at')
      .eq('published', true)
      .gte('created_at', `${today}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const brief = buildBlogBrief((data as DbBlogPost) ?? null)
    const { subject, body } = buildDigestEmail({ date: today, offPage, brief })
    await sendAdminAlert({ subject, body })

    await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)

    return NextResponse.json({ ok: true, postFound: !!data })
  } catch (err) {
    console.error('seo-digest-email cron failed', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export { handler as GET, handler as POST }
```

- [ ] **Step 2: Typecheck**

Run: `cd ~/Personalink && npx tsc --noEmit`
Expected: no errors in the new route.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/seo-digest-email/route.ts
git commit -m "feat(seo): weekly cron to email off-page digest + blog brief"
```

---

### Task 11: Register both crons in `vercel.json`

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the two cron entries**

In `vercel.json`, inside the `"crons"` array, add these two objects after the existing `growth-report` entry (mind the trailing comma on the entry before):
```json
    {
      "path": "/api/cron/seo-blog",
      "schedule": "30 3 * * 1"
    },
    {
      "path": "/api/cron/seo-digest-email",
      "schedule": "45 3 * * 1"
    }
```
(`30 3 * * 1` = Mon 09:00 IST; `45 3 * * 1` = Mon 09:15 IST. Vercel cron is UTC.)

- [ ] **Step 2: Validate JSON**

Run: `cd ~/Personalink && node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('valid json')"`
Expected: prints `valid json`.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat(seo): schedule weekly seo-blog + seo-digest-email crons"
```

---

### Task 12: Full test run, deploy verification, and local-task cleanup

**Files:** none (verification + ops)

- [ ] **Step 1: Run the whole unit suite**

Run: `cd ~/Personalink && npx vitest run`
Expected: all tests pass (including the three new spec files).

- [ ] **Step 2: Production build sanity check**

Run: `cd ~/Personalink && npm run build`
Expected: build succeeds; `/blog/[slug]`, `/api/cron/seo-blog`, and `/api/cron/seo-digest-email` appear in the route output.

- [ ] **Step 3: Deploy to production**

Deploy the working tree (the project's established flow): `cd ~/Personalink && vercel --prod`
Expected: deploy succeeds. (Note: this deploys the current working tree, including any uncommitted files — confirm with the user before running if the tree is dirty.)

- [ ] **Step 4: Manually trigger and verify the blog cron**

Run (replace `$CRON_SECRET` with the deployed value):
```bash
curl -s -X POST https://personalink.in/api/cron/seo-blog -H "Authorization: Bearer $CRON_SECRET" | head -c 400
```
Expected: JSON `{ "ok": true, "slug": "...", "title": "...", "url": "..." }`. Then open the returned URL and confirm the post renders, and that it appears on `https://personalink.in/blog`.

- [ ] **Step 5: Manually trigger and verify the digest email cron**

Run:
```bash
curl -s -X POST https://personalink.in/api/cron/seo-digest-email -H "Authorization: Bearer $CRON_SECRET" | head -c 200
```
Expected: JSON `{ "ok": true, "postFound": true }`, and an email arrives at hamzabamboat@gmail.com with both sections.

- [ ] **Step 6: Disable the two local scheduled tasks**

To avoid duplicate posts/emails, disable the local tasks created earlier. Use the `update_scheduled_task` tool for each:
- `weekly-seo-blog-post` → `enabled: false`
- `weekly-seo-email` → `enabled: false`
(Or delete them from the app's "Scheduled" sidebar.)

- [ ] **Step 7: Clean up the verification lock rows (optional)**

The manual `curl` runs in Steps 4-5 wrote `cron_locks` rows for today, which would make the *real* Monday run skip if triggered the same calendar day. If you tested on a Monday, clear them:
```sql
delete from cron_locks where job_name in ('seo-blog','seo-digest-email') and run_date = current_date;
```
Run in the Supabase SQL editor. (Harmless on any other day.)

---

## Self-Review

**Spec coverage:**
- Data model (§1) → Task 2. ✓
- Blog rendering: dynamic route (§2) → Task 4; index merge → Task 5; sitemap → Task 6; shared `lib/blog-db` helper → Task 3. ✓
- `/api/cron/seo-blog` (§3) → Tasks 7–8. ✓
- `/api/cron/seo-digest-email` (§4) → Tasks 9–10. ✓
- Registration + local-task cleanup (§5) → Tasks 11–12. ✓
- Error handling (§6) → try/catch + locks in Tasks 8 & 10. ✓
- Testing (§7) → Tasks 3, 7, 9 (unit) + Task 12 (manual). ✓
- New deps (§8) → Task 1. ✓
- Embedded-guidance deviation documented in header and Tasks 7/9.

**Placeholder scan:** No TBD/TODO; every code step contains full code; commands have expected output. ✓

**Type consistency:** `GeneratedPost`, `DbBlogPost`, `BlogListItem` defined in Task 3 and reused unchanged in Tasks 4, 7, 8, 9, 10. `generateBlogPost(existingSlugs, guidance?)`, `parseGeneratedPost`, `mergeBlogPosts(staticPosts, dbPosts)`, `getPublishedDbPosts`, `getDbPostBySlug`, `buildDigestEmail({date,offPage,brief})`, `buildBlogBrief(post|null)` — signatures consistent across all call sites. ✓
