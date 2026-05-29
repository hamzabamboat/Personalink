import 'server-only'
import crypto from 'crypto'
import { supabaseAdmin } from './supabase-admin'

const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes
const EMAIL_RATE_WINDOW_MS = 10 * 60 * 1000 // max 3 requests / email / 10 min
const EMAIL_RATE_MAX = 3

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** True when the email has requested too many links recently. */
export async function isEmailRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - EMAIL_RATE_WINDOW_MS).toISOString()
  const { count } = await supabaseAdmin
    .from('magic_link_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since)
  return (count ?? 0) >= EMAIL_RATE_MAX
}

/** Create a single-use token row, return the RAW token (emailed, never stored). */
export async function createMagicLinkToken(opts: {
  email: string
  voiceReportToken?: string | null
}): Promise<string> {
  const token = generateToken()
  await supabaseAdmin.from('magic_link_tokens').insert({
    token_hash: hashToken(token),
    email: opts.email,
    voice_report_token: opts.voiceReportToken ?? null,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  })
  return token
}

export type VerifiedToken = {
  email: string
  voiceReportToken: string | null
}

/**
 * Validate + consume a token. Returns the payload on success, or null when the
 * token is unknown, expired, or already used. Marks used_at atomically-enough
 * for our scale (single service client, low contention).
 */
export async function consumeMagicLinkToken(rawToken: string): Promise<VerifiedToken | null> {
  if (!/^[0-9a-f]{64}$/.test(rawToken)) return null
  const tokenHash = hashToken(rawToken)

  const { data: row } = await supabaseAdmin
    .from('magic_link_tokens')
    .select('id, email, voice_report_token, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!row) return null
  if (row.used_at) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null

  // Mark used; only succeeds if still unused (guards against double-spend races).
  const { data: updated } = await supabaseAdmin
    .from('magic_link_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle()
  if (!updated) return null

  return { email: row.email as string, voiceReportToken: (row.voice_report_token as string | null) ?? null }
}
