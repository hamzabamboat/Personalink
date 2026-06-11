import { ImageResponse } from 'next/og'
import type { Theme } from './presets'
import type { CardBrand } from './render-card'

// LinkedIn personal banner is 1584 x 396.
const W = 1584
const H = 396

export interface BannerContent {
  name: string
  designation?: string
  tagline?: string
  keywords?: string[]
}

function accentOf(brand: CardBrand, theme: Theme): string {
  return brand.accentColor || brand.primaryColor || theme.accent
}

function bannerElement(content: BannerContent, theme: Theme, brand: CardBrand) {
  const accent = accentOf(brand, theme)
  const keywords = (content.keywords || []).filter(Boolean).slice(0, 4)
  const chipBg = theme.id === 'mist' ? 'rgba(43,77,255,0.08)' : 'rgba(255,255,255,0.10)'

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.bg, color: theme.ink, fontFamily: 'sans-serif', padding: '0 96px' }}>
      {/* main content */}
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 1040 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 10, height: 64, borderRadius: 6, background: accent, marginRight: 26 }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 70, fontWeight: 800, color: theme.ink, lineHeight: 1.0 }}>{content.name}</div>
            {content.designation ? <div style={{ fontSize: 32, fontWeight: 700, color: accent, marginTop: 6 }}>{content.designation}</div> : null}
          </div>
        </div>
        {content.tagline ? <div style={{ fontSize: 28, color: theme.sub, marginTop: 18, lineHeight: 1.3 }}>{content.tagline}</div> : null}
        {keywords.length ? (
          <div style={{ display: 'flex', marginTop: 24 }}>
            {keywords.map((k, i) => (
              <div key={i} style={{ display: 'flex', fontSize: 22, fontWeight: 600, color: accent, background: chipBg, padding: '8px 20px', borderRadius: 30, marginRight: 14 }}>{k}</div>
            ))}
          </div>
        ) : null}
      </div>

      {/* right: logo or decorative accent ring */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 260, height: 260 }}>
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} height={180} alt="" style={{ borderRadius: 12 }} />
        ) : (
          <div style={{ display: 'flex', width: 210, height: 210, borderRadius: 999, border: `16px solid ${accent}`, opacity: 0.22 }} />
        )}
      </div>
    </div>
  )
}

export async function renderBannerToBuffer(content: BannerContent, theme: Theme, brand: CardBrand): Promise<Buffer> {
  const resp = new ImageResponse(bannerElement(content, theme, brand), { width: W, height: H })
  return Buffer.from(await resp.arrayBuffer())
}

export function renderBannerResponse(content: BannerContent, theme: Theme, brand: CardBrand): ImageResponse {
  return new ImageResponse(bannerElement(content, theme, brand), { width: W, height: H })
}
