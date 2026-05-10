import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { analyseImageForPost } from '@/lib/anthropic'

export const maxDuration = 60

const BUCKET = 'post-images'
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
const MAX_SIZE = 10 * 1024 * 1024
const MAX_FILES = 4

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const files = formData.getAll('files') as File[]
    if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Max ${MAX_FILES} files at once` }, { status: 400 })

    const results = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({ error: `${file.name}: Invalid type. Allowed: JPG, PNG, WebP, HEIC` })
        continue
      }
      if (file.size > MAX_SIZE) {
        results.push({ error: `${file.name}: Too large. Max 10 MB` })
        continue
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: file.type, upsert: false })

      if (uploadError) {
        results.push({ error: `${file.name}: Upload failed — ${uploadError.message}` })
        continue
      }

      const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)

      const { data: imageRow, error: dbError } = await supabaseAdmin
        .from('post_images')
        .insert({
          user_id: user.id,
          storage_path: storagePath,
          public_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single()

      if (dbError || !imageRow) {
        results.push({ error: `${file.name}: DB insert failed` })
        continue
      }

      // Trigger analysis inline (non-blocking — errors don't fail the upload)
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
        .catch(err => console.error('[images/upload] analysis failed', imageRow.id, err))

      results.push({ image: imageRow })
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[images/upload]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
