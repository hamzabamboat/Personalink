import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import sharp from 'sharp'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { renderBannerToBuffer, type BannerContent } from '@/lib/images/render-banner'
import { resolveTheme } from '@/lib/images/presets'
import type { CardBrand } from '@/lib/images/render-card'

export const runtime = 'nodejs'
export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const BUCKET = 'post-images'
// gpt-image-1 deprecates 2026-10-23; default to 1.5. Override via env if the id changes.
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5'

// LinkedIn personal banner is 1584×396. We render the identity layer at 2× for a
// crisp download; the AI background is soft minimalist art, so a 2× upscale is fine.
const BANNER_W = 1584
const BANNER_H = 396

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = profile?.plan || 'starter'
  const limitCheck = await checkLimit(user.id, plan, 'ai_banner_generations')
  return NextResponse.json({ remaining: limitCheck.remaining, limit: limitCheck.limit, used: limitCheck.used })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    const p = (profile ?? {}) as Record<string, unknown>
    const plan = String(p.plan || 'starter')

    const body = await request.json()
    const brief = (typeof body.brief === 'string' ? body.brief : '').trim().slice(0, 1200)
    if (!brief) return NextResponse.json({ error: 'Missing banner brief' }, { status: 400 })
    const iconStyle = body.iconStyle === 'filled' ? 'filled' : 'outline'

    // Gate before doing any paid work.
    const check = await checkLimit(user.id, plan, 'ai_banner_generations')
    if (!check.allowed) {
      await logViolation(user.id, 'ai_banner_generations', plan)
      return NextResponse.json(
        { error: `You've used all ${check.limit} AI banner generations this month. Upgrade to get more.`, limitReached: true },
        { status: 403 },
      )
    }

    // Identity + brand, composited in code so text & logo stay crisp and accurate.
    const name = String(body.name || p.name || 'Your Name').slice(0, 60)
    const designation = String(body.designation ?? p.role ?? p.job_title ?? '').slice(0, 80)
    const company = String(body.company ?? p.company ?? '').slice(0, 80)

    const { data: kit } = await supabaseAdmin
      .from('brand_kits')
      .select('primary_color, accent_color, logo_url, font_family')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle()
    const brand: CardBrand = {
      accentColor: kit?.accent_color ?? null,
      primaryColor: kit?.primary_color ?? null,
      logoUrl: kit?.logo_url ?? null,
      fontFamily: kit?.font_family ?? null,
      name: null,
      sub: null,
    }

    // Build the background prompt: a FEW minimalist interest icons, not a scene.
    const brandColours = [kit?.primary_color, kit?.accent_color].filter(Boolean) as string[]
    const colourLine = brandColours.length
      ? `Use this brand colour palette: ${brandColours.join(', ')}, on a calm complementary background.`
      : 'Use a refined, professional, muted colour palette.'
    const styleWord = iconStyle === 'filled'
      ? 'simple solid filled flat icons'
      : 'simple thin outline / line-art icons'
    const prompt =
      `A minimalist, elegant LinkedIn profile banner background. ` +
      `Feature only a few (2–4) ${styleWord} that represent the person's interests and themes from this brief: "${brief}". ` +
      `Flat vector icon aesthetic with generous negative space — tasteful, premium, modern. ` +
      `Absolutely NOT photorealistic: no 3D renders, no detailed scenes, no photos, no people or faces, and no text, letters, numbers, logos or watermarks. ` +
      `${colourLine} ` +
      `Composition: cluster the icons toward the RIGHT side; keep the LEFT third calm, dark and nearly empty so overlaid text stays readable. ` +
      `Render wide with the icons centred in the middle horizontal band so the image survives a 4:1 crop.`

    // High quality is a Pro perk; everyone else gets medium.
    const quality = plan === 'pro' ? 'high' : 'medium'

    let bgDataUri: string
    try {
      const response = await openai.images.generate({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: '1536x1024',
        quality,
      })
      const b64 = response.data?.[0]?.b64_json
      if (!b64) return NextResponse.json({ error: 'Image generation failed. You were not charged.' }, { status: 500 })

      // Crop the landscape render to the banner shape, then hand it to the
      // compositor as a data URI (no extra stored asset, no extra fetch).
      const bgBuffer = await sharp(Buffer.from(b64, 'base64'))
        .resize(BANNER_W, BANNER_H, { fit: 'cover' })
        .jpeg({ quality: 82 })
        .toBuffer()
      bgDataUri = `data:image/jpeg;base64,${bgBuffer.toString('base64')}`
    } catch (err) {
      console.error('[banner/ai] generate', err)
      return NextResponse.json({ error: 'Image generation failed. You were not charged.' }, { status: 500 })
    }

    // Composite the real identity over the AI background. Dark "midnight" theme
    // gives white text + a dark scrim for reliable legibility; brand colours
    // still drive the accent bar & subtitle.
    const content: BannerContent = { name, designation, company, backgroundImageUrl: bgDataUri }
    const theme = resolveTheme(body.theme || 'midnight')
    let finalBuffer: Buffer
    try {
      finalBuffer = await renderBannerToBuffer(content, theme, brand, 2)
    } catch (err) {
      console.error('[banner/ai] composite', err)
      return NextResponse.json({ error: 'Banner composition failed. You were not charged.' }, { status: 500 })
    }

    const path = `${user.id}/banner/ai-banner-${Date.now()}.png`
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, finalBuffer, { contentType: 'image/png', upsert: true })
    if (uploadError) return NextResponse.json({ error: 'Storage upload failed. You were not charged.' }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

    // Mirror into the image library so it's reusable. Best-effort — a failed
    // insert must not block delivery or cause a double-charge.
    const { error: libError } = await supabaseAdmin.from('post_images').insert({
      user_id: user.id,
      storage_path: path,
      public_url: publicUrl,
      file_name: `ai-banner-${Date.now()}.png`,
      file_size: finalBuffer.length,
      mime_type: 'image/png',
      kind: 'ai_photo',
      template_type: null,
      theme: theme.id,
      aspect_ratio: `${BANNER_W}x${BANNER_H}`,
      ai_description: `AI profile banner: ${brief.slice(0, 160)}`,
      analysed_at: new Date().toISOString(),
    })
    if (libError) console.error('[banner/ai] library insert', libError)

    // Only charge after a successful store.
    await incrementUsage(user.id, 'ai_banner_generations')

    return NextResponse.json({ url: publicUrl, remaining: Math.max(0, check.remaining - 1) })
  } catch (err) {
    console.error('[banner/ai]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
