// Public, no-auth unsubscribe link sent in every lead-drip email.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || ''
  if (!token) return new NextResponse('Missing token', { status: 400 })

  const { data: updated, error } = await supabaseAdmin
    .from('leads')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .is('unsubscribed_at', null)
    .select('email')
    .maybeSingle()

  if (error) console.error('[leads/unsubscribe] update failed', error)

  const message = updated
    ? 'You have been unsubscribed. You will not receive further emails from this list.'
    : 'This unsubscribe link is invalid or has already been used.'

  return new NextResponse(
    `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#0f172a">
      <p style="font-size:15px;line-height:1.6">${message}</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}
