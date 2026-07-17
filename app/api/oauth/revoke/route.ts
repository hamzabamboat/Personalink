import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { sha256 } from '@/lib/oauth'

export async function POST(request: NextRequest) {
  const ct = request.headers.get('content-type') || ''

  // In-app revoke by row id (requires session/user).
  if (ct.includes('application/json')) {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { id } = await request.json().catch(() => ({}))
    if (!id) return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    await supabaseAdmin
      .from('oauth_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
    return NextResponse.json({ revoked: true })
  }

  // RFC 7009 client-driven revoke by raw token value.
  const form = await request.formData()
  const token = String(form.get('token') || '')
  if (token) {
    const h = sha256(token)
    await supabaseAdmin.from('oauth_tokens').update({ revoked_at: new Date().toISOString() }).or(`access_token.eq.${h},refresh_token.eq.${h}`)
  }
  return new NextResponse(null, { status: 200 }) // RFC 7009: always 200
}
