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
