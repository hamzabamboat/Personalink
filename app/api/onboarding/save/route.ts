import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { analyzeVoiceFingerprint } from '@/lib/anthropic'
import { addVoiceSample } from '@/lib/voice'
import { PLAN_LIMITS } from '@/lib/supabase'
import { getTierLimits, TIER_LIMITS, type TierID } from '@/lib/pricing-config'
import { getPostHogClient } from '@/lib/posthog-server'
import { isLocaleId } from '@/lib/prompts/locales/types'

export async function POST(request: NextRequest) {
  try {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  const {
    name, role, industry, company, age, linkedin_url,
    mcq_answers, writing_sample, content_pillars, control_preference, plan, voice_locale,
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

  // Fetch the existing row up-front: needed both to preserve the earliest
  // onboarding_completed_at AND to detect whether this is the user's FIRST
  // onboarding save. The deferred dashboard "finish profile" flow calls this
  // same endpoint later with only plan + config fields (no core identity), so
  // corePresent is false then — and the new-user defaults block below must NOT
  // run, or it would reset post quota / the monthly counter and clobber any
  // scheduling/tone the user customised in Settings after signup.
  const { data: existing } = await supabaseAdmin
    .from('user_profiles')
    .select('onboarding_completed_at')
    .eq('user_id', user.id)
    .maybeSingle()
  const isInitialOnboarding = corePresent && !existing?.onboarding_completed_at

  const upsertPayload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }

  // New-user defaults — ONLY on the initial onboarding save.
  if (isInitialOnboarding) {
    upsertPayload.plan = resolvedPlan
    upsertPayload.posts_limit = planData.posts
    upsertPayload.voice_fingerprint_limit = tierLimits.voiceFingerprints
    upsertPayload.posts_used_this_month = 0
    upsertPayload.preferred_days = ['Monday', 'Wednesday', 'Friday']
    upsertPayload.preferred_post_hour = 9
    upsertPayload.timezone = 'Asia/Kolkata'
    upsertPayload.writing_style = 'conversational'
    upsertPayload.tone = 'friendly'
    upsertPayload.onboarding_completed_at = new Date().toISOString()
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

  // Config fields — only write NON-EMPTY values. An empty array/object/string
  // would clobber existing data or mask downstream fallbacks (e.g. an empty
  // content_pillars defeats the default-pillar fallback in generation).
  if (Array.isArray(content_pillars) && content_pillars.length > 0) {
    upsertPayload.content_pillars = content_pillars
    upsertPayload.topics = content_pillars
  }
  if (mcq_answers && typeof mcq_answers === 'object' && Object.keys(mcq_answers).length > 0) {
    upsertPayload.mcq_answers = mcq_answers
  }
  if (control_preference) upsertPayload.control_preference = control_preference
  // Language mode (additive; only written when a valid locale is supplied).
  if (isLocaleId(voice_locale)) upsertPayload.voice_locale = voice_locale

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .upsert(upsertPayload, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed the voice corpus with the onboarding writing sample
  if (writing_sample) addVoiceSample(user.id, writing_sample, 'onboarding').catch(() => { /* non-fatal */ })

  if (isInitialOnboarding) {
    getPostHogClient().capture({
      distinctId: user.id,
      event: 'onboarding_completed',
      properties: { plan: resolvedPlan, industry, role },
    })
  }

  return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[onboarding/save]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
