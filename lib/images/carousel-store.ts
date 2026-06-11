import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderCarousel } from './render-carousel'
import type { CarouselSlide } from '@/lib/supabase'
import type { Theme } from './presets'
import type { CardBrand } from './render-card'

const BUCKET = 'post-images'

/** Render the carousel and upload the slide PNGs + the stitched PDF to storage. */
export async function renderAndStoreCarousel(
  userId: string,
  carouselId: string,
  slides: CarouselSlide[],
  theme: Theme,
  brand: CardBrand,
): Promise<{ pngUrls: string[]; pdfUrl: string }> {
  const { pngBuffers, pdfBuffer } = await renderCarousel(slides, theme, brand)
  const base = `${userId}/carousel-${carouselId}`

  const pngUrls: string[] = []
  for (let i = 0; i < pngBuffers.length; i++) {
    const path = `${base}/slide-${i}.png`
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, pngBuffers[i], { contentType: 'image/png', upsert: true })
    if (!error) pngUrls.push(supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
  }

  const pdfPath = `${base}/carousel.pdf`
  await supabaseAdmin.storage.from(BUCKET).upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })
  const pdfUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(pdfPath).data.publicUrl

  return { pngUrls, pdfUrl }
}

/** The user's default brand kit + display identity, for branding slides. */
export async function getDefaultBrand(userId: string): Promise<CardBrand> {
  const [{ data: kit }, { data: profile }] = await Promise.all([
    supabaseAdmin.from('brand_kits').select('primary_color, accent_color, logo_url').eq('user_id', userId).eq('is_default', true).maybeSingle(),
    supabaseAdmin.from('user_profiles').select('name, role').eq('user_id', userId).maybeSingle(),
  ])
  return {
    accentColor: kit?.accent_color ?? null,
    primaryColor: kit?.primary_color ?? null,
    logoUrl: kit?.logo_url ?? null,
    name: profile?.name ?? null,
    sub: profile?.role ?? null,
  }
}
