import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { extractCardContent } from '@/lib/anthropic'
import { renderCardToBuffer, type CardBrand } from '@/lib/images/render-card'
import { resolveTheme, resolveAspectRatio, type TemplateType } from '@/lib/images/presets'

export const runtime = 'nodejs'
export const maxDuration = 60

const BUCKET = 'post-images'
const VALID_TYPES: TemplateType[] = ['quote', 'stat', 'title', 'list', 'myth']

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabaseAdmin.from('user_profiles').select('plan').eq('user_id', user.id).maybeSingle()
  const plan = profile?.plan || 'starter'
  const limit = await checkLimit(user.id, plan, 'template_graphics')
  return NextResponse.json({ remaining: limit.remaining, limit: limit.limit, used: limit.used })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('plan, name, role')
      .eq('user_id', user.id)
      .maybeSingle()

    const plan = profile?.plan || 'starter'

    const limitCheck = await checkLimit(user.id, plan, 'template_graphics')
    if (!limitCheck.allowed) {
      await logViolation(user.id, 'template_graphics', plan)
      return NextResponse.json(
        { error: `You've reached this month's branded-graphics limit. Upgrade for more.`, limitReached: true },
        { status: 403 },
      )
    }

    const body = await request.json()
    const type: TemplateType = VALID_TYPES.includes(body.templateType) ? body.templateType : 'quote'
    const theme = resolveTheme(body.theme)
    const ar = resolveAspectRatio(body.aspectRatio)
    const postContent: string = body.postContent || ''

    const content = await extractCardContent(postContent, type)
    if (!content) {
      return NextResponse.json({ error: 'Could not build a card from this post — add more text and retry.' }, { status: 422 })
    }

    // Brand kit: accent colour + logo (background stays themed in v1).
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
      name: profile?.name ?? null,
      sub: profile?.role ?? null,
    }

    const buffer = await renderCardToBuffer(content, theme, brand, ar)

    const storagePath = `${user.id}/card-${Date.now()}-${crypto.randomUUID()}.png`
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: 'image/png', upsert: false })
    if (uploadError) return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)

    const { data: imageRow } = await supabaseAdmin
      .from('post_images')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        public_url: publicUrl,
        file_name: `card-${type}-${Date.now()}.png`,
        file_size: buffer.length,
        mime_type: 'image/png',
        kind: 'template',
        template_type: type,
        theme: theme.id,
        aspect_ratio: ar,
        ai_description: `Branded ${type} card: ${content.headline.slice(0, 120)}`,
        analysed_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (!imageRow) return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })

    await incrementUsage(user.id, 'template_graphics')
    const after = await checkLimit(user.id, plan, 'template_graphics')

    return NextResponse.json({ image: imageRow, remaining: after.remaining })
  } catch (err) {
    console.error('[images/template]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
