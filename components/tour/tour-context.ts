'use client'

import { createContext, useContext } from 'react'
import type { TourStepId } from '@/lib/tour/steps'
import type { StepView } from '@/lib/tour/gating'
import type { TourRect } from '@/lib/tour/positioning'

export interface TourContextValue {
  isActive: boolean
  stepId: TourStepId | null
  view: StepView | null
  /** Measured rect of the spotlight target, or null (center / still resolving). */
  targetRect: TourRect | null
  /** 1-based progress among the visible stops (welcome..voice), or null on the done card. */
  progress: { current: number; total: number } | null
  isFirst: boolean
  cta: { label: string; route: string } | null
  start: () => void
  next: () => void
  back: () => void
  skip: () => void
  finish: () => void
}

export const TourContext = createContext<TourContextValue | null>(null)

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within <TourProvider>')
  return ctx
}
