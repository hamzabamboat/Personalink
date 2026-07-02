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
