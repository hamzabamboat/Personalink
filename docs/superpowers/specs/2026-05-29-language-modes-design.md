# Language Modes (English / Indian English / Hinglish) — Design

**Date:** 2026-05-29
**Status:** Approved direction; pending spec review
**Branch:** `feature/language-modes`

## Goal

Add three selectable language modes to PersonaLink's post generator — `english`, `indian_english`, `hinglish` — applied **on top of** the user's voice fingerprint (additive register layer, never a voice replacement). Default `english`, so existing users see no change unless they opt in. Ship behind a PostHog rollout flag. Enable Anthropic prompt caching as part of the work (lowers cost beyond what the feature adds).

## Why this matters / fit

The product is already India-first (`user_profiles.timezone` defaults to `Asia/Kolkata`, hashtag examples reference `#StartupIndia`, rate-limit copy uses `en-IN`). Indian-professional dialect output is a natural fit.

## Corrections to the original brief

- **Voice logic is not in `/lib/voice-fingerprint.ts`.** It lives in `lib/voice.ts` (corpus/exemplars/refresh) and `lib/anthropic.ts` (`generateLinkedInPosts`, `buildVoiceContext`, `buildExemplarBlock`, where the system prompt is assembled).
- **Generate route is `app/api/posts/generate/route.ts`**, not `/app/api/generate/route.ts`.
- **Locale column goes on `user_profiles`, not `users`.** `users` is auth/billing only. Every voice/content setting (`voice_fingerprint`, `mcq_answers`, `tone`, `content_pillars`, `writing_sample`) is on `user_profiles`, which the generate route already loads as `profile`. → zero new queries.

## Resolved decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Locale column location | `user_profiles.voice_locale`, `CHECK IN ('english','indian_english','hinglish')`, `DEFAULT 'english'` |
| 2 | Few-shot usage | Build all 90; inject only **2–3 rotating** target-locale examples per request. Full set doubles as style-guide source + eval set. `english` injects **0** locale examples (model default; user's own exemplars cover it). |
| 3 | A/B test | PostHog flag `language_modes` as a **rollout + exposure gate** — controls who sees the toggle and records exposure for downstream comparison (retention / publishes / edit-rate). No forced English-vs-localized arm in v1. |
| 4 | Test runs | Standalone script, direct generator calls, synthetic India profile, 20 topics × 3 locales, no auth/DB writes. Needs `ANTHROPIC_API_KEY` locally. |
| 5 | QA self-check | **Inline** self-check prefix in production (single call); **second-pass Haiku naturalness scorer only in the test harness** (avoids doubling prod cost). |
| 6 | "kindly / do the needful" | Treat as **near-banned caricature**, not flavor. Earn Indian-English register through measured tone + specific local references instead. |
| 7 | Devanagari (Hinglish) | **Rare, impact words only**, frequency a tunable constant. Must not break the AI-detection scorer (validate). |
| 8 | Prompt caching | Convert `system` (string) → content blocks with `cache_control`; reorder so universal rules → locale register form the stable cached prefix. |

## Data model

New migration `supabase/migrations/20260529_voice_locale.sql` (matches the existing unsuffixed `20260529_*` naming):

```sql
alter table user_profiles
  add column if not exists voice_locale text not null default 'english'
  check (voice_locale in ('english', 'indian_english', 'hinglish'));
```

Mirror the column into `supabase/schema.sql` (the `user_profiles` definition) for fresh installs.

## Locale module architecture

```
lib/prompts/locales/
  index.ts            # registry: LOCALES, getLocale(id), type LocaleId, isLocaleId()
  types.ts            # LocaleModule interface
  english.ts          # extracted from the current inline prompt (rules 1-12, banned lists)
  indian-english.ts   # register block + qa prefix
  hinglish.ts         # register block + qa prefix + devanagari policy
  examples/
    index.ts          # 30 triplet objects + selectExamples(localeId, n, seed)
    triplets.ts       # the data: { id, topic, pillar, english, indian_english, hinglish }
```

```ts
// types.ts (design sketch)
export type LocaleId = 'english' | 'indian_english' | 'hinglish'

export interface LocaleModule {
  id: LocaleId
  label: string                  // UI: "English" | "Indian English" | "Hinglish"
  // Static, cacheable register instructions (the "how this dialect behaves" block).
  register: string
  // Inline self-check appended near the top of the dynamic tail.
  qaPrefix: string
  // How many rotating few-shot examples to inject (english = 0).
  exampleCount: number
  // Optional knobs (e.g. hinglish devanagari frequency) kept as named constants.
}
```

The **universal LinkedIn rules (1–12) + banned lists** move out of the inline string in `anthropic.ts` into a shared constant (`lib/prompts/base-rules.ts`) so all locales share one cached block and `english.ts` is literally "base rules, nothing added."

## Prompt assembly changes (`generateLinkedInPosts`)

`generateLinkedInPosts` gains a `locale: LocaleId` option (default `'english'`). New `buildLocaleContext(locale, examples)` produces the register + QA + rotating-example text.

**Register-not-voice framing (the core safeguard).** Because the prompt already injects the user's real posts under *"match this style exactly"*, the locale block must be explicitly subordinate:

> "The following describes the LANGUAGE and REGISTER of {label} — how it phrases, switches, and what it references. Apply it on top of the author's voice defined above. Do NOT adopt these example authors' voice, rhythm, or signature phrases — keep the author's voice. Register is *which dialect*; voice is *whose*."

Rotating examples are drawn from **varied creators** so the model averages out individual voice and extracts only dialectal signal.

### Caching restructure

Convert the `anthropic.messages.create({ system: string })` call to `system: ContentBlock[]` with `cache_control: { type: 'ephemeral' }` breakpoints. Target layering (most-static → most-dynamic):

1. **Universal block** (intro + rules 1–12 + banned phrases/formats/arcs) — identical for *all* users/locales. `cache_control` breakpoint #1. Highest reuse.
2. **Locale register block** — identical for all users of a locale. Breakpoint #2.
3. **Per-user block** (author identity + voice fingerprint + MCQ + exemplars) — stable across a user's session. Optional breakpoint #3.
4. **Dynamic tail** (not cached): content pillar, memories, rotating locale examples, avoid-topics, image context, QA prefix.

Per-request items currently in the system string (pillar, memories, avoidTopics, imageContext) move **after** the breakpoints (or into the user message) so they don't bust the cached prefix. **This reordering changes prompt structure**, so the test harness must confirm English output shows no regression vs current behavior before rollout.

## AI-detection gate must be locale-aware (critical)

`app/api/posts/generate/route.ts` runs every draft through `cleanThroughAIGate(p, { profile, voiceExemplars })` (`lib/ai-detector.ts`) — up to 2 Haiku rewrites per post. Today this is locale-blind and may "correct" Hinglish/Indian English toward generic English or treat Devanagari/code-switching as an anomaly.

**Required:** thread `locale` into `cleanThroughAIGate` and its Haiku rewrite prompt(s) so rewrites *preserve* the dialect (keep code-switches, keep Devanagari, keep Indian-English register). Also verify `analyzeContent` / `calculateSimilarityScore` / `ai_detection_score` behave sanely on localized + Devanagari text (the repo has `ai_detection_scoring`). If a scorer is English-biased, adjust thresholds or skip the offending heuristic for non-english locales rather than de-localizing.

## Few-shot examples (90 = 30 triplets × 3 locales)

- **Shape:** 30 triplet objects, each = one topic written three ways (`english`, `indian_english`, `hinglish`). Contrastive triplets teach "same idea, shifted register."
- **Topics:** real Indian-professional spread — fundraising, hiring, layoffs, festivals/Diwali, family business, upskilling, D2C/quick-commerce, GST/compliance, tier-2/3 expansion, return-to-office, etc. Tagged with a content pillar.
- **Sourcing/ethics:** paraphrase *structural patterns* (hooks, switch points, register moves) from the named creators (Warikoo, Aprameya, Nikhil Kamath, Falguni Nayar, Kunal Shah, Sairee Chahal, Lisa Mukhedkar, …). **No verbatim text** — no copyright/voice-lift.
- **Injection:** `selectExamples(localeId, n, seed)` returns `n` target-locale variants (deterministic per request via a seed, rotating across requests). `english` → 0.

## Authenticity design

**Indian English.** Lower hyperbole (no "game-changer"/"10x"); measured, slightly formal claims; specific local grounding (GST, RBI/SEBI, tier-1/2/3 cities, family-business dynamics, jugaad as a real concept). Avoid American idioms/baseball metaphors/"y'all"/"awesome". "kindly"/"do the needful" effectively banned (caricature).

**Hinglish.** Natural code-switching keyed to **slots, not a word quota**:
- intensifiers: *ekdum, bilkul, kaafi*
- discourse markers: *matlab, bas, arre, yaar*
- relational address: *yaar, boss, bhai*
- degree/quantity: *thoda, zyada*
- culture-bound concepts: *jugaad, log kya kahenge, set hai*

Do **not** switch professional nouns ("valuation, runway, term sheet, appraisal" stay English). No full Hindi sentences. Devanagari rare, impact words only.

**Tone coupling.** Hinglish intensity modulates by the existing tone selector: Casual/Storytelling → more switching + occasional Devanagari; Data-driven/Professional → mostly English with a few discourse markers. Prevents tone-deaf output (no "yaar" in a layoffs post).

**QA self-check prefix** (per locale, inline): *"Before responding, verify the output sounds natural to a [locale] speaker. If it sounds forced, parodic, or stereotypical, silently revise before producing the final post."*

## API changes (`app/api/posts/generate/route.ts`)

- Read `profile.voice_locale`; accept optional `locale` in the request body (toggle preview without saving). Resolve effective locale = body override ?? profile value ?? `'english'`, validated by `isLocaleId()`.
- Gate via PostHog `language_modes` flag: if the user isn't in the flag, force `english` regardless of stored value (clean rollout).
- Pass `locale` to `generateLinkedInPosts` **and** to `cleanThroughAIGate`.

## PostHog

- `lib/flags.ts`: thin wrapper over the existing server client (`lib/posthog-server.ts`) — `isLanguageModesEnabled(distinctId)`. Evaluate **once per request**, suppress per-call exposure spam; record exposure deliberately.
- Events: `language_mode_selected` (on change, with `{ locale, surface }`). Client toggle + onboarding + settings all emit it.

## UI

- **Generator** (`app/dashboard/generate/page.tsx`): 3-button segmented control (English · Indian English · Hinglish) beside the existing tone selector, defaulting to `profile.voice_locale`; sends `locale` on generate. Only rendered when the flag is on.
- **Onboarding** (`app/onboarding/page.tsx`): one new question in the voice/content step; saved via existing `/api/onboarding/save`.
- **Settings** (`app/dashboard/settings/page.tsx`): "Language & dialect" control writing `voice_locale` anytime.
- Persistence endpoints (`/api/onboarding/save`, settings save, `/api/me` read) handle `voice_locale`.

## Test harness

`scripts/test-locales.ts` (run via `tsx`/`ts-node`):
- Synthetic India-based `UserProfile` (with a plausible voice_fingerprint + exemplars).
- 20 topics × 3 locales → call `generateLinkedInPosts` directly (no HTTP/auth/DB).
- Run each output through a Haiku **naturalness scorer** ("does this sound forced/parodic to a [locale] speaker? score + reason").
- Print outputs grouped by locale + scorer verdicts. Also generate a few English outputs pre/post caching-reorder to eyeball regression.
- ~60 Sonnet calls (~$3–5). Requires `ANTHROPIC_API_KEY`.

## Cost

Marginal: ~1,000 added input tokens per localized generation ≈ **$0.003/gen** (~8% over base; `english` ≈ $0). Rotating-subset choice is ~6× cheaper than inject-all. Inline QA avoids ~doubling cost of a second-pass. Prompt caching (newly enabled) reads the repeated prefix at ~10% cost and likely **net-lowers** the overall bill. One-time test run ~$3–5.

## File-by-file change list

| File | Change |
|------|--------|
| `supabase/migrations/20260529_voice_locale.sql` | new — add column |
| `supabase/schema.sql` | add `voice_locale` to `user_profiles` |
| `lib/prompts/base-rules.ts` | new — extracted universal rules + banned lists |
| `lib/prompts/locales/{types,index,english,indian-english,hinglish}.ts` | new — locale modules |
| `lib/prompts/locales/examples/{index,triplets}.ts` | new — 30 triplets + selector |
| `lib/anthropic.ts` | `generateLinkedInPosts` gains `locale`; `buildLocaleContext`; system→cached content blocks; reorder |
| `lib/ai-detector.ts` | `cleanThroughAIGate` + rewrite prompts become locale-aware |
| `app/api/posts/generate/route.ts` | resolve locale, flag gate, pass locale to generator + gate |
| `lib/flags.ts` | new — PostHog flag wrapper |
| `app/dashboard/generate/page.tsx` | locale toggle + send `locale` |
| `app/onboarding/page.tsx` | language question |
| `app/dashboard/settings/page.tsx` | language control |
| `app/api/onboarding/save/route.ts`, settings save, `/api/me` | persist/read `voice_locale` |
| `scripts/test-locales.ts` | new — eval harness |

## Open items to confirm at review

- Decisions 5–7 (inline QA, ban "kindly/do the needful", rare Devanagari) are my recommendations baked in — flag if you disagree.
- Confirm ~$3–5 spend + `ANTHROPIC_API_KEY` set locally before the harness step.

## Out of scope (v1)

- Forced English-vs-localized causal A/B (gate first; revisit later).
- Locales beyond the three.
- Translating existing stored posts.
- Localizing non-generation surfaces (emails, UI chrome).

## Risks

- **Voice contamination** — mitigated by register-not-voice framing + varied-creator examples.
- **AI-gate de-localization** — mitigated by threading locale through the gate (critical).
- **Caching reorder regression** — mitigated by pre/post English comparison in the harness.
- **Parody/stereotype** — mitigated by slot-based switching, near-ban on caricature phrases, inline QA + harness scorer.
- **Devanagari vs scorers/rendering** — validate in harness; keep rare + tunable.
