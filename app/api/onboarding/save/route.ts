import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { analyzeVoiceFingerprint } from '@/lib/anthropic'
import { PLAN_LIMITS } from '@/lib/supabase'
import { getPostHogClient } from '@/lib/posthog-server'

export async function POST(request: NextRequest) {
  try {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  const {
    name, role, industry, company, age, linkedin_url,
    mcq_answers, writing_sample, content_pillars, control_preference, plan,
  } = body

  // Generate voice fingerprint from writing sample
  let voice_fingerprint = ''
  if (writing_sample) {
    try {
      voice_fingerprint = await analyzeVoiceFingerprint(writing_sample)
    } catch {}
  }

  const planData = PLAN_LIMITS[plan] || PLAN_LIMITS.starter

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      name, role, industry, company,
      age: age ? parseInt(age) : null,
      linkedin_url,
      job_title: role,
      topics: content_pillars,
      writing_style: 'conversational',
      tone: 'friendly',
      voice_fingerprint,
      mcq_answers,
      writing_sample,
      content_pillars,
      control_preference,
      plan,
      posts_limit: planData.posts,
      posts_used_this_month: 0,
      onboarding_completed_at: new Date().toISOString(),
      preferred_days: ['Monday', 'Wednesday', 'Friday'],
      preferred_post_hour: 9,
      timezone: 'Asia/Kolkata',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  getPostHogClient().capture({
    distinctId: user.id,
    event: 'onboarding_completed',
    properties: { plan, industry, role, content_pillars, control_preference },
  })

  return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[onboarding/save]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
