import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { addVoiceSample, refreshFingerprint } from '@/lib/voice'

export const maxDuration = 60

// Re-distil the voice fingerprint from the user's accumulated writing corpus.
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Seed the corpus from the saved writing sample if it's still empty
    // (covers existing users created before the corpus existed).
    const { count } = await supabaseAdmin
      .from('voice_samples')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (!count) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('writing_sample')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profile?.writing_sample) {
        await addVoiceSample(user.id, profile.writing_sample, 'manual')
      }
    }

    const fingerprint = await refreshFingerprint(user.id)
    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Add a writing sample in Settings first so we have something to learn from.' },
        { status: 400 },
      )
    }

    return NextResponse.json({ ok: true, fingerprint })
  } catch (err) {
    console.error('[voice/retrain]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
