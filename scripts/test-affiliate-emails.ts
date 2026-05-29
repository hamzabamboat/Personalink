/**
 * One-shot: send all four affiliate emails to a single inbox so you can
 * preview how each one renders. Uses realistic-but-fake data.
 *
 * Run with: npx tsx --env-file=.env.local scripts/test-affiliate-emails.ts [recipient]
 *   - Default recipient: partners@personalink.in
 *   - Override by passing an email as the first CLI arg.
 *
 * Sends, in order:
 *   1. sendAffiliateApplicationAdminAlert      (admin-facing — new application)
 *   2. sendAffiliateApplicationAutoReply       (applicant-facing — submit confirm)
 *   3. sendAffiliateApprovedEmail              (applicant-facing — approval)
 *   4. sendAffiliateRejectedEmail              (applicant-facing — rejection)
 *
 * Safe to run multiple times. Does not touch the DB.
 */

import 'dotenv/config'
import {
  sendAffiliateApplicationAdminAlert,
  sendAffiliateApplicationAutoReply,
  sendAffiliateApprovedEmail,
  sendAffiliateRejectedEmail,
  type AffiliateApplicationRecord,
} from '../lib/email'

const RECIPIENT = process.argv[2] || 'partners@personalink.in'

const fakeRecord: AffiliateApplicationRecord = {
  id: '00000000-0000-0000-0000-000000000001',
  user_id: '00000000-0000-0000-0000-000000000002',
  full_name: 'Test Partner (preview)',
  email: RECIPIENT,
  ref_code: 'testpart042',
  audience_size: '10k–50k',
  audience_description:
    'Indian B2B SaaS founders raising their Series A. They post on LinkedIn between fundraising calls.',
  promotion_channels: ['LinkedIn', 'Newsletter'],
  website_url: 'https://example.com',
  linkedin_url: 'https://linkedin.com/in/example',
  payout_method: 'Razorpay (India)',
  payout_details: { raw: 'upi@razorpay' },
  applied_at: new Date().toISOString(),
}

async function main() {
  console.log(`\n📧  Sending 4 test affiliate emails to: ${RECIPIENT}\n`)

  const calls: Array<[string, () => Promise<unknown>]> = [
    [
      '1/4 Admin alert (new application)',
      () => sendAffiliateApplicationAdminAlert({ ...fakeRecord, email: RECIPIENT }),
    ],
    [
      '2/4 Applicant auto-reply',
      () => sendAffiliateApplicationAutoReply({ to: RECIPIENT, firstName: 'Test' }),
    ],
    [
      '3/4 Approval email',
      () => sendAffiliateApprovedEmail({ to: RECIPIENT, firstName: 'Test', refCode: 'testpart042' }),
    ],
    [
      '4/4 Rejection email',
      () =>
        sendAffiliateRejectedEmail({
          to: RECIPIENT,
          firstName: 'Test',
          reason:
            "Audience focus doesn't match our current bar (this is a test preview — please ignore).",
        }),
    ],
  ]

  let success = 0
  let failure = 0
  for (const [label, fn] of calls) {
    process.stdout.write(`  · ${label} … `)
    try {
      const res = (await fn()) as { data?: { id?: string }; error?: unknown }
      if (res?.error) {
        console.log(`❌  ${JSON.stringify(res.error)}`)
        failure++
      } else {
        console.log(`✓  ${res?.data?.id ?? 'sent'}`)
        success++
      }
    } catch (err) {
      console.log(`❌  ${err instanceof Error ? err.message : String(err)}`)
      failure++
    }
    // Resend allows 2 req/sec — sleep 600ms between sends to stay safely under.
    await new Promise(r => setTimeout(r, 600))
  }

  console.log(`\n${success}/${calls.length} sent · ${failure} failed\n`)
  process.exit(failure > 0 ? 1 : 0)
}

main()
