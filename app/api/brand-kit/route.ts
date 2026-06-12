import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const KIT_COLS = 'id, name, primary_color, accent_color, logo_url, font_family, is_default, created_at'

/** All of a user's brand kits — the active (is_default) one first. */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: kits } = await supabaseAdmin
    .from('brand_kits')
    .select(KIT_COLS)
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  return NextResponse.json({ kits: kits ?? [] })
}

/** Create a new (client) kit. The user's first kit becomes the active one. */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name = (typeof body.name === 'string' && body.name.trim()) ? body.name.trim().slice(0, 60) : 'New kit'

  const { count } = await supabaseAdmin
    .from('brand_kits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const isFirst = (count ?? 0) === 0
  const { data, error } = await supabaseAdmin
    .from('brand_kits')
    .insert({
      user_id: user.id,
      name,
      is_default: isFirst,
      accent_color: body.accent_color || null,
      font_family: body.font_family || null,
    })
    .select(KIT_COLS)
    .single()

  if (error) return NextResponse.json({ error: 'Could not create kit' }, { status: 500 })
  return NextResponse.json({ kit: data })
}

/**
 * Update a kit by id (colour / font / name). Pass makeActive:true to switch the
 * active kit. With no id, falls back to the active kit (back-compat / first save).
 */
export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  // Resolve the target kit id (explicit id, else the active kit).
  let kitId: string | null = typeof body.id === 'string' ? body.id : null
  if (!kitId) {
    const { data: active } = await supabaseAdmin
      .from('brand_kits').select('id').eq('user_id', user.id).eq('is_default', true).maybeSingle()
    kitId = active?.id ?? null
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if ('primary_color' in body) patch.primary_color = body.primary_color || null
  if ('accent_color' in body) patch.accent_color = body.accent_color || null
  if ('font_family' in body) patch.font_family = body.font_family || null
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim().slice(0, 60)

  // No kit yet → create the first one (active) from the patch.
  if (!kitId) {
    const { data } = await supabaseAdmin
      .from('brand_kits')
      .insert({ user_id: user.id, is_default: true, name: (patch.name as string) || 'My brand', ...patch })
      .select(KIT_COLS).single()
    return NextResponse.json({ kit: data })
  }

  // Ownership guard.
  const { data: owned } = await supabaseAdmin
    .from('brand_kits').select('id').eq('id', kitId).eq('user_id', user.id).maybeSingle()
  if (!owned) return NextResponse.json({ error: 'Kit not found' }, { status: 404 })

  if (body.makeActive) {
    // Unset others first (avoids a two-default window that would break maybeSingle), then set this one.
    await supabaseAdmin.from('brand_kits').update({ is_default: false }).eq('user_id', user.id).neq('id', kitId)
    patch.is_default = true
  }

  const { data } = await supabaseAdmin
    .from('brand_kits').update(patch).eq('id', kitId).eq('user_id', user.id).select(KIT_COLS).single()
  return NextResponse.json({ kit: data })
}

/** Delete a kit. Can't delete your only kit; deleting the active one promotes another. */
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const kitId = request.nextUrl.searchParams.get('id')
  if (!kitId) return NextResponse.json({ error: 'Missing kit id' }, { status: 400 })

  const { data: kits } = await supabaseAdmin
    .from('brand_kits').select('id, is_default, created_at').eq('user_id', user.id)
  const list = kits ?? []
  if (list.length <= 1) return NextResponse.json({ error: 'You need at least one brand kit.' }, { status: 400 })
  const target = list.find(k => k.id === kitId)
  if (!target) return NextResponse.json({ error: 'Kit not found' }, { status: 404 })

  await supabaseAdmin.from('brand_kits').delete().eq('id', kitId).eq('user_id', user.id)

  // If we removed the active kit, promote the most-recent remaining one.
  if (target.is_default) {
    const next = list.filter(k => k.id !== kitId).sort((a, b) => (b.created_at > a.created_at ? 1 : -1))[0]
    if (next) await supabaseAdmin.from('brand_kits').update({ is_default: true }).eq('id', next.id)
  }

  return NextResponse.json({ ok: true })
}
