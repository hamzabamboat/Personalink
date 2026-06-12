import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: kit } = await supabaseAdmin
    .from('brand_kits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle()

  return NextResponse.json({ kit: kit ?? null })
}

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('primary_color' in body) patch.primary_color = body.primary_color || null
  if ('accent_color' in body) patch.accent_color = body.accent_color || null
  if ('font_family' in body) patch.font_family = body.font_family || null

  const { data: existing } = await supabaseAdmin
    .from('brand_kits')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle()

  if (existing) {
    const { data } = await supabaseAdmin.from('brand_kits').update(patch).eq('id', existing.id).select().single()
    return NextResponse.json({ kit: data })
  }

  const { data } = await supabaseAdmin
    .from('brand_kits')
    .insert({ user_id: user.id, is_default: true, ...patch })
    .select()
    .single()
  return NextResponse.json({ kit: data })
}
