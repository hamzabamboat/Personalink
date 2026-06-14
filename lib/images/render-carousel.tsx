import { ImageResponse } from 'next/og'
import { PDFDocument } from 'pdf-lib'
import type { CarouselSlide } from '@/lib/supabase'
import type { Theme } from './presets'
import { textOn, type CardBrand } from './render-card'
import { pickDeco, Decoration, LogoDeco, hashStr } from './decorations'
import { loadBrandFont, DEFAULT_CAROUSEL_FONT } from './fonts'

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
          <div style={{ display: 'flex', width: 48, height: 48, borderRadius: 13, background: accent, color: textOn(accent), alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800 }}>{initials}</div>
        )}
        {brand.name ? <div style={{ fontSize: 24, fontWeight: 800, color: theme.ink }}>{brand.name}</div> : null}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: theme.sub }}>{`${page} / ${total}`}</div>
    </div>
  )
}

function slideElement(slide: CarouselSlide, index: number, total: number, theme: Theme, brand: CardBrand, fontFamily: string, accent: string) {
  const isCover = slide.kind === 'cover'
  const isCta = slide.kind === 'cta'
  const dark = textOn(theme.bg) === '#FFFFFF'
  const spec = pickDeco(hashStr((brand.name || 'pl') + slide.headline), index)
  return (
    <div style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 90, background: theme.bg, color: theme.ink, fontFamily }}>
      {brand.logoUrl && index % 4 === 2
        ? <LogoDeco logoUrl={brand.logoUrl} corner={spec.corner} dark={dark} />
        : <Decoration spec={spec} color={accent} dark={dark} />}
      <div style={{ display: 'flex' }}>
        {isCover ? (
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 5, color: accent }}>CAROUSEL</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 86, height: 86, borderRadius: 22, background: accent, color: textOn(accent), fontSize: 42, fontWeight: 800 }}>{String(index + 1).padStart(2, '0')}</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: isCover ? 92 : 64, fontWeight: 800, color: theme.ink, lineHeight: 1.04, letterSpacing: -2 }}>{slide.headline}</div>
        {slide.body ? (
          <div style={{ fontSize: isCover ? 40 : 36, fontWeight: 500, color: isCover ? theme.sub : theme.ink, marginTop: 24, lineHeight: 1.35 }}>{slide.body}</div>
        ) : null}
        {isCover ? (
          <div style={{ marginTop: 44, display: 'flex' }}>
            <div style={{ background: accent, color: textOn(accent), fontSize: 30, fontWeight: 800, padding: '16px 32px', borderRadius: 44 }}>Swipe &#8594;</div>
          </div>
        ) : null}
        {isCta ? <div style={{ marginTop: 30, fontSize: 30, fontWeight: 800, color: accent }}>Follow for more &#8594;</div> : null}
      </div>

      <Footer brand={brand} theme={theme} accent={accent} page={index + 1} total={total} />
    </div>
  )
}

/** Render every slide to PNG, then stitch into a 1080x1350 multi-page PDF.
 *  Slides alternate between the base palette and its inverse (colour-field) for
 *  rhythm as the reader swipes. */
export async function renderCarousel(
  slides: CarouselSlide[],
  theme: Theme,
  brand: CardBrand,
): Promise<{ pngBuffers: Buffer[]; pdfBuffer: Buffer }> {
  const font = await loadBrandFont(brand.fontFamily || DEFAULT_CAROUSEL_FONT)
  const family = font?.family ?? 'sans-serif'
  const fontOpt = font ? { fonts: font.fonts } : {}
  const baseAccent = accentOf(brand, theme)

  const pngBuffers: Buffer[] = []
  for (let i = 0; i < slides.length; i++) {
    const inv = i % 2 === 1
    const invInk = textOn(baseAccent)
    const slideTheme: Theme = inv
      ? { id: invInk === '#FFFFFF' ? 'ink' : 'mist', label: theme.label, bg: baseAccent, ink: invInk, sub: invInk === '#FFFFFF' ? 'rgba(255,255,255,0.72)' : 'rgba(11,11,18,0.6)', accent: invInk }
      : theme
    const slideAccent = inv ? invInk : baseAccent
    const resp = new ImageResponse(slideElement(slides[i], i, slides.length, slideTheme, brand, family, slideAccent), { width: W, height: H, ...fontOpt })
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
