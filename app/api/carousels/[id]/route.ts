import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveTheme } from '@/lib/images/presets'
import { renderAndStoreCarousel, getDefaultBrand } from '@/lib/images/carousel-store'
import type { CarouselSlide } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 180

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: carousel } = await supabaseAdmin
    .from('carousels')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!carousel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ carousel })
}

// Edit slides and/or theme, then re-render. Does not consume quota (it's an edit).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing } = await supabaseAdmin
      .from('carousels')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const slides: CarouselSlide[] = Array.isArray(body.slides) ? body.slides : existing.slides
    const theme = resolveTheme(body.theme || existing.theme)
    if (!slides || slides.length < 2) return NextResponse.json({ error: 'A carousel needs at least 2 slides.' }, { status: 422 })

    const brand = await getDefaultBrand(user.id)
    const { pngUrls, pdfUrl } = await renderAndStoreCarousel(user.id, id, slides, theme, brand)

    const { data: updated } = await supabaseAdmin
      .from('carousels')
      .update({ slides, theme: theme.id, png_urls: pngUrls, pdf_url: pdfUrl, status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return NextResponse.json({ carousel: updated })
  } catch (err) {
    console.error('[carousels/[id]] PATCH', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
