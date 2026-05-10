import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET = 'post-images'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const { data: imageRow } = await supabaseAdmin
      .from('post_images')
      .select('storage_path, user_id')
      .eq('id', id)
      .single()

    if (!imageRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (imageRow.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await supabaseAdmin.storage.from(BUCKET).remove([imageRow.storage_path])
    await supabaseAdmin.from('post_images').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[images DELETE]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
