'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TOUR_STEPS } from '@/lib/tour/steps'
import { resolveStepView, shouldNavigate } from '@/lib/tour/gating'
import type { TourRect } from '@/lib/tour/positioning'
import { TourContext, type TourContextValue } from '@/components/tour/tour-context'

const VISIBLE_STOPS = TOUR_STEPS.filter(s => s.id !== 'done').length
const TARGET_WAIT_MS = 1500

export function TourProvider({
  plan,
  autoStart,
  children,
}: {
  plan: string
  autoStart: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [stepIndex, setStepIndex] = useState<number | null>(null)
  const [targetRect, setTargetRect] = useState<TourRect | null>(null)
  const startedRef = useRef(false)
  const persistedRef = useRef(false)

  const start = useCallback(() => {
    persistedRef.current = false
    setTargetRect(null)
    setStepIndex(0)
  }, [])

  const persist = useCallback(() => {
    if (persistedRef.current) return
    persistedRef.current = true
    fetch('/api/me/tour', { method: 'POST' }).catch(() => {})
  }, [])

  const close = useCallback(() => {
    setStepIndex(null)
    setTargetRect(null)
  }, [])

  const finish = useCallback(() => {
    persist()
    close()
  }, [persist, close])

  const skip = useCallback(() => {
    persist()
    close()
  }, [persist, close])

  const next = useCallback(() => {
    setStepIndex(i => {
      if (i === null) return i
      if (i >= TOUR_STEPS.length - 1) {
        persist()
        return null
      }
      return i + 1
    })
    setTargetRect(null)
  }, [persist])

  const back = useCallback(() => {
    setStepIndex(i => (i === null ? i : Math.max(0, i - 1)))
    setTargetRect(null)
  }, [])

  // Auto-start once when eligible.
  useEffect(() => {
    if (autoStart && !startedRef.current && stepIndex === null) {
      startedRef.current = true
      start()
    }
  }, [autoStart, stepIndex, start])

  const step = stepIndex === null ? null : TOUR_STEPS[stepIndex]

  // Navigate to the step's page, then measure its spotlight target.
  useEffect(() => {
    if (stepIndex === null || !step) return

    if (shouldNavigate(step, plan, pathname)) {
      router.push(step.route!)
      return // re-runs when pathname updates
    }

    const view = resolveStepView(step, plan)
    if (view.mode === 'center') {
      queueMicrotask(() => setTargetRect(null))
      return
    }

    let cancelled = false
    const selector = `[data-tour="${view.target}"]`
    const startedAt = performance.now()

    const tick = () => {
      if (cancelled) return
      const el = document.querySelector(selector) as HTMLElement | null
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        const r = el.getBoundingClientRect()
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        return
      }
      if (performance.now() - startedAt > TARGET_WAIT_MS) {
        setTargetRect(null) // graceful fallback → overlay shows a centered card
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => {
      cancelled = true
    }
  }, [stepIndex, step, pathname, plan, router])

  // Keep the spotlight aligned on resize / scroll.
  useEffect(() => {
    if (stepIndex === null || !step) return
    const view = resolveStepView(step, plan)
    if (view.mode !== 'spotlight') return
    const selector = `[data-tour="${view.target}"]`
    const remeasure = () => {
      const el = document.querySelector(selector) as HTMLElement | null
      if (el) {
        const r = el.getBoundingClientRect()
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      }
    }
    window.addEventListener('resize', remeasure)
    window.addEventListener('scroll', remeasure, true)
    return () => {
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('scroll', remeasure, true)
    }
  }, [stepIndex, step, plan])

  const value = useMemo<TourContextValue>(() => {
    if (stepIndex === null || !step) {
      return {
        isActive: false, stepId: null, view: null, targetRect: null, progress: null,
        isFirst: true, cta: null, start, next, back, skip, finish,
      }
    }
    return {
      isActive: true,
      stepId: step.id,
      view: resolveStepView(step, plan),
      targetRect,
      progress: step.id === 'done' ? null : { current: stepIndex + 1, total: VISIBLE_STOPS },
      isFirst: stepIndex === 0,
      cta: step.cta ?? null,
      start, next, back, skip, finish,
    }
  }, [stepIndex, step, plan, targetRect, start, next, back, skip, finish])

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}
