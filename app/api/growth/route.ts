import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { persistGrowthScore } from '@/lib/growth-score'
import { getUserInsights } from '@/lib/insights'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Latest score; recompute if the freshest is older than 24h (mirrors analytics page cadence).
    const { data: latest } = await supabaseAdmin
      .from('growth_scores')
      .select('score, breakdown, captured_at')
      .eq('user_id', user.id)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let growthScore = latest
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    if (!latest || new Date(latest.captured_at).getTime() < oneDayAgo) {
      const fresh = await persistGrowthScore(user.id)
      growthScore = { ...fresh, captured_at: new Date().toISOString() }
    }

    const insights = await getUserInsights(user.id)
    return NextResponse.json({ growthScore, insights })
  } catch (err) {
    console.error('[growth]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
