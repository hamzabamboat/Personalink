import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: images } = await supabaseAdmin
      .from('post_images')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })

    return NextResponse.json({ images: images || [] })
  } catch (err) {
    console.error('[images GET]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
