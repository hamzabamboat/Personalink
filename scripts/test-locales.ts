/**
 * Eval harness for language modes. Calls the generator directly with a synthetic
 * India-based profile across N topics x 3 locales, runs each draft through the
 * (locale-aware) AI-detection gate, scores naturalness with Haiku, and prints
 * results grouped by locale. No HTTP / auth / DB writes.
 *
 * Run: npx tsx scripts/test-locales.ts          # all 20 topics x 3 locales
 *      npx tsx scripts/test-locales.ts 1        # smoke: first topic only (cheap)
 *
 * Requires ANTHROPIC_API_KEY (loaded from .env.local if not already in env).
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { UserProfile } from '../lib/supabase'
import type { LocaleId } from '../lib/prompts/locales/types'

// Load .env.local (all keys) BEFORE importing modules that construct API/DB
// clients at load time. Dependency-free parser; never overrides existing env.
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* no .env.local — rely on ambient env */ }
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set. Add it to .env.local or the environment.')
  process.exit(1)
}

const PROFILE = {
  id: 'test', user_id: 'test',
  name: 'Ananya Rao', role: 'Co-founder & CEO', industry: 'B2B SaaS', company: 'a Bangalore startup',
  voice_fingerprint: 'Writes in short, direct paragraphs with the occasional one-line punch. Warm but not gushing. Uses concrete numbers. Avoids buzzwords. Ends on a genuine question, not a CTA.',
  mcq_answers: { voice_style: 'Conversational', main_goal: 'Build personal brand', known_as: 'The Operator' },
  content_pillars: ['Fundraising', 'Hiring', 'Product'],
  writing_sample: 'We almost missed payroll in month 9. I told the team the truth on a Friday. Three of them offered to defer salary. We did not take them up on it, but I have never forgotten who raised their hand.',
  timezone: 'Asia/Kolkata',
} as unknown as UserProfile

const exemplars = [PROFILE.writing_sample as string]

const TOPICS = [
  'Closing a seed round', 'Shutting down a product line', 'Hiring your first senior leader',
  'Layoffs handled with dignity', 'A Diwali reflection on the year', 'Family business vs your own startup',
  'Learning to code at 35', 'D2C unit economics', 'The quick-commerce ops grind',
  'A GST compliance headache', 'Expanding into tier-2 cities', 'Return to office vs remote',
  'Saying no to a big client', 'Bootstrapping vs VC money', "A mentor's advice that stuck",
  'Hiring freshers from non-IIT colleges', 'Burnout and taking a break', 'Appraisal-season salary talk',
  'Customer support as growth', 'Building in public',
]

// CLI: [limit] [locale] [startOffset]
const limit = Number(process.argv[2]) || TOPICS.length
const start = Number(process.argv[4]) || 0
const topics = TOPICS.slice(start, start + limit)

async function main() {
  // Dynamic import AFTER env is loaded so the SDK clients construct with credentials.
  const { anthropic, generateLinkedInPosts } = await import('../lib/anthropic')
  const { cleanThroughAIGate } = await import('../lib/ai-detector')
  const { LOCALE_IDS } = await import('../lib/prompts/locales')
  const localeArg = process.argv[3]
  const localesToRun = localeArg && (LOCALE_IDS as readonly string[]).includes(localeArg)
    ? [localeArg as LocaleId]
    : LOCALE_IDS

  async function scoreNaturalness(post: string, locale: LocaleId): Promise<string> {
    if (locale === 'english') return 'n/a'
    const reader = locale === 'hinglish' ? 'Hinglish (bilingual Indian)' : 'Indian English'
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `You are a native ${reader} reader. Rate this LinkedIn post 1-5 for how NATURAL it sounds (5 = a real Indian professional wrote it; 1 = forced / parody / stereotype). Reply as "<score> - <8-word reason>".\n\n${post}`,
      }],
    })
    return msg.content[0].type === 'text' ? msg.content[0].text.trim() : '?'
  }

  for (const locale of localesToRun) {
    console.log(`\n\n========================  ${locale.toUpperCase()}  ========================`)
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i]
      try {
        const posts = await generateLinkedInPosts({ profile: PROFILE, topic, voiceExemplars: exemplars, locale })
        const gated = await cleanThroughAIGate(posts[0], { profile: PROFILE, voiceExemplars: exemplars, locale })
        const score = await scoreNaturalness(gated.content, locale)
        console.log(`\n--- [${locale}] ${start + i + 1}. ${topic} | naturalness: ${score} ---\n${gated.content}`)
      } catch (err) {
        console.error(`[${locale}] ${topic} FAILED:`, err)
      }
    }
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
