import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { analyseImageForPost } from '@/lib/anthropic'

export const maxDuration = 60

const BUCKET = 'post-images'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { imageId } = await request.json()
    if (!imageId) return NextResponse.json({ error: 'imageId required' }, { status: 400 })

    const { data: imageRow } = await supabaseAdmin
      .from('post_images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', user.id)
      .single()

    if (!imageRow) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(imageRow.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Could not fetch image from storage' }, { status: 500 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64Data = buffer.toString('base64')
    const mimeType = imageRow.mime_type || 'image/jpeg'

    const analysis = await analyseImageForPost(base64Data, mimeType)

    const { data: updated } = await supabaseAdmin
      .from('post_images')
      .update({
        ai_description: analysis.description,
        ai_mood: analysis.mood,
        ai_topics: analysis.topics,
        ai_text_detected: analysis.text_detected,
        ai_post_hooks: analysis.post_hooks,
        ai_content_pillars: analysis.content_pillars,
        analysed_at: new Date().toISOString(),
      })
      .eq('id', imageId)
      .select()
      .single()

    return NextResponse.json({ image: updated })
  } catch (err) {
    console.error('[images/analyse]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
