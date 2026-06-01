/**
 * One-shot: bulk-reschedule Hamza's 15 stale posts (all scheduled July 1+)
 * through the NEW buildOptimalSlots scheduler so they land in the next 15
 * days from today instead. Preserves the AI-generated content.
 *
 * Run: npx tsx --env-file=.env.local scripts/reschedule-hamza-posts.ts
 *
 * Safety:
 *   - Writes a JSON backup of the original (id, scheduled_at) to scripts/_backup-*.json
 *     before any DB update. Re-running won't double-apply because the new
 *     dates land in May/June and won't match the original July+ pattern.
 *   - Targets only status='scheduled' posts for the named user; other rows
 *     are left untouched.
 *   - On any per-post UPDATE failure, logs and continues with the rest.
 *
 * What this script does NOT do:
 *   - Touch user_profiles.posts_used_this_month (quota counter)
 *   - Re-trigger emails, Google Calendar sync, or LinkedIn scheduling
 *     (the publish cron picks up the new scheduled_at on its next tick)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

import { buildOptimalSlots } from '../lib/linkedin-schedule'
import { getTierLimits, type TierID } from '../lib/pricing-config'

const HAMZA_EMAIL = process.argv[2] || 'hamzabamboat@gmail.com'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. User
  const { data: user } = await supabase
    .from('users')
    .select('id, linkedin_name')
    .eq('email', HAMZA_EMAIL)
    .maybeSingle()
  if (!user) {
    console.error(`No user found for ${HAMZA_EMAIL}`)
    process.exit(1)
  }
  console.log(`\nUser: ${user.linkedin_name} (${user.id})`)

  // 2. Profile (preferred days/hour, timezone, plan)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan, preferred_post_hour, preferred_days, timezone, content_pillars')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile) {
    console.error('No user_profile row — cannot determine preferred slots.')
    process.exit(1)
  }

  // 3. Subscription period (Hamza currently has no subscription row, but
  //    keep the lookup so the script also works for paying users).
  let periodEndDate: Date | undefined
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('next_billing_date, billing_period, status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle()
  if (sub?.next_billing_date) {
    const nextBilling = new Date(sub.next_billing_date)
    const daysUntilRenewal = (nextBilling.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    const isAnnual = sub.billing_period === 'annual' || daysUntilRenewal > 60
    if (!isAnnual && daysUntilRenewal > 0) periodEndDate = nextBilling
  }

  // 4. Scheduled posts (sorted by current scheduled_at so the relative
  //    ordering carries into the new slots — earliest old post → earliest new slot).
  const { data: posts } = await supabase
    .from('posts')
    .select('id, scheduled_at, status, content_pillar')
    .eq('user_id', user.id)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true })

  if (!posts?.length) {
    console.log('No scheduled posts to reschedule.')
    return
  }

  console.log(`Found ${posts.length} scheduled posts`)
  console.log(`  earliest: ${posts[0].scheduled_at}`)
  console.log(`  latest:   ${posts[posts.length - 1].scheduled_at}`)

  // 5. Backup BEFORE any write.
  const backupPath = path.resolve(
    process.cwd(),
    `scripts/_backup-${user.id.slice(0, 8)}-${Date.now()}.json`,
  )
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      posts.map(p => ({ id: p.id, scheduled_at: p.scheduled_at })),
      null,
      2,
    ),
  )
  console.log(`\nBackup written: ${backupPath}`)

  // 6. Compute new slots via the fixed scheduler.
  const planMonthlyLimit = getTierLimits(profile.plan as TierID).postsPerMonth ?? 50
  const now = new Date()
  const slots = buildOptimalSlots({
    now,
    count: posts.length,
    planMonthlyLimit,
    timezone: (profile.timezone as string) || 'Asia/Kolkata',
    pillars: (profile.content_pillars as string[]) ?? [],
    takenDateStrings: new Set(),
    userPreferredDays: (profile.preferred_days as string[]) ?? [],
    userPreferredHour: (profile.preferred_post_hour as number) ?? 9,
    periodEndDate,
  })

  if (slots.length === 0) {
    console.error('Scheduler returned 0 slots — aborting.')
    process.exit(1)
  }
  if (slots.length < posts.length) {
    console.warn(
      `Scheduler returned ${slots.length} slots for ${posts.length} posts. ` +
      `Will update the first ${slots.length} only.`,
    )
  }

  // 7. Print plan then apply.
  console.log(`\nReschedule plan (plan=${profile.plan} limit=${planMonthlyLimit}, window auto-derived):`)
  for (let i = 0; i < Math.min(posts.length, slots.length); i++) {
    console.log(`  ${posts[i].id.slice(0, 8)}  ${posts[i].scheduled_at?.slice(0, 16)}  →  ${slots[i].toISOString().slice(0, 16)}`)
  }

  let okCount = 0
  let failCount = 0
  for (let i = 0; i < Math.min(posts.length, slots.length); i++) {
    const { error } = await supabase
      .from('posts')
      .update({ scheduled_at: slots[i].toISOString() })
      .eq('id', posts[i].id)
    if (error) {
      console.error(`  ✗ ${posts[i].id.slice(0, 8)}: ${error.message}`)
      failCount++
    } else {
      okCount++
    }
  }

  console.log(`\n${okCount} updated · ${failCount} failed`)
  console.log(`Restore (if needed): npx tsx --env-file=.env.local scripts/restore-from-backup.ts ${backupPath}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
