import { describe, it, expect } from 'vitest'
import { computeCardPosition } from '@/lib/tour/positioning'

const card = { width: 320, height: 180 }
const vp = { width: 1024, height: 768 }

describe('computeCardPosition', () => {
  it('places the card to the right of a target near the left edge', () => {
    const pos = computeCardPosition({ top: 300, left: 0, width: 80, height: 40 }, card, vp)
    expect(pos.side).toBe('right')
    expect(pos.left).toBe(80 + 14) // target right edge + gap
  })

  it('falls back to the left side when there is no room on the right or bottom', () => {
    const tallCard = { width: 320, height: 700 }
    const pos = computeCardPosition({ top: 300, left: 944, width: 80, height: 40 }, tallCard, vp)
    expect(pos.side).toBe('left')
  })

  it('clamps the card inside the viewport (never negative top)', () => {
    const tallCard = { width: 320, height: 700 }
    const pos = computeCardPosition({ top: 300, left: 944, width: 80, height: 40 }, tallCard, vp)
    expect(pos.top).toBeGreaterThanOrEqual(12)
    expect(pos.left).toBeGreaterThanOrEqual(12)
  })

  it('clamps a bottom-placed card horizontally within the viewport', () => {
    const pos = computeCardPosition({ top: 10, left: 990, width: 24, height: 24 }, card, vp)
    expect(pos.left + card.width).toBeLessThanOrEqual(vp.width - 12)
  })

  it('honors a fitting preferred side', () => {
    const pos = computeCardPosition({ top: 300, left: 400, width: 80, height: 40 }, card, vp, { preferred: 'bottom' })
    expect(pos.side).toBe('bottom')
  })
})
