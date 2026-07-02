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
