import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit, incrementUsage } from '@/lib/usage-limits'
import { extractCardContent } from '@/lib/anthropic'
import { renderCardToBuffer, type CardBrand } from '@/lib/images/render-card'
import { resolveTheme, resolveAspectRatio, type TemplateType } from '@/lib/images/presets'

export const runtime = 'nodejs'
export const maxDuration = 300

const BUCKET = 'post-images'
const VALID: TemplateType[] = ['quote', 'stat', 'title', 'list', 'myth']
const MAX_POSTS = 15

// Bulk = "put a branded graphic on every post that doesn't have one." Uses the
// cheap, unlimited template path (not AI photos), so it's affordable to be generous.
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

    const body = await request.json().catch(() => ({}))
    const type: TemplateType = VALID.includes(body.templateType) ? body.templateType : 'quote'
    const theme = resolveTheme(body.theme)
    const ar = resolveAspectRatio(body.aspectRatio)

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

    // Eligible: still in the pipeline and has no image yet.
    const { data: posts } = await supabaseAdmin
      .from('posts')
      .select('id, content, image_urls')
      .eq('user_id', user.id)
      .in('status', ['draft', 'pending_approval', 'approved', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(MAX_POSTS)

    const eligible = (posts ?? []).filter(p => !p.image_urls || p.image_urls.length === 0)

    let generated = 0
    let stoppedForQuota = false

    for (const post of eligible) {
      const check = await checkLimit(user.id, plan, 'template_graphics')
      if (!check.allowed) { stoppedForQuota = true; break }

      const content = await extractCardContent(post.content || '', type)
      if (!content) continue

      let buffer: Buffer
      try { buffer = await renderCardToBuffer(content, theme, brand, ar) } catch { continue }

      const storagePath = `${user.id}/card-${Date.now()}-${crypto.randomUUID()}.png`
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: 'image/png', upsert: false })
      if (upErr) continue

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
        .select('id')
        .single()
      if (!imageRow) continue

      await supabaseAdmin.from('posts').update({ image_urls: [publicUrl] }).eq('id', post.id)
      await incrementUsage(user.id, 'template_graphics')
      generated++
    }

    const after = await checkLimit(user.id, plan, 'template_graphics')
    return NextResponse.json({ generated, eligible: eligible.length, stoppedForQuota, remaining: after.remaining })
  } catch (err) {
    console.error('[images/bulk]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
