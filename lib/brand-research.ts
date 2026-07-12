import { anthropic } from './anthropic'
import { fingerprintAngle } from './brand-fingerprint'
import type { BrandFact } from './supabase'
import type { RosterEntry } from '@/config/brand-roster'

/**
 * Automated brand research for the weekly cron. There is NO human approval
 * gate, so citation enforcement is the guardrail that upholds the
 * no-fabricated-data rule: every fact must carry a resolvable source URL, and
 * a company that can't clear the minimum simply doesn't go live.
 */

const MODEL = 'claude-sonnet-4-5'

/** A company needs at least this many verified-and-cited facts to go live. */
export const MIN_CITED_FACTS = 3

export type ResearchedAngle = { title: string; summary: string; fingerprint: string }
export type ResearchResult = {
  summary: string
  facts: BrandFact[]
  angles: ResearchedAngle[]
}

function extractText(content: Array<{ type: string; text?: string }>): string {
  return content.filter(b => b.type === 'text').map(b => b.text ?? '').join('\n')
}

function firstJsonObject(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try { return JSON.parse(text.slice(start, end + 1)) } catch { return null }
}

/** HEAD-check a URL so we never publish a fact whose source doesn't resolve. */
async function urlResolves(url: string): Promise<boolean> {
  if (!/^https?:\/\//i.test(url)) return false
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal })
    clearTimeout(timer)
    // Some hosts reject HEAD; treat <500 (incl. 405) as "the page exists".
    return res.status < 500
  } catch {
    return false
  }
}

async function runWithWebSearch(prompt: string, maxTokens: number): Promise<string> {
  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [{ role: 'user', content: prompt }]
  // Server-side web search can pause across tool rounds; resume a few times.
  for (let i = 0; i < 4; i++) {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: messages as never,
    })
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content })
      continue
    }
    return extractText(res.content as Array<{ type: string; text?: string }>)
  }
  return ''
}

/**
 * Research one company via live web search. Returns a summary + cited facts +
 * seed angles AFTER citation enforcement, or null if it can't clear the bar.
 */
export async function researchCompany(entry: RosterEntry): Promise<ResearchResult | null> {
  const prompt = `Research the company "${entry.name}" (${entry.sector}) using web search. Find recent, notable, verifiable facts about how it grew, a sector or operation it's known for, or something noteworthy about its business.

Return ONLY a JSON object (no prose, no code fences):
{
  "summary": "3-4 sentence growth story, plain and factual",
  "facts": [ {"claim": "one specific verifiable fact", "source_url": "https://real-article-url"} ],
  "angles": [ {"title": "6-10 word takeaway", "summary": "2-3 sentence talking points"} ]
}

Rules:
- Every fact MUST include a real source_url you actually found via search. No source, no fact.
- Do NOT invent statistics. If you can't verify a number, omit it.
- Provide 4-6 cited facts and 3-4 distinct angles.`

  const text = await runWithWebSearch(prompt, 2000)
  const parsed = firstJsonObject(text) as
    | { summary?: string; facts?: Array<{ claim?: string; source_url?: string }>; angles?: Array<{ title?: string; summary?: string }> }
    | null
  if (!parsed) return null

  // Citation enforcement: keep only facts whose source URL actually resolves.
  const fetchedAt = new Date().toISOString()
  const candidateFacts = (parsed.facts ?? []).filter(f => f.claim && f.source_url)
  const verified: BrandFact[] = []
  for (const f of candidateFacts) {
    if (await urlResolves(f.source_url!)) {
      verified.push({ claim: f.claim!, source_url: f.source_url!, fetched_at: fetchedAt })
    }
  }
  if (verified.length < MIN_CITED_FACTS) return null // not enough grounding to go live

  const angles: ResearchedAngle[] = (parsed.angles ?? [])
    .filter(a => a.title && a.summary)
    .map(a => ({ title: a.title!, summary: a.summary!, fingerprint: fingerprintAngle(a.title!, a.summary!) }))

  return { summary: parsed.summary?.trim() || `${entry.name} — case study.`, facts: verified, angles }
}

/**
 * Ask the model (with web search) for a few notable, in-the-news brands not
 * already covered — the weekly-discovery half of the roster.
 */
export async function discoverTrendingBrands(existingSlugs: string[]): Promise<RosterEntry[]> {
  const prompt = `Using web search, name 3 notable companies/brands that are currently in the business news and would make good LinkedIn case-study material (global or India-focused). Avoid these already-covered slugs: ${existingSlugs.join(', ') || '(none)'}.

Return ONLY a JSON object (no prose, no code fences):
{ "brands": [ {"slug": "kebab-case", "name": "Brand Name", "sector": "short-sector"} ] }`

  const text = await runWithWebSearch(prompt, 600)
  const parsed = firstJsonObject(text) as { brands?: Array<{ slug?: string; name?: string; sector?: string }> } | null
  const seen = new Set(existingSlugs)
  return (parsed?.brands ?? [])
    .filter(b => b.slug && b.name && !seen.has(b.slug))
    .map(b => ({ slug: b.slug!, name: b.name!, sector: b.sector || 'general' }))
    .slice(0, 3)
}
