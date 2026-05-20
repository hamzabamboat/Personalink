import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { beautifyLinkedInProfile } from '@/lib/anthropic'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan, role, industry, company, voice_fingerprint, writing_sample, name')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = profile?.plan || 'starter'

  // Starter plan cannot access this feature
  if (plan === 'starter') {
    return NextResponse.json({
      error: 'Profile Beautifier is available on Standard and Pro plans.',
      feature: 'profile_beautifications',
      plan,
      upgrade: true,
    }, { status: 403 })
  }

  const [cb, rl] = await Promise.all([
    checkCircuitBreaker(),
    checkRateLimit(user.id, 'profile_beautify'),
  ])
  if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit reached. Try again in an hour.' }, { status: 429 })

  const usageCheck = await checkLimit(user.id, plan, 'profile_beautifications')
  if (!usageCheck.allowed) {
    await logViolation(user.id, 'profile_beautifications', plan)
    return NextResponse.json({
      error: `You've used all ${usageCheck.limit} profile beautification${usageCheck.limit !== 1 ? 's' : ''} this month. Resets on the 1st.`,
      feature: 'profile_beautifications',
      used: usageCheck.used,
      limit: usageCheck.limit,
      plan,
    }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const { headline, about, skills } = body as {
    headline?: string
    about?: string
    skills?: string[]
  }

  // Save the user's current profile inputs for future pre-fill
  await supabaseAdmin
    .from('user_profiles')
    .update({
      ...(about !== undefined ? { current_about: about } : {}),
      ...(skills !== undefined ? { current_skills: skills } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  try {
    const result = await beautifyLinkedInProfile({
      name: profile?.name || user.linkedin_name,
      currentHeadline: headline || user.linkedin_headline || undefined,
      currentAbout: about,
      currentSkills: skills,
      role: profile?.role,
      industry: profile?.industry,
      company: profile?.company,
      voiceFingerprint: profile?.voice_fingerprint,
      writingSample: profile?.writing_sample,
    })

    const { data: saved } = await supabaseAdmin
      .from('profile_beautifications')
      .insert({
        user_id: user.id,
        input_headline: headline || user.linkedin_headline || null,
        input_about: about || null,
        input_skills: skills || null,
        score_before: result.score_before,
        score_after: result.score_after,
        breakdown_before: result.breakdown_before,
        breakdown_after: result.breakdown_after,
        new_headline: result.new_headline,
        new_about: result.new_about,
        suggested_skills: result.suggested_skills,
        profile_photo_brief: result.profile_photo_brief,
        banner_brief: result.banner_brief,
        improvement_notes: result.improvement_notes,
      })
      .select('id')
      .single()

    await Promise.all([
      incrementUsage(user.id, 'profile_beautifications'),
      incrementRateLimit(user.id, 'profile_beautify'),
      trackAndCheckSpend('claude_sonnet', user.id),
    ])

    return NextResponse.json({ ...result, id: saved?.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[profile/beautify] failed:', message)
    return NextResponse.json({ error: 'Beautification failed — please try again.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [beautifications, userRow, profileRow] = await Promise.all([
    supabaseAdmin
      .from('profile_beautifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('users')
      .select('linkedin_name, linkedin_picture, linkedin_headline')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('user_profiles')
      .select('plan, role, industry, company, current_about, current_skills')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const plan = profileRow.data?.plan || 'starter'
  const usageCheck = await checkLimit(user.id, plan, 'profile_beautifications')

  return NextResponse.json({
    beautifications: beautifications.data || [],
    linkedin: {
      name: userRow.data?.linkedin_name,
      picture: userRow.data?.linkedin_picture,
      headline: userRow.data?.linkedin_headline,
    },
    profile: {
      role: profileRow.data?.role,
      industry: profileRow.data?.industry,
      company: profileRow.data?.company,
      current_about: profileRow.data?.current_about,
      current_skills: profileRow.data?.current_skills,
    },
    usage: {
      used: usageCheck.used,
      limit: usageCheck.limit,
      remaining: usageCheck.remaining,
      plan,
    },
  })
}
