import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateImageSuggestions } from '@/lib/anthropic'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body?.postContent) return NextResponse.json({ error: 'postContent required' }, { status: 400 })

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('industry')
      .eq('user_id', user.id)
      .maybeSingle()

    const suggestions = await generateImageSuggestions(body.postContent, profile?.industry || 'business')
    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[posts/image-suggestions]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
