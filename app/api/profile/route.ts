import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { analyzeVoiceFingerprint } from '@/lib/anthropic'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ profile: data })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    name, role, industry, company, years_experience, linkedin_url,
    job_title, topics, writing_style, tone, post_examples,
    voice_fingerprint, mcq_answers, content_pillars, control_preference,
    writing_sample, plan, preferred_days, preferred_post_hour, timezone,
  } = body

  // If writing_sample changed and no fingerprint, generate one
  let computedFingerprint = voice_fingerprint
  if (writing_sample && !voice_fingerprint) {
    try {
      computedFingerprint = await analyzeVoiceFingerprint(writing_sample)
    } catch {}
  }

  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      name, role, industry, company, years_experience, linkedin_url,
      job_title: job_title || role,
      topics: topics || content_pillars,
      writing_style, tone, post_examples,
      voice_fingerprint: computedFingerprint,
      mcq_answers, content_pillars, control_preference,
      writing_sample, plan,
      preferred_days, preferred_post_hour, timezone,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
