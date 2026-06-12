import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { extractCarouselSlides } from '@/lib/anthropic'
import { resolveTheme } from '@/lib/images/presets'
import { clampSlideCount } from '@/lib/images/carousel-content'
import { renderAndStoreCarousel, getDefaultBrand } from '@/lib/images/carousel-store'

export const runtime = 'nodejs'
export const maxDuration = 180

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabaseAdmin.from('user_profiles').select('plan').eq('user_id', user.id).maybeSingle()
  const plan = profile?.plan || 'starter'
  const limit = await checkLimit(user.id, plan, 'carousels')
  return NextResponse.json({ remaining: limit.remaining, limit: limit.limit, used: limit.used })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('plan').eq('user_id', user.id).maybeSingle()
    const plan = profile?.plan || 'starter'

    const limitCheck = await checkLimit(user.id, plan, 'carousels')
    if (!limitCheck.allowed) {
      await logViolation(user.id, 'carousels', plan)
      return NextResponse.json(
        { error: `You've used all ${limitCheck.limit} carousels this month. Upgrade for more.`, limitReached: true },
        { status: 403 },
      )
    }

    const body = await request.json()
    const source: string = (body.source || body.postContent || body.topic || '').trim()
    if (!source) return NextResponse.json({ error: 'Add a topic or post to build a carousel from.' }, { status: 400 })
    const theme = resolveTheme(body.theme)
    const slideCount = clampSlideCount(body.slideCount)
    const postId: string | null = body.postId || null

    const slides = await extractCarouselSlides(source, slideCount)
    if (slides.length < 2) {
      return NextResponse.json({ error: 'Could not build a carousel from that — add a bit more detail.' }, { status: 422 })
    }

    // Create the row first so we have an id for the storage path.
    const { data: row } = await supabaseAdmin
      .from('carousels')
      .insert({ user_id: user.id, post_id: postId, theme: theme.id, slides, status: 'rendering' })
      .select()
      .single()
    if (!row) return NextResponse.json({ error: 'Could not start the carousel.' }, { status: 500 })

    const brand = await getDefaultBrand(user.id)
    try {
      const { pngUrls, pdfUrl } = await renderAndStoreCarousel(user.id, row.id, slides, theme, brand)
      const { data: updated } = await supabaseAdmin
        .from('carousels')
        .update({ png_urls: pngUrls, pdf_url: pdfUrl, status: 'ready', updated_at: new Date().toISOString() })
        .eq('id', row.id)
        .select()
        .single()

      await incrementUsage(user.id, 'carousels')
      const after = await checkLimit(user.id, plan, 'carousels')
      return NextResponse.json({ carousel: updated, remaining: after.remaining })
    } catch (renderErr) {
      await supabaseAdmin.from('carousels').update({ status: 'failed' }).eq('id', row.id)
      console.error('[carousels/generate] render', renderErr)
      return NextResponse.json({ error: 'Carousel rendering failed. You were not charged.' }, { status: 500 })
    }
  } catch (err) {
    console.error('[carousels/generate]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
