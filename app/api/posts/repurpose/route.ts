import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { repurposePost } from '@/lib/anthropic'
import { cleanThroughAIGate } from '@/lib/ai-detector'
import { getVoiceExemplars } from '@/lib/voice'
import type { UserProfile } from '@/lib/supabase'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()

    const plan = profile?.plan || 'starter'

    // Circuit breaker + hourly rate limit
    const [cb, rl] = await Promise.all([
      checkCircuitBreaker(),
      checkRateLimit(user.id, 'claude_calls'),
    ])
    if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })
    if (!rl.allowed) return NextResponse.json({ error: `Too many AI calls this hour (limit: ${rl.limit}). Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.` }, { status: 429 })

    // Repurpose is Pro only
    if (plan !== 'pro') {
      return NextResponse.json({
        error: 'Repurpose is a Pro feature. Upgrade to unlock.',
        feature: 'repurpose_runs',
        used: 0,
        limit: 0,
        plan,
      }, { status: 403 })
    }

    // Check repurpose_runs limit
    const repurposeCheck = await checkLimit(user.id, plan, 'repurpose_runs')
    if (!repurposeCheck.allowed) {
      await logViolation(user.id, 'repurpose_runs', plan)
      return NextResponse.json({
        error: `You've used all ${repurposeCheck.limit} repurpose runs this month.`,
        feature: 'repurpose_runs',
        used: repurposeCheck.used,
        limit: repurposeCheck.limit,
        plan,
      }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    if (!body?.postId) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })

    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('content')
      .eq('id', body.postId)
      .eq('user_id', user.id)
      .single()
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const { data: fullProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const gateProfile = (fullProfile || profile) as UserProfile
    const rawAngles = await repurposePost(post.content, gateProfile)

    // Few-shot voice exemplars (fall back to onboarding writing sample)
    let voiceExemplars: string[] = []
    try { voiceExemplars = await getVoiceExemplars(user.id) } catch { /* non-fatal */ }
    if (voiceExemplars.length === 0 && fullProfile?.writing_sample) {
      voiceExemplars = [fullProfile.writing_sample as string]
    }

    // Run every repurposed angle through the anti-AI-detection gate
    const angles = await Promise.all(
      rawAngles.map(async (angle) => {
        try {
          const gate = await cleanThroughAIGate(angle, { profile: gateProfile, voiceExemplars })
          return gate.content
        } catch (e) {
          console.warn('[posts/repurpose] cleanThroughAIGate failed for angle (non-fatal):', e)
          return angle
        }
      })
    )

    await Promise.all([
      incrementUsage(user.id, 'repurpose_runs'),
      incrementRateLimit(user.id, 'claude_calls'),
      trackAndCheckSpend('claude_sonnet', user.id),
    ])

    return NextResponse.json({ angles })
  } catch (err) {
    console.error('[posts/repurpose]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
