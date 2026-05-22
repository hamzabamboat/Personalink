import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { addVoiceSample, refreshFingerprint } from '@/lib/voice'

export const maxDuration = 60

async function countSamples(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('voice_samples')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count || 0
}

// How many real writing samples this user has in their voice corpus.
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return NextResponse.json({ count: await countSamples(user.id) })
  } catch (err) {
    console.error('[voice/samples GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

// Bulk-add the user's real past posts to the voice corpus, then re-distil.
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const raw: unknown = body?.posts
    const list: string[] = Array.isArray(raw)
      ? raw.map(p => (typeof p === 'string' ? p : ''))
      : typeof raw === 'string'
        ? raw.split(/^\s*---\s*$/m)
        : []

    const cleaned = list.map(p => p.trim()).filter(p => p.length >= 80)
    if (cleaned.length === 0) {
      return NextResponse.json(
        { error: 'Paste at least one real post (80+ characters). Separate multiple posts with a line containing only ---' },
        { status: 400 },
      )
    }

    // Cap a single import so a paste-bomb can't blow up the corpus
    for (const post of cleaned.slice(0, 50)) {
      await addVoiceSample(user.id, post, 'manual')
    }

    const fingerprint = await refreshFingerprint(user.id)
    return NextResponse.json({
      ok: true,
      added: Math.min(cleaned.length, 50),
      count: await countSamples(user.id),
      fingerprint,
    })
  } catch (err) {
    console.error('[voice/samples POST]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
