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
