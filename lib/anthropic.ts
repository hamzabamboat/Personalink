import Anthropic from '@anthropic-ai/sdk'
import { UserProfile } from './supabase'
import { BASE_RULES } from './prompts/base-rules'
import { getLocale, type LocaleId } from './prompts/locales'
import { buildLocaleTail } from './prompts/locales/context'

export type ImageAnalysis = {
  description: string
  mood: string
  topics: string[]
  text_detected: string
  post_hooks: string[]
  content_pillars: string[]
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

type GeneratePostOptions = {
  profile: UserProfile
  topic?: string
  transcript?: string
  storyText?: string
  additionalContext?: string
  trendingContext?: string
  recentTopics?: string[]
  recentTopicsByPillar?: Record<string, string[]>
  userMemories?: Array<{ content: string; memory_type: string; created_at: string; occurred_at?: string }>
  imageContext?: string
  /** Real human-authored writing from this person, used as few-shot style exemplars */
  voiceExemplars?: string[]
  /** Language mode applied additively on top of the voice fingerprint. */
  locale?: LocaleId
}

export type ExtractedMemory = {
  memory_type: 'life_event' | 'achievement' | 'story' | 'lesson' | 'preference'
  content: string
  occurred_at: string | null
}

export type ExtractedTopics = {
  topics: string[]
}

function pickContentPillar(profile: UserProfile, recentTopicsByPillar?: Record<string, string[]>): string {
  const pillars = profile.content_pillars || profile.topics || ['Professional Insights']
  if (!recentTopicsByPillar || Object.keys(recentTopicsByPillar).length === 0) {
    return pillars[Math.floor(Math.random() * pillars.length)]
  }
  // Pick the pillar used least recently
  const pillarUseCounts = pillars.map(p => ({ pillar: p, count: (recentTopicsByPillar[p] || []).length }))
  pillarUseCounts.sort((a, b) => a.count - b.count)
  return pillarUseCounts[0].pillar
}

function buildVoiceContext(profile: UserProfile): string {
  const parts: string[] = []

  if (profile.voice_fingerprint) {
    parts.push(`Voice fingerprint (match this style exactly):\n${profile.voice_fingerprint}`)
  }

  if (profile.mcq_answers) {
    const q = profile.mcq_answers
    const fmt = (v: string | string[] | undefined) => Array.isArray(v) ? v.join(', ') : v
    if (q.voice_style) parts.push(`Professional voice: ${fmt(q.voice_style)}`)
    if (q.main_goal) parts.push(`LinkedIn goal: ${fmt(q.main_goal)}`)
    if (q.personal_stories) parts.push(`Personal stories comfort: ${fmt(q.personal_stories)}`)
    if (q.content_type) parts.push(`Content they enjoy: ${fmt(q.content_type)}`)
    if (q.known_as) parts.push(`Wants to be known as: ${fmt(q.known_as)}`)
  }

  if (profile.writing_sample) {
    parts.push(`Writing sample:\n${profile.writing_sample}`)
  }

  return parts.join('\n\n')
}

/** Real, human-authored writing from this person — the strongest voice signal. */
function buildExemplarBlock(exemplars?: string[]): string {
  if (!exemplars?.length) return ''
  const samples = exemplars
    .filter(s => s && s.trim().length > 40)
    .slice(0, 4)
    .map((s, i) => `Example ${i + 1}:\n"""\n${s.trim()}\n"""`)
    .join('\n\n')
  if (!samples) return ''
  return `\n\nREAL WRITING BY THIS PERSON — study these closely. They are the ground truth for the voice.
Match their exact sentence rhythm, paragraph shape, vocabulary, punctuation habits, and quirks. Reuse their characteristic phrasings and cadence (not their topics). The post you write should be indistinguishable from these samples if read side by side.

${samples}`
}

/**
 * Distil a voice fingerprint from MULTIPLE real writing samples.
 * Used to keep the fingerprint sharpening as the person's corpus grows.
 */
export async function distillVoiceFingerprint(samples: string[]): Promise<string> {
  const corpus = samples
    .filter(s => s && s.trim())
    .slice(0, 10)
    .map((s, i) => `Sample ${i + 1}:\n${s.trim().slice(0, 1200)}`)
    .join('\n\n---\n\n')
  if (!corpus) return ''

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 700,
    messages: [{
      role: 'user',
      content: `Below are multiple real writing samples from the same person. Synthesise a single, precise voice fingerprint a ghostwriter can use to replicate this person's voice exactly. Cover:
1. Sentence length and rhythm (how they vary short vs long — the "burstiness")
2. Vocabulary level and any recurring/signature words
3. Tone and emotional register
4. Use of personal pronouns, asides, and storytelling
5. Punctuation, capitalisation, and formatting habits (incl. fragments, dashes, line breaks)
6. 4-5 distinctive phrases or patterns to replicate
7. Things this person never does (so the ghostwriter avoids them)

Writing samples:
${corpus}

Write the fingerprint in under 220 words. Be specific and actionable. Focus on what makes this voice unmistakably human and unmistakably theirs.`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

/**
 * Structured, scored variant of distillVoiceFingerprint for the public Voice
 * Analyzer funnel. Returns numeric scores (radar-chart friendly) plus the
 * signature phrases and avoidances. The prose `summary` is kept for human
 * display and as an analogue of the legacy fingerprint string.
 *
 * Distinct from distillVoiceFingerprint() — that one stays the source of
 * truth for the in-product voice corpus (prose, used inside generation
 * prompts). This is a side-channel for the public funnel only.
 */
export type ScoredVoiceFingerprint = {
  scores: {
    burstiness: number          // 0-100, how much sentence-length variance
    vocabulary: number          // 0-100, plain → sophisticated
    personal: number            // 0-100, abstract → personal-story
    punctuation_play: number    // 0-100, tight → loose (dashes, fragments, line breaks)
    warmth: number              // 0-100, reserved → warm
    hook_power: number          // 0-100, how attention-grabbing the openings are
  }
  signature_phrases: string[]   // 4-5 phrases the person actually uses
  avoidances: string[]          // 3-4 things this person never does
  summary: string               // 2-3 sentence plain-English read of the voice
  one_liner: string             // a single quotable line for share cards (under 90 chars)
}

const SCORED_FINGERPRINT_DEFAULT: ScoredVoiceFingerprint = {
  scores: { burstiness: 50, vocabulary: 50, personal: 50, punctuation_play: 50, warmth: 50, hook_power: 50 },
  signature_phrases: [],
  avoidances: [],
  summary: '',
  one_liner: '',
}

export async function distillVoiceFingerprintScored(samples: string[]): Promise<ScoredVoiceFingerprint> {
  const corpus = samples
    .filter(s => s && s.trim())
    .slice(0, 3)
    .map((s, i) => `Sample ${i + 1}:\n${s.trim().slice(0, 1200)}`)
    .join('\n\n---\n\n')
  if (!corpus) return SCORED_FINGERPRINT_DEFAULT

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 900,
    messages: [{
      role: 'user',
      content: `Analyse these LinkedIn-style writing samples from the same person. Score 6 dimensions of their voice on a 0–100 scale and extract signature patterns.

Scoring scale for each dimension:
- burstiness: 0 = uniform sentence length; 100 = high variance (very short fragments + long winding sentences mixed)
- vocabulary: 0 = plain everyday words; 100 = sophisticated/specialist vocabulary
- personal: 0 = abstract/third-person observations; 100 = first-person stories with named people, places, dates
- punctuation_play: 0 = tight conventional punctuation; 100 = heavy use of dashes, ellipses, fragments, white space
- warmth: 0 = reserved/clinical; 100 = warm/conversational/openly emotional
- hook_power: 0 = generic openings; 100 = strong scroll-stopping first lines

Writing samples:
${corpus}

Respond ONLY with a valid JSON object exactly like this — no markdown fences, no commentary:
{
  "scores": {
    "burstiness": <int 0-100>,
    "vocabulary": <int 0-100>,
    "personal": <int 0-100>,
    "punctuation_play": <int 0-100>,
    "warmth": <int 0-100>,
    "hook_power": <int 0-100>
  },
  "signature_phrases": ["<actual phrase from the samples>", "<another>", "<3-5 total>"],
  "avoidances": ["<thing they never do, e.g. 'never uses emoji'>", "<2-4 total>"],
  "summary": "<2-3 sentences in plain English describing this person's voice, written TO them ('You write like...'). Specific. No platitudes.>",
  "one_liner": "<a single quotable line under 90 chars describing their voice, share-card friendly>"
}`,
    }],
  })

  try {
    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const stripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) return SCORED_FINGERPRINT_DEFAULT
    const parsed = JSON.parse(match[0]) as Partial<ScoredVoiceFingerprint>
    const clamp = (n: unknown) => {
      const v = Math.round(Number(n))
      return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 50
    }
    return {
      scores: {
        burstiness: clamp(parsed.scores?.burstiness),
        vocabulary: clamp(parsed.scores?.vocabulary),
        personal: clamp(parsed.scores?.personal),
        punctuation_play: clamp(parsed.scores?.punctuation_play),
        warmth: clamp(parsed.scores?.warmth),
        hook_power: clamp(parsed.scores?.hook_power),
      },
      signature_phrases: Array.isArray(parsed.signature_phrases) ? parsed.signature_phrases.slice(0, 5) : [],
      avoidances: Array.isArray(parsed.avoidances) ? parsed.avoidances.slice(0, 4) : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 600) : '',
      one_liner: typeof parsed.one_liner === 'string' ? parsed.one_liner.slice(0, 120) : '',
    }
  } catch {
    return SCORED_FINGERPRINT_DEFAULT
  }
}

export async function generateLinkedInPosts(options: GeneratePostOptions): Promise<string[]> {
  const { profile, topic, transcript, storyText, additionalContext, trendingContext, recentTopics, recentTopicsByPillar, userMemories, imageContext, voiceExemplars, locale = 'english' } = options

  const pillar = pickContentPillar(profile, recentTopicsByPillar)
  const voiceContext = buildVoiceContext(profile)
  const exemplarBlock = buildExemplarBlock(voiceExemplars)

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

  const localeMod = getLocale(locale)
  const localeTail = buildLocaleTail(locale, localeMod.exampleCount)

  // Per-user, stable across a session (cacheable).
  const perUserBlock = `Author profile:
- Name: ${profile.name || profile.job_title || 'a professional'}${profile.company ? ` at ${profile.company}` : ''}
- Role: ${profile.role || profile.job_title || 'professional'}
- Industry: ${profile.industry || 'business'}

${voiceContext}${exemplarBlock}`

  // Per-request, never cached.
  const dynamicTail = `Content pillar for this post: ${pillar}${memoriesContext}${avoidTopics}${imageContext ? `\n\n${imageContext}\nWrite the post so it naturally connects to what is shown in these photos. Reference the images implicitly — the post should feel written specifically to accompany them.` : ''}${localeTail ? `\n\n${localeTail}` : ''}`

  // Ordered most-static -> most-dynamic so the universal rules and the locale
  // register form a stable, cacheable prefix; the dynamic tail is never cached.
  const system: Anthropic.TextBlockParam[] = [
    { type: 'text', text: BASE_RULES, cache_control: { type: 'ephemeral' } },
  ]
  if (localeMod.register) {
    system.push({ type: 'text', text: localeMod.register, cache_control: { type: 'ephemeral' } })
  }
  system.push({ type: 'text', text: perUserBlock, cache_control: { type: 'ephemeral' } })
  system.push({ type: 'text', text: dynamicTail })

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

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  const posts = responseText
    .split(/---POST \d+---/)
    .map(s => s.trim())
    .filter(Boolean)

  return posts.length > 0 ? posts : [responseText.trim()]
}

export async function analyzeVoiceFingerprint(writingSample: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Analyse this writing sample and create a voice fingerprint for LinkedIn ghostwriting. Describe:
1. Sentence length and rhythm (short punchy vs long flowing)
2. Vocabulary level (simple vs sophisticated)
3. Tone (formal vs casual)
4. Use of personal pronouns and storytelling
5. Punctuation and formatting style
6. 3 distinctive phrases or patterns to replicate

Writing sample:
"${writingSample}"

Write the fingerprint in 150 words max. Be specific and actionable for a ghostwriter.`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

export async function generateImageBriefPrompts(profile: UserProfile): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Generate 5 specific, actionable photo prompts for a LinkedIn personal brand content calendar.

Person: ${profile.name || profile.role} in ${profile.industry} industry
Content pillars: ${(profile.content_pillars || profile.topics || []).join(', ')}

Each prompt should describe exactly what photo to take (setting, action, props, mood). Make them realistic and achievable. Format as a JSON array of 5 strings.`,
    }],
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

export async function repurposePost(postContent: string, profile: UserProfile): Promise<string[]> {
  const voiceContext = buildVoiceContext(profile)

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Repurpose this LinkedIn post into 3 completely different angles. Each should feel fresh but match the author's voice.

Original post:
"${postContent}"

${voiceContext}

Angles to try:
1. A contrarian/challenge take
2. A practical how-to version
3. A personal story angle

Format:
---ANGLE 1---
[content]
---ANGLE 2---
[content]
---ANGLE 3---
[content]`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return text.split(/---ANGLE \d+---/).map(s => s.trim()).filter(Boolean)
}

export async function analyzeLinkedInProfile(profileData: {
  name?: string
  headline?: string
  about?: string
  industry?: string
  role?: string
  writingSample?: string
}): Promise<{ score: number; breakdown: Record<string, { score: number; max: number; tip: string }>; improvements: string[] }> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `Analyse this LinkedIn profile and score it out of 100. Give scores for each category and specific improvement tips.

Profile data:
- Name: ${profileData.name || 'Not provided'}
- Headline/Role: ${profileData.headline || profileData.role || 'Not provided'}
- About/Bio: ${profileData.about || 'Not provided'}
- Industry: ${profileData.industry || 'Not provided'}
- Writing sample: ${profileData.writingSample ? profileData.writingSample.slice(0, 300) : 'Not provided'}

Score these 5 categories (20 pts each):
1. Headline (20pts): Is it specific, value-driven, and keyword-rich?
2. About section (20pts): Does it tell a compelling story with a clear CTA?
3. Profile completeness (20pts): Are all key sections filled?
4. Content consistency (20pts): Does the writing show a clear voice and expertise?
5. Engagement potential (20pts): Would this profile attract the right connections?

Respond ONLY with a valid JSON object exactly like this:
{
  "score": <total 0-100>,
  "breakdown": {
    "headline": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" },
    "about": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" },
    "completeness": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" },
    "consistency": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" },
    "engagement": { "score": <0-20>, "max": 20, "tip": "<specific improvement>" }
  },
  "improvements": ["<tip 1>", "<tip 2>", "<tip 3>"]
}`,
    }],
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { score: 50, breakdown: {}, improvements: [] }
  } catch {
    return { score: 50, breakdown: {}, improvements: [] }
  }
}

export type BeautifyProfileResult = {
  new_headline: string
  new_about: string
  suggested_skills: string[]
  profile_photo_brief: string
  banner_brief: string
  improvement_notes: string[]
  score_before: number
  score_after: number
  breakdown_before: Record<string, { score: number; max: number; tip: string }>
  breakdown_after: Record<string, { score: number; max: number; tip: string }>
}

export async function beautifyLinkedInProfile(input: {
  name?: string
  currentHeadline?: string
  currentAbout?: string
  currentSkills?: string[]
  role?: string
  industry?: string
  company?: string
  voiceFingerprint?: string
  writingSample?: string
  guidance?: string
}): Promise<BeautifyProfileResult> {
  const { name, currentHeadline, currentAbout, currentSkills, role, industry, company, voiceFingerprint, writingSample, guidance } = input

  const profileContext = [
    name && `Name: ${name}`,
    role && `Role/Title: ${role}`,
    industry && `Industry: ${industry}`,
    company && `Company: ${company}`,
  ].filter(Boolean).join('\n')

  const currentProfileSection = [
    currentHeadline ? `Current headline: "${currentHeadline}"` : 'Current headline: Not provided',
    currentAbout ? `Current about/bio:\n"${currentAbout.slice(0, 1000)}"` : 'Current about/bio: Not provided',
    currentSkills?.length ? `Current skills: ${currentSkills.join(', ')}` : 'Current skills: Not provided',
  ].join('\n\n')

  const voiceSection = voiceFingerprint
    ? `\nVoice fingerprint (match this tone in the About section):\n${voiceFingerprint}`
    : writingSample
    ? `\nWriting sample (match this voice):\n"${writingSample.slice(0, 400)}"`
    : ''

  // User-stated direction for how they want to come across. Prioritised over
  // generic optimisation choices, and seeds a from-scratch bio for new accounts.
  const directionSection = guidance?.trim()
    ? `\nThe user's stated direction for how they want their profile to sound (PRIORITISE this over generic choices about tone, emphasis, and positioning):\n"${guidance.trim().slice(0, 600)}"`
    : ''

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a LinkedIn profile optimisation expert. Rewrite this person's LinkedIn profile to maximise recruiter discovery, inbound opportunities, and professional credibility.

Person context:
${profileContext}
${voiceSection}
${directionSection}

Current profile:
${currentProfileSection}

If the current profile is empty or sparse (e.g. a brand-new LinkedIn account with no bio yet), write a strong first profile from scratch using the person context and the stated direction above — never refuse for lack of an existing bio.

Generate an optimised profile. Return ONLY a valid JSON object with exactly these fields:
{
  "score_before": <integer 0-100, honest score of current profile>,
  "score_after": <integer 0-100, projected score of your rewritten profile>,
  "breakdown_before": {
    "headline": { "score": <0-20>, "max": 20, "tip": "<what's weak>" },
    "about": { "score": <0-20>, "max": 20, "tip": "<what's weak>" },
    "completeness": { "score": <0-20>, "max": 20, "tip": "<what's missing>" },
    "consistency": { "score": <0-20>, "max": 20, "tip": "<voice/brand issue>" },
    "engagement": { "score": <0-20>, "max": 20, "tip": "<why it won't attract people>" }
  },
  "breakdown_after": {
    "headline": { "score": <0-20>, "max": 20, "tip": "<what was improved>" },
    "about": { "score": <0-20>, "max": 20, "tip": "<what was improved>" },
    "completeness": { "score": <0-20>, "max": 20, "tip": "<what was added>" },
    "consistency": { "score": <0-20>, "max": 20, "tip": "<how voice is consistent now>" },
    "engagement": { "score": <0-20>, "max": 20, "tip": "<why it will attract people>" }
  },
  "new_headline": "<optimised headline — max 220 chars, keyword-rich, value-driven, specific>",
  "new_about": "<full rewritten About section — 250-350 words, first person, compelling story arc, ends with a clear CTA, matches the person's voice>",
  "suggested_skills": ["<skill 1>", "<skill 2>", "...", "<up to 20 skills>"],
  "profile_photo_brief": "<2-3 sentences describing the ideal LinkedIn profile photo: framing, background, attire, expression, lighting>",
  "banner_brief": "<2-3 sentences describing the ideal LinkedIn banner image: concept, colours, text overlay if any, mood>",
  "improvement_notes": ["<1-sentence explanation of change 1>", "<change 2>", "<change 3>"]
}`,
    }],
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found')
    return JSON.parse(match[0]) as BeautifyProfileResult
  } catch {
    return {
      new_headline: currentHeadline || '',
      new_about: currentAbout || '',
      suggested_skills: currentSkills || [],
      profile_photo_brief: '',
      banner_brief: '',
      improvement_notes: [],
      score_before: 40,
      score_after: 70,
      breakdown_before: {},
      breakdown_after: {},
    }
  }
}

export async function generateImageSuggestions(postContent: string, industry: string): Promise<Array<{ icon: string; suggestion: string; why: string }>> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Based on this LinkedIn post, suggest 3-4 image types that would maximise reach and engagement.

Post: "${postContent.slice(0, 400)}"
Industry: ${industry}

For each suggestion provide: a relevant emoji icon, a specific image description, and a one-line reason why it works.

Respond ONLY with a JSON array:
[
  { "icon": "📸", "suggestion": "<specific image description>", "why": "<one line why it works>" },
  ...
]`,
    }],
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

export async function analyseImageForPost(base64Data: string, mimeType: string): Promise<ImageAnalysis> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64Data },
        },
        {
          type: 'text',
          text: `You are analysing a photo that a professional wants to use in a LinkedIn post.

Analyse this image and return a JSON object with exactly these fields:
{
  "description": "1-2 sentence description of what is literally in the image",
  "mood": "one of: professional / casual / celebratory / behind-the-scenes / educational / inspirational",
  "topics": ["array", "of", "3-5", "topics", "visible", "or", "implied"],
  "text_detected": "any text visible in the image, or empty string if none",
  "post_hooks": [
    "First possible LinkedIn post opening line inspired by this image",
    "Second possible opening line with different angle",
    "Third possible opening line"
  ],
  "content_pillars": ["which content pillars this image fits best from: Leadership, Innovation, Culture, Growth, Industry Insights, Personal Brand, Behind the Scenes, Team, Product, Clients"]
}

Return only valid JSON, no other text.`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : {}
    return {
      description: parsed.description || '',
      mood: parsed.mood || 'professional',
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      text_detected: parsed.text_detected || '',
      post_hooks: Array.isArray(parsed.post_hooks) ? parsed.post_hooks : [],
      content_pillars: Array.isArray(parsed.content_pillars) ? parsed.content_pillars : [],
    }
  } catch {
    return { description: '', mood: 'professional', topics: [], text_detected: '', post_hooks: [], content_pillars: [] }
  }
}

export async function extractMemoriesFromContent(
  text: string,
  source: 'voice_note' | 'post',
): Promise<ExtractedMemory[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Extract 0–3 memorable facts about this person's life from the text below. Only extract concrete, specific things: achievements, life events, lessons learned, personal stories, or strong preferences. Skip generic statements.

Text (${source}):
"${text.slice(0, 1500)}"

Respond ONLY with a valid JSON array (empty array if nothing notable):
[
  {
    "memory_type": "life_event" | "achievement" | "story" | "lesson" | "preference",
    "content": "concise 1-sentence description of the memory",
    "occurred_at": "ISO date string if mentioned, otherwise null"
  }
]`,
    }],
  })

  try {
    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const stripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const match = stripped.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

export async function craftImagePrompt(
  postContent: string,
  industry: string,
  styleHint = 'photorealistic, professional editorial lighting',
): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 320,
    messages: [{
      role: 'user',
      content: `Write an image-generation prompt for a LinkedIn post image. Target aesthetic: ${styleHint}.

Post content (first 400 chars): "${postContent.slice(0, 400)}"
Industry: ${industry}

Rules:
- Match the target aesthetic above
- No text, words, letters, or logos in the image
- No faces or identifiable people (avoid copyright/likeness issues)
- Focus on concepts, environments, objects, or visual metaphors
- Business-appropriate; describe scene, composition, lighting, and mood specifically

Respond with ONLY the prompt string, nothing else.`,
    }],
  })

  return msg.content[0].type === 'text'
    ? msg.content[0].text.trim()
    : `${styleHint}, ${industry} concept scene, no people, no text, clean composition`
}

/** Generate carousel slides (cover/body/cta) from a topic or post. */
export async function extractCarouselSlides(
  source: string,
  slideCount: number,
): Promise<import('./supabase').CarouselSlide[]> {
  const { buildCarouselPrompt, parseCarouselSlides } = await import('./images/carousel-content')
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1600,
    messages: [{ role: 'user', content: buildCarouselPrompt(source, slideCount) }],
  })
  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return parseCarouselSlides(raw)
}

/** Extract short, card-ready content from a post for a branded template graphic. */
export async function extractCardContent(
  postContent: string,
  type: import('./images/presets').TemplateType,
): Promise<import('./images/card-content').CardContent | null> {
  const { buildCardExtractionPrompt, parseCardContent } = await import('./images/card-content')
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: buildCardExtractionPrompt(postContent, type) }],
  })
  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return parseCardContent(raw, type)
}

export async function extractTopicsFromPost(content: string): Promise<string[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Extract 3–5 topic tags from this LinkedIn post. Use short, lowercase noun phrases (e.g. "product launch", "team culture", "fundraising").

Post:
"${content.slice(0, 800)}"

Respond ONLY with a JSON array of strings. Example: ["leadership", "startup growth", "hiring"]`,
    }],
  })

  try {
    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const match = raw.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

export interface ExtractedLibraryPattern {
  hook_type: string
  format: 'text' | 'list' | 'story'
  niche: string
  pattern_summary: string
  template_text: string
}

/**
 * Analyse WHY a LinkedIn post works and return a transformative breakdown +
 * reusable template — never the verbatim post text. Used by first-party
 * ingestion so the library stores patterns, not republished content.
 */
export async function extractLibraryPattern(postContent: string): Promise<ExtractedLibraryPattern | null> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    messages: [{
      role: 'user',
      content: `You analyse what makes a LinkedIn post work — WITHOUT republishing it. Never copy its sentences verbatim; describe the structure in your own words.

Post:
"${postContent.slice(0, 1500)}"

Respond with ONLY a JSON object with these exact keys:
- hook_type: short label for the opening move (e.g. "contrarian", "vulnerable", "data", "how-to", "listicle", "confession", "question")
- format: one of "text", "list", "story"
- niche: short audience tag (e.g. "founders", "b2b-saas", "careers", "marketing", "general")
- pattern_summary: 1–2 sentences on WHY this structure works, generalised (not about this specific post)
- template_text: a reusable fill-in-the-blank template using [brackets] for placeholders — your own words, NOT the original text

Example:
{"hook_type":"contrarian","format":"text","niche":"general","pattern_summary":"Names the crowd's belief then flips it, promising a non-obvious payoff.","template_text":"Everyone says [common advice]. I did the opposite..."}`,
    }],
  })
  try {
    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    const o = JSON.parse(match[0])
    if (!o.template_text || !o.pattern_summary) return null
    const format = ['text', 'list', 'story'].includes(o.format) ? o.format : 'text'
    return {
      hook_type: String(o.hook_type || 'general').slice(0, 40),
      format,
      niche: String(o.niche || 'general').slice(0, 40),
      pattern_summary: String(o.pattern_summary).slice(0, 600),
      template_text: String(o.template_text).slice(0, 1200),
    }
  } catch {
    return null
  }
}

export async function generateSuggestionsForUser(
  profile: UserProfile,
  trendingNews: string[],
  recentPosts: string[],
): Promise<Array<{ suggestion_text: string; angle: string; hashtags: string[]; why_it_works: string; source: string }>> {
  const role = profile.role || profile.job_title || 'professional'
  const industry = profile.industry || 'business'
  const pillars = (profile.content_pillars || profile.topics || []).join(', ') || 'career, leadership, industry insights'

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Generate 5 LinkedIn post ideas for a ${role} in ${industry}.
Content pillars: ${pillars}
${trendingNews.length ? `Trending topics: ${trendingNews.join('; ')}` : ''}
${recentPosts.length ? `Avoid repeating these recent topics: ${recentPosts.join('; ')}` : ''}

Respond with ONLY a valid JSON array (no markdown, no explanation) of 5 objects, each with these exact keys:
- suggestion_text: the post idea/hook (1-2 sentences)
- angle: the storytelling angle (e.g. "personal story", "contrarian take", "how-to")
- hashtags: array of exactly 3 relevant hashtags (without #)
- why_it_works: one sentence on why this will get engagement
- source: one of "news", "trends", or "history"

Example format:
[{"suggestion_text":"...","angle":"...","hashtags":["a","b","c"],"why_it_works":"...","source":"trends"}]`,
    }],
  })

  try {
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    // Strip markdown code fences if present
    const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const match = stripped.match(/\[[\s\S]*\]/)
    if (!match) {
      console.error('[generateSuggestions] no JSON array found in response:', text.slice(0, 200))
      return []
    }
    return JSON.parse(match[0])
  } catch (err) {
    console.error('[generateSuggestions] parse error:', err)
    return []
  }
}
