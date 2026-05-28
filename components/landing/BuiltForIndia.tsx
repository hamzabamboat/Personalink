'use client'

import { motion } from 'framer-motion'
import { fadeUp, staggerParent, viewportOnce } from './motion'

function UpiIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 32, height: 32 }} aria-hidden="true">
      <rect x="3" y="7" width="26" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 12h26" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M11 17l3 4 6-8"
        stroke="var(--pl-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="22"
        y="22"
        fontFamily="var(--f-mono)"
        fontSize="7"
        fontWeight="700"
        fill="currentColor"
      >
        ₹
      </text>
    </svg>
  )
}

function GstIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 32, height: 32 }} aria-hidden="true">
      <path
        d="M7 3h14l4 4v22H7V3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M21 3v4h4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 13h10M11 17h10M11 21h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <text
        x="11"
        y="10.5"
        fontFamily="var(--f-mono)"
        fontSize="5.5"
        fontWeight="700"
        fill="var(--pl-accent)"
      >
        GST
      </text>
    </svg>
  )
}

function IndiaIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" style={{ width: 32, height: 32 }} aria-hidden="true">
      <rect x="3" y="6" width="26" height="6" rx="1.5" fill="#FF9933" opacity="0.85" />
      <rect x="3" y="12" width="26" height="6" rx="0" fill="var(--surface)" stroke="currentColor" strokeWidth="0.5" />
      <rect x="3" y="18" width="26" height="6" rx="1.5" fill="#138808" opacity="0.85" />
      <circle cx="16" cy="15" r="1.7" fill="none" stroke="#1e3a8a" strokeWidth="0.8" />
      <g stroke="#1e3a8a" strokeWidth="0.4" opacity="0.7">
        <line x1="14.3" y1="15" x2="17.7" y2="15" />
        <line x1="16" y1="13.3" x2="16" y2="16.7" />
      </g>
    </svg>
  )
}

const PILLARS = [
  {
    icon: <UpiIcon />,
    title: 'Pay in INR.',
    desc: 'UPI, cards, net banking — through Razorpay. No FX. No surprise fees.',
  },
  {
    icon: <GstIcon />,
    title: 'GST invoices for B2B.',
    desc: 'Auto-generated, GSTIN-ready, downloadable in two clicks. Your CA will thank you.',
  },
  {
    icon: <IndiaIcon />,
    title: 'Hinglish + Indian English.',
    desc: 'The fingerprint picks up code-switching, regional rhythm, and the way Indian professionals actually write.',
  },
]

export function BuiltForIndia() {
  return (
    <section
      id="built-for-india"
      style={{
        background: 'var(--bg)',
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
              borderRadius: 'var(--r-xs)', background: 'var(--surface)',
            }}
          >
            // 02 — Built for India
          </div>
          <h2
            style={{
              fontFamily: 'var(--f-sans)', fontWeight: 700,
              fontSize: 'clamp(26px, 4vw, 44px)', color: 'var(--ink)',
              letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16,
              textWrap: 'balance',
            }}
          >
            Local payments. Local invoicing.{' '}
            <em style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--ink-3)' }}>
              Local voice.
            </em>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 560, marginBottom: 48 }}>
            Built where the customers are. Priced for the market, paid through the rails it already uses.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerParent}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 'clamp(16px, 2.5vw, 24px)',
          }}
        >
          {PILLARS.map((p) => (
            <motion.div
              key={p.title}
              variants={fadeUp}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)',
                padding: 'clamp(22px, 3vw, 28px)',
                boxShadow: 'var(--sh-1)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  width: 56, height: 56, borderRadius: 'var(--r-md)',
                  background: 'var(--surface-2)', border: '1px solid var(--line)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink-2)', marginBottom: 18,
                }}
              >
                {p.icon}
              </div>
              <h3 style={{
                fontWeight: 700, fontSize: 17, color: 'var(--ink)',
                letterSpacing: '-0.015em', lineHeight: 1.3, marginBottom: 8,
              }}>
                {p.title}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--ink-4)', lineHeight: 1.65, margin: 0 }}>
                {p.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

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
            maxWidth: 720,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Built in India. By Indians.
        </motion.p>
      </div>
    </section>
  )
}
