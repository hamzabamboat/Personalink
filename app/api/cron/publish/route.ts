import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { publishToLinkedIn, isTokenExpired } from '@/lib/linkedin-api'
import { logComplianceEvent } from '@/lib/compliance-events'
import { getPostHogClient } from '@/lib/posthog-server'

// Vercel default function timeout is 300s. Pin it explicitly so changes to the
// platform default don't silently break us. With 0–60s jitter + LinkedIn API +
// optional image uploads, posts finish well inside this window.
export const maxDuration = 300

// Max auto-published posts per user per day (cadence protection)
const MAX_AUTOPOSTS_PER_DAY = 2

// Spam score threshold — above this the post must go to manual review
const SPAM_BLOCK_THRESHOLD = 60

// A post stuck in 'publishing' for longer than this is assumed to be the
// fallout of a crashed/timed-out invocation, not a legitimate in-flight call,
// and gets reset to 'scheduled' so this cron tick can retry it. Threshold is
// well above any reasonable publish (jitter + API + image upload).
const STUCK_PUBLISHING_MS = 10 * 60 * 1000

async function countTodayPublished(userId: string): Promise<number> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { count } = await supabaseAdmin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'published')
    .gte('published_at', todayStart.toISOString())

  return count ?? 0
}

// Add a small random delay variance (0–60s) so posts don't fire at the exact
// same second. Must stay well under maxDuration so the function never gets
// killed waiting on the jitter.
function jitterMs(): number {
  return Math.floor(Math.random() * 60 * 1000)
}

async function handler(_request: NextRequest) {
  const now = new Date().toISOString()

  // Self-heal: posts left in 'publishing' from a prior invocation that died
  // mid-flight are stranded forever (the main query only picks up 'scheduled').
  // Reset stale ones so this tick can retry them.
  const stuckCutoff = new Date(Date.now() - STUCK_PUBLISHING_MS).toISOString()
  await supabaseAdmin
    .from('posts')
    .update({ status: 'scheduled', updated_at: now })
    .eq('status', 'publishing')
    .lt('updated_at', stuckCutoff)

  // Step 1: fetch scheduled posts + users (direct FK: posts.user_id → users.id)
  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('*, users(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(20)

  if (error) {
    console.error('Cron query error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ processed: 0, results: [] })
  }

  // Step 2: fetch user_profiles separately (no direct FK from posts → user_profiles)
  const userIds = [...new Set(posts.map((p) => p.user_id as string))]
  const { data: profileRows } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, control_preference, trust_score, risk_score, autopilot_eligible')
    .in('user_id', userIds)

  const profileByUserId = Object.fromEntries(
    (profileRows ?? []).map((p) => [p.user_id, p])
  )

  const results = await Promise.allSettled(
    (posts ?? []).map(async (post) => {
      const user = post.users as {
        linkedin_access_token: string | null
        linkedin_token_expires_at: string | null
        linkedin_id: string
        subscription_status: string | null
      }
      const profile = (profileByUserId[post.user_id as string] ?? null) as {
        control_preference: string | null
        trust_score: number | null
        risk_score: number | null
        autopilot_eligible: boolean | null
      } | null

      // — Subscription check — do not publish for expired/cancelled subscriptions.
      // 'access_code' users are entitled to publish (they activated a comp/gift
      // code via /api/access-codes/apply and the middleware grants them dashboard
      // access on the same basis).
      const activeStatuses = ['active', 'trialing', 'access_code']
      if (!activeStatuses.includes(user.subscription_status ?? '')) {
        return { id: post.id, status: 'skipped', reason: 'inactive_subscription' }
      }

      // — Token check —
      if (!user.linkedin_access_token || isTokenExpired(user.linkedin_token_expires_at)) {
        await supabaseAdmin
          .from('posts')
          .update({ status: 'failed', failure_reason: 'LinkedIn token expired' })
          .eq('id', post.id)
        return { id: post.id, status: 'failed', reason: 'token_expired' }
      }

      // — Unattended-autopilot safety gates —
      // These gates decide whether a post may publish WITHOUT a human in the
      // loop. A human-approved post (approved via the email link or the
      // dashboard, or explicitly scheduled by the user) has already been
      // reviewed, so we skip them — otherwise an explicit approval would be
      // bounced straight back to pending_approval and could never publish.
      if (!post.human_approved) {
        // — Spam score block —
        if ((post.spam_score ?? 0) >= SPAM_BLOCK_THRESHOLD) {
          await supabaseAdmin
            .from('posts')
            .update({ status: 'pending_approval', failure_reason: 'High spam score — manual review required' })
            .eq('id', post.id)
          await logComplianceEvent(post.user_id, 'post_blocked_spam', 'high', {
            spam_score: post.spam_score,
          }, post.id)
          return { id: post.id, status: 'blocked', reason: 'high_spam_score' }
        }

        // — Manual review flag —
        if (post.requires_manual_review) {
          await supabaseAdmin
            .from('posts')
            .update({ status: 'pending_approval', failure_reason: 'Flagged for manual review before publishing' })
            .eq('id', post.id)
          await logComplianceEvent(post.user_id, 'post_flagged_review', 'medium', {
            spam_score: post.spam_score,
            humanity_score: post.humanity_score,
          }, post.id)
          return { id: post.id, status: 'blocked', reason: 'requires_manual_review' }
        }

        // — Autopilot eligibility check —
        if (profile?.control_preference === 'autopilot' && profile?.autopilot_eligible === false) {
          await supabaseAdmin
            .from('posts')
            .update({ status: 'pending_approval', failure_reason: 'Account not yet eligible for autopilot — manual approval needed' })
            .eq('id', post.id)
          await logComplianceEvent(post.user_id, 'autopilot_blocked', 'medium', {
            trust_score: profile.trust_score,
            risk_score: profile.risk_score,
          }, post.id)
          return { id: post.id, status: 'blocked', reason: 'autopilot_not_eligible' }
        }

        // — Trust / risk gate (high risk users blocked from autopilot) —
        if ((profile?.risk_score ?? 0) >= 70) {
          await supabaseAdmin
            .from('posts')
            .update({ status: 'pending_approval', failure_reason: 'Account risk level too high for automatic publishing' })
            .eq('id', post.id)
          await logComplianceEvent(post.user_id, 'autopilot_blocked', 'high', {
            risk_score: profile?.risk_score,
          }, post.id)
          return { id: post.id, status: 'blocked', reason: 'high_risk_account' }
        }

        // — Posting cadence protection: max 2 auto-posts per day —
        const todayCount = await countTodayPublished(post.user_id)
        if (todayCount >= MAX_AUTOPOSTS_PER_DAY) {
          // Reschedule to next day same hour instead of failing
          const nextDay = new Date(post.scheduled_at)
          nextDay.setDate(nextDay.getDate() + 1)
          await supabaseAdmin
            .from('posts')
            .update({ scheduled_at: nextDay.toISOString() })
            .eq('id', post.id)
          return { id: post.id, status: 'rescheduled', reason: 'daily_cadence_limit' }
        }
      }

      await supabaseAdmin
        .from('posts')
        .update({ status: 'publishing', updated_at: new Date().toISOString() })
        .eq('id', post.id)

      // Small time jitter so all posts don't fire at exactly the same second
      await new Promise(res => setTimeout(res, jitterMs()))

      let linkedinPostId: string
      try {
        linkedinPostId = await publishToLinkedIn({
          accessToken: user.linkedin_access_token,
          linkedinId: user.linkedin_id,
          content: post.content,
          imageUrls: post.image_urls || undefined,
        })
      } catch (publishErr) {
        const errMsg = publishErr instanceof Error ? publishErr.message : String(publishErr)
        const codeMatch = errMsg.match(/error (\d{3})/)
        await supabaseAdmin.from('posts').update({ status: 'failed', failure_reason: errMsg, updated_at: new Date().toISOString() }).eq('id', post.id)
        getPostHogClient().capture({
          distinctId: post.user_id,
          event: 'post_publish_failed',
          properties: { post_id: post.id, error_code: codeMatch ? codeMatch[1] : 'unknown', error_message: errMsg },
        })
        return { id: post.id, status: 'failed', reason: errMsg }
      }

      await supabaseAdmin
        .from('posts')
        .update({
          status: 'published',
          linkedin_post_id: linkedinPostId,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)

      getPostHogClient().capture({
        distinctId: post.user_id,
        event: 'post_published',
        properties: { post_id: post.id, linkedin_post_id: linkedinPostId, scheduled_at: post.scheduled_at },
      })

      return { id: post.id, status: 'published' }
    })
  )

  const summary = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { id: posts![i].id, status: 'error', reason: String(r.reason) }
  )

  console.log('Cron publish results:', summary)
  return NextResponse.json({ processed: summary.length, results: summary })
}

export const POST = verifySignatureAppRouter(handler)
