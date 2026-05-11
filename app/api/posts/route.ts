import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const scheduledMonth = searchParams.get('scheduled_month') // YYYY-MM — filters by scheduled_at
    const createdMonth = searchParams.get('created_month')    // YYYY-MM — filters by created_at
    const orderBy = searchParams.get('order') === 'scheduled_at' ? 'scheduled_at' : 'created_at'
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 200

    let query = supabaseAdmin
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order(orderBy, { ascending: orderBy === 'scheduled_at' })
      .limit(limit)

    if (status) query = query.eq('status', status)

    if (scheduledMonth) {
      const [y, m] = scheduledMonth.split('-').map(Number)
      query = query
        .gte('scheduled_at', new Date(y, m - 1, 1).toISOString())
        .lte('scheduled_at', new Date(y, m, 0, 23, 59, 59).toISOString())
    }

    const since = searchParams.get('since')
    if (since) query = query.gte('created_at', since)

    if (createdMonth) {
      const [y, m] = createdMonth.split('-').map(Number)
      query = query
        .gte('created_at', new Date(y, m - 1, 1).toISOString())
        .lte('created_at', new Date(y, m, 0, 23, 59, 59).toISOString())
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ posts: data || [] })
  } catch (error) {
    console.error('[GET /api/posts]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
