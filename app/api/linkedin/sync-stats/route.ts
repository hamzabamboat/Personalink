import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isTokenExpired } from '@/lib/linkedin-api'
import {
  capturePostSnapshot,
  fetchFollowerCounts,
  findFollowerDateRange,
} from '@/lib/linkedin-analytics'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('linkedin_access_token, linkedin_token_expires_at, linkedin_scopes')
    .eq('id', user.id)
    .single()

  if (!userData?.linkedin_access_token || isTokenExpired(userData.linkedin_token_expires_at)) {
    return NextResponse.json(
      { error: 'LinkedIn token expired. Please log out and reconnect LinkedIn.' },
      { status: 403 }
    )
  }

  const token = userData.linkedin_access_token
  const scopes = userData.linkedin_scopes as string[] | null

  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, linkedin_post_id, published_at')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .not('linkedin_post_id', 'is', null)
    .limit(50)

  let synced = 0
  let failed = 0
  let usedFallback = false

  for (const post of posts ?? []) {
    try {
      const metrics = await capturePostSnapshot({
        db: supabaseAdmin,
        token,
        scopes,
        postId: post.id,
        userId: user.id,
        urn: post.linkedin_post_id!,
        publishedAt: post.published_at,
      })
      if (metrics.source === 'public_fallback') usedFallback = true
      synced++
    } catch {
      failed++
    }
  }

  // First-sync follower backfill: only when this user has no snapshots yet.
  let followersBackfilled = 0
  const { count: existingSnapshots } = await supabaseAdmin
    .from('follower_snapshots')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (!existingSnapshots) {
    const counts = await fetchFollowerCounts(token, findFollowerDateRange(90))
    if (counts.length) {
      const { error } = await supabaseAdmin.from('follower_snapshots').upsert(
        counts.map((c) => ({
          user_id: user.id,
          snapshot_date: c.snapshot_date,
          follower_count: c.follower_count,
          source: scopes?.includes('r_member_profileAnalytics') ? 'creator_api' : 'public_fallback',
        })),
        { onConflict: 'user_id,snapshot_date' }
      )
      if (!error) followersBackfilled = counts.length
    }
  }

  const total = posts?.length ?? 0
  const message =
    total === 0
      ? 'No published posts with LinkedIn IDs found.'
      : failed > 0
        ? `Synced ${synced} of ${total} posts (${failed} failed — LinkedIn may have rejected those URNs)`
        : `Synced ${synced} of ${total} posts`

  return NextResponse.json({
    synced,
    failed,
    total,
    followersBackfilled,
    message,
    ...(usedFallback && {
      warning: 'Impression data unavailable — reconnect LinkedIn to grant full analytics access.',
    }),
  })
}
