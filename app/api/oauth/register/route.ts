import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateToken } from '@/lib/oauth'
import { checkIpRateLimit } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkIpRateLimit(ip)
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

  const body = await request.json().catch(() => null)
  const redirectUris: unknown = body?.redirect_uris
  const uriOk = (u: unknown): u is string =>
    typeof u === 'string' && u.length <= 2000 &&
    (/^https:\/\//.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(u))
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 10 || !redirectUris.every(uriOk)) {
    return NextResponse.json({ error: 'invalid_redirect_uri' }, { status: 400 })
  }

  const clientId = `plc_${generateToken()}`
  const { error } = await supabaseAdmin.from('oauth_clients').insert({
    client_id: clientId,
    client_secret: null, // public PKCE client
    client_name: typeof body?.client_name === 'string' ? body.client_name.slice(0, 200) : null,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_method: 'none',
  })
  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 })

  // RFC 7591 registration response.
  return NextResponse.json(
    {
      client_id: clientId,
      client_name: typeof body?.client_name === 'string' ? body.client_name : undefined,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_method: 'none',
    },
    { status: 201 },
  )
}
