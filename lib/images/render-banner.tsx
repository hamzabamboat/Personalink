import { ImageResponse } from 'next/og'
import type { Theme } from './presets'
import type { CardBrand } from './render-card'

// LinkedIn personal banner is 1584 x 396. We render at a scale multiple for a
// crisp, high-resolution download (default 3x = 4752 x 1188).
const BASE_W = 1584
const BASE_H = 396
export const BANNER_SCALE = 3

export interface BannerContent {
  name: string
  designation?: string
  tagline?: string
  keywords?: string[]
}

function accentOf(brand: CardBrand, theme: Theme): string {
  return brand.accentColor || brand.primaryColor || theme.accent
}

function bannerElement(content: BannerContent, theme: Theme, brand: CardBrand, s: number) {
  const accent = accentOf(brand, theme)
  const keywords = (content.keywords || []).filter(Boolean).slice(0, 4)
  const chipBg = theme.id === 'mist' ? 'rgba(43,77,255,0.08)' : 'rgba(255,255,255,0.10)'

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.bg, color: theme.ink, fontFamily: 'sans-serif', padding: `0 ${96 * s}px` }}>
      {/* main content */}
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1040 * s }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 10 * s, height: 64 * s, borderRadius: 6 * s, background: accent, marginRight: 26 * s }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 70 * s, fontWeight: 800, color: theme.ink, lineHeight: 1.0 }}>{content.name}</div>
            {content.designation ? <div style={{ fontSize: 32 * s, fontWeight: 700, color: accent, marginTop: 6 * s }}>{content.designation}</div> : null}
          </div>
        </div>
        {content.tagline ? <div style={{ fontSize: 28 * s, color: theme.sub, marginTop: 18 * s, lineHeight: 1.3 }}>{content.tagline}</div> : null}
        {keywords.length ? (
          <div style={{ display: 'flex', marginTop: 24 * s }}>
            {keywords.map((k, i) => (
              <div key={i} style={{ display: 'flex', fontSize: 22 * s, fontWeight: 600, color: accent, background: chipBg, padding: `${8 * s}px ${20 * s}px`, borderRadius: 30 * s, marginRight: 14 * s }}>{k}</div>
            ))}
          </div>
        ) : null}
      </div>

      {/* right: logo or decorative accent ring */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 260 * s, height: 260 * s }}>
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} height={180 * s} alt="" style={{ borderRadius: 12 * s }} />
        ) : (
          <div style={{ display: 'flex', width: 210 * s, height: 210 * s, borderRadius: 999, border: `${16 * s}px solid ${accent}`, opacity: 0.22 }} />
        )}
      </div>
    </div>
  )
}

export async function renderBannerToBuffer(content: BannerContent, theme: Theme, brand: CardBrand, scale: number = BANNER_SCALE): Promise<Buffer> {
  const resp = new ImageResponse(bannerElement(content, theme, brand, scale), { width: BASE_W * scale, height: BASE_H * scale })
  return Buffer.from(await resp.arrayBuffer())
}

export function renderBannerResponse(content: BannerContent, theme: Theme, brand: CardBrand, scale: number = BANNER_SCALE): ImageResponse {
  return new ImageResponse(bannerElement(content, theme, brand, scale), { width: BASE_W * scale, height: BASE_H * scale })
}
