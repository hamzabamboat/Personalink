import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateImageSuggestions } from '@/lib/anthropic'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = await checkRateLimit(user.id, 'image_suggestions')
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many image-suggestion requests this hour. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
      )
    }

    const body = await request.json().catch(() => null)
    if (!body?.postContent) return NextResponse.json({ error: 'postContent required' }, { status: 400 })

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('industry')
      .eq('user_id', user.id)
      .maybeSingle()

    const suggestions = await generateImageSuggestions(body.postContent, profile?.industry || 'business')
    incrementRateLimit(user.id, 'image_suggestions')
    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[posts/image-suggestions]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
