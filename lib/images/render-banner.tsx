import { ImageResponse } from 'next/og'
import type { Theme } from './presets'
import type { CardBrand } from './render-card'
import { loadBrandFont, DEFAULT_BANNER_FONT, type LoadedBrandFont } from './fonts'

// LinkedIn personal banner is 1584 x 396. We render at a scale multiple for a
// crisp, high-resolution download (default 3x = 4752 x 1188).
const BASE_W = 1584
const BASE_H = 396
export const BANNER_SCALE = 3

export interface BannerContent {
  name: string
  designation?: string
  company?: string
  tagline?: string
  keywords?: string[]
  /**
   * Optional full-bleed background image (e.g. AI-generated minimalist interest
   * icons). When set, the banner switches to a hybrid layout: the image is
   * drawn full-bleed with a legibility scrim, the keyword chips and monogram are
   * suppressed (the art carries the visual), and only a real brand logo is overlaid.
   */
  backgroundImageUrl?: string
}

function accentOf(brand: CardBrand, theme: Theme): string {
  return brand.accentColor || brand.primaryColor || theme.accent
}

function bannerElement(content: BannerContent, theme: Theme, brand: CardBrand, s: number, fontFamily: string) {
  const accent = accentOf(brand, theme)
  const keywords = (content.keywords || []).filter(Boolean).slice(0, 4)
  const chipBg = theme.id === 'mist' ? 'rgba(43,77,255,0.08)' : 'rgba(255,255,255,0.10)'
  const initial = (content.name?.trim()?.[0] || 'P').toUpperCase()
  const hasBg = !!content.backgroundImageUrl
  // Designation and company read as one elegant line: "Founder · Acme".
  const subtitle = [content.designation, content.company].filter(Boolean).join(' · ')
  // Scrim keeps the left-side text legible over arbitrary art. Dark themes get a
  // dark wash (white text), the light theme gets a light wash (dark text).
  const scrim = theme.id === 'mist'
    ? 'linear-gradient(90deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.66) 40%, rgba(255,255,255,0) 72%)'
    : 'linear-gradient(90deg, rgba(8,10,22,0.86) 0%, rgba(8,10,22,0.55) 40%, rgba(8,10,22,0) 72%)'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', background: theme.bg, color: theme.ink, fontFamily }}>
      {hasBg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.backgroundImageUrl} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', background: scrim }} />
        </>
      ) : null}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '100%', padding: `0 ${96 * s}px` }}>
        {/* main content */}
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1040 * s }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 10 * s, height: 64 * s, borderRadius: 6 * s, background: accent, marginRight: 26 * s }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 70 * s, fontWeight: 800, color: theme.ink, lineHeight: 1.0 }}>{content.name}</div>
              {subtitle ? <div style={{ fontSize: 32 * s, fontWeight: 700, color: accent, marginTop: 6 * s }}>{subtitle}</div> : null}
            </div>
          </div>
          {content.tagline ? <div style={{ fontSize: 28 * s, color: theme.sub, marginTop: 18 * s, lineHeight: 1.3 }}>{content.tagline}</div> : null}
          {!hasBg && keywords.length ? (
            <div style={{ display: 'flex', marginTop: 24 * s }}>
              {keywords.map((k, i) => (
                <div key={i} style={{ display: 'flex', fontSize: 22 * s, fontWeight: 600, color: accent, background: chipBg, padding: `${8 * s}px ${20 * s}px`, borderRadius: 30 * s, marginRight: 14 * s }}>{k}</div>
              ))}
            </div>
          ) : null}
        </div>

        {/* right: a real brand logo if present; otherwise an accent monogram —
            but with AI art the icons already fill the right, so skip the monogram. */}
        {brand.logoUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 260 * s, height: 260 * s }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logoUrl} height={(hasBg ? 132 : 180) * s} alt="" style={{ borderRadius: 12 * s }} />
          </div>
        ) : !hasBg ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 208 * s, height: 208 * s, borderRadius: 999, border: `${5 * s}px solid ${accent}`, color: accent, fontSize: 124 * s, fontWeight: 700, lineHeight: 1 }}>{initial}</div>
        ) : null}
      </div>
    </div>
  )
}

export async function renderBannerToBuffer(content: BannerContent, theme: Theme, brand: CardBrand, scale: number = BANNER_SCALE): Promise<Buffer> {
  const font = await loadBrandFont(brand.fontFamily || DEFAULT_BANNER_FONT)
  const resp = renderBannerResponse(content, theme, brand, scale, font)
  return Buffer.from(await resp.arrayBuffer())
}

export function renderBannerResponse(content: BannerContent, theme: Theme, brand: CardBrand, scale: number = BANNER_SCALE, font?: LoadedBrandFont | null): ImageResponse {
  const family = font?.family ?? 'sans-serif'
  return new ImageResponse(bannerElement(content, theme, brand, scale, family), {
    width: BASE_W * scale,
    height: BASE_H * scale,
    ...(font ? { fonts: font.fonts } : {}),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' },
  })
}
