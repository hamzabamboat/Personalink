import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { syncPostToCalendar, getValidAccessToken } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check user has calendar connected
  const accessToken = await getValidAccessToken(user.id)
  if (!accessToken) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  // Fetch all future scheduled/approved posts for this user
  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('id, content, scheduled_at, google_calendar_event_id')
    .eq('user_id', user.id)
    .in('status', ['scheduled', 'approved', 'pending_approval'])
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', new Date().toISOString())

  if (error) {
    console.error('[gcal/sync] fetch posts failed:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No upcoming posts to sync' })
  }

  // Sync all posts concurrently (with a concurrency cap to avoid rate limits)
  const BATCH = 5
  let synced = 0

  for (let i = 0; i < posts.length; i += BATCH) {
    const batch = posts.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (post) => {
        await syncPostToCalendar(user.id, post)
        synced++
      })
    )
  }

  return NextResponse.json({ synced, total: posts.length })
}
