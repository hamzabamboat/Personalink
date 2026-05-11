import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isTokenExpired } from '@/lib/linkedin-api'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('linkedin_access_token, linkedin_token_expires_at')
    .eq('id', user.id)
    .single()

  if (!userData?.linkedin_access_token || isTokenExpired(userData.linkedin_token_expires_at)) {
    return NextResponse.json({ error: 'LinkedIn token expired. Please log out and reconnect LinkedIn.' }, { status: 403 })
  }

  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, linkedin_post_id')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .not('linkedin_post_id', 'is', null)
    .limit(50)

  if (!posts?.length) {
    return NextResponse.json({ synced: 0, message: 'No published posts with LinkedIn IDs found.' })
  }

  let synced = 0
  let failed = 0

  for (const post of posts) {
    try {
      const encodedUrn = encodeURIComponent(post.linkedin_post_id!)
      const res = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodedUrn}`,
        {
          headers: {
            Authorization: `Bearer ${userData.linkedin_access_token}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      )

      if (!res.ok) {
        failed++
        continue
      }

      const data = await res.json()
      const reactions = data.likesSummary?.totalLikes ?? null

      if (reactions !== null) {
        await supabaseAdmin
          .from('posts')
          .update({ reactions })
          .eq('id', post.id)
        synced++
      }
    } catch {
      failed++
    }
  }

  return NextResponse.json({ synced, failed, total: posts.length })
}
