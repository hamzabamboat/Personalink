import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MCQ_QUESTIONS } from '@/lib/onboarding-questions'
import { refreshFingerprint } from '@/lib/voice'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const questionId: string | undefined = body?.questionId
  const answer: string | string[] | undefined = body?.answer
  const skipped: boolean = !!body?.skipped

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('refinement_step, mcq_answers')
    .eq('user_id', user.id)
    .maybeSingle()

  const step = profile?.refinement_step ?? 0
  const current = MCQ_QUESTIONS[step]
  // Guard against stale client state.
  if (current && questionId && questionId !== current.id) {
    return NextResponse.json({ ok: true, step }) // ignore; client will re-fetch
  }

  const mcq = { ...(profile?.mcq_answers ?? {}) } as Record<string, string | string[]>
  if (!skipped && answer != null && current) mcq[current.id] = answer

  const nextStep = step + 1
  await supabaseAdmin
    .from('user_profiles')
    .update({ refinement_step: nextStep, mcq_answers: mcq, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  // Refresh the fingerprint from the corpus after answering (non-fatal).
  if (!skipped) refreshFingerprint(user.id).catch(() => {})

  return NextResponse.json({ ok: true, step: nextStep })
}
