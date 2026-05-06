import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { getTrendsForProfile, getPostInsights } from '@/lib/trends'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ error: 'no_profile' }, { status: 400 })
  }

  const [trends, insights] = await Promise.all([
    getTrendsForProfile(profile),
    getPostInsights(user.id),
  ])

  return NextResponse.json({ trends, insights })
}
