export interface TourRect { top: number; left: number; width: number; height: number }
export interface Size { width: number; height: number }
export interface Viewport { width: number; height: number }
export type TourSide = 'top' | 'bottom' | 'left' | 'right'
export interface CardPosition { top: number; left: number; side: TourSide }

interface Opts {
  gap?: number
  margin?: number
  preferred?: 'auto' | TourSide
}

/**
 * Pick the side of `target` with room for `card` and return clamped fixed
 * coordinates. Preference order: explicit `preferred`, then right, bottom,
 * left, top; if none fit, the side with the most free space wins.
 */
export function computeCardPosition(
  target: TourRect,
  card: Size,
  viewport: Viewport,
  opts: Opts = {},
): CardPosition {
  const gap = opts.gap ?? 14
  const margin = opts.margin ?? 12
  const preferred = opts.preferred ?? 'auto'

  const space: Record<TourSide, number> = {
    right: viewport.width - (target.left + target.width),
    left: target.left,
    bottom: viewport.height - (target.top + target.height),
    top: target.top,
  }

  const needsHoriz = card.width + gap + margin
  const needsVert = card.height + gap + margin
  const fits = (side: TourSide): boolean =>
    side === 'right' || side === 'left' ? space[side] >= needsHoriz : space[side] >= needsVert

  const order: TourSide[] =
    preferred !== 'auto'
      ? ([preferred, 'right', 'bottom', 'left', 'top'].filter((s, i, a) => a.indexOf(s) === i) as TourSide[])
      : (['right', 'bottom', 'left', 'top'] as TourSide[])

  const side: TourSide =
    order.find(fits) ??
    (['right', 'bottom', 'left', 'top'] as TourSide[]).reduce((best, s) => (space[s] > space[best] ? s : best), 'right')

  let top: number
  let left: number
  if (side === 'right') {
    left = target.left + target.width + gap
    top = target.top + target.height / 2 - card.height / 2
  } else if (side === 'left') {
    left = target.left - card.width - gap
    top = target.top + target.height / 2 - card.height / 2
  } else if (side === 'bottom') {
    top = target.top + target.height + gap
    left = target.left + target.width / 2 - card.width / 2
  } else {
    top = target.top - card.height - gap
    left = target.left + target.width / 2 - card.width / 2
  }

  left = Math.max(margin, Math.min(left, viewport.width - card.width - margin))
  top = Math.max(margin, Math.min(top, viewport.height - card.height - margin))

  return { top, left, side }
}
