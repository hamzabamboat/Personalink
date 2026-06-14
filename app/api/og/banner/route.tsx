import { NextRequest } from 'next/server'
import { renderBannerResponse } from '@/lib/images/render-banner'
import { resolveTheme, resolvePalette, paletteToTheme } from '@/lib/images/presets'
import { loadBrandFont, DEFAULT_BANNER_FONT } from '@/lib/images/fonts'
import type { CardBrand } from '@/lib/images/render-card'

export const runtime = 'nodejs'

// Auth-free banner renderer for marketing surfaces (e.g. the landing showcase).
// Content comes from query params; nothing is stored.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const fontId = sp.get('font') || DEFAULT_BANNER_FONT
  const font = await loadBrandFont(fontId)
  const brand: CardBrand = { accentColor: sp.get('accent'), fontFamily: fontId }
  const keywords = (sp.get('keywords') || 'AI,Growth,LinkedIn').split(',').map(s => s.trim()).filter(Boolean).slice(0, 4)
  const scale = Number(sp.get('scale')) || 1
  const palId = sp.get('palette')
  const theme = palId ? paletteToTheme(resolvePalette(palId)) : resolveTheme(sp.get('theme') || 'ink')
  return renderBannerResponse(
    {
      name: sp.get('name') || 'Aarav Sharma',
      designation: sp.get('designation') || 'Founder, Northwind',
      tagline: sp.get('tagline') || 'Helping founders grow on LinkedIn',
      keywords,
    },
    theme,
    brand,
    scale,
    font,
  )
}
