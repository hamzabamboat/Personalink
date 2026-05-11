import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateImageBriefPrompts } from '@/lib/anthropic'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

    const plan = profile.plan || 'starter'
    if (plan === 'starter') {
      return NextResponse.json({ error: 'Upgrade to Standard or Pro to get AI photo ideas.' }, { status: 403 })
    }

    const prompts = await generateImageBriefPrompts(profile)
    return NextResponse.json({ prompts })
  } catch (err) {
    console.error('[images/brief-prompts]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
