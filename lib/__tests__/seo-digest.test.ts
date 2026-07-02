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
