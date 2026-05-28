'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import posthog from 'posthog-js'
import { ease, fadeUp, staggerParent } from './motion'

const HERO_H1_FLAG = 'landing-hero-h1'

const H1_VARIANTS = {
  control: "The only AI that doesn't sound like AI.",
  'variant-b': "Your LinkedIn voice, automated. Not someone else's voice, badly faked.",
} as const

type H1Key = keyof typeof H1_VARIANTS

const VOICE_DIMS = [
  { label: 'Sentence rhythm', value: 88 },
  { label: 'Vocabulary fit', value: 94 },
  { label: 'Opening patterns', value: 82 },
  { label: 'Pet phrases', value: 76 },
  { label: 'Emotional register', value: 90 },
  { label: 'Punctuation tics', value: 71 },
]

function VoiceFingerprintDemo() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, ease }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 440,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        boxShadow: 'var(--sh-3)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', marginBottom: 6 }}>
          // your post —
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
          &ldquo;Took us four months to close the round. Mostly because conviction isn&apos;t a thing investors hand you. You build it for them, one data point at a time.&rdquo;
        </p>
      </div>

      <div style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
            // voice fingerprint
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--pl-accent)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--pl-accent)',
              animation: 'pulseDot 2.4s ease-in-out infinite',
            }} />
            analyzing
          </span>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {VOICE_DIMS.map((d, i) => (
            <motion.li
              key={d.label}
              initial={{ opacity: 0, x: -10 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.18, ease }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span className="pl-hero-dim-label" style={{
                fontSize: 12, color: 'var(--ink-3)', minWidth: 130,
                fontFamily: 'var(--f-sans)',
              }}>
                {d.label}
              </span>
              <span style={{
                flex: 1, height: 5, background: 'var(--surface-3)',
                borderRadius: 'var(--r-pill)', overflow: 'hidden',
              }}>
                <motion.span
                  initial={{ width: '0%' }}
                  animate={inView ? { width: `${d.value}%` } : { width: '0%' }}
                  transition={{ duration: 0.7, delay: 0.45 + i * 0.18, ease }}
                  style={{
                    display: 'block', height: '100%',
                    background: 'var(--pl-accent)',
                    borderRadius: 'var(--r-pill)',
                  }}
                />
              </span>
              <span style={{
                fontFamily: 'var(--f-mono)', fontSize: 11,
                color: 'var(--pl-accent)', minWidth: 30, textAlign: 'right',
              }}>
                {d.value}%
              </span>
            </motion.li>
          ))}
        </ul>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.35 + VOICE_DIMS.length * 0.18 + 0.35 }}
        style={{
          padding: '12px 20px',
          background: 'var(--surface-2)',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          fingerprint locked
        </span>
        <span>confidence · 98%</span>
      </motion.div>
    </motion.div>
  )
}

export function Hero() {
  const [h1Key, setH1Key] = useState<H1Key>('control')
  const exposedRef = useRef(false)

  useEffect(() => {
    function read() {
      try {
        const v = posthog.getFeatureFlag?.(HERO_H1_FLAG)
        if (v === 'variant-b') setH1Key('variant-b')
        else if (v === 'control') setH1Key('control')
        if (!exposedRef.current && typeof v === 'string') {
          exposedRef.current = true
        }
      } catch {
        /* posthog optional */
      }
    }
    read()
    try {
      posthog.onFeatureFlags?.(read)
    } catch {
      /* posthog optional */
    }
  }, [])

  const h1 = H1_VARIANTS[h1Key]

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg)',
        paddingTop: 64,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: '-10%', zIndex: 0, pointerEvents: 'none',
          filter: 'blur(60px)', opacity: 0.5,
        }}
      >
        <div style={{
          position: 'absolute', width: '38vw', height: '38vw', maxWidth: 580, maxHeight: 580,
          borderRadius: '50%', top: '-10%', left: '8%',
          background: 'radial-gradient(circle, rgba(43,77,255,.28), transparent 65%)',
          animation: 'drift1 22s ease-in-out infinite alternate',
        }} />
        <div style={{
          position: 'absolute', width: '38vw', height: '38vw', maxWidth: 580, maxHeight: 580,
          borderRadius: '50%', top: '18%', right: '-6%',
          background: 'radial-gradient(circle, rgba(107,134,255,.2), transparent 65%)',
          animation: 'drift2 28s ease-in-out infinite alternate',
        }} />
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(var(--pl-accent-glow),.07) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div
        className="pl-hero-grid"
        style={{
          maxWidth: 'var(--max)',
          margin: '0 auto',
          padding: '0 var(--pad)',
          paddingTop: 'clamp(56px, 9vw, 96px)',
          paddingBottom: 'clamp(56px, 9vw, 112px)',
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 'clamp(40px, 6vw, 72px)',
          alignItems: 'center',
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerParent}
        >
          <motion.div
            variants={fadeUp}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24,
              fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em',
              color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)',
              borderRadius: 'var(--r-xs)', background: 'var(--surface)',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--pl-accent)',
              animation: 'pulseDot 2.4s ease-in-out infinite', flexShrink: 0,
            }} />
            // LinkedIn AI, without the AI tells
          </motion.div>

          <motion.h1
            key={h1Key}
            variants={fadeUp}
            className="pl-hero-h1"
            style={{
              fontFamily: 'var(--f-sans)',
              fontWeight: 700,
              lineHeight: 1.06,
              fontSize: 'clamp(30px, 4.4vw, 56px)',
              letterSpacing: '-0.035em',
              color: 'var(--ink)',
              marginBottom: 20,
              textWrap: 'balance',
            }}
          >
            {h1}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            style={{
              fontSize: 'clamp(15px, 1.4vw, 17px)',
              color: 'var(--ink-3)',
              lineHeight: 1.7,
              marginBottom: 28,
              maxWidth: 540,
            }}
          >
            6-dimensional voice mapping plus an Anti-AI humanizer. Generate LinkedIn posts in your exact tone. Pay in INR. Get GST invoices.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="pl-hero-cta-stack"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}
          >
            <Link
              href="/voice-analyzer"
              className="pl-hero-cta-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                height: 52, padding: '0 24px', borderRadius: 'var(--r-md)',
                fontSize: 15, fontWeight: 700, textDecoration: 'none',
                background: 'var(--ink)', color: 'var(--bg)',
                border: 'none', boxShadow: 'var(--sh-2)', transition: 'opacity .15s',
              }}
            >
              Analyze My Voice — Free, No Signup
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 14, height: 14 }} aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>

            <a
              href="/api/auth/linkedin"
              className="pl-hero-cta-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                height: 52, padding: '0 22px', borderRadius: 'var(--r-md)',
                fontSize: 15, fontWeight: 600, textDecoration: 'none',
                background: 'var(--surface)', color: 'var(--ink)',
                border: '1px solid var(--line-2)', boxShadow: 'var(--sh-1)',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="#0a66c2" style={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden="true">
                <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04s-2.14 1.44-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 .01-4.13 2.06 2.06 0 0 1-.01 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
              </svg>
              Connect LinkedIn — start free
            </a>
          </motion.div>

          <motion.p
            variants={fadeUp}
            style={{
              fontFamily: 'var(--f-mono)', fontSize: 12,
              color: 'var(--ink-4)', lineHeight: 1.7, margin: 0,
              display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
            }}
          >
            3 posts a month. No card.
            <Link
              href="/pricing"
              style={{
                color: 'var(--pl-accent)',
                textDecoration: 'none',
                marginLeft: 4,
              }}
            >
              See pricing →
            </Link>
          </motion.p>
        </motion.div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <VoiceFingerprintDemo />
        </div>
      </div>
    </section>
  )
}
