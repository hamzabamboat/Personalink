import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyPkce, generateToken, sha256, ACCESS_TTL_MS, REFRESH_TTL_MS } from '@/lib/oauth'
import { checkIpRateLimit } from '@/lib/rate-limiter'

function err(code: string, status = 400) {
  return NextResponse.json({ error: code }, { status })
}

async function issueTokens(clientId: string, userId: string, scope: string) {
  const accessRaw = generateToken()
  const refreshRaw = generateToken()
  const now = Date.now()
  await supabaseAdmin.from('oauth_tokens').insert({
    access_token: sha256(accessRaw),
    refresh_token: sha256(refreshRaw),
    client_id: clientId,
    user_id: userId,
    scope,
    access_expires_at: new Date(now + ACCESS_TTL_MS).toISOString(),
    refresh_expires_at: new Date(now + REFRESH_TTL_MS).toISOString(),
  })
  return NextResponse.json({
    access_token: accessRaw,
    refresh_token: refreshRaw,
    token_type: 'Bearer',
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    scope,
  })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!(await checkIpRateLimit(ip)).allowed) return err('rate_limited', 429)

  const form = await request.formData()
  const grantType = String(form.get('grant_type') || '')

  if (grantType === 'authorization_code') {
    const code = String(form.get('code') || '')
    const verifier = String(form.get('code_verifier') || '')
    const redirectUri = String(form.get('redirect_uri') || '')
    const clientId = String(form.get('client_id') || '')

    const { data: row } = await supabaseAdmin
      .from('oauth_auth_codes')
      .select('*')
      .eq('code', sha256(code))
      .maybeSingle()

    if (!row || row.consumed_at || row.client_id !== clientId || row.redirect_uri !== redirectUri) return err('invalid_grant')
    if (new Date(row.expires_at as string) < new Date()) return err('invalid_grant')
    if (!verifyPkce(verifier, row.code_challenge as string)) return err('invalid_grant')

    // single-use: atomically consume; a concurrent redemption loses this race
    const { data: consumed } = await supabaseAdmin
      .from('oauth_auth_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('code', sha256(code))
      .is('consumed_at', null)
      .select()
    if (!consumed || consumed.length === 0) return err('invalid_grant')
    return issueTokens(row.client_id as string, row.user_id as string, row.scope as string)
  }

  if (grantType === 'refresh_token') {
    const refresh = String(form.get('refresh_token') || '')
    const { data: row } = await supabaseAdmin
      .from('oauth_tokens')
      .select('*')
      .eq('refresh_token', sha256(refresh))
      .maybeSingle()

    if (!row || row.revoked_at) return err('invalid_grant')
    if (row.refresh_expires_at && new Date(row.refresh_expires_at as string) < new Date()) return err('invalid_grant')

    const clientId = String(form.get('client_id') || '')
    if (row.client_id !== clientId) return err('invalid_grant')

    // rotate atomically: only the first concurrent use wins
    const { data: rotated } = await supabaseAdmin
      .from('oauth_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('revoked_at', null)
      .select()
    if (!rotated || rotated.length === 0) return err('invalid_grant')
    return issueTokens(row.client_id as string, row.user_id as string, row.scope as string)
  }

  return err('unsupported_grant_type')
}
