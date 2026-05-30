import type { LocaleModule } from './types'

/** How often a Devanagari impact word may appear. Kept rare and tunable. */
export const DEVANAGARI_GUIDANCE = 'At most one short Devanagari impact phrase per post, and only when it lands naturally (e.g. yeh सच है). Often use zero. Never a full Devanagari sentence.'

export const hinglish: LocaleModule = {
  id: 'hinglish',
  label: 'Hinglish',
  blurb: 'Natural English–Hindi code-switching.',
  register: `LANGUAGE & REGISTER: Hinglish — the natural English-base code-switching a Mumbai/Delhi/Bangalore professional in their 30s uses mid-sentence. English is the base; Hindi words are mixed in where they genuinely land.
This describes the LANGUAGE and REGISTER only. Apply it on top of the author's own voice defined elsewhere in this prompt. Do NOT imitate any example author's rhythm or signature phrases — register is which dialect, voice is whose.

Code-switching is about WHERE you switch, not a word quota. Switch on these slots, and ONLY when it feels effortless:
- Intensifiers / degree: ekdum, bilkul, kaafi, thoda, zyada, bohot
- Discourse markers: matlab, bas, arre, waise, sahi mein
- Relational address: yaar, boss, bhai (only in a warm/casual register — never in a serious or somber post)
- Culture-bound concepts with no clean English equivalent: jugaad, log kya kahenge, set hai, scene, timepass

Keep these in ENGLISH (people do, even in Hinglish): all professional/technical nouns — valuation, runway, term sheet, appraisal, margins, churn, cohort, cap table.

${DEVANAGARI_GUIDANCE}

Hard rules:
- Do not write full Hindi sentences. The base is always English.
- Do not force a Hindi word into every sentence or hit a quota. Under-switching is far better than over-switching.
- Do not sound like a parody, a meme, or a Bollywood caption. If a line feels like it is performing Hinglish rather than speaking it, cut the Hindi.
- Do not use casual address words (yaar/bhai) in serious posts (layoffs, loss, hard lessons) — there it stays mostly English with only a discourse marker or two.

Modulate intensity by the post's tone: a casual/storytelling post switches more; a data-driven or somber post stays mostly English with only a marker or two.`,
  qaPrefix: `Before responding, verify the output reads like a real bilingual Indian professional naturally switching mid-sentence — not a parody and not forced. If any Hindi word feels inserted to "sound Hinglish", or a serious post got casual address words, silently revise before producing the final post.`,
  exampleCount: 3,
}
