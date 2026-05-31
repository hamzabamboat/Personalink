// Vercel cron — every 6h. Snapshots published posts (latest + velocity row)
// and writes daily follower_snapshots + profile_analytics for all connected
// users, so capture is consistent across users (not on-click).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isTokenExpired } from '@/lib/linkedin-api'
import {
  capturePostSnapshot,
  fetchFollowerCounts,
  LINKEDIN_API_VERSION,
} from '@/lib/linkedin-analytics'
import crypto from 'crypto'

export const maxDuration = 300

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Idempotency per 6h tick: include the hour in job_name so the daily lock
  // pattern (UNIQUE job_name, run_date) allows 4 runs/day but still blocks a
  // duplicate within the same tick. run_date stays a real DATE column value.
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const hourStr = String(now.getUTCHours()).padStart(2, '0') // HH
  const lockJobName = `sync-analytics-${hourStr}`
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: lockJobName, run_date: todayStr, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_this_tick' })

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, linkedin_access_token, linkedin_token_expires_at, linkedin_scopes')
    .not('linkedin_access_token', 'is', null)

  let postsSnapshotted = 0
  let usersProcessed = 0
  let followerRows = 0
  let profileRows = 0

  for (const u of users ?? []) {
    if (!u.linkedin_access_token || isTokenExpired(u.linkedin_token_expires_at)) continue
    usersProcessed++
    const token = u.linkedin_access_token as string
    const scopes = u.linkedin_scopes as string[] | null
    const hasProfileScope = !!scopes?.includes('r_member_profileAnalytics')

    // 1) Snapshot this user's published posts (cap at 50/user/tick — rate limits).
    const { data: posts } = await supabaseAdmin
      .from('posts')
      .select('id, linkedin_post_id, published_at')
      .eq('user_id', u.id)
      .eq('status', 'published')
      .not('linkedin_post_id', 'is', null)
      .limit(50)

    for (const post of posts ?? []) {
      try {
        await capturePostSnapshot({
          db: supabaseAdmin,
          token,
          scopes,
          postId: post.id,
          userId: u.id as string,
          urn: post.linkedin_post_id as string,
          publishedAt: post.published_at as string | null,
        })
        postsSnapshotted++
      } catch {
        /* skip this post; continue the tick */
      }
    }

    // 2) Today's follower snapshot (lifetime count → today's date).
    try {
      const counts = await fetchFollowerCounts(token)
      const today = counts[counts.length - 1]
      if (today) {
        const { error } = await supabaseAdmin.from('follower_snapshots').upsert(
          {
            user_id: u.id,
            snapshot_date: todayStr,
            follower_count: today.follower_count,
            source: hasProfileScope ? 'creator_api' : 'public_fallback',
          },
          { onConflict: 'user_id,snapshot_date' }
        )
        if (!error) followerRows++
      }
    } catch {
      /* follower fetch failed; continue */
    }

    // 3) Today's profile authority snapshot (creator_api only — no fallback).
    if (hasProfileScope) {
      try {
        const res = await fetch(
          'https://api.linkedin.com/rest/memberProfileAnalytics?q=me',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Linkedin-Version': LINKEDIN_API_VERSION,
              'X-Restli-Protocol-Version': '2.0.0',
            },
          }
        )
        if (res.ok) {
          const json = (await res.json()) as {
            elements?: Array<{ profileViews?: number; searchAppearances?: number }>
          }
          const el = json.elements?.[0]
          if (el) {
            const { error } = await supabaseAdmin.from('profile_analytics').upsert(
              {
                user_id: u.id,
                snapshot_date: todayStr,
                profile_views: el.profileViews ?? null,
                search_appearances: el.searchAppearances ?? null,
                source: 'creator_api',
              },
              { onConflict: 'user_id,snapshot_date' }
            )
            if (!error) profileRows++
          }
        }
      } catch {
        /* profile fetch failed; continue */
      }
    }
  }

  await supabaseAdmin
    .from('cron_locks')
    .update({ completed_at: new Date().toISOString() })
    .eq('lock_id', lockId)

  return NextResponse.json({
    usersProcessed,
    postsSnapshotted,
    followerRows,
    profileRows,
    total: users?.length ?? 0,
  })
}

export { handler as GET, handler as POST }
