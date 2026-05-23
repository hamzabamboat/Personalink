import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildIcs } from '@/lib/ics'

// Public, token-authenticated iCal feed. Calendar apps fetch this anonymously,
// so we authenticate by the per-user feed token rather than a session cookie.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return new NextResponse('Missing token', { status: 400 })

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, linkedin_name')
    .eq('calendar_feed_token', token)
    .maybeSingle()

  // Always return a valid (possibly empty) calendar so a bad/rotated token
  // doesn't make the subscribed calendar error out in the client.
  let posts: { id: string; content: string; scheduled_at: string | null; status: string | null }[] = []
  if (user) {
    const { data } = await supabaseAdmin
      .from('posts')
      .select('id, content, scheduled_at, status')
      .eq('user_id', user.id)
      .in('status', ['scheduled', 'pending_approval', 'approved', 'published'])
      .not('scheduled_at', 'is', null)
      .order('scheduled_at', { ascending: true })
      .limit(500)
    posts = data || []
  }

  const ics = buildIcs(posts, {
    name: user?.linkedin_name ? `${user.linkedin_name} — LinkedIn Posts` : 'PersonaLink Posts',
    description: 'Your scheduled LinkedIn posts from PersonaLink',
  })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="personalink.ics"',
      'Cache-Control': 'no-cache, max-age=0',
    },
  })
}
