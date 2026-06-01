/**
 * One-shot diagnostic: dump Hamza's post-scheduling state to understand the
 * "everything scheduled from July 1" bug.
 *
 * Run: npx tsx --env-file=.env.local scripts/debug-hamza-posts.ts
 *
 * Reports:
 *   - user_id and current subscription
 *   - next_billing_date + billing_period
 *   - posts grouped by month of scheduled_at + status
 *   - earliest + latest scheduled post
 *   - source of each post (ai_generated, autopilot-rescheduled, etc)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const HAMZA_EMAIL = 'hamzabamboat@gmail.com'

async function main() {
  // 1. Resolve user
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, email, linkedin_name, created_at')
    .eq('email', HAMZA_EMAIL)
    .maybeSingle()
  if (userErr) throw userErr
  if (!user) { console.log(`No user found for ${HAMZA_EMAIL}`); return }

  console.log(`\n=== USER ===`)
  console.log(`  id:    ${user.id}`)
  console.log(`  name:  ${user.linkedin_name}`)
  console.log(`  email: ${user.email}`)

  // 2. Subscription
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, status, billing_period, next_billing_date, start_date, trial_ends_at, payment_processor, currency, amount, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  console.log(`\n=== SUBSCRIPTIONS (${subs?.length ?? 0}) ===`)
  for (const s of subs ?? []) {
    console.log(`  ${s.status.padEnd(10)} ${s.billing_period ?? '?'.padEnd(7)}  next_billing=${s.next_billing_date ?? '-'}  trial_ends=${s.trial_ends_at ?? '-'}  ${s.payment_processor ?? '-'} ${s.currency ?? ''} ${s.amount ?? ''}`)
  }

  // 3. Posts
  const { data: posts } = await supabase
    .from('posts')
    .select('id, status, scheduled_at, created_at, source, content_pillar, content')
    .eq('user_id', user.id)
    .order('scheduled_at', { ascending: true, nullsFirst: false })

  const list = posts ?? []
  console.log(`\n=== POSTS (${list.length} total) ===`)

  const byStatus = list.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})
  console.log(`  status:`)
  for (const [s, n] of Object.entries(byStatus)) console.log(`    ${s.padEnd(20)} ${n}`)

  const scheduled = list.filter(p => p.scheduled_at)
  if (scheduled.length === 0) { console.log(`\n  no posts have scheduled_at set`); return }

  console.log(`\n  earliest scheduled_at: ${scheduled[0].scheduled_at}`)
  console.log(`  latest scheduled_at:   ${scheduled[scheduled.length - 1].scheduled_at}`)

  // Group by month
  const byMonth: Record<string, number> = {}
  for (const p of scheduled) {
    const ym = p.scheduled_at!.slice(0, 7) // YYYY-MM
    byMonth[ym] = (byMonth[ym] ?? 0) + 1
  }
  console.log(`\n  by month:`)
  for (const [ym, n] of Object.entries(byMonth).sort()) console.log(`    ${ym}  ${'█'.repeat(Math.min(n, 50))} ${n}`)

  // Source breakdown
  const bySource: Record<string, number> = {}
  for (const p of list) {
    bySource[p.source ?? '(null)'] = (bySource[p.source ?? '(null)'] ?? 0) + 1
  }
  console.log(`\n  by source:`)
  for (const [src, n] of Object.entries(bySource)) console.log(`    ${src.padEnd(20)} ${n}`)

  // First 5 + last 5 — include created_at to see when each was inserted
  console.log(`\n  first 5 scheduled (with created_at):`)
  for (const p of scheduled.slice(0, 5)) console.log(`    sched=${p.scheduled_at}  created=${p.created_at}  src=${p.source ?? '-'} id=${p.id.slice(0, 8)}`)
  console.log(`\n  last 5 scheduled (with created_at):`)
  for (const p of scheduled.slice(-5)) console.log(`    sched=${p.scheduled_at}  created=${p.created_at}  src=${p.source ?? '-'} id=${p.id.slice(0, 8)}`)

  // Group by created date
  const byCreatedDate: Record<string, number> = {}
  for (const p of list) {
    const d = p.created_at?.slice(0, 10) ?? '(null)'
    byCreatedDate[d] = (byCreatedDate[d] ?? 0) + 1
  }
  console.log(`\n  by created_at (day):`)
  for (const [d, n] of Object.entries(byCreatedDate).sort()) console.log(`    ${d}  ${n}`)

  // Check user_profile for preferred_post_hour, timezone, plan
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan, posts_limit, preferred_post_hour, preferred_days, timezone, posts_used_this_month, control_preference, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()
  console.log(`\n=== USER PROFILE ===`)
  console.log(`  plan: ${profile?.plan}`)
  console.log(`  posts_limit: ${profile?.posts_limit}`)
  console.log(`  posts_used_this_month: ${profile?.posts_used_this_month}`)
  console.log(`  preferred_post_hour: ${profile?.preferred_post_hour}`)
  console.log(`  preferred_days: ${JSON.stringify(profile?.preferred_days)}`)
  console.log(`  timezone: ${profile?.timezone}`)
  console.log(`  control_preference: ${profile?.control_preference}`)
  console.log(`  profile updated_at: ${profile?.updated_at}`)

  // Check for posts created today (recent generation)
  const todayIso = new Date().toISOString().slice(0, 10)
  const createdToday = list.filter(p => p.created_at?.startsWith(todayIso))
  console.log(`\n  posts created today (${todayIso}): ${createdToday.length}`)

  // Check today's date in JS
  console.log(`\n=== ENV ===`)
  console.log(`  now (UTC): ${new Date().toISOString()}`)
  console.log(`  now (IST): ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`)

  // All posts grouped by created_at day + status (to verify whether an earlier
  // batch existed and got published/deleted before this one was generated)
  const byCreatedDay: Record<string, Record<string, number>> = {}
  for (const p of list) {
    const d = p.created_at?.slice(0, 10) ?? '(null)'
    byCreatedDay[d] ??= {}
    byCreatedDay[d][p.status] = (byCreatedDay[d][p.status] ?? 0) + 1
  }
  console.log(`\n  ALL posts by created_at day × status:`)
  for (const [day, statuses] of Object.entries(byCreatedDay).sort()) {
    console.log(`    ${day}  ${JSON.stringify(statuses)}`)
  }

  // Usage tracking — last 10 rows
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('feature_key, count, period_start, period_end, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)
  console.log(`\n  Last 10 usage_tracking rows (any feature):`)
  for (const u of usage ?? []) console.log(`    ${u.created_at}  feature=${u.feature_key} count=${u.count}  period=${u.period_start}..${u.period_end}`)
}

main().catch(e => { console.error(e); process.exit(1) })
