import 'server-only'
import crypto from 'crypto'
import { supabaseAdmin } from './supabase-admin'
import { addVoiceSample } from './voice'
import { attachVoiceAnalyzerFingerprint } from './voice-analyzer'

export type EmailUserResult = { userId: string; isNew: boolean }

/**
 * Link-by-email: if a users row already has this email, return it. Otherwise
 * create a new free-tier email-signup user (id is a generated uuid string,
 * matching the text users.id column) with a minimal free user_profiles row and
 * onboarding marked complete (the new funnel skips the 7-step QA flow).
 */
export async function findOrCreateEmailUser(emailRaw: string): Promise<EmailUserResult> {
  const email = emailRaw.trim().toLowerCase()

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) return { userId: existing.id as string, isNew: false }

  const userId = crypto.randomUUID()
  const now = new Date().toISOString()
  const { error: userError } = await supabaseAdmin.from('users').insert({
    id: userId,
    email,
    signup_source: 'email_magic_link',
    subscription_status: 'inactive',
    created_at: now,
    updated_at: now,
  })
  if (userError) throw new Error(`email-auth: user insert failed: ${userError.message}`)

  // Minimal free profile so post generation (which requires a profile) works.
  const { error: profileError } = await supabaseAdmin.from('user_profiles').upsert(
    {
      user_id: userId,
      plan: 'free',
      writing_style: 'conversational',
      tone: 'friendly',
      posts_used_this_month: 0,
      onboarding_completed_at: new Date().toISOString(),
      preferred_days: ['Monday', 'Wednesday', 'Friday'],
      preferred_post_hour: 9,
      timezone: 'Asia/Kolkata',
      refinement_step: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (profileError) console.error('[email-auth] profile upsert failed', profileError)

  return { userId, isNew: true }
}

/**
 * Seed the new account's voice from the analyzer report identified by token:
 *  - fingerprint summary → user_profiles.voice_fingerprint (via existing helper)
 *  - the 3 pasted samples → voice_samples corpus (source 'analyzer')
 * Safe + non-fatal: errors are swallowed/logged.
 */
export async function seedVoiceFromReport(userId: string, voiceReportToken: string | null, email: string): Promise<void> {
  try {
    // Fingerprint summary + converted_user_id backfill (matches by email).
    await attachVoiceAnalyzerFingerprint({ userId, linkedinEmail: email, cookieEmail: email })

    if (!voiceReportToken) return
    const { data: report } = await supabaseAdmin
      .from('voice_reports')
      .select('samples')
      .eq('token', voiceReportToken)
      .maybeSingle()

    const samples = Array.isArray(report?.samples) ? (report!.samples as unknown[]) : []
    for (const s of samples) {
      if (typeof s === 'string') {
        await addVoiceSample(userId, s, 'analyzer')
      }
    }
  } catch (err) {
    console.error('[email-auth.seedVoiceFromReport]', err)
  }
}
