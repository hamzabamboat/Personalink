import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MCQ_QUESTIONS } from '@/lib/onboarding-questions'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('refinement_step')
    .eq('user_id', user.id)
    .maybeSingle()

  const step = profile?.refinement_step ?? 0
  if (step >= MCQ_QUESTIONS.length) {
    return NextResponse.json({ done: true, step, total: MCQ_QUESTIONS.length })
  }
  return NextResponse.json({ done: false, step, total: MCQ_QUESTIONS.length, question: MCQ_QUESTIONS[step] })
}
