'use client'

import { motion } from 'framer-motion'
import { fadeUp, staggerParent, viewportOnce } from './motion'

/* ─── Mini on-brand mockups (pure CSS/SVG, theme-aware via CSS vars) ─── */

// Branded quote/stat card
function GraphicMock() {
  return (
    <div style={{
      aspectRatio: '4 / 3', borderRadius: 'var(--r-md)', overflow: 'hidden',
      background: 'linear-gradient(150deg, #0b1020, #161d36)', border: '1px solid var(--line)',
      padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 4, borderRadius: 4, background: 'var(--pl-accent)', alignSelf: 'stretch' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <div style={{ height: 8, width: '92%', borderRadius: 3, background: 'rgba(255,255,255,0.92)' }} />
          <div style={{ height: 8, width: '78%', borderRadius: 3, background: 'rgba(255,255,255,0.92)' }} />
          <div style={{ height: 8, width: '54%', borderRadius: 3, background: 'rgba(255,255,255,0.55)' }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 16, height: 16, borderRadius: 5, background: 'var(--pl-accent)' }} />
        <div style={{ height: 6, width: 56, borderRadius: 3, background: 'rgba(255,255,255,0.4)' }} />
      </div>
    </div>
  )
}

// AI photo tile
function PhotoMock() {
  return (
    <div style={{
      aspectRatio: '4 / 3', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative',
      background: 'radial-gradient(120% 120% at 25% 15%, #6b86ff 0%, #2b4dff 38%, #131a33 100%)',
      border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg viewBox="0 0 24 24" width={30} height={30} fill="none" aria-hidden="true" style={{ filter: 'drop-shadow(0 1px 6px rgba(0,0,0,.35))' }}>
        <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" fill="#fff" opacity="0.95" />
        <circle cx="19" cy="5" r="1.3" fill="#fff" opacity="0.85" />
        <circle cx="5.5" cy="18" r="1" fill="#fff" opacity="0.7" />
      </svg>
      <span style={{
        position: 'absolute', left: 12, bottom: 12, fontFamily: 'var(--f-mono)', fontSize: 9.5,
        color: '#fff', background: 'rgba(0,0,0,0.32)', borderRadius: 'var(--r-pill)', padding: '3px 8px',
        backdropFilter: 'blur(4px)',
      }}>1200×627 · on-brand</span>
    </div>
  )
}

// Carousel: stacked slides
function CarouselMock() {
  return (
    <div style={{ aspectRatio: '4 / 3', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[2, 1, 0].map((i) => (
        <div key={i} style={{
          position: 'absolute', width: '52%', aspectRatio: '4 / 5', borderRadius: 'var(--r-sm)',
          background: i === 0 ? 'linear-gradient(160deg,#161d36,#0b1020)' : 'var(--surface-3)',
          border: '1px solid var(--line)', boxShadow: 'var(--sh-1)',
          transform: `translateX(${i * 18}px) translateY(${i * -6}px) rotate(${i * 3}deg)`,
          opacity: i === 0 ? 1 : 0.55, zIndex: 3 - i,
          padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {i === 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ height: 4, width: 22, borderRadius: 3, background: 'var(--pl-accent)' }} />
                <div style={{ height: 6, width: '85%', borderRadius: 3, background: 'rgba(255,255,255,0.9)' }} />
                <div style={{ height: 6, width: '62%', borderRadius: 3, background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, color: 'rgba(255,255,255,0.6)' }}>1 / 6</span>
            </>
          )}
        </div>
      ))}
      <span style={{
        position: 'absolute', right: 8, bottom: 6, fontFamily: 'var(--f-mono)', fontSize: 9.5,
        color: 'var(--pl-accent)', background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent)',
        borderRadius: 'var(--r-pill)', padding: '2px 8px',
      }}>PDF</span>
    </div>
  )
}

// LinkedIn banner (wide)
function BannerMock() {
  return (
    <div style={{ aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: '100%', aspectRatio: '1584 / 396', borderRadius: 'var(--r-sm)', overflow: 'hidden',
        background: 'linear-gradient(120deg,#0b1020,#1b2440)', border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 4, height: 30, borderRadius: 3, background: 'var(--pl-accent)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ height: 8, width: 96, borderRadius: 3, background: 'rgba(255,255,255,0.92)' }} />
            <div style={{ height: 5, width: 64, borderRadius: 3, background: 'var(--pl-accent)' }} />
          </div>
        </div>
        <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid var(--pl-accent)', opacity: 0.5 }} />
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
