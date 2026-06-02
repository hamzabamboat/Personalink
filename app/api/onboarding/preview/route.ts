import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { generateLinkedInPosts } from '@/lib/anthropic'
import type { UserProfile } from '@/lib/supabase'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const post = posts[0] ?? ''
    return NextResponse.json({ post })
  } catch (err) {
    console.error('[onboarding/preview]', err)
    return NextResponse.json({ error: 'preview_failed' }, { status: 200 })
  }
}
