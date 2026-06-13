import { NextRequest } from 'next/server'
import { renderCardResponse, type CardBrand } from '@/lib/images/render-card'
import { resolveTheme, resolveAspectRatio, type TemplateType } from '@/lib/images/presets'
import { loadBrandFont, DEFAULT_QUOTE_FONT, DEFAULT_CARD_FONT } from '@/lib/images/fonts'
import type { CardContent } from '@/lib/images/card-content'

export const runtime = 'nodejs'

const VALID: TemplateType[] = ['quote', 'stat', 'title', 'list', 'myth']

// Live preview renderer — used by the brand-kit preview and the public free card
// generator. Content comes from query params; nothing is stored.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const rawType = sp.get('type') as TemplateType | null
  const type: TemplateType = rawType && VALID.includes(rawType) ? rawType : 'quote'

  const content: CardContent = {
    type,
    kicker: sp.get('kicker') || undefined,
    headline: sp.get('headline') || 'Your headline appears here',
    body: sp.get('body') || undefined,
    lines: sp.get('lines') ? sp.get('lines')!.split('|').filter(Boolean) : undefined,
  }

  const brand: CardBrand = {
    accentColor: sp.get('accent'),
    primaryColor: sp.get('primary'),
    logoUrl: sp.get('logo'),
    name: sp.get('name'),
    sub: sp.get('sub'),
    fontFamily: sp.get('font'),
  }

  const defaultFont = type === 'quote' ? DEFAULT_QUOTE_FONT : DEFAULT_CARD_FONT
  const font = await loadBrandFont(brand.fontFamily || defaultFont)
  return renderCardResponse(content, resolveTheme(sp.get('theme')), brand, resolveAspectRatio(sp.get('ar')), font)
}
