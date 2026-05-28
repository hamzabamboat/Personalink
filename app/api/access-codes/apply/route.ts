import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { analyzeVoiceFingerprint } from '@/lib/anthropic'
import { addVoiceSample } from '@/lib/voice'
import { PLAN_LIMITS } from '@/lib/supabase'
import { getTierLimits, type TierID } from '@/lib/pricing-config'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    code,
    name, role, industry, company, age, linkedin_url,
    mcq_answers, writing_sample, content_pillars, control_preference,
  } = body

  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  // Atomically validate and claim the code
  const { data: codeRow } = await supabaseAdmin
    .from('access_codes')
    .select('id, plan, max_uses, uses_count, expires_at, is_active, duration_days')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!codeRow || !codeRow.is_active || codeRow.uses_count >= codeRow.max_uses) {
    return NextResponse.json({ error: 'Invalid or fully used code' }, { status: 400 })
  }
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Code has expired' }, { status: 400 })
  }

  const plan: string = codeRow.plan

  // Generate voice fingerprint
  let voice_fingerprint = ''
  if (writing_sample) {
    try { voice_fingerprint = await analyzeVoiceFingerprint(writing_sample) } catch {}
  }

  const planData = PLAN_LIMITS[plan] || PLAN_LIMITS.starter
  const tierLimits = getTierLimits(plan as TierID)
  const now = new Date().toISOString()

  // Time-limited codes: redemption sets plan_expires_at. Cron at
  // /api/cron/expire-plans reverts to 'free' when that date passes.
  const planExpiresAt = (typeof codeRow.duration_days === 'number' && codeRow.duration_days > 0)
    ? new Date(Date.now() + codeRow.duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null

  await Promise.all([
    // Increment code uses
    supabaseAdmin
      .from('access_codes')
      .update({ uses_count: codeRow.uses_count + 1 })
      .eq('id', codeRow.id),

    // Save profile
    supabaseAdmin.from('user_profiles').upsert({
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
      voice_fingerprint_limit: tierLimits.voiceFingerprints,
      plan_expires_at: planExpiresAt,
      posts_used_this_month: 0,
      onboarding_completed_at: now,
      preferred_days: ['Monday', 'Wednesday', 'Friday'],
      preferred_post_hour: 9,
      timezone: 'Asia/Kolkata',
      updated_at: now,
    }, { onConflict: 'user_id' }),

    // Mark user as access_code subscriber
    supabaseAdmin
      .from('users')
      .update({ subscription_status: 'access_code', updated_at: now })
      .eq('id', user.id),
  ])

  // Seed the voice corpus with the onboarding writing sample
  if (writing_sample) addVoiceSample(user.id, writing_sample, 'onboarding').catch(() => { /* non-fatal */ })

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
  const response = NextResponse.json({ success: true, plan })
  response.cookies.set('sub_status', 'access_code', { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 })
  response.cookies.set('used_code', code.toUpperCase().trim(), { ...cookieOpts, maxAge: 60 * 60 * 24 * 365 })
  return response
}
