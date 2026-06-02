import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { analyzeVoiceFingerprint } from '@/lib/anthropic'
import { addVoiceSample } from '@/lib/voice'
import { PLAN_LIMITS } from '@/lib/supabase'
import { getTierLimits, TIER_LIMITS, type TierID } from '@/lib/pricing-config'
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

  // Default new users to the Free tier; only known tiers are written.
  const resolvedPlan: TierID = (TIER_LIMITS[plan as TierID] ? plan : 'free') as TierID
  const planData = PLAN_LIMITS[resolvedPlan] || PLAN_LIMITS.free
  const tierLimits = getTierLimits(resolvedPlan)

  // Core identity fields — presence of all five marks onboarding as complete.
  const corePresent =
    !!name && !!role && !!industry && !!linkedin_url && !!writing_sample

  // Build the upsert payload: always include identity/core fields that are
  // present; only include optional config fields when they appear in the body
  // so a partial save never nulls out values already stored.
  const upsertPayload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
    // Plan + limits are always resolved (preserves existing behaviour).
    plan: resolvedPlan,
    posts_limit: planData.posts,
    voice_fingerprint_limit: tierLimits.voiceFingerprints,
    posts_used_this_month: 0,
    preferred_days: ['Monday', 'Wednesday', 'Friday'],
    preferred_post_hour: 9,
    timezone: 'Asia/Kolkata',
    writing_style: 'conversational',
    tone: 'friendly',
  }

  // Core identity — only write when present in the payload.
  if (name !== undefined) upsertPayload.name = name
  if (role !== undefined) { upsertPayload.role = role; upsertPayload.job_title = role }
  if (industry !== undefined) upsertPayload.industry = industry
  if (linkedin_url !== undefined) upsertPayload.linkedin_url = linkedin_url
  if (writing_sample !== undefined) { upsertPayload.writing_sample = writing_sample; upsertPayload.voice_fingerprint = voice_fingerprint }

  // Optional profile fields — only write when present in the payload.
  if (company !== undefined) upsertPayload.company = company
  if (age !== undefined) upsertPayload.age = age ? parseInt(age) : null

  // Config fields — only write when present in the payload.
  if (mcq_answers !== undefined) upsertPayload.mcq_answers = mcq_answers
  if (content_pillars !== undefined) { upsertPayload.content_pillars = content_pillars; upsertPayload.topics = content_pillars }
  if (control_preference !== undefined) upsertPayload.control_preference = control_preference

  // Set onboarding_completed_at when core fields are present.
  // Use a subquery-style upsert: only set if not already populated (coalesce
  // approach isn't available in a plain upsert, so we fetch first).
  if (corePresent) {
    const { data: existing } = await supabaseAdmin
      .from('user_profiles')
      .select('onboarding_completed_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!existing?.onboarding_completed_at) {
      upsertPayload.onboarding_completed_at = new Date().toISOString()
    }
  }

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .upsert(upsertPayload, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed the voice corpus with the onboarding writing sample
  if (writing_sample) addVoiceSample(user.id, writing_sample, 'onboarding').catch(() => { /* non-fatal */ })

  getPostHogClient().capture({
    distinctId: user.id,
    event: 'onboarding_completed',
    properties: { plan: resolvedPlan, industry, role, content_pillars, control_preference },
  })

  return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[onboarding/save]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
