import { ImageResponse } from 'next/og'
import type { CardContent } from './card-content'
import { ASPECT_RATIOS, type AspectRatioId, type Theme } from './presets'

// Brand kit applied to a card. v1 = accent colour + logo (background stays themed;
// full background re-colouring with contrast handling is Phase 2).
export interface CardBrand {
  primaryColor?: string | null
  accentColor?: string | null
  logoUrl?: string | null
  name?: string | null
  sub?: string | null
}

function initials(name?: string | null): string {
  if (!name) return 'IN'
  return name.split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? '').join('') || 'IN'
}

function Footer({ brand, theme, accent }: { brand: CardBrand; theme: Theme; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} height={56} alt="" style={{ borderRadius: 8 }} />
      ) : (
        <div style={{ display: 'flex', width: 64, height: 64, borderRadius: 999, background: accent, color: theme.id === 'mist' ? '#FFFFFF' : '#0B1024', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700 }}>
          {initials(brand.name)}
        </div>
      )}
      {brand.name ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: theme.ink }}>{brand.name}</div>
          {brand.sub ? <div style={{ fontSize: 22, color: theme.sub }}>{brand.sub}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

function Middle({ content, theme, accent }: { content: CardContent; theme: Theme; accent: string }) {
  switch (content.type) {
    case 'stat':
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {content.kicker ? <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: accent, marginBottom: 12 }}>{content.kicker.toUpperCase()}</div> : null}
          <div style={{ fontSize: 300, fontWeight: 800, color: accent, lineHeight: 1 }}>{content.headline}</div>
          {content.body ? <div style={{ fontSize: 52, fontWeight: 700, color: theme.ink, lineHeight: 1.15, marginTop: 24 }}>{content.body}</div> : null}
        </div>
      )
    case 'title':
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {content.kicker ? <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: accent, marginBottom: 16 }}>{content.kicker.toUpperCase()}</div> : null}
          <div style={{ fontSize: 80, fontWeight: 800, color: theme.ink, lineHeight: 1.08 }}>{content.headline}</div>
          {content.body ? <div style={{ fontSize: 38, color: theme.sub, marginTop: 20 }}>{content.body}</div> : null}
        </div>
      )
    case 'list':
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 64, fontWeight: 800, color: theme.ink, lineHeight: 1.08, marginBottom: 36 }}>{content.headline}</div>
          {(content.lines ?? []).slice(0, 5).map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: accent, width: 80 }}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{ fontSize: 40, color: theme.ink }}>{l}</div>
            </div>
          ))}
        </div>
      )
    case 'myth':
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4, color: '#FF6B8A' }}>MYTH</div>
          <div style={{ fontSize: 54, fontWeight: 700, color: theme.ink, lineHeight: 1.15, marginTop: 10 }}>{content.headline}</div>
          <div style={{ height: 3, background: theme.sub, opacity: 0.4, marginTop: 34, marginBottom: 34 }} />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4, color: accent }}>REALITY</div>
          <div style={{ fontSize: 54, fontWeight: 700, color: theme.ink, lineHeight: 1.15, marginTop: 10 }}>{content.body ?? ''}</div>
        </div>
      )
    case 'quote':
    default:
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 150, fontWeight: 700, color: accent, lineHeight: 1 }}>&#8220;</div>
          <div style={{ fontSize: 64, fontWeight: 700, color: theme.ink, lineHeight: 1.18 }}>{content.headline}</div>
          <div style={{ width: 120, height: 10, borderRadius: 6, background: accent, marginTop: 28 }} />
        </div>
      )
  }
}

function cardElement(content: CardContent, theme: Theme, brand: CardBrand) {
  const accent = brand.accentColor || brand.primaryColor || theme.accent
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: theme.bg,
        color: theme.ink,
        fontFamily: 'sans-serif',
      }}
    >
      <Middle content={content} theme={theme} accent={accent} />
      <Footer brand={brand} theme={theme} accent={accent} />
    </div>
  )
}

/** Render a branded card as a streaming PNG Response (for live preview / public tool). */
export function renderCardResponse(content: CardContent, theme: Theme, brand: CardBrand, ar: AspectRatioId): ImageResponse {
  const { w, h } = ASPECT_RATIOS[ar]
  return new ImageResponse(cardElement(content, theme, brand), { width: w, height: h })
}

/** Render a branded card to a PNG Buffer (for storage). */
export async function renderCardToBuffer(content: CardContent, theme: Theme, brand: CardBrand, ar: AspectRatioId): Promise<Buffer> {
  const resp = renderCardResponse(content, theme, brand, ar)
  return Buffer.from(await resp.arrayBuffer())
}
