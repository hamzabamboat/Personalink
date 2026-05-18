import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('zapier_api_key')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const key = profile?.zapier_api_key as string | null | undefined
  return NextResponse.json({
    hasKey: !!key,
    // Only expose last 6 chars so user can identify which key is active
    keyPreview: key ? `plk_...${key.slice(-6)}` : null,
  })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const newKey = `plk_${randomBytes(24).toString('hex')}`

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ zapier_api_key: newKey })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return full key once — user must copy it now
  return NextResponse.json({ key: newKey })
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabaseAdmin
    .from('user_profiles')
    .update({ zapier_api_key: null })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ revoked: true })
}
