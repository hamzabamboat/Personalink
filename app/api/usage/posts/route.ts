import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit } from '@/lib/usage-limits'
import type { TierID } from '@/lib/pricing-config'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = (profile?.plan || 'free') as TierID
  const { used, limit } = await checkLimit(user.id, plan, 'posts_generated')
  return NextResponse.json({ used, limit, plan })
}
