import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 30

// Logos are a brand asset, not content — they do NOT count against image_uploads.
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 2 * 1024 * 1024

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try { formData = await request.formData() } catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }) }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Use a PNG, JPG, WebP, or SVG logo.' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'Logo too large. Max 2 MB.' }, { status: 400 })

  const ext = file.type === 'image/svg+xml' ? 'svg' : (file.name.split('.').pop()?.toLowerCase() || 'png')
  const path = `${user.id}/brand/logo-${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('post-images')
    .upload(path, buffer, { contentType: file.type, upsert: true })
  if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('post-images').getPublicUrl(path)

  // Target a specific kit when given (multi-client); else the active kit.
  const kitId = (formData.get('kitId') as string | null) || null
  let existing: { id: string } | null = null
  if (kitId) {
    const { data } = await supabaseAdmin.from('brand_kits').select('id').eq('id', kitId).eq('user_id', user.id).maybeSingle()
    existing = data
  }
  if (!existing) {
    const { data } = await supabaseAdmin.from('brand_kits').select('id').eq('user_id', user.id).eq('is_default', true).maybeSingle()
    existing = data
  }

  if (existing) {
    await supabaseAdmin.from('brand_kits').update({ logo_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('brand_kits').insert({ user_id: user.id, is_default: true, name: 'My brand', logo_url: publicUrl })
  }

  return NextResponse.json({ logo_url: publicUrl, kit_id: existing?.id ?? null })
}
