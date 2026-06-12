import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import sharp from 'sharp'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { craftImagePrompt } from '@/lib/anthropic'
import {
  resolveStylePreset,
  resolveAspectRatio,
  gptImageSize,
  ASPECT_RATIOS,
  clampVariations,
} from '@/lib/images/presets'

export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const BUCKET = 'post-images'
// gpt-image-1 deprecates 2026-10-23; default to 1.5. Override via env if the id changes.
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = profile?.plan || 'starter'
  const limitCheck = await checkLimit(user.id, plan, 'ai_image_generations')
  return NextResponse.json({ remaining: limitCheck.remaining, limit: limitCheck.limit, used: limitCheck.used })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('plan, industry')
      .eq('user_id', user.id)
      .maybeSingle()

    const plan = profile?.plan || 'starter'
    const industry = profile?.industry || 'business'

    const body = await request.json()
    const postContent: string = body.postContent || ''
    const preset = resolveStylePreset(body.stylePreset)

    // This route handles AI photos only. Branded template graphics → /api/images/template.
    if (preset.kind !== 'ai_photo') {
      return NextResponse.json(
        { error: 'Branded graphics are generated via /api/images/template' },
        { status: 400 },
      )
    }

    const ar = resolveAspectRatio(body.aspectRatio)
    const { w, h } = ASPECT_RATIOS[ar]
    const wantVariations = clampVariations(body.variations)
    // High quality is a Pro perk; everyone else gets medium.
    const quality = plan === 'pro' && body.quality === 'high' ? 'high' : 'medium'
    const size = gptImageSize(ar)

    // Gate before doing any paid work.
    const firstCheck = await checkLimit(user.id, plan, 'ai_image_generations')
    if (!firstCheck.allowed) {
      await logViolation(user.id, 'ai_image_generations', plan)
      return NextResponse.json(
        { error: `You've used all ${firstCheck.limit} AI image generations this month. Upgrade to get more.`, limitReached: true },
        { status: 403 },
      )
    }

    // Direct prompt (library "build a stock of visuals" flow) uses the user's words
    // verbatim; otherwise we craft an image prompt from the post content.
    const directPrompt: string = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    const prompt = directPrompt
      ? `${directPrompt}. Aesthetic: ${preset.promptHint}. No text, words, letters, or logos. No identifiable real people.`
      : await craftImagePrompt(postContent, industry, preset.promptHint)

    const images: unknown[] = []
    let remaining = firstCheck.remaining

    // Generate up to `wantVariations`, charging one generation per delivered image
    // and stopping cleanly when the monthly quota is exhausted. Failed renders are
    // never charged (incrementUsage only runs after a successful store).
    for (let i = 0; i < wantVariations; i++) {
      const check = i === 0 ? firstCheck : await checkLimit(user.id, plan, 'ai_image_generations')
      if (!check.allowed) break

      try {
        const response = await openai.images.generate({ model: IMAGE_MODEL, prompt, n: 1, size, quality })
        const b64 = response.data?.[0]?.b64_json
        if (!b64) continue

        // Crop the model's native size to the exact LinkedIn target.
        const buffer = await sharp(Buffer.from(b64, 'base64')).resize(w, h, { fit: 'cover' }).png().toBuffer()

        const storagePath = `${user.id}/ai-${Date.now()}-${i}-${crypto.randomUUID()}.png`
        const { error: uploadError } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(storagePath, buffer, { contentType: 'image/png', upsert: false })
        if (uploadError) continue

        const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)

        const { data: imageRow } = await supabaseAdmin
          .from('post_images')
          .insert({
            user_id: user.id,
            storage_path: storagePath,
            public_url: publicUrl,
            file_name: `ai-generated-${Date.now()}.png`,
            file_size: buffer.length,
            mime_type: 'image/png',
            kind: 'ai_photo',
            template_type: null,
            theme: null,
            aspect_ratio: ar,
            ai_description: `AI image: ${prompt.slice(0, 160)}`,
            // We crafted the prompt, so we already know the image — skip the vision
            // re-analysis cost and mark ready so the grid shows it immediately.
            analysed_at: new Date().toISOString(),
          })
          .select()
          .single()
        if (!imageRow) continue

        await incrementUsage(user.id, 'ai_image_generations')
        images.push(imageRow)
        remaining = Math.max(0, check.remaining - 1)
      } catch (err) {
        console.error('[images/ai-generate] variation', i, err)
        continue
      }
    }

    if (!images.length) {
      return NextResponse.json({ error: 'Image generation failed. You were not charged.' }, { status: 500 })
    }

    // `image` kept for backward-compat with the current single-image UI.
    return NextResponse.json({ images, image: images[0], remaining, prompt })
  } catch (err) {
    console.error('[images/ai-generate]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
