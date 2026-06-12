'use client'

import { motion } from 'framer-motion'
import { fadeUp, staggerParent, viewportOnce } from './motion'

/* ─── Real product renders via the live OG endpoints (auth-free), so the
   showcase shows actual PersonaLink output rather than abstractions. ─── */

const ACCENT = '%232B4DFF' // #2B4DFF, url-encoded
function cardSrc(type: string, ar: string, headline: string) {
  return `/api/og/card?type=${type}&theme=midnight&ar=${ar}&accent=${ACCENT}` +
    `&headline=${encodeURIComponent(headline)}&name=${encodeURIComponent('Your brand')}`
}

// Real branded quote card (square)
function GraphicMock() {
  return (
    <div style={{ aspectRatio: '1 / 1', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cardSrc('quote', '1080x1080', 'Consistency beats genius.')} alt="A branded quote card generated in PersonaLink" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

// AI photo tile (photoreal generation is inherently varied — a styled tile, not one fixed sample)
function PhotoMock() {
  return (
    <div style={{
      aspectRatio: '1 / 1', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative',
      background: 'radial-gradient(130% 130% at 22% 12%, #7d97ff 0%, #2b4dff 36%, #0e1530 100%)',
      border: '1px solid var(--line)', boxShadow: 'var(--sh-1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg viewBox="0 0 24 24" width={34} height={34} fill="none" aria-hidden="true" style={{ filter: 'drop-shadow(0 1px 7px rgba(0,0,0,.4))' }}>
        <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" fill="#fff" opacity="0.96" />
        <circle cx="19" cy="5" r="1.3" fill="#fff" opacity="0.85" />
        <circle cx="5.5" cy="18" r="1" fill="#fff" opacity="0.7" />
      </svg>
      <span style={{
        position: 'absolute', left: 12, bottom: 12, fontFamily: 'var(--f-mono)', fontSize: 9.5,
        color: '#fff', background: 'rgba(0,0,0,0.32)', borderRadius: 'var(--r-pill)', padding: '3px 8px',
        backdropFilter: 'blur(4px)',
      }}>gpt-image · your brief</span>
    </div>
  )
}

// Carousel: a real rendered cover slide, with placeholder slides fanned behind
function CarouselMock() {
  return (
    <div style={{ aspectRatio: '4 / 3', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[2, 1].map((i) => (
        <div key={i} style={{
          position: 'absolute', width: '47%', aspectRatio: '1080 / 1350', borderRadius: 'var(--r-sm)',
          background: 'var(--surface-3)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)',
          transform: `translateX(${i * 15}px) translateY(${i * -5}px) rotate(${i * 3}deg)`,
          opacity: 0.5, zIndex: 1,
        }} />
      ))}
      <div style={{ position: 'relative', width: '47%', aspectRatio: '1080 / 1350', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line)', boxShadow: 'var(--sh-2)', zIndex: 3 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cardSrc('title', '1080x1350', '5 lessons from my first raise')} alt="A carousel cover slide" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <span style={{
        position: 'absolute', right: 8, bottom: 6, fontFamily: 'var(--f-mono)', fontSize: 9.5,
        color: 'var(--pl-accent)', background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent)',
        borderRadius: 'var(--r-pill)', padding: '2px 8px', zIndex: 4,
      }}>PDF</span>
    </div>
  )
}

// Real rendered LinkedIn banner (wide)
function BannerMock() {
  return (
    <div style={{ aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', aspectRatio: '1584 / 396', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/api/og/banner?theme=ink&accent=%232B4DFF" alt="A LinkedIn banner generated in PersonaLink" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    </div>
  )
}

const PILLARS = [
  {
    n: '01', tag: 'Branded graphics', accent: true,
    title: 'Turn any post into an on-brand graphic.',
    desc: 'Quote, stat, title, list and myth-buster cards — rendered in your brand colour and logo. Unlimited, on every plan.',
    mock: <GraphicMock />,
  },
  {
    n: '02', tag: 'AI photos',
    title: 'Photoreal images from a single prompt.',
    desc: 'Describe it; we generate a clean, professional image and crop it to the exact LinkedIn ratio. No stock-photo tax.',
    mock: <PhotoMock />,
  },
  {
    n: '03', tag: 'Carousels → PDF',
    title: 'Carousels written and exported for you.',
    desc: 'Give a topic, get a multi-slide carousel — copy drafted in your voice, slides designed, ready as a LinkedIn PDF.',
    mock: <CarouselMock />,
  },
  {
    n: '04', tag: 'Profile banner',
    title: 'A profile banner that looks designed.',
    desc: 'Your name, title and brand on a clean 1584×396 banner — downloadable in HD. No Canva, no designer.',
    mock: <BannerMock />,
  },
]

export function VisualsShowcase() {
  return (
    <section
      id="visuals"
      style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--line)',
        padding: 'clamp(60px, 8vw, 100px) var(--pad)',
      }}
    >
      <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
            fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em',
            color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)',
            borderRadius: 'var(--r-xs)', background: 'var(--surface)',
          }}>
            // 04 — Visuals
          </div>
          <h2 style={{
            fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(26px, 4vw, 48px)',
            color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 16,
            textWrap: 'balance',
          }}>
            The post is written. Now make it{' '}
            <em style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--ink-3)' }}>
              impossible to scroll past.
            </em>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 600, marginBottom: 48 }}>
            Posts with a visual stop the scroll. PersonaLink builds them for you — branded graphics, AI photos,
            carousels and your profile banner — all in your brand kit, without opening a design tool.
          </p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={viewportOnce} variants={staggerParent}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'clamp(14px, 2vw, 18px)' }}
        >
          {PILLARS.map((p) => (
            <motion.div key={p.tag} variants={fadeUp} className="col-span-6 md:col-span-3">
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
                padding: 'clamp(20px, 2.6vw, 26px)', height: '100%', boxShadow: 'var(--sh-1)',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{
                    fontFamily: 'var(--f-mono)', fontSize: 11, padding: '4px 10px', borderRadius: 'var(--r-pill)',
                    color: p.accent ? 'var(--pl-accent)' : 'var(--ink-4)',
                    background: p.accent ? 'var(--pl-accent-soft)' : 'var(--surface-2)',
                    border: `1px solid ${p.accent ? 'var(--pl-accent)' : 'var(--line)'}`,
                  }}>{p.tag}</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{p.n}</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 17, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--ink-4)', lineHeight: 1.6, marginBottom: 20 }}>{p.desc}</p>
                <div style={{ marginTop: 'auto' }}>{p.mock}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Brand-kit thread */}
        <motion.div
          initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp}
          style={{
            marginTop: 'clamp(16px, 2vw, 18px)',
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
            padding: 'clamp(18px, 2.4vw, 24px)', boxShadow: 'var(--sh-1)',
            display: 'flex', alignItems: 'center', gap: 'clamp(14px, 3vw, 28px)', flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['var(--pl-accent)', '#0b1020', '#10b981'].map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: 8, background: c, border: '1px solid var(--line)' }} />
              ))}
            </div>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--pl-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 700 }}>P</div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0, flex: 1, minWidth: 240 }}>
            <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>Set your brand kit once.</strong>{' '}
            Pick a colour, drop in your logo, and every graphic, carousel and banner renders on-brand — automatically.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
