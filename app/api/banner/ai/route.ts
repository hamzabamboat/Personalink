import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import sharp from 'sharp'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'

export const runtime = 'nodejs'
export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const BUCKET = 'post-images'
// gpt-image-1 deprecates 2026-10-23; default to 1.5. Override via env if the id changes.
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5'

// LinkedIn's recommended profile-banner dimensions. gpt-image can't render 4:1
// natively (widest native is 1536×1024), so we generate landscape and crop a
// centre band to this exact target.
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
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()

    const plan = profile?.plan || 'starter'

    const body = await request.json()
    const brief = (typeof body.brief === 'string' ? body.brief : '').trim().slice(0, 1200)
    if (!brief) return NextResponse.json({ error: 'Missing banner brief' }, { status: 400 })

    // Gate before doing any paid work.
    const check = await checkLimit(user.id, plan, 'ai_banner_generations')
    if (!check.allowed) {
      await logViolation(user.id, 'ai_banner_generations', plan)
      return NextResponse.json(
        { error: `You've used all ${check.limit} AI banner generations this month. Upgrade to get more.`, limitReached: true },
        { status: 403 },
      )
    }

    // Wrap the AI-written brief so the centre-band crop survives: force a wide,
    // vertically-centred composition with headroom, and forbid text/faces.
    const prompt =
      `Wide horizontal LinkedIn profile banner background. ${brief}. ` +
      `Composition: cinematic ultra-wide letterbox framing, key visual elements centred in the middle horizontal band, ` +
      `with generous empty headroom above and footer space below so the image survives a 4:1 crop. ` +
      `No text, words, letters, numbers, logos, or watermarks. No identifiable real people or faces. ` +
      `Polished, modern and professional — suitable as a LinkedIn profile background.`

    // High quality is a Pro perk; everyone else gets medium.
    const quality = plan === 'pro' ? 'high' : 'medium'

    let buffer: Buffer
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

      // Crop the landscape render to the exact LinkedIn banner shape.
      buffer = await sharp(Buffer.from(b64, 'base64'))
        .resize(BANNER_W, BANNER_H, { fit: 'cover' })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 90 })
        .toBuffer()
    } catch (err) {
      console.error('[banner/ai] generate', err)
      return NextResponse.json({ error: 'Image generation failed. You were not charged.' }, { status: 500 })
    }

    const path = `${user.id}/banner/ai-banner-${Date.now()}.jpg`
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
    if (uploadError) return NextResponse.json({ error: 'Storage upload failed. You were not charged.' }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

    // Mirror the banner into the image library so it's reusable. We crafted the
    // prompt, so the image is already "known" — mark analysed so the grid shows
    // it immediately. Best-effort: a failed insert must not block delivery or
    // cause a double-charge.
    const { error: libError } = await supabaseAdmin.from('post_images').insert({
      user_id: user.id,
      storage_path: path,
      public_url: publicUrl,
      file_name: `ai-banner-${Date.now()}.jpg`,
      file_size: buffer.length,
      mime_type: 'image/jpeg',
      kind: 'ai_photo',
      template_type: null,
      theme: null,
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
