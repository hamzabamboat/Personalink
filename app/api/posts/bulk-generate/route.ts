import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { generateLinkedInPosts } from '@/lib/anthropic'
import { cleanThroughAIGate } from '@/lib/ai-detector'
import { getVoiceExemplars } from '@/lib/voice'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (profile?.plan !== 'pro') return NextResponse.json({ error: 'Bulk generate is a Pro feature.' }, { status: 403 })

  const cb = await checkCircuitBreaker()
  if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })

  const [rlClaude, rlBatch] = await Promise.all([
    checkRateLimit(user.id, 'claude_calls'),
    checkRateLimit(user.id, 'batch_generation'),
  ])
  if (!rlClaude.allowed) return NextResponse.json({ error: `Too many AI calls this hour (limit: ${rlClaude.limit}). Try again in ${Math.ceil(rlClaude.retryAfterSeconds / 60)} minutes.` }, { status: 429 })
  if (!rlBatch.allowed) return NextResponse.json({ error: 'You have already run bulk generation this hour. Try again next hour.' }, { status: 429 })

  const plan = 'pro'
  const batchCheck = await checkLimit(user.id, plan, 'batch_runs')
  if (!batchCheck.allowed) {
    await logViolation(user.id, 'batch_runs', plan)
    return NextResponse.json({ error: `You've used all ${batchCheck.limit} batch runs this month.`, feature: 'batch_runs' }, { status: 429 })
  }

  const postsCheck = await checkLimit(user.id, plan, 'posts_generated')
  if (postsCheck.remaining === 0) {
    return NextResponse.json({ error: `You've used all ${postsCheck.limit} post generations this month.`, feature: 'posts_generated' }, { status: 429 })
  }

  const pillars = profile.content_pillars || profile.topics || ['Professional Insights', 'Leadership', 'Innovation']
  const postsPerPillar = Math.ceil(Math.min(30, postsCheck.remaining) / pillars.length)
  const inserted: unknown[] = []

  // Few-shot voice exemplars (fall back to onboarding writing sample)
  let voiceExemplars: string[] = []
  try { voiceExemplars = await getVoiceExemplars(user.id) } catch { /* non-fatal */ }
  if (voiceExemplars.length === 0 && profile.writing_sample) {
    voiceExemplars = [profile.writing_sample as string]
  }

  let dayOffset = 0
  for (const pillar of pillars) {
    try {
      const posts = await generateLinkedInPosts({ profile, topic: `Write about ${pillar}`, voiceExemplars })
      for (const rawContent of posts.slice(0, postsPerPillar)) {
        const gate = await cleanThroughAIGate(rawContent, { profile, voiceExemplars })
        if (!gate.content || gate.content.trim().length < 50) continue

        const scheduledAt = new Date()
        scheduledAt.setDate(scheduledAt.getDate() + dayOffset)
        scheduledAt.setHours(profile.preferred_post_hour || 9, 0, 0, 0)

        const { data } = await supabaseAdmin.from('posts').insert({
          user_id: user.id,
          content: gate.content,
          status: 'scheduled',
          source: 'ai_generated',
          content_pillar: pillar,
          scheduled_at: scheduledAt.toISOString(),
          generation_prompt: `Bulk: ${pillar}`,
          ai_detection_score: gate.finalScore,
          ai_detection_patterns: gate.patternsAtSave,
          ai_rewrite_attempts: gate.rewriteAttempts,
        }).select().single()

        if (data) inserted.push(data)
        dayOffset++
        if (dayOffset >= 30) break
      }
    } catch {}
    if (dayOffset >= 30) break
  }

  await Promise.all([
    incrementUsage(user.id, 'batch_runs'),
    incrementUsage(user.id, 'posts_generated', inserted.length),
    incrementRateLimit(user.id, 'claude_calls'),
    incrementRateLimit(user.id, 'batch_generation'),
    trackAndCheckSpend('claude_sonnet', user.id, { posts: inserted.length }),
    supabaseAdmin.from('user_profiles').update({
      posts_used_this_month: (profile.posts_used_this_month || 0) + inserted.length,
    }).eq('user_id', user.id),
  ])

  return NextResponse.json({ count: inserted.length })
}
