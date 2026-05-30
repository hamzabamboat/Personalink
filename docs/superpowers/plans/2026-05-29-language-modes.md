# Language Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three selectable language modes — `english`, `indian_english`, `hinglish` — to the post generator, applied as an additive register layer on top of each user's voice fingerprint, behind a PostHog rollout flag, with Anthropic prompt caching enabled.

**Architecture:** A `lib/prompts/locales/` module exposes per-locale register instructions + a rotating few-shot example pool. `generateLinkedInPosts` composes the system prompt from ordered content blocks (universal rules → locale register → per-user voice → dynamic tail) with `cache_control` breakpoints on the static prefix. The chosen locale threads from `user_profiles.voice_locale` (or a per-request override) through generation **and** the post-generation AI-detection gate so dialect survives the Haiku rewrites. UI toggles in the generator, onboarding, and settings persist the column.

**Tech Stack:** Next.js 15 (App Router), TypeScript, `@anthropic-ai/sdk` ^0.94 (claude-sonnet-4-5 / claude-haiku-4-5), Supabase (raw SQL migrations), Vitest, PostHog (`posthog-node`), Tailwind + shadcn.

**Spec:** `docs/superpowers/specs/2026-05-29-language-modes-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260529_voice_locale.sql` | Add `voice_locale` column |
| `supabase/schema.sql` | Mirror column for fresh installs |
| `lib/supabase.ts` | Add `voice_locale` to `UserProfile` |
| `lib/prompts/locales/types.ts` | `LocaleId`, `LOCALE_IDS`, `isLocaleId`, `LocaleModule`, `LocaleExample` |
| `lib/prompts/base-rules.ts` | Universal LinkedIn rules (extracted, shared, cacheable) |
| `lib/prompts/locales/english.ts` | English module (register empty, 0 examples) |
| `lib/prompts/locales/indian-english.ts` | Indian English register + QA prefix |
| `lib/prompts/locales/hinglish.ts` | Hinglish register + QA prefix + devanagari knob |
| `lib/prompts/locales/index.ts` | `LOCALES` registry + `getLocale()` + locale option metadata |
| `lib/prompts/locales/examples/triplets.ts` | 30 contrastive example triplets (data) |
| `lib/prompts/locales/examples/index.ts` | `selectExamples()` rotating selector |
| `lib/anthropic.ts` | Thread `locale`; `buildLocaleContext`; system→cached content blocks |
| `lib/ai-detector.ts` | Locale-aware `cleanThroughAIGate` + `rewriteToHumanize` |
| `lib/flags.ts` | PostHog `language_modes` flag wrapper |
| `app/api/posts/generate/route.ts` | Resolve locale, flag-gate, pass to generator + gate |
| `app/api/profile/route.ts` | Persist `voice_locale` |
| `app/api/onboarding/save/route.ts` | Persist `voice_locale` |
| `app/dashboard/generate/page.tsx` | Locale toggle + send `locale` |
| `app/onboarding/page.tsx` | Language question |
| `app/dashboard/settings/page.tsx` | Language control |
| `scripts/test-locales.ts` | Direct-call eval harness + naturalness scorer |

**Test files** (Vitest config only includes `lib/__tests__/**/*.test.ts`; tests use **relative** imports):
`lib/__tests__/locales.test.ts`, `locale-examples.test.ts`, `locale-context.test.ts`, `ai-detector-locale.test.ts`, `resolve-locale.test.ts`.

---

## Task 1: Locale types foundation

**Files:**
- Create: `lib/prompts/locales/types.ts`
- Test: `lib/__tests__/locales.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/locales.test.ts
import { describe, it, expect } from 'vitest'
import { LOCALE_IDS, isLocaleId } from '../prompts/locales/types'

describe('locale ids', () => {
  it('exposes exactly the three supported locales', () => {
    expect(LOCALE_IDS).toEqual(['english', 'indian_english', 'hinglish'])
  })

  it('isLocaleId accepts valid ids and rejects everything else', () => {
    expect(isLocaleId('english')).toBe(true)
    expect(isLocaleId('indian_english')).toBe(true)
    expect(isLocaleId('hinglish')).toBe(true)
    expect(isLocaleId('spanish')).toBe(false)
    expect(isLocaleId('')).toBe(false)
    expect(isLocaleId(undefined)).toBe(false)
    expect(isLocaleId(42)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/locales.test.ts`
Expected: FAIL — cannot resolve `../prompts/locales/types`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/prompts/locales/types.ts
export const LOCALE_IDS = ['english', 'indian_english', 'hinglish'] as const
export type LocaleId = (typeof LOCALE_IDS)[number]

export function isLocaleId(value: unknown): value is LocaleId {
  return typeof value === 'string' && (LOCALE_IDS as readonly string[]).includes(value)
}

/** One example post in a single locale. */
export type LocaleExample = {
  id: string
  topic: string
  pillar: string
  text: string
}

export interface LocaleModule {
  id: LocaleId
  /** Human label for UI. */
  label: string
  /** Short UI blurb. */
  blurb: string
  /**
   * Static, cacheable register instructions: how this dialect phrases, switches,
   * and what it references. Empty string for english (model default).
   */
  register: string
  /** Inline self-check appended to the dynamic tail. Empty string for english. */
  qaPrefix: string
  /** How many rotating few-shot examples to inject (english = 0). */
  exampleCount: number
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/locales.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/prompts/locales/types.ts lib/__tests__/locales.test.ts
git commit -m "feat(locales): add LocaleId types and guard"
```

---

## Task 2: Database migration + UserProfile type

**Files:**
- Create: `supabase/migrations/20260529_voice_locale.sql`
- Modify: `supabase/schema.sql` (user_profiles block, after `writing_sample text,` ~line 53)
- Modify: `lib/supabase.ts` (`UserProfile` type, after `writing_sample` ~line 58)

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/20260529_voice_locale.sql
-- Language mode for the post generator: applied additively on top of voice fingerprint.
alter table user_profiles
  add column if not exists voice_locale text not null default 'english'
  check (voice_locale in ('english', 'indian_english', 'hinglish'));
```

- [ ] **Step 2: Mirror into schema.sql**

In `supabase/schema.sql`, inside `create table if not exists user_profiles (...)`, add after the `writing_sample text,` line:

```sql
  voice_locale text default 'english',
```

- [ ] **Step 3: Add field to the UserProfile type**

In `lib/supabase.ts`, add an import at the top of the file (after the existing imports):

```ts
import type { LocaleId } from './prompts/locales/types'
```

Then in the `UserProfile` type, after `writing_sample: string | null`, add:

```ts
  voice_locale: LocaleId
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors).

- [ ] **Step 5: Apply the migration to Supabase**

Run the migration SQL in the Supabase SQL editor for project `aoirhksbkoraaywephya` (the dashboard URL is referenced at the top of `supabase/schema.sql`). This is a manual step — the repo has no automated migration runner. Verify with:

```sql
select column_name, column_default from information_schema.columns
where table_name = 'user_profiles' and column_name = 'voice_locale';
```
Expected: one row, default `'english'::text`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260529_voice_locale.sql supabase/schema.sql lib/supabase.ts
git commit -m "feat(locales): add user_profiles.voice_locale column + type"
```

---

## Task 3: Base rules extraction (shared cacheable prefix)

**Files:**
- Create: `lib/prompts/base-rules.ts`
- Test: `lib/__tests__/locale-context.test.ts` (start it here; extended in Task 6)

This extracts the universal, user-independent instruction block from the inline string in `lib/anthropic.ts` so all locales share one cached prefix. **Rule 7 is reworded** (the original said "from the REAL WRITING samples above"; in the new block order the samples come *after* the rules, so it must not say "above").

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/locale-context.test.ts
import { describe, it, expect } from 'vitest'
import { BASE_RULES } from '../prompts/base-rules'

describe('BASE_RULES', () => {
  it('contains the universal rule + banned blocks', () => {
    expect(BASE_RULES).toContain('LinkedIn post rules:')
    expect(BASE_RULES).toContain('HASHTAGS (MANDATORY)')
    expect(BASE_RULES).toContain('BANNED phrases')
    expect(BASE_RULES).toContain('BANNED formats')
    expect(BASE_RULES).toContain('BANNED arcs')
  })

  it('does not reference samples as being "above" (they now come after the rules)', () => {
    expect(BASE_RULES).not.toContain('samples above')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/locale-context.test.ts`
Expected: FAIL — cannot resolve `../prompts/base-rules`.

- [ ] **Step 3: Create base-rules.ts**

Copy the intro line and `LinkedIn post rules:` through the `BANNED arcs` line **verbatim** from `lib/anthropic.ts` (currently lines 260 and 270–304), with the single rule-7 reword noted below.

```ts
// lib/prompts/base-rules.ts
/**
 * Universal, user-independent LinkedIn ghostwriting rules.
 * Extracted from lib/anthropic.ts so it forms a single cacheable prefix shared
 * across all users and locales. Keep this free of any per-user/per-request text.
 */
export const BASE_RULES = `You are an expert LinkedIn ghostwriter who writes posts that sound 100% human, get high engagement, and match the author's exact voice. You have deep context about this person's recent life and experiences — use it to make posts feel authentic and timely, not generic.

LinkedIn post rules:
1. First line must be a scroll-stopper hook — no "I" to open, no generic starters
2. Short paragraphs (1-3 lines) with blank lines between. VARY paragraph length — not every paragraph the same size.
3. End with a question, strong CTA, or powerful closing — but never beg for engagement ("tag someone", "follow me", "comment below")
4. HASHTAGS (MANDATORY): Always add 5-8 hashtags on a new line after the post. Mix: 2 large (1M+ followers, e.g. #Leadership #Entrepreneurship), 3 medium (100k-1M, e.g. #StartupIndia #ProductManagement), 2-3 niche (under 100k, specific to their industry/topic). Never use #instagood, #love, #follow. Base hashtags on industry, content pillar, and post topic.
5. 150-300 words for most posts (up to 500 for deep insights)
6. Sound like a real person writing for themselves — not a press release, not an AI assistant
7. Match the author's exact sentence length, vocabulary, and rhythm from the author's REAL WRITING samples provided below — copy their voice, not their topics
8. STRUCTURE — patterns AI detectors look for. Every single one of these is forbidden:
   ❌ Triadic anaphora — 3+ sentences or clauses starting with the same word
      Bad: "When you can't hide… When your old friends… When nobody knows…"
      Good: vary the openings, break the rhythm
   ❌ Aphoristic closer — wisdom-statement ending
      Bad: "Sometimes the worst thing is the best thing wearing a disguise."
      Good: end on a concrete detail, a flat observation, or stop mid-thought
   ❌ Symmetric callback — back-to-back sentences with identical scaffolding
      Bad: "None of that happens if X. None of that happens if Y."
      Bad: "I wasn't the kid who X. I definitely wasn't the kid who Y."
      Good: use the structure once, or not at all
   ❌ Hedging / pivot opener — "Funny how X works though" / "Here's the thing" / "The thing is" / "It's worth noting" / "Plot twist"
      Good: just say the next thing
   ❌ "Not X, it's Y" / "Not just X, it's Y" pivot
      Good: pick one side and say it
   ❌ Tricolons in every paragraph — "pitch, speak, cold call" rhythm repeated
      Good: one list per post, max. Real people don't think in threes.
   ❌ Generic abstraction without grounding — "people", "things", "moments", "lessons"
      Good: name the specific person, day, place, dollar amount, number
9. RHYTHM — high burstiness is mandatory. Mix very short sentences (2-5 words) with longer ones. Allow fragments. Allow slightly imperfect transitions. Do not over-polish. Real people are uneven; AI averages out.
10. BANNED phrases — never use: "game changer", "paradigm shift", "move the needle", "hustle harder", "built different", "showing up", "consistency is key", "trust the process", "level up", "crushing it", "this changed everything", "nobody talks about this", "unpopular opinion", "hard truth", "real talk", "at the end of the day", "deep dive", "synergy", "low-hanging fruit", "in today's world", "in a world where", "let's dive in", "the truth is", "here's the thing", "needle-moving"
11. BANNED formats — no numbered lists (1. 2. 3.), no heavy bullet point lists, no em-dash rhythm. Narrative paragraphs only.
12. BANNED arcs — no "I failed, then I learned", no fake vulnerability designed to perform rather than share, no fabricated journey narratives`
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/locale-context.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/prompts/base-rules.ts lib/__tests__/locale-context.test.ts
git commit -m "feat(locales): extract universal BASE_RULES prompt block"
```

---

## Task 4: Locale register modules + registry

**Files:**
- Create: `lib/prompts/locales/english.ts`, `indian-english.ts`, `hinglish.ts`, `index.ts`
- Test: `lib/__tests__/locales.test.ts` (extend)

- [ ] **Step 1: Extend the failing test**

Append to `lib/__tests__/locales.test.ts`:

```ts
import { getLocale, LOCALES, LOCALE_OPTIONS } from '../prompts/locales'

describe('locale registry', () => {
  it('returns a module per id with matching id', () => {
    for (const id of LOCALE_IDS) {
      expect(getLocale(id).id).toBe(id)
    }
  })

  it('english injects no examples and has empty register/qa', () => {
    const en = getLocale('english')
    expect(en.exampleCount).toBe(0)
    expect(en.register).toBe('')
    expect(en.qaPrefix).toBe('')
  })

  it('non-english locales have register text, a QA self-check, and inject examples', () => {
    for (const id of ['indian_english', 'hinglish'] as const) {
      const m = getLocale(id)
      expect(m.register.length).toBeGreaterThan(200)
      expect(m.qaPrefix.toLowerCase()).toContain('natural')
      expect(m.exampleCount).toBeGreaterThanOrEqual(2)
    }
  })

  it('hinglish register forbids full Hindi sentences and caricature; indian-english near-bans "do the needful"', () => {
    expect(getLocale('hinglish').register.toLowerCase()).toContain('do not write full hindi sentences')
    expect(getLocale('indian_english').register.toLowerCase()).toContain('do the needful')
  })

  it('LOCALE_OPTIONS has a label+blurb per id for the UI', () => {
    expect(LOCALE_OPTIONS.map(o => o.id)).toEqual(['english', 'indian_english', 'hinglish'])
    for (const o of LOCALE_OPTIONS) { expect(o.label).toBeTruthy(); expect(o.blurb).toBeTruthy() }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/locales.test.ts`
Expected: FAIL — cannot resolve `../prompts/locales`.

- [ ] **Step 3: Create the english module**

```ts
// lib/prompts/locales/english.ts
import type { LocaleModule } from './types'

export const english: LocaleModule = {
  id: 'english',
  label: 'English',
  blurb: 'Standard professional English.',
  register: '',
  qaPrefix: '',
  exampleCount: 0,
}
```

- [ ] **Step 4: Create the indian-english module**

```ts
// lib/prompts/locales/indian-english.ts
import type { LocaleModule } from './types'

export const indianEnglish: LocaleModule = {
  id: 'indian_english',
  label: 'Indian English',
  blurb: 'Measured, India-grounded professional English.',
  register: `LANGUAGE & REGISTER: Indian English (the way tier-1-city Indian professionals in their 30s actually write on LinkedIn).
This describes the LANGUAGE and REGISTER only. Apply it on top of the author's own voice defined elsewhere in this prompt. Do NOT imitate any example author's rhythm or signature phrases — register is which dialect, voice is whose.

Do:
- Lower the hyperbole. No "game-changer", "10x", "insane", "blew my mind". Claims are measured and slightly understated.
- Slightly more formal sentence construction than American English; complete sentences; fewer contractions than US casual.
- Ground specifics in the Indian context where natural: GST, RBI/SEBI, UPI, tier-1/2/3 cities, IIT/IIM, family-business dynamics, festive-season demand, ESOPs, appraisal season, jugaad (as a real resourcefulness concept, not a buzzword).
- Use Indian number words only when natural to the author: lakh, crore.

Do NOT:
- Use American idioms or sports metaphors ("hit it out of the park", "Hail Mary", "touch base", "ballpark"), "y'all", "awesome", "super excited".
- Use "kindly" or "do the needful" — these read as dated babu-English caricature to this audience. Treat them as effectively banned (do not use them to "sound Indian").
- Add Hindi words — that is the Hinglish mode, not this one. This mode is clean English with an Indian register and Indian references.`,
  qaPrefix: `Before responding, verify the output sounds natural to an Indian English speaker — a real Bangalore/Mumbai/Delhi professional, not a stereotype. If any line sounds forced, parodic, or like "kindly do the needful" caricature, silently revise it before producing the final post.`,
  exampleCount: 3,
}
```

- [ ] **Step 5: Create the hinglish module**

```ts
// lib/prompts/locales/hinglish.ts
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

Do NOT:
- Write full Hindi sentences. The base is always English.
- Force a Hindi word into every sentence or hit a quota. Under-switching is far better than over-switching.
- Sound like a parody, a meme, or a Bollywood caption. If a line feels like it's performing Hinglish rather than speaking it, cut the Hindi.
- Switch the relational words (yaar/bhai) into serious posts (layoffs, loss, hard lessons) — there it stays mostly English with only a discourse marker or two.

Modulate intensity by the post's tone: a casual/storytelling post switches more; a data-driven or somber post stays mostly English with only a marker or two.`,
  qaPrefix: `Before responding, verify the output reads like a real bilingual Indian professional naturally switching mid-sentence — not a parody and not forced. If any Hindi word feels inserted to "sound Hinglish", or a serious post got casual address words, silently revise before producing the final post.`,
  exampleCount: 3,
}
```

- [ ] **Step 6: Create the registry index**

```ts
// lib/prompts/locales/index.ts
import type { LocaleId, LocaleModule } from './types'
import { english } from './english'
import { indianEnglish } from './indian-english'
import { hinglish } from './hinglish'

export * from './types'
export { selectExamples } from './examples'

export const LOCALES: Record<LocaleId, LocaleModule> = {
  english,
  indian_english: indianEnglish,
  hinglish,
}

export function getLocale(id: LocaleId): LocaleModule {
  return LOCALES[id] ?? english
}

/** UI metadata in display order. */
export const LOCALE_OPTIONS: Array<{ id: LocaleId; label: string; blurb: string }> = [
  { id: 'english', label: english.label, blurb: english.blurb },
  { id: 'indian_english', label: indianEnglish.label, blurb: indianEnglish.blurb },
  { id: 'hinglish', label: hinglish.label, blurb: hinglish.blurb },
]
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/locales.test.ts`
Expected: PASS. (`selectExamples` is imported by `index.ts`; it does not exist yet, so this step will fail to resolve until Task 5. To keep this task self-contained, temporarily comment out the `export { selectExamples } from './examples'` line, run the test green, then restore it at the start of Task 5.)

- [ ] **Step 8: Commit**

```bash
git add lib/prompts/locales/ lib/__tests__/locales.test.ts
git commit -m "feat(locales): add english/indian-english/hinglish register modules + registry"
```

---

## Task 5: Example triplets + rotating selector

**Files:**
- Create: `lib/prompts/locales/examples/triplets.ts`, `lib/prompts/locales/examples/index.ts`
- Test: `lib/__tests__/locale-examples.test.ts`

The triplets are the creative core. Each triplet = one topic written three ways. **Paraphrase structural patterns** from the named creators (Warikoo, Aprameya, Nikhil Kamath, Falguni Nayar, Kunal Shah, Sairee Chahal, Lisa Mukhedkar, …) — **never verbatim text**. Authenticity rules live in the spec ("Authenticity design") and in the locale `register` blocks; every example must satisfy them and the `BASE_RULES` (no banned phrases, no banned structures).

**The 30 topics** (id `t01`…`t30`, with a content pillar each):

1. t01 Closing a seed round (Fundraising)
2. t02 Shutting down a product line (Product)
3. t03 Hiring your first senior leader (Hiring)
4. t04 Layoffs handled with dignity (Leadership)
5. t05 Diwali reflection on the year (Reflection)
6. t06 Family business vs own startup (Career)
7. t07 Learning to code at 35 (Upskilling)
8. t08 D2C unit-economics reality check (D2C)
9. t09 Quick-commerce ops grind (Operations)
10. t10 GST/compliance headache as a founder (Finance)
11. t11 Expanding into tier-2/3 cities (Growth)
12. t12 Return-to-office vs remote (Culture)
13. t13 Saying no to a big client (Sales)
14. t14 Bootstrapping vs VC money (Fundraising)
15. t15 A mentor's advice that stuck (Mentorship)
16. t16 Hiring freshers from non-IIT colleges (Hiring)
17. t17 Burnout and taking a real break (Wellbeing)
18. t18 Appraisal-season salary negotiation (Career)
19. t19 Customer support as a growth lever (CX)
20. t20 Building in public / sharing revenue (Transparency)
21. t21 The first 100 customers story (Growth)
22. t22 Moving back to India from abroad (Career)
23. t23 Women stepping into leadership (Leadership)
24. t24 Building a beauty/D2C brand (D2C)
25. t25 Fintech trust at UPI scale (Fintech)
26. t26 Books that shaped your thinking (Learning)
27. t27 A personal-finance lesson (Personal Finance)
28. t28 What podcasting taught you (Learning)
29. t29 ESOP/cap-table honesty with the team (Leadership)
30. t30 Festive-season sales-spike operations (Operations)

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/locale-examples.test.ts
import { describe, it, expect } from 'vitest'
import { TRIPLETS } from '../prompts/locales/examples/triplets'
import { selectExamples } from '../prompts/locales/examples'

describe('triplets dataset', () => {
  it('has 30 triplets each with all three locale variants and unique ids', () => {
    expect(TRIPLETS).toHaveLength(30)
    const ids = new Set(TRIPLETS.map(t => t.id))
    expect(ids.size).toBe(30)
    for (const t of TRIPLETS) {
      expect(t.topic).toBeTruthy()
      expect(t.pillar).toBeTruthy()
      expect(t.english.trim().length).toBeGreaterThan(80)
      expect(t.indian_english.trim().length).toBeGreaterThan(80)
      expect(t.hinglish.trim().length).toBeGreaterThan(80)
    }
  })

  it('never uses the caricature phrase "do the needful" in any variant', () => {
    for (const t of TRIPLETS) {
      for (const v of [t.english, t.indian_english, t.hinglish]) {
        expect(v.toLowerCase()).not.toContain('do the needful')
      }
    }
  })
})

describe('selectExamples', () => {
  it('returns 0 for english regardless of n', () => {
    expect(selectExamples('english', 3, 0)).toEqual([])
  })

  it('returns n examples in the requested locale, deterministically by seed', () => {
    const a = selectExamples('hinglish', 3, 5)
    const b = selectExamples('hinglish', 3, 5)
    expect(a).toHaveLength(3)
    expect(a.map(e => e.id)).toEqual(b.map(e => e.id))
    expect(a.every(e => e.text.length > 0)).toBe(true)
  })

  it('rotates: different seeds yield a different starting example', () => {
    const a = selectExamples('indian_english', 3, 0)
    const c = selectExamples('indian_english', 3, 7)
    expect(a[0].id).not.toBe(c[0].id)
  })

  it('caps n at the dataset size and never returns duplicates', () => {
    const all = selectExamples('hinglish', 999, 0)
    expect(all.length).toBe(30)
    expect(new Set(all.map(e => e.id)).size).toBe(30)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/locale-examples.test.ts`
Expected: FAIL — cannot resolve the example modules.

- [ ] **Step 3: Create the triplets dataset**

Create `lib/prompts/locales/examples/triplets.ts` exporting `export const TRIPLETS: Triplet[]` with all 30 entries (`t01`…`t30`) using the topics above. The `Triplet` type:

```ts
// at top of triplets.ts
export type Triplet = {
  id: string
  topic: string
  pillar: string
  english: string
  indian_english: string
  hinglish: string
}
```

Two complete reference entries establishing the quality + anti-parody bar (author the other 28 to this standard, varying tone — celebratory, reflective, firm, somber, analytical — across the topic list):

```ts
{
  id: 't01',
  topic: 'Closing a seed round',
  pillar: 'Fundraising',
  english: `We closed our seed round last week. $1.4M.

I expected to feel relief. Mostly I felt the weight of it.

Forty-one investor conversations. Twenty-nine of them said no, and a few of those were right to. The round came together because two early customers got on calls with investors and explained why they kept paying us. That did more than any deck I built.

The money buys us about eighteen months. That's it. It's not a finish line, it's a slightly longer runway to prove the thing we already believe.

To the founders still in the no-pile: a no from someone who doesn't understand your customer isn't data. Keep going.

What's one thing you wish someone told you before your first raise?

#StartupIndia #Fundraising #SeedFunding #FoundersJourney #SaaS #Entrepreneurship #VentureCapital`,
  indian_english: `We closed our seed round last week. $1.4M.

I expected relief. Mostly I felt the responsibility of it.

Forty-one investor conversations, twenty-nine no's. The round finally came together because two of our earliest customers joined calls and explained, in their own words, why they keep paying us. That carried more weight than any deck I prepared.

This money gives us roughly eighteen months of runway. It is not an achievement in itself — it is time to prove what we already believe about the business.

For founders still collecting no's: a rejection from someone who does not understand your customer is not a verdict. Keep at it.

What is one thing you wish you had known before your first raise?

#StartupIndia #Fundraising #SeedFunding #FoundersJourney #SaaS #Entrepreneurship #VentureCapital`,
  hinglish: `We closed our seed round last week. $1.4M.

I thought I'd feel relief. Bas, mostly I felt the weight of it.

Forty-one investor calls, twenty-nine no's. Sahi mein, the round came together only because two of our oldest customers hopped on calls and explained why they keep paying us. That did more than any deck I made.

This money gives us about eighteen months of runway. Thoda perspective: it's not a finish line, it's just a longer runway to prove the thing we already believe.

To the founders still sitting in the no-pile — yaar, a no from someone who doesn't get your customer isn't data. Keep going.

What's one thing you wish someone told you before your first raise?

#StartupIndia #Fundraising #SeedFunding #FoundersJourney #SaaS #Entrepreneurship #VentureCapital`,
},
{
  id: 't13',
  topic: 'Saying no to a big client',
  pillar: 'Sales',
  english: `We turned down ₹40 lakh of annual revenue yesterday.

The client wanted us to rebuild half our product for their workflow. On paper it was our biggest deal. In practice it would have pulled four engineers off the roadmap for six months to serve one logo.

I said no on the call. The room went quiet. My co-founder and I had agreed beforehand, but it still felt like setting money on fire.

Here's what made it easier: we already had eleven smaller customers asking for things that would help all of them. Building for one would have meant ignoring eleven.

Revenue you have to contort yourself to earn isn't really revenue. It's a future apology.

Have you ever walked away from a deal you were "supposed" to take?

#Sales #Startups #ProductStrategy #FoundersJourney #B2B #SaaS #Entrepreneurship`,
  indian_english: `We declined ₹40 lakh of annual revenue yesterday.

The client wanted us to rebuild nearly half the product around their workflow. On paper, it was our largest deal. In reality, it would have taken four engineers off the roadmap for six months to serve a single logo.

I said no on the call itself. There was a pause. My co-founder and I had aligned beforehand, yet it still felt like walking away from certain money.

What made it manageable: eleven smaller customers were already asking for improvements that would benefit all of them. Building for one would have meant neglecting eleven.

Revenue that requires you to distort the business is not really revenue. It is a future apology.

Have you ever stepped back from a deal you were "supposed" to accept?

#Sales #Startups #ProductStrategy #FoundersJourney #B2B #SaaS #Entrepreneurship`,
  hinglish: `We turned down ₹40 lakh of annual revenue yesterday.

The client wanted us to rebuild half the product around their workflow. On paper, biggest deal ever. Reality mein, it would've pulled four engineers off the roadmap for six months — for one logo.

I said no on the call itself. Thoda silence after that. My co-founder and I had already decided, par still, it felt like burning money.

What made it easier: eleven chhote customers were already asking for things that would help all of them. Building for one matlab ignoring eleven.

Revenue jiske liye you have to bend the whole company out of shape — that's not revenue, boss. It's a future apology.

Ever walked away from a deal you were "supposed" to take?

#Sales #Startups #ProductStrategy #FoundersJourney #B2B #SaaS #Entrepreneurship`,
},
```

Author `t02`–`t12`, `t14`–`t30` to the same standard. Each variant must: open with a non-"I" hook, keep the same facts/structure across all three locales, pass `BASE_RULES` (no banned phrases/structures), and for hinglish follow slot-based switching (and tone modulation — e.g. t04 layoffs and t17 burnout stay mostly English with at most a discourse marker; t05 Diwali and t26 books can switch more).

- [ ] **Step 4: Create the selector**

```ts
// lib/prompts/locales/examples/index.ts
import type { LocaleId, LocaleExample } from '../types'
import { TRIPLETS } from './triplets'

/**
 * Pick `n` examples in the target locale, starting at a rotating offset.
 * Deterministic when `seed` is provided (tests + harness); random otherwise.
 * Returns [] for english or n <= 0.
 */
export function selectExamples(locale: LocaleId, n: number, seed?: number): LocaleExample[] {
  if (locale === 'english' || n <= 0) return []
  const total = TRIPLETS.length
  const count = Math.min(n, total)
  const start = ((seed ?? Math.floor(Math.random() * total)) % total + total) % total
  const out: LocaleExample[] = []
  for (let i = 0; i < count; i++) {
    const t = TRIPLETS[(start + i) % total]
    out.push({ id: t.id, topic: t.topic, pillar: t.pillar, text: t[locale] })
  }
  return out
}
```

- [ ] **Step 5: Restore the export in the registry**

In `lib/prompts/locales/index.ts`, ensure the line `export { selectExamples } from './examples'` is present (un-comment if you commented it in Task 4 Step 7).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/locale-examples.test.ts lib/__tests__/locales.test.ts`
Expected: PASS (all).

- [ ] **Step 7: Commit**

```bash
git add lib/prompts/locales/examples/ lib/prompts/locales/index.ts lib/__tests__/locale-examples.test.ts
git commit -m "feat(locales): add 30 example triplets + rotating selector"
```

---

## Task 6: Thread locale into generation + cached content blocks

**Files:**
- Modify: `lib/anthropic.ts` (`GeneratePostOptions` ~17-30; `generateLinkedInPosts` ~234-337)
- Test: `lib/__tests__/locale-context.test.ts` (extend)

This restructures the `system` prompt into ordered content blocks with `cache_control`, in this order: **BASE_RULES (cached) → locale register (cached) → per-user voice (cached) → dynamic tail (uncached)**. Per-request bits (content pillar, memories, avoid-topics, image context, locale examples, QA prefix) move into the uncached tail.

- [ ] **Step 1: Write the failing test**

Append to `lib/__tests__/locale-context.test.ts`:

```ts
import { buildLocaleContext } from '../anthropic'

describe('buildLocaleContext', () => {
  it('is empty for english', () => {
    expect(buildLocaleContext('english', 0)).toBe('')
  })

  it('includes register, QA self-check, and the requested number of examples for hinglish', () => {
    const out = buildLocaleContext('hinglish', 3, 0)
    expect(out).toContain('Hinglish')
    expect(out.toLowerCase()).toContain('before responding')
    // 3 injected examples, each rendered inside a fenced block
    expect((out.match(/"""/g) || []).length).toBe(6)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/locale-context.test.ts`
Expected: FAIL — `buildLocaleContext` is not exported from `../anthropic`.

- [ ] **Step 3: Add imports and `buildLocaleContext` to anthropic.ts**

At the top of `lib/anthropic.ts`, add:

```ts
import { BASE_RULES } from './prompts/base-rules'
import { getLocale, selectExamples, type LocaleId } from './prompts/locales'
```

Add `locale` to `GeneratePostOptions` (after `voiceExemplars?`):

```ts
  /** Language mode applied additively on top of the voice fingerprint. */
  locale?: LocaleId
```

Add the exported helper (place it just above `generateLinkedInPosts`):

```ts
/**
 * Register + QA + rotating few-shot examples for a locale. Empty for english.
 * `seed` is forwarded to selectExamples for deterministic tests/harness runs.
 */
export function buildLocaleContext(locale: LocaleId, exampleCount: number, seed?: number): string {
  const mod = getLocale(locale)
  if (locale === 'english') return ''
  const examples = selectExamples(locale, exampleCount, seed)
  const exampleBlock = examples.length
    ? `\n\nExamples of ${mod.label} register — study the LANGUAGE and switching, NOT the voice (keep the author's voice):\n\n${examples
        .map((e, i) => `Register example ${i + 1} (${e.topic}):\n"""\n${e.text}\n"""`)
        .join('\n\n')}`
    : ''
  return `${mod.register}${exampleBlock}\n\n${mod.qaPrefix}`
}
```

- [ ] **Step 4: Run the new unit test to verify it passes**

Run: `npx vitest run lib/__tests__/locale-context.test.ts`
Expected: PASS.

- [ ] **Step 5: Rewrite the system-prompt assembly in `generateLinkedInPosts`**

Replace the body of `generateLinkedInPosts` from the `const systemPrompt = ...` assignment through the `anthropic.messages.create({...})` call (currently ~260-328) with the block-structured version below. Destructure `locale` with a default, and build the per-user block and dynamic tail explicitly.

```ts
  const { profile, topic, transcript, storyText, additionalContext, trendingContext, recentTopics, recentTopicsByPillar, userMemories, imageContext, voiceExemplars, locale = 'english' } = options

  const pillar = pickContentPillar(profile, recentTopicsByPillar)
  const voiceContext = buildVoiceContext(profile)
  const exemplarBlock = buildExemplarBlock(voiceExemplars)
  const localeMod = getLocale(locale)
  const localeContext = buildLocaleContext(locale, localeMod.exampleCount)

  const sourceContext = storyText
    ? `Transform this personal story/experience into a LinkedIn post:\n"${storyText}"`
    : transcript
    ? `The user recorded a voice note. Transcript:\n"${transcript}"\n\nTransform these raw ideas into a polished post.`
    : topic
    ? `Topic: "${topic}"`
    : `Generate a post about: ${pillar}`

  const avoidTopics = recentTopics?.length
    ? `\nDo NOT repeat or closely overlap with these recent topics: ${recentTopics.join(', ')}`
    : ''

  const memoriesContext = userMemories?.length
    ? `\n\nThings this person has recently experienced (NOT yet written about on LinkedIn — consider weaving one naturally into the post or following up on it if relevant):\n${userMemories.map(m => {
        const when = m.occurred_at ? ` (${new Date(m.occurred_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})` : ''
        return `- [${m.memory_type}]${when}: ${m.content}`
      }).join('\n')}`
    : ''

  // Per-user, stable across a session (cacheable).
  const perUserBlock = `Author profile:
- Name: ${profile.name || profile.job_title || 'a professional'}${profile.company ? ` at ${profile.company}` : ''}
- Role: ${profile.role || profile.job_title || 'professional'}
- Industry: ${profile.industry || 'business'}

${voiceContext}${exemplarBlock}`

  // Per-request, never cached.
  const dynamicTail = `Content pillar for this post: ${pillar}${memoriesContext}${avoidTopics}${imageContext ? `\n\n${imageContext}\nWrite the post so it naturally connects to what is shown in these photos. Reference the images implicitly — the post should feel written specifically to accompany them.` : ''}${localeContext ? `\n\n${localeContext}` : ''}`

  const system: Anthropic.TextBlockParam[] = [
    { type: 'text', text: BASE_RULES, cache_control: { type: 'ephemeral' } },
    ...(localeMod.register ? [{ type: 'text' as const, text: localeMod.register, cache_control: { type: 'ephemeral' as const } }] : []),
    { type: 'text', text: perUserBlock, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: dynamicTail },
  ]

  const userPrompt = `${sourceContext}
${additionalContext ? `\nAdditional instructions: ${additionalContext}` : ''}
${trendingContext ? `\nTrending context to weave in naturally: ${trendingContext}` : ''}

Write 3 different LinkedIn post options with different angles/hooks. Format:

---POST 1---
[post content]

---POST 2---
[post content]

---POST 3---
[post content]`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2500,
    temperature: 0.85,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  })
```

Note: `localeContext` already contains the register + QA + examples; here the register is *also* placed as its own cached block. To avoid duplicating the register text, change `buildLocaleContext` usage in the tail to examples+QA only. Concretely, the `dynamicTail` must NOT repeat `localeMod.register`. Use this dedicated tail builder instead of `localeContext`:

```ts
  // examples + QA only (register lives in its own cached block above)
  const localeExamples = selectExamples(locale, localeMod.exampleCount)
  const localeTail = locale === 'english' ? '' : `${localeExamples.length ? `\n\nExamples of ${localeMod.label} register — study the LANGUAGE and switching, NOT the voice (keep the author's voice):\n\n${localeExamples.map((e, i) => `Register example ${i + 1} (${e.topic}):\n"""\n${e.text}\n"""`).join('\n\n')}` : ''}\n\n${localeMod.qaPrefix}`
```

Then build `dynamicTail` ending with `${localeTail}` instead of `${localeContext ? ...}`. (Keep `buildLocaleContext` exported — it is still used by the unit test and is a convenient single-string form; the production path uses the split version so the register can be cached separately.)

- [ ] **Step 6: Typecheck + run all locale tests**

Run: `npx tsc --noEmit && npx vitest run lib/__tests__/locale-context.test.ts lib/__tests__/locales.test.ts lib/__tests__/locale-examples.test.ts`
Expected: PASS, no type errors. (`Anthropic.TextBlockParam` is exported by `@anthropic-ai/sdk` ^0.94; `Anthropic` is already imported at the top of the file.)

- [ ] **Step 7: Commit**

```bash
git add lib/anthropic.ts lib/__tests__/locale-context.test.ts
git commit -m "feat(locales): compose system prompt from cached blocks + inject locale register"
```

---

## Task 7: Locale-aware AI-detection gate

**Files:**
- Modify: `lib/ai-detector.ts` (`rewriteToHumanize` ~269-318, `cleanThroughAIGate` ~322-373)
- Test: `lib/__tests__/ai-detector-locale.test.ts`

The Haiku rewrite must preserve dialect for non-english locales, otherwise it "corrects" Hinglish/Indian English back to standard English. We add `locale` to both signatures and inject a preservation clause into the rewrite prompt.

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/ai-detector-locale.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn(async () => ({ content: [{ type: 'text', text: 'rewritten' }] }))
vi.mock('../anthropic', () => ({ anthropic: { messages: { create: (...a: unknown[]) => createMock(...a) } } }))
vi.mock('../humanize', () => ({ humanizeText: (s: string) => s }))

import { rewriteToHumanize } from '../ai-detector'
import type { UserProfile } from '../supabase'

const profile = { name: 'Test' } as unknown as UserProfile

beforeEach(() => createMock.mockClear())

describe('rewriteToHumanize locale awareness', () => {
  it('adds a dialect-preservation clause for hinglish', async () => {
    await rewriteToHumanize('text', ['triadic_anaphora'], { profile, attempt: 1, locale: 'hinglish' })
    const prompt = (createMock.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content
    expect(prompt.toLowerCase()).toContain('preserve')
    expect(prompt.toLowerCase()).toContain('hinglish')
    expect(prompt.toLowerCase()).toContain('devanagari')
  })

  it('adds no dialect clause for english', async () => {
    await rewriteToHumanize('text', ['triadic_anaphora'], { profile, attempt: 1, locale: 'english' })
    const prompt = (createMock.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content
    expect(prompt.toLowerCase()).not.toContain('preserve the')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/ai-detector-locale.test.ts`
Expected: FAIL — `rewriteToHumanize` does not accept `locale`.

- [ ] **Step 3: Add locale to the gate**

In `lib/ai-detector.ts`, add the import:

```ts
import type { LocaleId } from './prompts/locales/types'
```

Change the `rewriteToHumanize` options type to include `locale` and build a preservation clause. Update the signature:

```ts
export async function rewriteToHumanize(
  text: string,
  patterns: string[],
  options: { profile: UserProfile; voiceExemplars?: string[]; attempt: 1 | 2; locale?: LocaleId }
): Promise<string> {
  const { voiceExemplars, attempt, locale = 'english' } = options
```

Immediately before `const prompt = ...`, add:

```ts
  const dialectClause = locale === 'indian_english'
    ? `\n\nThis post is written in Indian English register. PRESERVE that register and any India-specific references (GST, RBI, lakh/crore, city tiers). Do NOT Americanise it and do NOT add "kindly" or "do the needful".`
    : locale === 'hinglish'
    ? `\n\nThis post is written in Hinglish (English base with natural Hindi code-switching, occasional Devanagari). PRESERVE every Hindi word, the code-switching, and any Devanagari exactly as written. Do NOT translate it to standard English or strip the Hindi. Only remove the flagged structural patterns.`
    : ''
```

Then append `${dialectClause}` to the prompt, just before the final `Return ONLY the rewritten post...` line. Concretely, change:

```ts
If the original ended with hashtags, keep them. If not, do not add any.${stricter}

Return ONLY the rewritten post. No preamble. No commentary.`
```
to:
```ts
If the original ended with hashtags, keep them. If not, do not add any.${dialectClause}${stricter}

Return ONLY the rewritten post. No preamble. No commentary.`
```

- [ ] **Step 4: Thread locale through `cleanThroughAIGate`**

Update its signature and the `rewriteToHumanize` call:

```ts
export async function cleanThroughAIGate(
  draft: string,
  options: { profile: UserProfile; voiceExemplars?: string[]; locale?: LocaleId }
): Promise<GateResult> {
```
and inside the loop change:
```ts
      const rewritten = await rewriteToHumanize(bestContent, bestPatterns, { ...options, attempt })
```
(`options` now carries `locale`, so the spread forwards it — no further change needed.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/ai-detector-locale.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/ai-detector.ts lib/__tests__/ai-detector-locale.test.ts
git commit -m "feat(locales): preserve dialect through the AI-detection rewrite gate"
```

---

## Task 8: PostHog flag wrapper

**Files:**
- Create: `lib/flags.ts`
- Test: `lib/__tests__/resolve-locale.test.ts` (created here, extended in Task 9)

- [ ] **Step 1: Write the failing test**

```ts
// lib/__tests__/resolve-locale.test.ts
import { describe, it, expect, vi } from 'vitest'

const isEnabled = vi.fn()
vi.mock('../posthog-server', () => ({
  getPostHogClient: () => ({ isFeatureEnabled: (...a: unknown[]) => isEnabled(...a) }),
}))

import { isLanguageModesEnabled } from '../flags'

describe('isLanguageModesEnabled', () => {
  it('returns true when PostHog enables the flag', async () => {
    isEnabled.mockResolvedValueOnce(true)
    expect(await isLanguageModesEnabled('user-1')).toBe(true)
  })
  it('returns false when the flag is off or undefined', async () => {
    isEnabled.mockResolvedValueOnce(undefined)
    expect(await isLanguageModesEnabled('user-1')).toBe(false)
  })
  it('fails closed to false if PostHog throws', async () => {
    isEnabled.mockRejectedValueOnce(new Error('network'))
    expect(await isLanguageModesEnabled('user-1')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/resolve-locale.test.ts`
Expected: FAIL — cannot resolve `../flags`.

- [ ] **Step 3: Implement the wrapper**

```ts
// lib/flags.ts
import { getPostHogClient } from './posthog-server'

export const LANGUAGE_MODES_FLAG = 'language_modes'

/**
 * Rollout gate for language modes. Evaluate once per request. Fails closed
 * (false) on any error so a PostHog outage never breaks generation.
 */
export async function isLanguageModesEnabled(distinctId: string): Promise<boolean> {
  try {
    const enabled = await getPostHogClient().isFeatureEnabled(LANGUAGE_MODES_FLAG, distinctId)
    return enabled === true
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/resolve-locale.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/flags.ts lib/__tests__/resolve-locale.test.ts
git commit -m "feat(locales): add PostHog language_modes flag wrapper"
```

---

## Task 9: Generate route — resolve locale, gate, thread through

**Files:**
- Create: `lib/resolve-locale.ts` (pure helper, unit-tested)
- Modify: `app/api/posts/generate/route.ts` (body parse ~49; generate call ~185-191; gate call ~195-197)
- Test: `lib/__tests__/resolve-locale.test.ts` (extend)

- [ ] **Step 1: Extend the failing test**

Append to `lib/__tests__/resolve-locale.test.ts`:

```ts
import { resolveLocale } from '../resolve-locale'

describe('resolveLocale', () => {
  it('forces english when the flag is disabled, ignoring stored/override', () => {
    expect(resolveLocale({ flagEnabled: false, override: 'hinglish', stored: 'hinglish' })).toBe('english')
  })
  it('prefers a valid per-request override when enabled', () => {
    expect(resolveLocale({ flagEnabled: true, override: 'hinglish', stored: 'english' })).toBe('hinglish')
  })
  it('falls back to the stored profile value when no override', () => {
    expect(resolveLocale({ flagEnabled: true, override: undefined, stored: 'indian_english' })).toBe('indian_english')
  })
  it('defaults to english for invalid values', () => {
    expect(resolveLocale({ flagEnabled: true, override: 'klingon', stored: null })).toBe('english')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/resolve-locale.test.ts`
Expected: FAIL — cannot resolve `../resolve-locale`.

- [ ] **Step 3: Implement the resolver**

```ts
// lib/resolve-locale.ts
import { isLocaleId, type LocaleId } from './prompts/locales/types'

/**
 * Effective locale for a generation request.
 * - Flag off  -> always english (clean rollout).
 * - Flag on   -> valid per-request override, else stored profile value, else english.
 */
export function resolveLocale(input: {
  flagEnabled: boolean
  override?: unknown
  stored?: unknown
}): LocaleId {
  if (!input.flagEnabled) return 'english'
  if (isLocaleId(input.override)) return input.override
  if (isLocaleId(input.stored)) return input.stored
  return 'english'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/resolve-locale.test.ts`
Expected: PASS (all 7 tests in the file).

- [ ] **Step 5: Wire into the route**

In `app/api/posts/generate/route.ts`:

Add imports near the existing imports:
```ts
import { isLanguageModesEnabled } from '@/lib/flags'
import { resolveLocale } from '@/lib/resolve-locale'
```

Change the request-body destructure (currently line 49) to also read `locale`:
```ts
  const { topic, voiceNoteId, storyBankId, additionalContext, imageIds, locale: localeOverride } = await request.json()
```

Immediately after `voiceExemplars` is resolved (after line 183, before the `generateLinkedInPosts` call), add:
```ts
  const languageModesOn = await isLanguageModesEnabled(user.id)
  const locale = resolveLocale({ flagEnabled: languageModesOn, override: localeOverride, stored: profile.voice_locale })
```

Pass `locale` into the generator call (add to the options object at ~185):
```ts
  const posts = await generateLinkedInPosts({
    profile, topic, transcript, storyText, additionalContext, trendingContext,
    recentTopics, recentTopicsByPillar,
    userMemories: userMemories || undefined,
    imageContext,
    voiceExemplars,
    locale,
  })
```

Pass `locale` into the gate (the `cleanThroughAIGate` call at ~196):
```ts
  const gateResults = await Promise.all(
    posts.map(p => cleanThroughAIGate(p, { profile, voiceExemplars, locale }))
  )
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/posts/generate/route.ts lib/resolve-locale.ts lib/__tests__/resolve-locale.test.ts
git commit -m "feat(locales): resolve + flag-gate locale in the generate route"
```

---

## Task 10: Persist voice_locale in profile + onboarding routes

**Files:**
- Modify: `app/api/profile/route.ts` (destructure ~29-34; upsert ~43-54)
- Modify: `app/api/onboarding/save/route.ts` (destructure ~17-20; upsert ~37-60)

- [ ] **Step 1: Update `/api/profile` POST**

Add the import:
```ts
import { isLocaleId } from '@/lib/prompts/locales/types'
```
Add `voice_locale` to the destructure (line 29-34 block):
```ts
      writing_sample, plan, preferred_days, preferred_post_hour, timezone, voice_locale,
```
Add to the upsert object (after `writing_sample, plan,`):
```ts
        voice_locale: isLocaleId(voice_locale) ? voice_locale : undefined,
```
(`undefined` omits the field so a partial save never overwrites the column with an invalid value; the DB default/existing value stands.)

- [ ] **Step 2: Update `/api/onboarding/save` POST**

Add the import:
```ts
import { isLocaleId } from '@/lib/prompts/locales/types'
```
Add `voice_locale` to the destructure (line 17-20 block):
```ts
    mcq_answers, writing_sample, content_pillars, control_preference, plan, voice_locale,
```
Add to the upsert object (near `mcq_answers,`):
```ts
      voice_locale: isLocaleId(voice_locale) ? voice_locale : 'english',
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/profile/route.ts app/api/onboarding/save/route.ts
git commit -m "feat(locales): persist voice_locale from profile + onboarding saves"
```

---

## Task 11: Generator UI — locale toggle

**Files:**
- Modify: `app/dashboard/generate/page.tsx` (state ~444-483; load effect ~487-511; tone selector ~767-778; body assembly ~596)

No unit test (UI in a large client component); verified by manual run in Task 14.

- [ ] **Step 1: Add imports + state**

Add the import near the top:
```ts
import { LOCALE_OPTIONS, type LocaleId } from '@/lib/prompts/locales'
```
Add state beside `selectedTone` (after line 483):
```ts
const [locale, setLocale] = useState<LocaleId>('english')
const [languageModesOn, setLanguageModesOn] = useState(false)
```

- [ ] **Step 2: Load the user's stored locale + flag exposure**

In the `/api/me` handler inside the load effect (after the `setPlan(...)` block ~495-498), add:
```ts
      if (meData.profile?.voice_locale) setLocale(meData.profile.voice_locale)
      if (meData.languageModesEnabled) setLanguageModesOn(true)
```
This relies on `/api/me` returning `languageModesEnabled` — add that to the route. In `app/api/me/route.ts`, import the flag helper and include it in the response:
```ts
import { isLanguageModesEnabled } from '@/lib/flags'
```
Change the response object to add (compute it alongside the existing Promise.all, keyed on `user.id`):
```ts
    const languageModesEnabled = await isLanguageModesEnabled(user.id)
```
and add `languageModesEnabled,` to the returned JSON object.

- [ ] **Step 3: Render the locale segmented control**

Directly after the tone selector block (after line 778), add — only shown when the flag is on:
```tsx
{languageModesOn && (
  <div>
    <label className="db-label" style={{ marginBottom: 8 }}>// language</label>
    <div className="seg">
      {LOCALE_OPTIONS.map(opt => (
        <button key={opt.id} type="button" onClick={() => setLocale(opt.id)}
          title={opt.blurb}
          className={locale === opt.id ? 'is-on' : ''}>
          {opt.label}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Send locale on generate + capture the event**

In `handleGenerate`, change the body initialiser (line 596) to include locale:
```ts
    const body: Record<string, unknown> = { additionalContext: tonePrefix + additionalContext, locale }
```
Right after a successful generation (after `setGeneratedPosts(posts)` ~620), add:
```ts
    posthog.capture('language_mode_selected', { locale, surface: 'generator' })
```

- [ ] **Step 5: Build to verify the client compiles**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/generate/page.tsx app/api/me/route.ts
git commit -m "feat(locales): add language toggle to the generator + expose flag in /api/me"
```

---

## Task 12: Onboarding — language question

**Files:**
- Modify: `app/onboarding/page.tsx` (FormData ~47-51; MCQ step render ~381-406; handleFinish ~167-172)

- [ ] **Step 1: Add `voice_locale` to FormData + initial state**

Add the import:
```ts
import { LOCALE_OPTIONS, type LocaleId } from '@/lib/prompts/locales'
```
Add to the `FormData` type:
```ts
  voice_locale: LocaleId
```
In the `useState` that initialises `form`, add `voice_locale: 'english'` to the initial object.

- [ ] **Step 2: Render the language question in the content/voice step**

Inside the step-2 render, immediately after the `{MCQ_QUESTIONS.map(...)}` block (after line 406), add:
```tsx
<div>
  <p className="font-semibold text-slate-900 mb-1 text-[15px]">Which language style should your posts use?</p>
  <p className="text-[12px] text-slate-400 mb-3">You can change this anytime in Settings.</p>
  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-2.5">
    {LOCALE_OPTIONS.map(opt => {
      const selected = form.voice_locale === opt.id
      return (
        <button
          key={opt.id}
          type="button"
          onClick={() => setForm(f => ({ ...f, voice_locale: opt.id }))}
          title={opt.blurb}
          className={`px-4 py-3 sm:py-2.5 rounded-xl sm:rounded-full border-2 text-sm transition-all text-left sm:text-center min-h-[48px] sm:min-h-0 ${
            selected ? 'border-brand bg-brand-light text-brand font-semibold' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          {opt.label}
        </button>
      )
    })}
  </div>
</div>
```
(`form` is sent wholesale to `/api/onboarding/save` in `handleFinish`, so `voice_locale` is persisted by the Task 10 change — no handler edit needed.)

- [ ] **Step 2b (verify):** confirm `setForm` is the state updater name used elsewhere in the file; if the file uses a differently-named updater (e.g. `update(field, value)`), use that pattern instead for the `onClick`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat(locales): add language preference question to onboarding"
```

---

## Task 13: Settings — language control

**Files:**
- Modify: `app/dashboard/settings/page.tsx` (load ~79-115; a preferences section near the Content Pillars block ~505-532; save via existing `saveProfile()` → `/api/profile`)

- [ ] **Step 1: Add the import**

```ts
import { LOCALE_OPTIONS } from '@/lib/prompts/locales'
```

- [ ] **Step 2: Render a language control modelled on the Content Pillars block**

Near the Content Pillars block (after line 532), add a new control that reads/writes `profile.voice_locale`:
```tsx
<div>
  <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
    Language & dialect
  </Label>
  <div className="flex flex-wrap gap-2 mt-2">
    {LOCALE_OPTIONS.map(opt => {
      const selected = (profile.voice_locale as string) === opt.id
      return (
        <button
          key={opt.id}
          type="button"
          onClick={() => setProfile(p => ({ ...p, voice_locale: opt.id }))}
          title={opt.blurb}
          className={`px-3.5 py-1.5 rounded-full border text-[13px] transition-all duration-150 font-medium ${
            selected
              ? 'border-brand bg-brand-light text-brand shadow-sm'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
          }`}
        >
          {selected && <Check className="w-3 h-3 inline mr-1.5" strokeWidth={2.5} />}
          {opt.label}
        </button>
      )
    })}
  </div>
</div>
```
(`Check` is already imported in this file per the Content Pillars block. `saveProfile()` POSTs the whole `profile` to `/api/profile`, and Task 10 persists `voice_locale` there.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/settings/page.tsx
git commit -m "feat(locales): add language control to settings"
```

---

## Task 14: Eval harness — 20 generations × 3 locales + naturalness scorer

**Files:**
- Create: `scripts/test-locales.ts`

- [ ] **Step 1: Write the harness**

```ts
// scripts/test-locales.ts
/**
 * Eval harness for language modes. Calls the generator directly with a synthetic
 * India-based profile across 20 topics x 3 locales, scores each output for
 * naturalness with Haiku, and prints results grouped by locale. No HTTP/auth/DB.
 *
 * Run: npx tsx scripts/test-locales.ts
 * Requires ANTHROPIC_API_KEY (loaded from .env.local if not already in env).
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local for ANTHROPIC_API_KEY if not already set (no dotenv dep).
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

import { anthropic, generateLinkedInPosts } from '../lib/anthropic'
import { cleanThroughAIGate } from '../lib/ai-detector'
import { LOCALE_IDS, type LocaleId } from '../lib/prompts/locales'
import type { UserProfile } from '../lib/supabase'

const PROFILE = {
  id: 'test', user_id: 'test',
  name: 'Ananya Rao', role: 'Co-founder & CEO', industry: 'B2B SaaS', company: 'a Bangalore startup',
  voice_fingerprint: 'Writes in short, direct paragraphs with the occasional one-line punch. Warm but not gushing. Uses concrete numbers. Avoids buzzwords. Ends on a genuine question, not a CTA.',
  mcq_answers: { voice_style: 'Conversational', main_goal: 'Build personal brand', known_as: 'The Operator' },
  content_pillars: ['Fundraising', 'Hiring', 'Product'],
  writing_sample: 'We almost missed payroll in month 9. I told the team the truth on a Friday. Three of them offered to defer salary. We did not take them up on it, but I have never forgotten who raised their hand.',
  timezone: 'Asia/Kolkata',
} as unknown as UserProfile

const TOPICS = [
  'Closing a seed round', 'Shutting down a product line', 'Hiring your first senior leader',
  'Layoffs handled with dignity', 'A Diwali reflection on the year', 'Family business vs your own startup',
  'Learning to code at 35', 'D2C unit economics', 'The quick-commerce ops grind',
  'A GST compliance headache', 'Expanding into tier-2 cities', 'Return to office vs remote',
  'Saying no to a big client', 'Bootstrapping vs VC money', 'A mentor’s advice that stuck',
  'Hiring freshers from non-IIT colleges', 'Burnout and taking a break', 'Appraisal-season salary talk',
  'Customer support as growth', 'Building in public', // 20 topics
]

const exemplars = [PROFILE.writing_sample as string]

async function scoreNaturalness(post: string, locale: LocaleId): Promise<string> {
  if (locale === 'english') return 'n/a'
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 120,
    messages: [{ role: 'user', content: `You are a native ${locale === 'hinglish' ? 'Hinglish (bilingual Indian)' : 'Indian English'} reader. Rate this LinkedIn post 1-5 for how NATURAL it sounds (5 = a real Indian professional wrote it; 1 = forced/parody/stereotype). Reply as "<score> - <8-word reason>".\n\n${post}` }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : '?'
}

async function main() {
  for (const locale of LOCALE_IDS) {
    console.log(`\n\n========================  ${locale.toUpperCase()}  ========================`)
    for (let i = 0; i < TOPICS.length; i++) {
      const topic = TOPICS[i]
      try {
        const posts = await generateLinkedInPosts({ profile: PROFILE, topic, voiceExemplars: exemplars, locale })
        const gated = await cleanThroughAIGate(posts[0], { profile: PROFILE, voiceExemplars: exemplars, locale })
        const score = await scoreNaturalness(gated.content, locale)
        console.log(`\n--- [${locale}] ${i + 1}. ${topic} | naturalness: ${score} ---\n${gated.content}`)
      } catch (err) {
        console.error(`[${locale}] ${topic} FAILED:`, err)
      }
    }
  }
}

main().then(() => process.exit(0))
```

- [ ] **Step 2: Run a 1-topic smoke test first (cheap)**

Temporarily set `TOPICS` to a single-element array (or add `const SMOKE = TOPICS.slice(0,1)` and loop over that) and run:
Run: `npx tsx scripts/test-locales.ts`
Expected: prints 3 posts (one per locale) with naturalness scores; no errors. Restore the full `TOPICS` after.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-locales.ts
git commit -m "feat(locales): add direct-call eval harness with naturalness scorer"
```

---

## Task 15: Full verification + final run

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: PASS — all `lib/__tests__/*.test.ts` including the new locale, examples, context, ai-detector-locale, and resolve-locale suites.

- [ ] **Step 2: Typecheck + production build**

Run: `npx tsc --noEmit && npm run build`
Expected: PASS, build completes.

- [ ] **Step 3: Confirm the migration is applied** (Task 2 Step 5) and `ANTHROPIC_API_KEY` is present in `.env.local`.

- [ ] **Step 4: Run the full eval harness**

Run: `npx tsx scripts/test-locales.ts > test-results/locale-eval.txt 2>&1`
Expected: 60 generations (20 × 3 locales) with naturalness scores. Review `test-results/locale-eval.txt`: english reads unchanged from current behavior; indian_english is measured + India-grounded with no "kindly/do the needful"; hinglish code-switches naturally with no parody and rare Devanagari. Flag any output scoring ≤ 2 for register-rule tuning.

- [ ] **Step 5: Present outputs to the user** grouped by locale (the original request: "run 20 test generations per locale and show me outputs").

- [ ] **Step 6: Final commit (eval output, optional)**

```bash
git add test-results/locale-eval.txt
git commit -m "test(locales): capture locale eval harness output"
```

---

## Self-Review

**Spec coverage:**
- Migration → Task 2 ✓
- 3 locale prompt files (`english.ts`, `indian-english.ts`, `hinglish.ts`) → Task 4 ✓ (english extracted via BASE_RULES in Task 3)
- 90 examples (30 triplets) → Task 5 ✓
- Updated generation API (route + generator) → Tasks 6, 9 ✓
- AI-gate locale threading (critical) → Task 7 ✓
- Prompt caching → Task 6 ✓
- QA prefix per locale → Task 4 (modules) + Task 6 (injected) ✓
- PostHog A/B flag → Task 8 + gate in Task 9 + exposure in Task 11 ✓
- UI toggle / onboarding / settings → Tasks 11, 12, 13 ✓
- voice_locale persistence → Task 10 ✓
- 20×3 eval run → Tasks 14, 15 ✓

**Placeholder scan:** Example triplets t02–t12, t14–t30 are authored content, not code placeholders — Task 5 gives the exact topic list, two complete reference entries, and explicit acceptance rules (the standard way to spec creative content). All code steps include complete code.

**Type consistency:** `LocaleId` defined once in `types.ts`, imported everywhere. `LocaleModule` fields (`register`, `qaPrefix`, `exampleCount`, `label`, `blurb`) are consistent across Tasks 1, 4, 6. `selectExamples(locale, n, seed)` signature consistent in Tasks 5, 6. `cleanThroughAIGate(draft, {profile, voiceExemplars, locale})` and `rewriteToHumanize(text, patterns, {…, locale})` consistent in Tasks 7, 9, 14. `resolveLocale({flagEnabled, override, stored})` consistent in Task 9. `/api/me` adds `languageModesEnabled` (Task 11) consumed by the generator page (Task 11).

**Note on register duplication (Task 6):** the locale register is emitted once as a cached block; the dynamic tail carries only examples + QA. `buildLocaleContext` (single-string form) remains exported for unit testing.
