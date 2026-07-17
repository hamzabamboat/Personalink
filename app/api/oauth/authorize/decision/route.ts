import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { getClient, redirectUriAllowed, sanitizeScope, generateToken, sha256, CODE_TTL_MS } from '@/lib/oauth'

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const clientId = String(form.get('client_id') || '')
  const redirectUri = String(form.get('redirect_uri') || '')
  const codeChallenge = String(form.get('code_challenge') || '')
  const state = String(form.get('state') || '')
  const scope = sanitizeScope(String(form.get('scope') || ''))
  const decision = String(form.get('decision') || '')

  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const client = await getClient(clientId)
  if (!client || !redirectUriAllowed(client, redirectUri) || !codeChallenge) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const back = new URL(redirectUri)
  if (state) back.searchParams.set('state', state)

  if (decision !== 'approve') {
    back.searchParams.set('error', 'access_denied')
    return NextResponse.redirect(back.toString(), { status: 302 })
  }

  const rawCode = generateToken()
  const { error } = await supabaseAdmin.from('oauth_auth_codes').insert({
    code: sha256(rawCode),
    client_id: clientId,
    user_id: user.id,
    redirect_uri: redirectUri,
    scope,
    code_challenge: codeChallenge,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  })
  if (error) return NextResponse.json({ error: 'server_error' }, { status: 500 })

  back.searchParams.set('code', rawCode)
  return NextResponse.redirect(back.toString(), { status: 302 })
}
