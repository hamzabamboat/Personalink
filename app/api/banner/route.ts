import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderBannerToBuffer, type BannerContent } from '@/lib/images/render-banner'
import { resolveTheme } from '@/lib/images/presets'
import type { CardBrand } from '@/lib/images/render-card'

export const runtime = 'nodejs'
export const maxDuration = 60
const BUCKET = 'post-images'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    // Profile defaults for any blank field.
    const { data: profile } = await supabaseAdmin.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
    const p = (profile ?? {}) as Record<string, unknown>

    const name = String(body.name || p.name || 'Your Name').slice(0, 60)
    const designation = String(body.designation ?? p.role ?? p.job_title ?? '').slice(0, 80)
    const tagline = String(body.tagline ?? '').slice(0, 140)
    const rawKeywords = Array.isArray(body.keywords) && body.keywords.length
      ? body.keywords
      : (Array.isArray(p.content_pillars) ? p.content_pillars : Array.isArray(p.topics) ? p.topics : [])
    const keywords = (rawKeywords as unknown[]).map(k => String(k).slice(0, 24)).filter(Boolean).slice(0, 4)

    const theme = resolveTheme(body.theme)

    const { data: kit } = await supabaseAdmin
      .from('brand_kits')
      .select('primary_color, accent_color, logo_url')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle()
    const brand: CardBrand = {
      accentColor: kit?.accent_color ?? null,
      primaryColor: kit?.primary_color ?? null,
      logoUrl: kit?.logo_url ?? null,
      name: null,
      sub: null,
    }

    const content: BannerContent = { name, designation, tagline, keywords }
    const buffer = await renderBannerToBuffer(content, theme, brand)

    const path = `${user.id}/banner/banner-${Date.now()}.png`
    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, { contentType: 'image/png', upsert: true })
    if (uploadError) return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[banner]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
