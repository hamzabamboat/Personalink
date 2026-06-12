import { ImageResponse } from 'next/og'
import { PDFDocument } from 'pdf-lib'
import type { CarouselSlide } from '@/lib/supabase'
import type { Theme } from './presets'
import type { CardBrand } from './render-card'
import { loadBrandFont } from './fonts'

const W = 1080
const H = 1350

function accentOf(brand: CardBrand, theme: Theme): string {
  return brand.accentColor || brand.primaryColor || theme.accent
}

function Footer({ brand, theme, accent, page, total }: { brand: CardBrand; theme: Theme; accent: string; page: number; total: number }) {
  const initials = (brand.name || 'IN').split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('') || 'IN'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} height={44} alt="" style={{ borderRadius: 6 }} />
        ) : (
          <div style={{ display: 'flex', width: 48, height: 48, borderRadius: 999, background: accent, color: theme.id === 'mist' ? '#FFFFFF' : '#0B1024', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>{initials}</div>
        )}
        {brand.name ? <div style={{ fontSize: 24, fontWeight: 700, color: theme.ink }}>{brand.name}</div> : null}
      </div>
      <div style={{ fontSize: 22, color: theme.sub }}>{`${page} / ${total}`}</div>
    </div>
  )
}

function slideElement(slide: CarouselSlide, index: number, total: number, theme: Theme, brand: CardBrand, fontFamily: string) {
  const accent = accentOf(brand, theme)
  const isCover = slide.kind === 'cover'
  const isCta = slide.kind === 'cta'
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 90, background: theme.bg, color: theme.ink, fontFamily }}>
      <div style={{ display: 'flex' }}>
        {isCover ? (
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: accent }}>CAROUSEL</div>
        ) : (
          <div style={{ fontSize: 60, fontWeight: 800, color: accent }}>{String(index + 1).padStart(2, '0')}</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: isCover ? 90 : 62, fontWeight: 800, color: theme.ink, lineHeight: 1.1 }}>{slide.headline}</div>
        {slide.body ? (
          <div style={{ fontSize: isCover ? 40 : 36, color: isCover ? theme.sub : theme.ink, marginTop: 24, lineHeight: 1.35 }}>{slide.body}</div>
        ) : null}
        {isCover ? (
          <div style={{ marginTop: 40, display: 'flex' }}>
            <div style={{ background: accent, color: theme.id === 'mist' ? '#FFFFFF' : '#08231C', fontSize: 30, fontWeight: 700, padding: '14px 30px', borderRadius: 44 }}>Swipe &#8594;</div>
          </div>
        ) : null}
        {isCta ? <div style={{ marginTop: 30, fontSize: 30, fontWeight: 700, color: accent }}>Follow for more &#8594;</div> : null}
      </div>

      <Footer brand={brand} theme={theme} accent={accent} page={index + 1} total={total} />
    </div>
  )
}

/** Render every slide to PNG, then stitch into a 1080x1350 multi-page PDF. */
export async function renderCarousel(
  slides: CarouselSlide[],
  theme: Theme,
  brand: CardBrand,
): Promise<{ pngBuffers: Buffer[]; pdfBuffer: Buffer }> {
  const font = await loadBrandFont(brand.fontFamily)
  const family = font?.family ?? 'sans-serif'
  const fontOpt = font ? { fonts: font.fonts } : {}

  const pngBuffers: Buffer[] = []
  for (let i = 0; i < slides.length; i++) {
    const resp = new ImageResponse(slideElement(slides[i], i, slides.length, theme, brand, family), { width: W, height: H, ...fontOpt })
    pngBuffers.push(Buffer.from(await resp.arrayBuffer()))
  }

  const pdf = await PDFDocument.create()
  for (const png of pngBuffers) {
    const img = await pdf.embedPng(png)
    const page = pdf.addPage([W, H])
    page.drawImage(img, { x: 0, y: 0, width: W, height: H })
  }
  const pdfBytes = await pdf.save()

  return { pngBuffers, pdfBuffer: Buffer.from(pdfBytes) }
}
