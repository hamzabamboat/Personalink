// Image-engine presets: AI-photo styles, branded-template styles, themes, and
// LinkedIn aspect ratios. Single source of truth for the image generation UI
// and the generation routes.

export type ImageStyleKind = 'ai_photo' | 'template'
export type TemplateType = 'quote' | 'stat' | 'title' | 'list' | 'myth'
export type ThemeId = 'midnight' | 'mist' | 'ink'
export type AspectRatioId = '1080x1350' | '1080x1080' | '1200x627'

export interface StylePreset {
  id: string
  label: string
  kind: ImageStyleKind
  /** Set when kind === 'template'. */
  templateType?: TemplateType
  /** Set when kind === 'ai_photo' — appended to the gpt-image prompt. */
  promptHint?: string
}

export const STYLE_PRESETS: StylePreset[] = [
  // ── AI photo styles (gpt-image) ──
  { id: 'photorealistic', label: 'Photorealistic', kind: 'ai_photo', promptHint: 'photorealistic, professional editorial lighting' },
  { id: 'minimalist', label: 'Minimalist', kind: 'ai_photo', promptHint: 'minimalist, generous negative space, clean, muted palette' },
  { id: 'vibrant', label: 'Vibrant', kind: 'ai_photo', promptHint: 'bold saturated colours, energetic, high contrast' },
  { id: 'illustration', label: 'Illustration', kind: 'ai_photo', promptHint: 'flat vector illustration, simple shapes, brand-friendly' },
  { id: 'abstract', label: 'Abstract', kind: 'ai_photo', promptHint: 'abstract geometric concept art, smooth gradients' },
  // ── Branded template styles (next/og render) ──
  { id: 'quote', label: 'Quote card', kind: 'template', templateType: 'quote' },
  { id: 'stat', label: 'Stat callout', kind: 'template', templateType: 'stat' },
  { id: 'title', label: 'Title card', kind: 'template', templateType: 'title' },
  { id: 'list', label: 'List / tips', kind: 'template', templateType: 'list' },
  { id: 'myth', label: 'Myth vs reality', kind: 'template', templateType: 'myth' },
]

export interface Theme {
  id: ThemeId
  label: string
  /** CSS background (solid or gradient) consumed by the ImageResponse template. */
  bg: string
  ink: string
  sub: string
  accent: string
}

export const THEMES: Theme[] = [
  { id: 'midnight', label: 'Midnight', bg: 'radial-gradient(circle at 78% 0%, #2f3f9c 0%, #16204c 44%, #0a0e24 100%)', ink: '#FFFFFF', sub: '#AEB9E4', accent: '#00E5C0' },
  { id: 'mist', label: 'Mist', bg: 'radial-gradient(circle at 50% 0%, #FFFFFF 0%, #ECF0FF 62%, #DDE4FF 100%)', ink: '#0B1024', sub: '#5566AA', accent: '#2B4DFF' },
  { id: 'ink', label: 'Ink', bg: 'radial-gradient(circle at 50% 0%, #23233e 0%, #0f0f1b 54%, #060609 100%)', ink: '#FFFFFF', sub: '#8A8AA0', accent: '#FFB020' },
]

// ── Curated palettes ──
// Bold & modern: clean backgrounds + one bright, harmonious accent. Users pick a
// palette instead of a raw hex, so colours can never clash. `dark` drives
// light/dark-aware bits; `onAccent` is text drawn on an accent-filled element.
export interface Palette {
  id: string
  label: string
  bg: string
  ink: string
  sub: string
  accent: string
  onAccent: string
  dark: boolean
}

export const PALETTES: Palette[] = [
  { id: 'electric',  label: 'Electric',  bg: '#FFFFFF', ink: '#0B0B12', sub: '#6F7480', accent: '#2B4DFF', onAccent: '#FFFFFF', dark: false },
  { id: 'flame',     label: 'Flame',     bg: '#F7F6F3', ink: '#141414', sub: '#6E6E6E', accent: '#FF4D2E', onAccent: '#FFFFFF', dark: false },
  { id: 'violet',    label: 'Violet',    bg: '#FBFAFF', ink: '#16121F', sub: '#6E6A86', accent: '#6A3DFF', onAccent: '#FFFFFF', dark: false },
  { id: 'forest',    label: 'Forest',    bg: '#F4F8F4', ink: '#0E1A12', sub: '#5C6B60', accent: '#0E9E62', onAccent: '#FFFFFF', dark: false },
  { id: 'electric-block', label: 'Electric block', bg: '#2B4DFF', ink: '#FFFFFF', sub: '#C7D2FF', accent: '#FFE24D', onAccent: '#0B0B12', dark: true },
  { id: 'sunset-block',   label: 'Sunset block',   bg: '#FF4D2E', ink: '#FFFFFF', sub: '#FFD9CF', accent: '#FFFFFF', onAccent: '#FF4D2E', dark: true },
  { id: 'midnight',  label: 'Midnight',  bg: '#0B0E1A', ink: '#FFFFFF', sub: '#9AA4C4', accent: '#5B86FF', onAccent: '#FFFFFF', dark: true },
  { id: 'carbon',    label: 'Carbon',    bg: '#121214', ink: '#FFFFFF', sub: '#9A9AA6', accent: '#FFB020', onAccent: '#0B0B12', dark: true },
]

export const DEFAULT_PALETTE = 'electric'

export function resolvePalette(id?: string | null): Palette {
  return PALETTES.find(p => p.id === id) ?? PALETTES[0]
}

/** Adapt a palette into the Theme shape the renderers consume. */
export function paletteToTheme(p: Palette): Theme {
  return { id: p.dark ? 'ink' : 'mist', label: p.label, bg: p.bg, ink: p.ink, sub: p.sub, accent: p.accent }
}

export const ASPECT_RATIOS: Record<AspectRatioId, { w: number; h: number; label: string }> = {
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait — best for feed' },
  '1080x1080': { w: 1080, h: 1080, label: 'Square' },
  '1200x627': { w: 1200, h: 627, label: 'Landscape / link' },
}

export const DEFAULT_ASPECT_RATIO: AspectRatioId = '1080x1350'

/**
 * gpt-image-1.5 supports 1024x1024, 1024x1536, 1536x1024. Pick the closest
 * orientation; the route then sharp-crops to the exact LinkedIn target.
 */
export function gptImageSize(ar: AspectRatioId): '1024x1024' | '1024x1536' | '1536x1024' {
  const { w, h } = ASPECT_RATIOS[ar]
  if (h > w) return '1024x1536'
  if (w > h) return '1536x1024'
  return '1024x1024'
}

export function resolveStylePreset(id: string | undefined | null): StylePreset {
  return STYLE_PRESETS.find(p => p.id === id) ?? STYLE_PRESETS[0]
}

export function resolveTheme(id: string | undefined | null): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}

export function resolveAspectRatio(id: string | undefined | null): AspectRatioId {
  return (id && id in ASPECT_RATIOS ? id : DEFAULT_ASPECT_RATIO) as AspectRatioId
}

/** Clamp a requested variation count to a safe, cost-controlled range. */
export function clampVariations(n: number | undefined): number {
  if (!n || n < 1) return 1
  return Math.min(4, Math.floor(n))
}
