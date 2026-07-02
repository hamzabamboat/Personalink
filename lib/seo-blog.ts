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
