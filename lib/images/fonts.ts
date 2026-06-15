// Curated brand fonts for templated graphics (cards, carousels, banners).
//
// Satori (next/og) parses TTF / OTF / WOFF — but NOT WOFF2. We load the latin
// WOFF subset from @fontsource via jsDelivr (verified `wOFF` magic, ~10–30 KB
// each), cache the bytes per warm instance, and fall back to the system sans if
// anything fails — so a font choice can never break a render.

export const FONT_CATEGORIES = ['Bold & modern', 'Display', 'Editorial serif', 'Elegant', 'Technical', 'Handwritten'] as const
export type FontCategory = (typeof FONT_CATEGORIES)[number]

export interface BrandFontDef {
  id: string
  label: string
  /** The font-family name passed to Satori + used in element styles. */
  family: string
  /** One-line descriptor shown in the picker. */
  vibe: string
  /** 'sans' | 'serif' — used only for the picker's fallback preview. */
  kind: 'sans' | 'serif'
  category: FontCategory
}

// IDs match @fontsource package names; every entry verified to ship a 400 WOFF
// on jsDelivr (most also 700/800). All OFL/Apache-licensed. Adding more is one
// verified line — keep them grouped by category.
export const BRAND_FONTS: BrandFontDef[] = [
  // — Bold & modern (geometric / grotesk sans) —
  { id: 'montserrat', label: 'Montserrat', family: 'Montserrat', vibe: 'Corporate · confident', kind: 'sans', category: 'Bold & modern' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins', vibe: 'Friendly · geometric', kind: 'sans', category: 'Bold & modern' },
  { id: 'inter', label: 'Inter', family: 'Inter', vibe: 'Neutral · UI-grade', kind: 'sans', category: 'Bold & modern' },
  { id: 'sora', label: 'Sora', family: 'Sora', vibe: 'Modern · techy', kind: 'sans', category: 'Bold & modern' },
  { id: 'manrope', label: 'Manrope', family: 'Manrope', vibe: 'Clean · rounded', kind: 'sans', category: 'Bold & modern' },
  { id: 'outfit', label: 'Outfit', family: 'Outfit', vibe: 'Minimal · even', kind: 'sans', category: 'Bold & modern' },
  { id: 'plus-jakarta-sans', label: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans', vibe: 'Crisp · contemporary', kind: 'sans', category: 'Bold & modern' },
  { id: 'space-grotesk', label: 'Space Grotesk', family: 'Space Grotesk', vibe: 'Technical · distinct', kind: 'sans', category: 'Bold & modern' },
  { id: 'lexend', label: 'Lexend', family: 'Lexend', vibe: 'Readable · smooth', kind: 'sans', category: 'Bold & modern' },
  { id: 'archivo', label: 'Archivo', family: 'Archivo', vibe: 'Grotesk · sturdy', kind: 'sans', category: 'Bold & modern' },
  { id: 'onest', label: 'Onest', family: 'Onest', vibe: 'Soft · modern', kind: 'sans', category: 'Bold & modern' },
  { id: 'figtree', label: 'Figtree', family: 'Figtree', vibe: 'Warm · simple', kind: 'sans', category: 'Bold & modern' },
  { id: 'schibsted-grotesk', label: 'Schibsted Grotesk', family: 'Schibsted Grotesk', vibe: 'Editorial · bold', kind: 'sans', category: 'Bold & modern' },
  { id: 'familjen-grotesk', label: 'Familjen Grotesk', family: 'Familjen Grotesk', vibe: 'Grotesk · friendly', kind: 'sans', category: 'Bold & modern' },
  { id: 'dm-sans', label: 'DM Sans', family: 'DM Sans', vibe: 'Low-contrast · clean', kind: 'sans', category: 'Bold & modern' },
  { id: 'work-sans', label: 'Work Sans', family: 'Work Sans', vibe: 'Workhorse sans', kind: 'sans', category: 'Bold & modern' },
  { id: 'epilogue', label: 'Epilogue', family: 'Epilogue', vibe: 'Sharp · modern', kind: 'sans', category: 'Bold & modern' },
  // — Display (high-impact headline) —
  { id: 'anton', label: 'Anton', family: 'Anton', vibe: 'Heavy · condensed', kind: 'sans', category: 'Display' },
  { id: 'archivo-black', label: 'Archivo Black', family: 'Archivo Black', vibe: 'Solid · impactful', kind: 'sans', category: 'Display' },
  { id: 'bebas-neue', label: 'Bebas Neue', family: 'Bebas Neue', vibe: 'Tall caps · punchy', kind: 'sans', category: 'Display' },
  { id: 'oswald', label: 'Oswald', family: 'Oswald', vibe: 'Condensed · news', kind: 'sans', category: 'Display' },
  { id: 'teko', label: 'Teko', family: 'Teko', vibe: 'Narrow · bold', kind: 'sans', category: 'Display' },
  { id: 'fjalla-one', label: 'Fjalla One', family: 'Fjalla One', vibe: 'Strong · compact', kind: 'sans', category: 'Display' },
  { id: 'unbounded', label: 'Unbounded', family: 'Unbounded', vibe: 'Quirky · rounded', kind: 'sans', category: 'Display' },
  { id: 'syne', label: 'Syne', family: 'Syne', vibe: 'Arty · wide', kind: 'sans', category: 'Display' },
  { id: 'righteous', label: 'Righteous', family: 'Righteous', vibe: 'Retro · geometric', kind: 'sans', category: 'Display' },
  { id: 'big-shoulders-display', label: 'Big Shoulders', family: 'Big Shoulders Display', vibe: 'Industrial · tall', kind: 'sans', category: 'Display' },
  { id: 'passion-one', label: 'Passion One', family: 'Passion One', vibe: 'Chunky · loud', kind: 'sans', category: 'Display' },
  { id: 'titan-one', label: 'Titan One', family: 'Titan One', vibe: 'Bubbly · bold', kind: 'sans', category: 'Display' },
  { id: 'alfa-slab-one', label: 'Alfa Slab One', family: 'Alfa Slab One', vibe: 'Slab · heavy', kind: 'sans', category: 'Display' },
  { id: 'bungee', label: 'Bungee', family: 'Bungee', vibe: 'Signage · playful', kind: 'sans', category: 'Display' },
  { id: 'staatliches', label: 'Staatliches', family: 'Staatliches', vibe: 'Condensed caps', kind: 'sans', category: 'Display' },
  // — Editorial serif —
  { id: 'playfair-display', label: 'Playfair Display', family: 'Playfair Display', vibe: 'Luxury · high-contrast', kind: 'serif', category: 'Editorial serif' },
  { id: 'lora', label: 'Lora', family: 'Lora', vibe: 'Editorial · calm', kind: 'serif', category: 'Editorial serif' },
  { id: 'fraunces', label: 'Fraunces', family: 'Fraunces', vibe: 'Characterful · soft', kind: 'serif', category: 'Editorial serif' },
  { id: 'cormorant', label: 'Cormorant', family: 'Cormorant', vibe: 'Refined · delicate', kind: 'serif', category: 'Editorial serif' },
  { id: 'dm-serif-display', label: 'DM Serif Display', family: 'DM Serif Display', vibe: 'Classic · elegant', kind: 'serif', category: 'Editorial serif' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', family: 'Libre Baskerville', vibe: 'Bookish · trusted', kind: 'serif', category: 'Editorial serif' },
  { id: 'spectral', label: 'Spectral', family: 'Spectral', vibe: 'Literary · warm', kind: 'serif', category: 'Editorial serif' },
  { id: 'bitter', label: 'Bitter', family: 'Bitter', vibe: 'Slab serif · solid', kind: 'serif', category: 'Editorial serif' },
  { id: 'newsreader', label: 'Newsreader', family: 'Newsreader', vibe: 'News · readable', kind: 'serif', category: 'Editorial serif' },
  { id: 'source-serif-4', label: 'Source Serif', family: 'Source Serif 4', vibe: 'Clean · neutral', kind: 'serif', category: 'Editorial serif' },
  { id: 'instrument-serif', label: 'Instrument Serif', family: 'Instrument Serif', vibe: 'Light · stylish', kind: 'serif', category: 'Editorial serif' },
  // — Elegant (fashion / luxury serif) —
  { id: 'cormorant-garamond', label: 'Cormorant Garamond', family: 'Cormorant Garamond', vibe: 'Fashion · airy', kind: 'serif', category: 'Elegant' },
  { id: 'eb-garamond', label: 'EB Garamond', family: 'EB Garamond', vibe: 'Timeless · classic', kind: 'serif', category: 'Elegant' },
  { id: 'marcellus', label: 'Marcellus', family: 'Marcellus', vibe: 'Roman · graceful', kind: 'serif', category: 'Elegant' },
  { id: 'cinzel', label: 'Cinzel', family: 'Cinzel', vibe: 'Engraved caps', kind: 'serif', category: 'Elegant' },
  { id: 'yeseva-one', label: 'Yeseva One', family: 'Yeseva One', vibe: 'Ornate · display', kind: 'serif', category: 'Elegant' },
  { id: 'prata', label: 'Prata', family: 'Prata', vibe: 'Vogue · thin', kind: 'serif', category: 'Elegant' },
  { id: 'gilda-display', label: 'Gilda Display', family: 'Gilda Display', vibe: 'Boutique · slim', kind: 'serif', category: 'Elegant' },
  { id: 'italiana', label: 'Italiana', family: 'Italiana', vibe: 'Couture · elegant', kind: 'serif', category: 'Elegant' },
  // — Technical / mono —
  { id: 'space-mono', label: 'Space Mono', family: 'Space Mono', vibe: 'Retro · code', kind: 'sans', category: 'Technical' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', family: 'JetBrains Mono', vibe: 'Dev · precise', kind: 'sans', category: 'Technical' },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', family: 'IBM Plex Mono', vibe: 'Corporate mono', kind: 'sans', category: 'Technical' },
  { id: 'dm-mono', label: 'DM Mono', family: 'DM Mono', vibe: 'Minimal mono', kind: 'sans', category: 'Technical' },
  { id: 'red-hat-mono', label: 'Red Hat Mono', family: 'Red Hat Mono', vibe: 'Clean · technical', kind: 'sans', category: 'Technical' },
  // — Batch 2 (all CDN-verified) —
  { id: 'hanken-grotesk', label: 'Hanken Grotesk', family: 'Hanken Grotesk', vibe: 'Geometric · friendly', kind: 'sans', category: 'Bold & modern' },
  { id: 'red-hat-display', label: 'Red Hat Display', family: 'Red Hat Display', vibe: 'Open-source · clean', kind: 'sans', category: 'Bold & modern' },
  { id: 'mulish', label: 'Mulish', family: 'Mulish', vibe: 'Minimalist · light', kind: 'sans', category: 'Bold & modern' },
  { id: 'rubik', label: 'Rubik', family: 'Rubik', vibe: 'Rounded · modern', kind: 'sans', category: 'Bold & modern' },
  { id: 'urbanist', label: 'Urbanist', family: 'Urbanist', vibe: 'Low-contrast · sleek', kind: 'sans', category: 'Bold & modern' },
  { id: 'be-vietnam-pro', label: 'Be Vietnam Pro', family: 'Be Vietnam Pro', vibe: 'Versatile · neutral', kind: 'sans', category: 'Bold & modern' },
  { id: 'albert-sans', label: 'Albert Sans', family: 'Albert Sans', vibe: 'Geometric · airy', kind: 'sans', category: 'Bold & modern' },
  { id: 'instrument-sans', label: 'Instrument Sans', family: 'Instrument Sans', vibe: 'Modern · functional', kind: 'sans', category: 'Bold & modern' },
  { id: 'geist', label: 'Geist', family: 'Geist', vibe: 'Vercel · precise', kind: 'sans', category: 'Bold & modern' },
  { id: 'jost', label: 'Jost', family: 'Jost', vibe: 'Futura-style · geometric', kind: 'sans', category: 'Bold & modern' },
  { id: 'bricolage-grotesque', label: 'Bricolage Grotesque', family: 'Bricolage Grotesque', vibe: 'Editorial · characterful', kind: 'sans', category: 'Bold & modern' },
  { id: 'league-spartan', label: 'League Spartan', family: 'League Spartan', vibe: 'Bold · geometric', kind: 'sans', category: 'Bold & modern' },
  { id: 'kanit', label: 'Kanit', family: 'Kanit', vibe: 'Loud · condensed', kind: 'sans', category: 'Display' },
  { id: 'barlow-condensed', label: 'Barlow Condensed', family: 'Barlow Condensed', vibe: 'Tall · sporty', kind: 'sans', category: 'Display' },
  { id: 'saira-condensed', label: 'Saira Condensed', family: 'Saira Condensed', vibe: 'Narrow · techy', kind: 'sans', category: 'Display' },
  { id: 'archivo-narrow', label: 'Archivo Narrow', family: 'Archivo Narrow', vibe: 'Compact · grotesk', kind: 'sans', category: 'Display' },
  { id: 'koulen', label: 'Koulen', family: 'Koulen', vibe: 'Condensed caps', kind: 'sans', category: 'Display' },
  { id: 'bowlby-one', label: 'Bowlby One', family: 'Bowlby One', vibe: 'Fat · rounded', kind: 'sans', category: 'Display' },
  { id: 'monoton', label: 'Monoton', family: 'Monoton', vibe: 'Retro · lined', kind: 'sans', category: 'Display' },
  { id: 'ultra', label: 'Ultra', family: 'Ultra', vibe: 'Heavy slab', kind: 'serif', category: 'Display' },
  { id: 'changa-one', label: 'Changa One', family: 'Changa One', vibe: 'Bold · sturdy', kind: 'sans', category: 'Display' },
  { id: 'paytone-one', label: 'Paytone One', family: 'Paytone One', vibe: 'Solid · rounded', kind: 'sans', category: 'Display' },
  { id: 'luckiest-guy', label: 'Luckiest Guy', family: 'Luckiest Guy', vibe: 'Comic · playful', kind: 'sans', category: 'Display' },
  { id: 'fredoka', label: 'Fredoka', family: 'Fredoka', vibe: 'Rounded · fun', kind: 'sans', category: 'Display' },
  { id: 'lilita-one', label: 'Lilita One', family: 'Lilita One', vibe: 'Chubby · bold', kind: 'sans', category: 'Display' },
  { id: 'abril-fatface', label: 'Abril Fatface', family: 'Abril Fatface', vibe: 'Fashion · fat serif', kind: 'serif', category: 'Display' },
  { id: 'pt-serif', label: 'PT Serif', family: 'PT Serif', vibe: 'Versatile · readable', kind: 'serif', category: 'Editorial serif' },
  { id: 'merriweather', label: 'Merriweather', family: 'Merriweather', vibe: 'Screen serif · solid', kind: 'serif', category: 'Editorial serif' },
  { id: 'zilla-slab', label: 'Zilla Slab', family: 'Zilla Slab', vibe: 'Slab · sturdy', kind: 'serif', category: 'Editorial serif' },
  { id: 'roboto-slab', label: 'Roboto Slab', family: 'Roboto Slab', vibe: 'Slab · modern', kind: 'serif', category: 'Editorial serif' },
  { id: 'domine', label: 'Domine', family: 'Domine', vibe: 'Body serif · strong', kind: 'serif', category: 'Editorial serif' },
  { id: 'frank-ruhl-libre', label: 'Frank Ruhl Libre', family: 'Frank Ruhl Libre', vibe: 'Elegant · contrast', kind: 'serif', category: 'Editorial serif' },
  { id: 'vollkorn', label: 'Vollkorn', family: 'Vollkorn', vibe: 'Warm · bookish', kind: 'serif', category: 'Editorial serif' },
  { id: 'rozha-one', label: 'Rozha One', family: 'Rozha One', vibe: 'Display · dramatic', kind: 'serif', category: 'Editorial serif' },
  { id: 'cardo', label: 'Cardo', family: 'Cardo', vibe: 'Scholarly · refined', kind: 'serif', category: 'Elegant' },
  { id: 'forum', label: 'Forum', family: 'Forum', vibe: 'Roman caps · classic', kind: 'serif', category: 'Elegant' },
  { id: 'tenor-sans', label: 'Tenor Sans', family: 'Tenor Sans', vibe: 'Quiet · refined', kind: 'sans', category: 'Elegant' },
  { id: 'bodoni-moda', label: 'Bodoni Moda', family: 'Bodoni Moda', vibe: 'Vogue · high-contrast', kind: 'serif', category: 'Elegant' },
  { id: 'rufina', label: 'Rufina', family: 'Rufina', vibe: 'Slim · stylish', kind: 'serif', category: 'Elegant' },
  { id: 'amiri', label: 'Amiri', family: 'Amiri', vibe: 'Classical · ornate', kind: 'serif', category: 'Elegant' },
  { id: 'fira-code', label: 'Fira Code', family: 'Fira Code', vibe: 'Code · ligatures', kind: 'sans', category: 'Technical' },
  { id: 'roboto-mono', label: 'Roboto Mono', family: 'Roboto Mono', vibe: 'Clean mono', kind: 'sans', category: 'Technical' },
  { id: 'source-code-pro', label: 'Source Code Pro', family: 'Source Code Pro', vibe: 'Dev · legible', kind: 'sans', category: 'Technical' },
  { id: 'inconsolata', label: 'Inconsolata', family: 'Inconsolata', vibe: 'Humanist mono', kind: 'sans', category: 'Technical' },
  { id: 'caveat', label: 'Caveat', family: 'Caveat', vibe: 'Casual handwriting', kind: 'sans', category: 'Handwritten' },
  { id: 'dancing-script', label: 'Dancing Script', family: 'Dancing Script', vibe: 'Flowing script', kind: 'serif', category: 'Handwritten' },
  { id: 'pacifico', label: 'Pacifico', family: 'Pacifico', vibe: 'Brush · friendly', kind: 'serif', category: 'Handwritten' },
  { id: 'permanent-marker', label: 'Permanent Marker', family: 'Permanent Marker', vibe: 'Marker · bold', kind: 'sans', category: 'Handwritten' },
  { id: 'satisfy', label: 'Satisfy', family: 'Satisfy', vibe: 'Signature script', kind: 'serif', category: 'Handwritten' },
  { id: 'patrick-hand', label: 'Patrick Hand', family: 'Patrick Hand', vibe: 'Neat handwriting', kind: 'sans', category: 'Handwritten' },
]

export function resolveBrandFont(id?: string | null): BrandFontDef | null {
  if (!id) return null
  return BRAND_FONTS.find(f => f.id === id) ?? null
}

// Default type per surface when no brand font is chosen — a heavy geometric sans
// for the bold, modern, high-contrast look (never the system sans).
export const DEFAULT_QUOTE_FONT = 'montserrat'
export const DEFAULT_CARD_FONT = 'montserrat'
export const DEFAULT_BANNER_FONT = 'montserrat'
export const DEFAULT_CAROUSEL_FONT = 'montserrat'

type Weight = 400 | 700 | 800
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
  // 400 + 700 + 800 (black). Single-weight display faces (Anton, Bebas…) only
  // ship 400 — the missing weights resolve to null and Satori uses the closest.
  const [w400, w700, w800] = await Promise.all([fetchWoff(def.id, 400), fetchWoff(def.id, 700), fetchWoff(def.id, 800)])
  const fonts: SatoriFont[] = []
  if (w400) fonts.push({ name: def.family, data: w400, weight: 400, style: 'normal' })
  if (w700) fonts.push({ name: def.family, data: w700, weight: 700, style: 'normal' })
  if (w800) fonts.push({ name: def.family, data: w800, weight: 800, style: 'normal' })
  if (!fonts.length) return null
  return { family: def.family, fonts }
}
