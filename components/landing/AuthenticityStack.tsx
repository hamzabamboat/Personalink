'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ease, fadeUp, viewportOnce } from './motion'

const RADAR_DIMS = [
  { label: 'Rhythm', value: 0.88 },
  { label: 'Vocabulary', value: 0.94 },
  { label: 'Openings', value: 0.82 },
  { label: 'Pet phrases', value: 0.76 },
  { label: 'Warmth', value: 0.90 },
  { label: 'Punctuation', value: 0.71 },
]

function VoiceRadar() {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const vbW = 400
  const vbH = 340
  const center = { x: vbW / 2, y: vbH / 2 }
  const radius = 96

  const points = RADAR_DIMS.map((d, i) => {
    const angle = (Math.PI * 2 * i) / RADAR_DIMS.length - Math.PI / 2
    const r = radius * d.value
    const labelDist = radius + 22
    return {
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r,
      labelX: center.x + Math.cos(angle) * labelDist,
      labelY: center.y + Math.sin(angle) * labelDist,
      angle,
      label: d.label,
    }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z'

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${vbW} ${vbH}`}
      style={{ width: '100%', maxWidth: 400, height: 'auto', display: 'block', margin: '0 auto' }}
      aria-label="Voice fingerprint, six dimensions"
    >
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <circle key={i} cx={center.x} cy={center.y} r={radius * r} fill="none" stroke="var(--line)" strokeWidth="1" />
      ))}
      {RADAR_DIMS.map((_, i) => {
        const angle = (Math.PI * 2 * i) / RADAR_DIMS.length - Math.PI / 2
        return (
          <line
            key={i}
            x1={center.x}
            y1={center.y}
            x2={center.x + Math.cos(angle) * radius}
            y2={center.y + Math.sin(angle) * radius}
            stroke="var(--line)"
            strokeWidth="1"
          />
        )
      })}

      <motion.path
        d={pathD}
        fill="var(--pl-accent-soft)"
        stroke="var(--pl-accent)"
        strokeWidth="1.6"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.7, ease }}
        style={{ transformOrigin: `${center.x}px ${center.y}px`, transformBox: 'fill-box' }}
      />

      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="var(--pl-accent)"
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.5 + i * 0.06, ease }}
        />
      ))}

      {points.map((p, i) => {
        const anchor: 'start' | 'middle' | 'end' =
          p.labelX > center.x + 8 ? 'start' : p.labelX < center.x - 8 ? 'end' : 'middle'
        return (
          <text
            key={i}
            x={p.labelX}
            y={p.labelY}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="11"
            fontFamily="var(--f-mono)"
            fill="var(--ink-4)"
          >
            {p.label}
          </text>
        )
      })}
    </svg>
  )
}

const GENERIC_SAMPLE = `In today's rapidly evolving startup landscape, founders must leverage strategic insights to unlock unprecedented growth. Here are 5 transformative takeaways from my recent VC meeting that will revolutionize your fundraising approach. First, alignment is paramount. Second, scalability cannot be overstated. Third...`

const PERSONALINK_SAMPLE = `I thought I'd close my Series A in 6 weeks.

It took 4 months.

Three things I learned the hard way:

1. Conviction isn't a thing investors hand you. You build it for them, one data point at a time.
2. The soft no is the cruellest no. It costs you a month before you accept it.
3. The fastest investor in the round sets the price of everyone else's hesitation.`

function HumanizerDemo() {
  const [tab, setTab] = useState<'generic' | 'ours'>('ours')
  const isOurs = tab === 'ours'

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <div
        role="tablist"
        aria-label="Compare generators"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
        }}
      >
        {(['generic', 'ours'] as const).map((t) => {
          const on = tab === t
          return (
            <button
              key={t}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t)}
              style={{
                padding: '12px 14px',
                fontFamily: 'var(--f-mono)',
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: '0.03em',
                background: on ? 'var(--surface-2)' : 'transparent',
                color: on ? 'var(--ink)' : 'var(--ink-4)',
                border: 'none',
                borderBottom: on ? '2px solid var(--pl-accent)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'color .15s, background .15s',
              }}
            >
              {t === 'generic' ? '// generic GPT' : '// PersonaLink'}
            </button>
          )
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease }}
        style={{ padding: '18px 20px' }}
      >
        <p
          style={{
            fontSize: 13,
            color: 'var(--ink-2)',
            lineHeight: 1.7,
            whiteSpace: 'pre-line',
            margin: 0,
            minHeight: 168,
            fontStyle: isOurs ? 'normal' : 'italic',
          }}
        >
          {isOurs ? PERSONALINK_SAMPLE : GENERIC_SAMPLE}
        </p>
      </motion.div>

      <div
        style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--line)',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {[
          { label: 'AI detector', score: isOurs ? 6 : 94, good: isOurs },
          { label: 'Reads as human', score: isOurs ? 96 : 12, good: isOurs },
        ].map((row) => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: 11,
              color: 'var(--ink-4)', minWidth: 110,
            }}>
              {row.label}
            </span>
            <span style={{
              flex: 1, height: 5, background: 'var(--surface-3)',
              borderRadius: 'var(--r-pill)', overflow: 'hidden',
            }}>
              <motion.span
                key={`${row.label}-${tab}`}
                initial={{ width: '0%' }}
                animate={{ width: `${row.score}%` }}
                transition={{ duration: 0.55, ease }}
                style={{
                  display: 'block', height: '100%',
                  background: row.good ? '#10b981' : '#ef4444',
                  borderRadius: 'var(--r-pill)',
                }}
              />
            </span>
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: 11,
              color: row.good ? '#10b981' : '#ef4444',
              minWidth: 38, textAlign: 'right',
            }}>
              {row.score}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AuthenticityStack() {
  return (
    <section
      id="authenticity"
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--line)',
        padding: 'clamp(60px, 8vw, 100px) var(--pad)',
      }}
    >
      <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em',
              color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)',
              borderRadius: 'var(--r-xs)', background: 'var(--surface-2)',
            }}
          >
            // 01 — The authenticity stack
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-sans)', fontWeight: 700,
              fontSize: 'clamp(26px, 4vw, 44px)', color: 'var(--ink)',
              letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16,
              textWrap: 'balance',
            }}
          >
            Other tools generate AI posts.{' '}
            <em style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--ink-3)' }}>
              We generate yours.
            </em>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 560, marginBottom: 48 }}>
            Two layers, one job: catch how you write, then write inside that space — without leaving a tell.
          </p>
        </motion.div>

        <div
          className="pl-auth-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 'clamp(20px, 3vw, 32px)',
          }}
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={fadeUp}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
              padding: 'clamp(24px, 3vw, 32px)',
              boxShadow: 'var(--sh-1)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{
                fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--pl-accent)',
                padding: '4px 10px', background: 'var(--pl-accent-soft)',
                border: '1px solid var(--pl-accent)', borderRadius: 'var(--r-pill)',
              }}>
                voice fingerprint
              </span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>01</span>
            </div>
            <h3 style={{
              fontWeight: 700, fontSize: 'clamp(18px, 2vw, 22px)',
              color: 'var(--ink)', letterSpacing: '-0.02em',
              lineHeight: 1.25, marginBottom: 10,
            }}>
              Six dimensions, one fingerprint.
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-4)', lineHeight: 1.65, marginBottom: 24 }}>
              Sentence rhythm, vocabulary, openings, pet phrases, emotional register, punctuation tics. Every draft constrained inside that space.
            </p>
            <div style={{ marginTop: 'auto' }}>
              <VoiceRadar />
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={fadeUp}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
              padding: 'clamp(24px, 3vw, 32px)',
              boxShadow: 'var(--sh-1)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{
                fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--pl-accent)',
                padding: '4px 10px', background: 'var(--pl-accent-soft)',
                border: '1px solid var(--pl-accent)', borderRadius: 'var(--r-pill)',
              }}>
                anti-AI humanizer
              </span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>02</span>
            </div>
            <h3 style={{
              fontWeight: 700, fontSize: 'clamp(18px, 2vw, 22px)',
              color: 'var(--ink)', letterSpacing: '-0.02em',
              lineHeight: 1.25, marginBottom: 10,
            }}>
              Built to pass for human.
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-4)', lineHeight: 1.65, marginBottom: 20 }}>
              Toggle a generic GPT post next to one PersonaLink wrote. The detector tells the story.
            </p>
            <HumanizerDemo />
          </motion.div>
        </div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          style={{
            marginTop: 'clamp(40px, 6vw, 64px)',
            textAlign: 'center',
            fontFamily: 'var(--f-display)',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(18px, 2.4vw, 26px)',
            color: 'var(--ink-2)',
            lineHeight: 1.4,
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Reads like you wrote it. Even to the AI detectors.
        </motion.p>
      </div>
    </section>
  )
}
