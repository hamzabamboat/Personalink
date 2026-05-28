import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { anthropic, generateLinkedInPosts } from '@/lib/anthropic'
import { getVoiceExemplars } from '@/lib/voice'
import { humanizeText } from '@/lib/humanize'
import { UserProfile } from '@/lib/supabase'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'
import { buildOptimalSlots } from '@/lib/linkedin-schedule'

export const maxDuration = 300

async function generateBatch(
  count: number,
  profile: Record<string, unknown>,
  pillars: string[],
  instructions?: string,
  tone?: string,
  exemplars?: string[],
): Promise<Array<{ content: string; content_pillar: string; format: string }>> {
  const voiceCtx = [
    profile.voice_fingerprint ? `Voice fingerprint:\n${profile.voice_fingerprint}` : '',
    profile.writing_sample ? `Writing sample:\n${String(profile.writing_sample).slice(0, 400)}` : '',
  ].filter(Boolean).join('\n\n')

  const exemplarBlock = exemplars?.length
    ? `\n\nREAL WRITING BY THIS PERSON (match this voice, rhythm, vocabulary and quirks exactly — copy the voice, not the topics):\n${exemplars.slice(0, 4).map((s, i) => `Example ${i + 1}:\n"""\n${s.trim().slice(0, 1000)}\n"""`).join('\n\n')}`
    : ''

  const toneInstruction = tone ? `\nTone: Write every post in a ${tone.toLowerCase()} tone.` : ''
  const extraInstructions = instructions?.trim() ? `\nBatch instructions from the user: ${instructions.trim()}` : ''

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `Generate exactly ${count} LinkedIn posts for this person.

Author: ${profile.name || 'Professional'}, ${profile.role || 'expert'} in ${profile.industry || 'business'}
Content pillars (rotate evenly): ${pillars.join(', ')}
${voiceCtx}${exemplarBlock}${toneInstruction}${extraInstructions}

Rules:
1. Scroll-stopping first line — no generic openers, never start with "I"
2. Short paragraphs (1-3 lines), blank lines between — vary paragraph length naturally
3. 150-300 words per post
4. Include 5-8 hashtags (mix of large/medium/niche) on the last line
5. Vary formats: personal story, contrarian take, industry insight, behind-the-scenes, question to audience, how-to narrative
6. Sound 100% human — match the REAL WRITING samples' rhythm exactly. High burstiness: mix very short sentences (2-5 words) with longer winding ones; never uniform. Allow fragments, asides, and small imperfections. Avoid the tidy, evenly-balanced cadence AI defaults to.
7. Each post must be on a completely different topic
8. NEVER use numbered lists (1. 2. 3.) or heavy bullet points — write in paragraphs
9. BANNED phrases: "game changer", "unpopular opinion", "nobody talks about", "hard truth", "trust the process", "level up", "hustle", "consistency is key", "paradigm shift", "move the needle", "crushing it", "built different"
10. BANNED CTAs: "follow me", "tag someone", "comment below", "share if you agree", "save this post"
11. If batch instructions are given, incorporate them while respecting the format variety

Respond with ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "content": "<full post text with hashtags>",
    "content_pillar": "<pillar name>",
    "format": "<story|tips|insight|contrarian|behind_the_scenes|lesson|question>"
  }
]

Generate all ${count} posts now.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try { return JSON.parse(match[0]) } catch { return [] }
}

async function generatePostFromStory(
  story: { id: string; raw_text: string },
  profile: Record<string, unknown>,
  pillars: string[],
  instructions?: string,
  tone?: string,
): Promise<{ content: string; content_pillar: string; format: string; storyId: string } | null> {
  const voiceCtx = [
    profile.voice_fingerprint ? `Voice fingerprint:\n${profile.voice_fingerprint}` : '',
    profile.writing_sample ? `Writing sample:\n${String(profile.writing_sample).slice(0, 400)}` : '',
  ].filter(Boolean).join('\n\n')

  const pillar = pillars[Math.floor(Math.random() * pillars.length)]
  const toneInstruction = tone ? `\nTone: Write in a ${tone.toLowerCase()} tone.` : ''
  const extraInstructions = instructions?.trim() ? `\nAdditional instructions: ${instructions.trim()}` : ''

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Turn this raw story/experience into a LinkedIn post.

Author: ${profile.name || 'Professional'}, ${profile.role || 'expert'} in ${profile.industry || 'business'}
Content pillar: ${pillar}
${voiceCtx}${toneInstruction}${extraInstructions}

Raw story/experience:
${story.raw_text}

Rules:
1. Scroll-stopping first line — no generic openers, never start with "I"
2. Short punchy paragraphs, blank lines between
3. 150-300 words
4. Include 5-8 hashtags (mix of large/medium/niche) on the last line
5. Sound 100% human — match the writing sample's rhythm exactly
6. Extract the key insight or lesson from the story

Respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "content": "<full post text with hashtags>",
  "content_pillar": "${pillar}",
  "format": "story"
}`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return { ...parsed, storyId: story.id }
  } catch { return null }
}

// buildScheduleSlots replaced by buildOptimalSlots (lib/linkedin-schedule.ts)

export async function POST(request: NextRequest) {
  try {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Circuit breaker — default to open=false if the check itself fails
  let cb = { open: false }
  try { cb = await checkCircuitBreaker() } catch (e) { console.warn('[generate-batch] circuit breaker check failed (non-fatal):', e) }
  if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })

  // Per-user hourly rate limits — default to allowed=true if the check fails
  let rlClaude = { allowed: true, count: 0, limit: 0, retryAfterSeconds: 60 }
  let rlBatch = { allowed: true, count: 0, limit: 0, retryAfterSeconds: 60 }
  try {
    const [_rlc, _rlb] = await Promise.all([
      checkRateLimit(user.id, 'claude_calls'),
      checkRateLimit(user.id, 'batch_generation'),
    ])
    rlClaude = _rlc
    rlBatch = _rlb
  } catch (e) { console.warn('[generate-batch] rate limit check failed (non-fatal):', e) }
  if (!rlClaude.allowed) return NextResponse.json({ error: `Too many AI calls this hour (limit: ${rlClaude.limit}). Try again in ${Math.ceil(rlClaude.retryAfterSeconds / 60)} minutes.` }, { status: 429 })
  if (!rlBatch.allowed) return NextResponse.json({ error: 'You have already run batch generation this hour. Try again next hour.' }, { status: 429 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'Complete your profile first before generating posts.' }, { status: 404 })
  }

  const plan = profile.plan || 'starter'

  // Check batch_runs limit — default to allowed=true if the check fails
  let batchCheck = { allowed: true, used: 0, limit: 0, remaining: 0 }
  try { batchCheck = await checkLimit(user.id, plan, 'batch_runs') } catch (e) { console.warn('[generate-batch] batch_runs limit check failed (non-fatal):', e) }
  if (!batchCheck.allowed) {
    try { await logViolation(user.id, 'batch_runs', plan) } catch { /* non-fatal */ }
    return NextResponse.json({
      error: `You've used all ${batchCheck.limit} batch generation run${batchCheck.limit !== 1 ? 's' : ''} this month. Upgrade to get more.`,
      feature: 'batch_runs',
      used: batchCheck.used,
      limit: batchCheck.limit,
      plan,
    }, { status: 429 })
  }

  // Check how many posts are remaining this month — default to large remaining if the check fails
  let postsCheck = { allowed: true, used: 0, limit: 999, remaining: 999 }
  try { postsCheck = await checkLimit(user.id, plan, 'posts_generated') } catch (e) { console.warn('[generate-batch] posts_generated limit check failed (non-fatal):', e) }
  if (postsCheck.remaining === 0) {
    return NextResponse.json({
      error: `You've used all ${postsCheck.limit} post generations this month.`,
      feature: 'posts_generated',
      used: postsCheck.used,
      limit: postsCheck.limit,
      plan,
    }, { status: 429 })
  }

  // Parse body params
  const body = await request.json().catch(() => ({}))
  const requestedCount = typeof body.count === 'number' && body.count > 0 ? body.count : null
  const postsToGenerate = requestedCount ? Math.min(requestedCount, postsCheck.remaining) : postsCheck.remaining
  const instructions: string = typeof body.instructions === 'string' ? body.instructions : ''
  const tone: string = typeof body.tone === 'string' ? body.tone : ''
  const storyBankCount: number = typeof body.storyBankCount === 'number' && body.storyBankCount > 0
    ? Math.min(body.storyBankCount, postsToGenerate)
    : 0

  const pillars: string[] = (profile.content_pillars as string[]) || ['Professional Insights', 'Industry Trends', 'Personal Growth']
  const controlPreference: string = (profile.control_preference as string) || 'approve'
  const preferredHour: number = (profile.preferred_post_hour as number) || 9
  const preferredDays: string[] = (profile.preferred_days as string[]) || ['Monday', 'Wednesday', 'Friday']
  const timezone: string = (profile.timezone as string) || 'Asia/Kolkata'

  // Few-shot voice exemplars from the person's real writing (fall back to the
  // onboarding writing sample for users with an empty corpus).
  let voiceExemplars: string[] = []
  try { voiceExemplars = await getVoiceExemplars(user.id) } catch (e) { console.warn('[generate-batch] getVoiceExemplars failed (non-fatal):', e) }
  if (voiceExemplars.length === 0 && profile.writing_sample) {
    voiceExemplars = [profile.writing_sample as string]
  }

  const now = new Date()
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  // ── Subscription billing period ──────────────────────────────────────────
  // Fetch the user's next billing date so we can cap scheduling to it.
  // Annual subscribers have next_billing_date ~365 days out; monthly ~30 days.
  // We treat any renewal date > 60 days away as annual and skip the cap.
  let periodEndDate: Date | undefined
  try {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('next_billing_date, billing_period, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (sub?.next_billing_date) {
      const nextBilling = new Date(sub.next_billing_date)
      const daysUntilRenewal = (nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      // Annual subscribers: billing_period === 'annual' OR next renewal > 60 days out.
      // Either signal means the user has paid for the year — no period cap applied.
      const isAnnual = sub.billing_period === 'annual' || daysUntilRenewal > 60

      if (!isAnnual && daysUntilRenewal > 0) {
        periodEndDate = nextBilling
      }
    }
  } catch (e) {
    console.warn('[generate-batch] subscription period fetch failed (non-fatal):', e)
  }

  // ── Already-scheduled posts (wider window to cover cross-month slots) ────
  // Use a 65-day forward window instead of the calendar month so we don't
  // miss taken days that land in the next month (e.g. generating on May 28).
  const windowStart = now.toISOString()
  const windowEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 65, 23, 59, 59).toISOString()
  const { data: existingScheduled } = await supabaseAdmin
    .from('posts')
    .select('scheduled_at')
    .eq('user_id', user.id)
    .in('status', ['scheduled', 'pending_approval'])
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)
  const takenDateStrings = new Set(
    (existingScheduled || [])
      .filter(p => p.scheduled_at)
      .map(p => new Date(p.scheduled_at).toDateString())
  )

  // Step 1: convert queued story bank entries first
  const { data: pendingStories } = await supabaseAdmin
    .from('story_bank')
    .select('id, raw_text')
    .eq('user_id', user.id)
    .not('status', 'in', '("converted","dismissed")')
    .order('created_at', { ascending: true })
    .limit(postsToGenerate)

  type PostRow = { content: string; content_pillar: string; format: string; story_bank_id?: string }
  const allPosts: PostRow[] = []
  const convertedStoryIds: string[] = []

  for (const story of (pendingStories || []).slice(0, postsToGenerate)) {
    try {
      const variants = await generateLinkedInPosts({
        profile: profile as unknown as UserProfile,
        storyText: story.raw_text,
        additionalContext: instructions || undefined,
        voiceExemplars,
      })
      if (variants.length > 0) {
        allPosts.push({
          content: variants[0],
          content_pillar: (profile.content_pillars as string[])?.[0] || 'Personal Growth',
          format: 'story',
          story_bank_id: story.id,
        })
        convertedStoryIds.push(story.id)
      }
    } catch { /* skip failed story, continue with rest */ }
    if (allPosts.length >= postsToGenerate) break
  }

  // Step 2: fill remaining quota with AI batch generation (parallel for speed)
  const aiPostsNeeded = postsToGenerate - allPosts.length
  if (aiPostsNeeded > 0) {
    const BATCH_SIZE = 10
    // Build all batch sizes upfront, then fire them concurrently.
    // This cuts total latency from (N batches × ~20s) to max(~20s per batch).
    const batches: number[] = []
    let remaining = aiPostsNeeded
    while (remaining > 0) {
      batches.push(Math.min(remaining, BATCH_SIZE))
      remaining -= BATCH_SIZE
    }
    const results = await Promise.all(
      batches.map(count =>
        generateBatch(count, profile as Record<string, unknown>, pillars, instructions, tone, voiceExemplars)
          .catch(() => [] as Array<{ content: string; content_pillar: string; format: string }>)
      )
    )
    for (const batch of results) allPosts.push(...batch)
  }

  if (allPosts.length === 0) {
    return NextResponse.json({ error: 'Failed to generate posts. Please try again.' }, { status: 500 })
  }

  const slots = buildOptimalSlots({
    now,
    count: allPosts.length,
    planMonthlyLimit: postsCheck.limit,
    timezone,
    pillars,
    takenDateStrings,
    userPreferredDays: preferredDays,
    userPreferredHour: preferredHour,
    periodEndDate,   // caps window to subscription renewal date (monthly plans only)
  })

  const postStatus = controlPreference === 'autopilot' ? 'scheduled'
    : controlPreference === 'suggest' ? 'draft'
    : 'pending_approval'

  const insertPayloads = allPosts.map((post, i) => {
    // humanizeText can theoretically throw — fall back to raw AI content
    let content = post.content
    try { content = humanizeText(post.content) } catch { /* non-fatal: use raw content */ }
    return {
      user_id: user.id,
      content,
      content_pillar: post.content_pillar || pillars[i % pillars.length],
      source: 'ai_generated',
      status: postStatus,
      scheduled_at: slots[i]?.toISOString() ?? null,
      ...(post.story_bank_id ? { story_bank_id: post.story_bank_id } : {}),
    }
  })

  const { data: insertedPosts, error: insertError } = await supabaseAdmin
    .from('posts')
    .insert(insertPayloads)
    .select()

  if (insertError) {
    return NextResponse.json({ error: 'Failed to save posts: ' + insertError.message }, { status: 500 })
  }

  // Mark converted stories as converted — best-effort, non-fatal
  if (convertedStoryIds.length > 0) {
    Promise.resolve(supabaseAdmin.from('story_bank').update({ status: 'converted' }).in('id', convertedStoryIds)).catch(console.error)
  }

  // Increment usage counters — best-effort, non-fatal.
  // Posts are ALREADY inserted above; never let a tracking failure surface as
  // a generation error to the user.
  Promise.all([
    incrementUsage(user.id, 'batch_runs'),
    incrementUsage(user.id, 'posts_generated', allPosts.length),
    convertedStoryIds.length > 0 ? incrementUsage(user.id, 'story_conversions', convertedStoryIds.length) : Promise.resolve(),
    incrementRateLimit(user.id, 'claude_calls'),
    incrementRateLimit(user.id, 'batch_generation'),
    trackAndCheckSpend('claude_sonnet', user.id, { posts: allPosts.length }),
    supabaseAdmin.from('user_profiles').update({
      posts_used_this_month: (profile.posts_used_this_month || 0) + allPosts.length,
    }).eq('user_id', user.id),
  ]).catch(err => console.error('[generate-batch] usage increment error (non-fatal):', err))

  const nextScheduled = (insertedPosts || [])
    .filter(p => p.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  const nextPostDate = nextScheduled?.scheduled_at
    ? new Date(nextScheduled.scheduled_at).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      })
    : null

  return NextResponse.json({
    ok: true,
    postsGenerated: insertedPosts?.length || 0,
    storyPostsGenerated: convertedStoryIds.length,
    monthName,
    nextPostDate,
    controlPreference,
  })
  } catch (error) {
    console.error('[posts/generate-batch]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
