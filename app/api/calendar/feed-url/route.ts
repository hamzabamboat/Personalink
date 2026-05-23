import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Returns the private subscription URLs for the logged-in user's posting feed.
// Lazily generates a feed token on first request.
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let token = (user as { calendar_feed_token?: string | null }).calendar_feed_token
    if (!token) {
      token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')
      const { error } = await supabaseAdmin
        .from('users')
        .update({ calendar_feed_token: token })
        .eq('id', user.id)
      if (error) return NextResponse.json({ error: 'Could not create feed' }, { status: 500 })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const httpsUrl = `${origin.replace(/\/$/, '')}/api/calendar/feed?token=${token}`
    const webcalUrl = httpsUrl.replace(/^https?:\/\//, 'webcal://')

    return NextResponse.json({ httpsUrl, webcalUrl })
  } catch (err) {
    console.error('[calendar/feed-url]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
