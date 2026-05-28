/**
 * Daily sweep: revert users whose access-code grant has expired.
 *
 * A user qualifies if:
 *   - plan_expires_at IS NOT NULL
 *   - plan_expires_at < now()
 *   - subscription_status = 'access_code'   (don't touch real paying customers)
 *
 * On expiry we set plan='free', posts_limit=3, voice_fingerprint_limit=1,
 * plan_expires_at=NULL, and demote subscription_status to 'inactive' so the
 * user falls back into the free-tier funnel. linkedin_accounts mirror is
 * updated too.
 *
 * Scheduled via vercel.json — runs at 02:00 UTC daily.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TIER_LIMITS } from '@/lib/pricing-config'

async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  const freeLimits = TIER_LIMITS.free

  // Find users whose grant has lapsed and who are still on the access_code track.
  const { data: expired, error: selErr } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, plan, plan_expires_at')
    .lt('plan_expires_at', nowIso)
    .not('plan_expires_at', 'is', null)

  if (selErr) {
    console.error('[expire-plans] select failed:', selErr.message)
    return NextResponse.json({ error: selErr.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ expired: 0, note: 'no users due' })
  }

  // Only act on users still tagged as access_code subscribers — don't ever
  // touch a paying customer whose plan_expires_at somehow got populated.
  const userIds = expired.map(e => e.user_id)
  const { data: userRows } = await supabaseAdmin
    .from('users')
    .select('id, email, linkedin_name, subscription_status')
    .in('id', userIds)

  const eligibleIds = (userRows ?? [])
    .filter(u => u.subscription_status === 'access_code')
    .map(u => u.id)

  if (eligibleIds.length === 0) {
    return NextResponse.json({ expired: 0, note: 'no eligible access_code users' })
  }

  // Downgrade in parallel (these are independent updates).
  await Promise.all([
    supabaseAdmin
      .from('user_profiles')
      .update({
        plan: 'free',
        posts_limit: freeLimits.postsPerMonth,
        voice_fingerprint_limit: freeLimits.voiceFingerprints,
        plan_expires_at: null,
        updated_at: nowIso,
      })
      .in('user_id', eligibleIds),
    supabaseAdmin
      .from('users')
      .update({ subscription_status: 'inactive', updated_at: nowIso })
      .in('id', eligibleIds),
    supabaseAdmin
      .from('linkedin_accounts')
      .update({
        plan: 'free',
        posts_limit: freeLimits.postsPerMonth,
        subscription_status: 'inactive',
        updated_at: nowIso,
      })
      .in('user_id', eligibleIds),
  ])

  console.log(`[expire-plans] downgraded ${eligibleIds.length} users to free`)
  return NextResponse.json({
    expired: eligibleIds.length,
    user_ids: eligibleIds,
  })
}

export { handler as GET, handler as POST }
