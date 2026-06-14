import { ImageResponse } from 'next/og'
import type { CardContent } from './card-content'
import { ASPECT_RATIOS, type AspectRatioId, type Theme } from './presets'
import { loadBrandFont, DEFAULT_QUOTE_FONT, DEFAULT_CARD_FONT, type LoadedBrandFont } from './fonts'
import { pickDeco, Decoration, LogoDeco, hashStr } from './decorations'

// Brand kit applied to a card: accent colour + logo + optional brand font.
// (Background stays themed; full background re-colouring is a later pass.)
export interface CardBrand {
  primaryColor?: string | null
  accentColor?: string | null
  logoUrl?: string | null
  name?: string | null
  sub?: string | null
  /** Brand-font id (see lib/images/fonts.ts). Null/unknown → system sans. */
  fontFamily?: string | null
}

// Readable text colour on an arbitrary fill, by luminance.
export function textOn(hex: string): string {
  const m = (hex || '#000').replace('#', '')
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#0B0B12' : '#FFFFFF'
}

// Auto-fit a headline so long text never overflows the card.
function fitHeadline(text: string, max: number, min: number): number {
  const len = (text || '').length
  if (len <= 22) return max
  if (len >= 150) return min
  return Math.round(max - ((len - 22) / 128) * (max - min))
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
        <div style={{ display: 'flex', width: 64, height: 64, borderRadius: 16, background: accent, color: textOn(accent), alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 }}>
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
    case 'stat': {
      const big = fitHeadline(content.headline, 340, 190)
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {content.kicker ? <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, color: accent, marginBottom: 14 }}>{content.kicker.toUpperCase()}</div> : null}
          <div style={{ fontSize: big, fontWeight: 800, color: accent, lineHeight: 0.92, letterSpacing: -6 }}>{content.headline}</div>
          {content.body ? <div style={{ fontSize: 52, fontWeight: 700, color: theme.ink, lineHeight: 1.12, marginTop: 28 }}>{content.body}</div> : null}
        </div>
      )
    }
    case 'title': {
      const fit = fitHeadline(content.headline, 100, 54)
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {content.kicker ? <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 5, color: accent, marginBottom: 22 }}>{content.kicker.toUpperCase()}</div> : null}
          <div style={{ fontSize: fit, fontWeight: 800, color: theme.ink, lineHeight: 1.03, letterSpacing: -2.5 }}>{content.headline}</div>
          {content.body ? <div style={{ fontSize: 38, fontWeight: 500, color: theme.sub, marginTop: 26, lineHeight: 1.3 }}>{content.body}</div> : null}
          <div style={{ width: 104, height: 10, borderRadius: 5, background: accent, marginTop: 44 }} />
        </div>
      )
    }
    case 'list':
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: fitHeadline(content.headline, 72, 46), fontWeight: 800, color: theme.ink, lineHeight: 1.04, letterSpacing: -1.5, marginBottom: 46 }}>{content.headline}</div>
          {(content.lines ?? []).slice(0, 5).map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, borderRadius: 15, background: accent, color: textOn(accent), fontSize: 30, fontWeight: 800, marginRight: 28 }}>{i + 1}</div>
              <div style={{ fontSize: 42, fontWeight: 600, color: theme.ink }}>{l}</div>
            </div>
          ))}
        </div>
      )
    case 'myth':
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignSelf: 'flex-start', fontSize: 26, fontWeight: 800, letterSpacing: 4, color: '#FFFFFF', background: '#E5484D', padding: '12px 24px', borderRadius: 14 }}>MYTH</div>
          <div style={{ fontSize: fitHeadline(content.headline, 60, 42), fontWeight: 800, color: theme.ink, lineHeight: 1.1, marginTop: 18, letterSpacing: -1 }}>{content.headline}</div>
          <div style={{ display: 'flex', alignSelf: 'flex-start', fontSize: 26, fontWeight: 800, letterSpacing: 4, color: textOn(accent), background: accent, padding: '12px 24px', borderRadius: 14, marginTop: 44 }}>REALITY</div>
          <div style={{ fontSize: fitHeadline(content.body ?? '', 60, 42), fontWeight: 800, color: theme.ink, lineHeight: 1.1, marginTop: 18, letterSpacing: -1 }}>{content.body ?? ''}</div>
        </div>
      )
    case 'quote':
    default: {
      const fit = fitHeadline(content.headline, 108, 52)
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 176, fontWeight: 800, color: accent, lineHeight: 0.7, height: 104, marginBottom: 28 }}>&#8220;</div>
          <div style={{ fontSize: fit, fontWeight: 800, color: theme.ink, lineHeight: 1.02, letterSpacing: -3 }}>{content.headline}</div>
          <div style={{ width: 104, height: 10, borderRadius: 5, background: accent, marginTop: 52 }} />
        </div>
      )
    }
  }
}

function cardElement(content: CardContent, theme: Theme, brand: CardBrand, fontFamily: string) {
  const accent = brand.accentColor || brand.primaryColor || theme.accent
  const dark = textOn(theme.bg) === '#FFFFFF'
  const seed = hashStr(content.type + '|' + (content.headline || '') + (content.body || ''))
  const spec = pickDeco(seed)
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: theme.bg,
        color: theme.ink,
        fontFamily,
      }}
    >
      {brand.logoUrl && seed % 3 === 0
        ? <LogoDeco logoUrl={brand.logoUrl} corner={spec.corner} dark={dark} />
        : <Decoration spec={spec} color={accent} dark={dark} />}
      <Middle content={content} theme={theme} accent={accent} />
      <Footer brand={brand} theme={theme} accent={accent} />
    </div>
  )
}

/**
 * Render a branded card as a streaming PNG Response (live preview / public tool).
 * Pass a preloaded brand font (callers load it async via loadBrandFont).
 */
export function renderCardResponse(content: CardContent, theme: Theme, brand: CardBrand, ar: AspectRatioId, font?: LoadedBrandFont | null): ImageResponse {
  const { w, h } = ASPECT_RATIOS[ar]
  const family = font?.family ?? 'sans-serif'
  return new ImageResponse(cardElement(content, theme, brand, family), {
    width: w,
    height: h,
    ...(font ? { fonts: font.fonts } : {}),
    headers: { 'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' },
  })
}

/** Render a branded card to a PNG Buffer (for storage). Loads the brand font if set. */
export async function renderCardToBuffer(content: CardContent, theme: Theme, brand: CardBrand, ar: AspectRatioId): Promise<Buffer> {
  const defaultFont = content.type === 'quote' ? DEFAULT_QUOTE_FONT : DEFAULT_CARD_FONT
  const font = await loadBrandFont(brand.fontFamily || defaultFont)
  const resp = renderCardResponse(content, theme, brand, ar, font)
  return Buffer.from(await resp.arrayBuffer())
}
