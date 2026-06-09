'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTour } from '@/components/tour/tour-context'
import { computeCardPosition } from '@/lib/tour/positioning'

const CARD_WIDTH = 320
const PAD = 8 // inflate the spotlight around the target

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    queueMicrotask(() => setReduced(mq.matches))
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function TourOverlay() {
  const tour = useTour()
  const router = useRouter()
  const reduced = usePrefersReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState({ width: 1024, height: 768 })
  const [cardHeight, setCardHeight] = useState(180)

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.getBoundingClientRect().height)
  }, [tour.stepId, tour.targetRect, tour.view])

  if (!tour.isActive || !tour.view) return null

  const isMobile = viewport.width < 640
  const spotlightRect = tour.view.mode === 'spotlight' ? tour.targetRect : null
  const hasSpotlight = !!spotlightRect

  // Card position
  let cardStyle: React.CSSProperties
  if (isMobile) {
    cardStyle = { left: 12, right: 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }
  } else if (hasSpotlight && spotlightRect) {
    const inflated = {
      top: spotlightRect.top - PAD,
      left: spotlightRect.left - PAD,
      width: spotlightRect.width + PAD * 2,
      height: spotlightRect.height + PAD * 2,
    }
    const pos = computeCardPosition(inflated, { width: CARD_WIDTH, height: cardHeight }, viewport, {
      preferred: 'auto',
    })
    cardStyle = { top: pos.top, left: pos.left, width: CARD_WIDTH }
  } else {
    // centered
    cardStyle = {
      top: '50%',
      left: '50%',
      width: Math.min(CARD_WIDTH + 40, viewport.width - 24),
      transform: 'translate(-50%, -50%)',
    }
  }

  const spring = reduced
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 320, damping: 32 } as const)
  const fade = reduced ? { duration: 0 } : { duration: 0.2 }

  const onDone = () => {
    if (tour.cta) router.push(tour.cta.route)
    tour.finish()
  }

  return (
    <AnimatePresence>
      <motion.div
        key="tour-root"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fade}
        style={{ position: 'fixed', inset: 0, zIndex: 100 }}
      >
        {/* Click-blocker / dim. Transparent when a spotlight provides its own dim. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: hasSpotlight ? 'transparent' : 'rgba(12,18,32,0.72)',
          }}
        />

        {/* Spotlight: a box whose huge spread box-shadow forms the dim with a hole. */}
        {hasSpotlight && spotlightRect && (
          <motion.div
            aria-hidden
            initial={false}
            animate={{
              top: spotlightRect.top - PAD,
              left: spotlightRect.left - PAD,
              width: spotlightRect.width + PAD * 2,
              height: spotlightRect.height + PAD * 2,
            }}
            transition={spring}
            style={{
              position: 'absolute',
              borderRadius: 12,
              pointerEvents: 'none',
              boxShadow: '0 0 0 9999px rgba(12,18,32,0.72), 0 0 0 3px var(--pl-accent)',
            }}
          />
        )}

        {/* Coach card */}
        <motion.div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={tour.view.title}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={fade}
          style={{
            position: 'fixed',
            zIndex: 102,
            ...cardStyle,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--sh-3)',
            padding: 18,
          }}
        >
          {/* Progress */}
          {tour.progress && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {Array.from({ length: tour.progress.total }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: i < tour.progress!.current ? 'var(--pl-accent)' : 'var(--line-2)',
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 10, letterSpacing: '.07em', color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                STEP {tour.progress.current} / {tour.progress.total}
              </span>
            </div>
          )}

          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, fontFamily: 'var(--f-sans)' }}>
            {tour.view.title}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-3)', marginBottom: 16, fontFamily: 'var(--f-sans)' }}>
            {tour.view.body}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {tour.stepId === 'done' ? (
              <>
                <button onClick={tour.finish} style={btnGhost}>Maybe later</button>
                <button onClick={onDone} style={btnPrimary}>{tour.cta?.label ?? 'Done'}</button>
              </>
            ) : (
              <>
                <button onClick={tour.skip} style={{ fontSize: 12, color: 'var(--ink-4)', background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'var(--f-sans)' }}>
                  Skip tour
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!tour.isFirst && <button onClick={tour.back} style={btnGhost}>Back</button>}
                  <button onClick={tour.next} style={btnPrimary}>Next →</button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const btnPrimary: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--bg)', background: 'var(--pl-accent)',
  padding: '7px 16px', borderRadius: 8, border: 0, cursor: 'pointer', fontFamily: 'var(--f-sans)',
}
const btnGhost: React.CSSProperties = {
  fontSize: 12, color: 'var(--ink-3)', background: 'transparent',
  padding: '7px 14px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', fontFamily: 'var(--f-sans)',
}
