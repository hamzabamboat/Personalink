// Curated brand fonts for templated graphics (cards, carousels, banners).
//
// Satori (next/og) parses TTF / OTF / WOFF — but NOT WOFF2. We load the latin
// WOFF subset from @fontsource via jsDelivr (verified `wOFF` magic, ~10–30 KB
// each), cache the bytes per warm instance, and fall back to the system sans if
// anything fails — so a font choice can never break a render.

export interface BrandFontDef {
  id: string
  label: string
  /** The font-family name passed to Satori + used in element styles. */
  family: string
  /** One-line descriptor shown in the picker. */
  vibe: string
  /** 'sans' | 'serif' — used only for the picker's fallback preview. */
  kind: 'sans' | 'serif'
}

// IDs match @fontsource package names. All OFL-licensed.
export const BRAND_FONTS: BrandFontDef[] = [
  { id: 'inter', label: 'Inter', family: 'Inter', vibe: 'Modern · clean', kind: 'sans' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', vibe: 'Friendly · geometric', kind: 'sans' },
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat', vibe: 'Corporate · confident', kind: 'sans' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: 'Space Grotesk', vibe: 'Technical · distinct', kind: 'sans' },
  { id: 'lora', label: 'Lora', family: 'Lora', vibe: 'Editorial serif', kind: 'serif' },
  { id: 'playfair-display', label: 'Playfair Display', family: 'Playfair Display', vibe: 'Luxury serif', kind: 'serif' },
]

export function resolveBrandFont(id?: string | null): BrandFontDef | null {
  if (!id) return null
  return BRAND_FONTS.find(f => f.id === id) ?? null
}

// Distinctive default type per surface when no brand font is chosen — never the
// system sans. Quotes/banners get an editorial serif; cards a clean geometric.
export const DEFAULT_QUOTE_FONT = 'playfair-display'
export const DEFAULT_CARD_FONT = 'poppins'
export const DEFAULT_BANNER_FONT = 'playfair-display'
export const DEFAULT_CAROUSEL_FONT = 'montserrat'

type Weight = 400 | 700
export interface SatoriFont {
  name: string
  data: ArrayBuffer
  weight: Weight
  style: 'normal'
}

export interface LoadedBrandFont {
  family: string
  fonts: SatoriFont[]
}

const byteCache = new Map<string, ArrayBuffer | null>()

function woffUrl(id: string, weight: Weight): string {
  return `https://cdn.jsdelivr.net/npm/@fontsource/${id}@5/files/${id}-latin-${weight}-normal.woff`
}

async function fetchWoff(id: string, weight: Weight): Promise<ArrayBuffer | null> {
  const key = `${id}-${weight}`
  if (byteCache.has(key)) return byteCache.get(key)!
  try {
    const res = await fetch(woffUrl(id, weight), { cache: 'force-cache' })
    if (!res.ok) { byteCache.set(key, null); return null }
    const buf = await res.arrayBuffer()
    // Validate WOFF magic ('wOFF' = 0x774F4646); reject anything else (e.g. an HTML error page).
    const head = new Uint8Array(buf.slice(0, 4))
    const isWoff = head[0] === 0x77 && head[1] === 0x4f && head[2] === 0x46 && head[3] === 0x46
    const ok = isWoff ? buf : null
    byteCache.set(key, ok)
    return ok
  } catch {
    byteCache.set(key, null)
    return null
  }
}

/**
 * Load a brand font (regular + bold) for Satori. Returns null when no font is
 * selected or the load fails — callers then fall back to `sans-serif`.
 */
export async function loadBrandFont(id?: string | null): Promise<LoadedBrandFont | null> {
  const def = resolveBrandFont(id)
  if (!def) return null
  const [w400, w700] = await Promise.all([fetchWoff(def.id, 400), fetchWoff(def.id, 700)])
  const fonts: SatoriFont[] = []
  if (w400) fonts.push({ name: def.family, data: w400, weight: 400, style: 'normal' })
  if (w700) fonts.push({ name: def.family, data: w700, weight: 700, style: 'normal' })
  if (!fonts.length) return null
  return { family: def.family, fonts }
}
