#!/usr/bin/env npx ts-node --project tsconfig.json
/**
 * nuke-and-reset.ts
 *
 * Cancels all active Razorpay + Dodo subscriptions, deletes all app rows,
 * and removes all Supabase Auth users so you can start fresh.
 *
 * Run: npx ts-node --project tsconfig.json scripts/nuke-and-reset.ts
 * Or:  npx tsx scripts/nuke-and-reset.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import Razorpay from 'razorpay'
import DodoPayments from 'dodopayments'
import { createClient } from '@supabase/supabase-js'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY!,
  environment: (process.env.DODO_ENVIRONMENT as 'live_mode' | 'test_mode') ?? 'live_mode',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role bypasses RLS
)

async function cancelRazorpaySubscriptions() {
  console.log('\n── Razorpay subscriptions ──')
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('razorpay_subscription_id, status')
    .not('razorpay_subscription_id', 'is', null)

  if (error) throw error
  if (!subs?.length) { console.log('  None found.'); return }

  for (const sub of subs) {
    const id = sub.razorpay_subscription_id
    console.log(`  Cancelling ${id} (db status: ${sub.status})…`)
    try {
      // cancel_at_cycle_end=0 means cancel immediately
      await razorpay.subscriptions.cancel(id, false)
      console.log(`  ✓ Cancelled ${id}`)
    } catch (err: any) {
      // Already cancelled / completed subscriptions throw an error — safe to ignore
      const msg: string = err?.error?.description ?? err?.message ?? String(err)
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('completed') || msg.toLowerCase().includes('cancelled')) {
        console.log(`  ↷ ${id} already in terminal state, skipping`)
      } else {
        console.warn(`  ✗ Failed to cancel ${id}: ${msg}`)
      }
    }
  }
}

async function cancelDodoSubscriptions() {
  console.log('\n── Dodo subscriptions ──')
  const { data: accts, error } = await supabase
    .from('linkedin_accounts')
    .select('dodo_subscription_id, subscription_status')
    .not('dodo_subscription_id', 'is', null)

  if (error) throw error
  if (!accts?.length) { console.log('  None found.'); return }

  for (const acct of accts) {
    const id = acct.dodo_subscription_id!
    console.log(`  Cancelling ${id} (db status: ${acct.subscription_status})…`)
    try {
      await dodo.subscriptions.update(id, { status: 'cancelled' })
      console.log(`  ✓ Cancelled ${id}`)
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('cancelled')) {
        console.log(`  ↷ ${id} already cancelled, skipping`)
      } else {
        console.warn(`  ✗ Failed to cancel ${id}: ${msg}`)
      }
    }
  }
}

async function truncateAppTables() {
  console.log('\n── Truncating app tables ──')

  // Order matters: children before parents (or use CASCADE)
  const tables = [
    'post_analytics',
    'post_suggestions',
    'image_briefs',
    'linkedin_scores',
    'story_bank',
    'voice_notes',
    'posts',
    'profile_analyses',
    'trends_cache',
    'user_memories',
    'linkedin_accounts',
    'subscriptions',
    'user_profiles',
    'access_codes',
    'usage_tracking',
    'users',
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error && error.code !== '42P01') { // 42P01 = table doesn't exist
      console.warn(`  ✗ ${table}: ${error.message}`)
    } else {
      console.log(`  ✓ cleared ${table}`)
    }
  }
}

async function deleteAuthUsers() {
  console.log('\n── Deleting Supabase Auth users ──')

  let deleted = 0
  let page = 1

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    if (!data.users.length) break

    for (const user of data.users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id)
      if (delErr) {
        console.warn(`  ✗ Failed to delete auth user ${user.email ?? user.id}: ${delErr.message}`)
      } else {
        deleted++
      }
    }

    if (data.users.length < 1000) break
    page++
  }

  console.log(`  ✓ Deleted ${deleted} auth user(s)`)
}

async function main() {
  console.log('=== PERSONALINK NUKE & RESET ===')
  console.log('Target:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('')
  console.log('This will permanently delete ALL data. Press Ctrl+C within 5s to abort.')
  await new Promise(r => setTimeout(r, 5000))

  await cancelRazorpaySubscriptions()
  await cancelDodoSubscriptions()
  await truncateAppTables()
  await deleteAuthUsers()

  console.log('\n✅ Done. Database is clean — you can now onboard as a fresh user.')
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
