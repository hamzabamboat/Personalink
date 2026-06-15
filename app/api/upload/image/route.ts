import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'
import { analyseImageForPost } from '@/lib/anthropic'

export const maxDuration = 30

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = profile?.plan || 'starter'

  // Per-user hourly rate limit for uploads
  const rl = await checkRateLimit(user.id, 'image_uploads')
  if (!rl.allowed) return NextResponse.json({ error: `Too many uploads this hour (limit: ${rl.limit}). Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.` }, { status: 429 })

  // Check image_uploads limit
  const uploadCheck = await checkLimit(user.id, plan, 'image_uploads')
  if (!uploadCheck.allowed) {
    await logViolation(user.id, 'image_uploads', plan)
    return NextResponse.json({
      error: `You've reached your image upload limit (${uploadCheck.limit}/month). Upgrade to upload more.`,
      feature: 'image_uploads',
      used: uploadCheck.used,
      limit: uploadCheck.limit,
      plan,
    }, { status: 429 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Max 5 MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from('post-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
  }

  await Promise.all([
    incrementUsage(user.id, 'image_uploads'),
    incrementRateLimit(user.id, 'image_uploads'),
  ])

  const { data: { publicUrl } } = supabaseAdmin.storage.from('post-images').getPublicUrl(fileName)

  // Also catalogue this upload in the image library (post_images) so it shows up
  // in the image selector for reuse — mirrors /api/images/upload. Non-fatal: a
  // failure here must never break the inline attach, which only needs the URL.
  try {
    const { data: imageRow } = await supabaseAdmin
      .from('post_images')
      .insert({
        user_id: user.id,
        storage_path: fileName,
        public_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single()
    if (imageRow) {
      analyseImageForPost(buffer.toString('base64'), file.type)
        .then(analysis =>
          supabaseAdmin.from('post_images').update({
            ai_description: analysis.description,
            ai_mood: analysis.mood,
            ai_topics: analysis.topics,
            ai_text_detected: analysis.text_detected,
            ai_post_hooks: analysis.post_hooks,
            ai_content_pillars: analysis.content_pillars,
            analysed_at: new Date().toISOString(),
          }).eq('id', imageRow.id)
        )
        .catch(err => console.error('[upload/image] analysis failed', imageRow.id, err))
    }
  } catch (err) {
    console.error('[upload/image] library catalogue failed (non-fatal)', err)
  }

  return NextResponse.json({ url: publicUrl, path: fileName })
}
