import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { generateLinkedInPosts } from '@/lib/anthropic'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'
import type { UserProfile } from '@/lib/supabase'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Preview hits the paid LLM — rate-limit it (shares the generation bucket)
    // so a signed-in user can't loop it to burn credits. On limit the client
    // falls back gracefully (it treats any error response as "skip the preview").
    const rl = await checkRateLimit(user.id, 'claude_calls')
    if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

    const body = await request.json()
    const { name, role, industry, writing_sample } = body as {
      name?: string
      role?: string
      industry?: string
      writing_sample?: string
    }

    // Build a minimal UserProfile-shaped object from the in-progress onboarding data.
    // Only the fields that generateLinkedInPosts / buildVoiceContext / pickContentPillar
    // actually read are required here.
    const minimalProfile: UserProfile = {
      id: '',
      user_id: user.id,
      name: name || null,
      role: role || null,
      industry: industry || null,
      company: null,
      years_experience: null,
      age: null,
      linkedin_url: null,
      job_title: role || null,
      topics: null,
      writing_style: 'professional',
      tone: 'friendly',
      post_examples: null,
      voice_fingerprint: null,
      mcq_answers: null,
      content_pillars: null,
      control_preference: null,
      writing_sample: writing_sample || null,
      voice_locale: 'english',
      plan: 'free',
      onboarding_completed_at: null,
      posts_used_this_month: 0,
      posts_limit: 0,
      preferred_days: null,
      preferred_post_hour: 9,
      timezone: 'UTC',
      current_about: null,
      current_skills: null,
      trust_score: 100,
      risk_score: 0,
      flagged_count: 0,
      autopilot_eligible: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Pass the writing_sample as a voice exemplar so it is used as the
    // ground-truth style signal (mirrors the fallback logic in posts/generate).
    const voiceExemplars = writing_sample ? [writing_sample] : undefined

    const posts = await generateLinkedInPosts({
      profile: minimalProfile,
      voiceExemplars,
    })
    incrementRateLimit(user.id, 'claude_calls').catch(() => {})

    const post = posts[0] ?? ''
    return NextResponse.json({ post })
  } catch (err) {
    console.error('[onboarding/preview]', err)
    return NextResponse.json({ error: 'preview_failed' }, { status: 200 })
  }
}
