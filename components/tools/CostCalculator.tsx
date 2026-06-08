'use client'

import { useState } from 'react'
import { COMPETITORS, COMPETITOR_SLUGS, calcYearOne, inr, type CompetitorSlug } from '@/lib/competitor-data'

// Interactive INR-vs-USD "true cost" calculator. Reuses calcYearOne() from
// lib/competitor-data so the numbers stay in sync with the /vs pages.
export function CostCalculator() {
  const [slug, setSlug] = useState<CompetitorSlug>('taplio')
  const [posts, setPosts] = useState(22)
  const c = COMPETITORS[slug]
  const r = calcYearOne(c, posts)

  const card = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 20 } as const

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 'clamp(18px,4vw,28px)' }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 22 }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Compare against</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {COMPETITOR_SLUGS.map((s) => (
              <button key={s} onClick={() => setSlug(s)} style={{
                padding: '8px 14px', borderRadius: 'var(--r-pill)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${slug === s ? 'var(--pl-accent)' : 'var(--line)'}`,
                background: slug === s ? 'var(--pl-accent-soft)' : 'var(--surface)',
                color: slug === s ? 'var(--pl-accent)' : 'var(--ink-3)',
              }}>{COMPETITORS[s].name}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: '1 1 220px' }}>
          <label htmlFor="posts" style={{ display: 'block', fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'var(--ink-4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Posts per month: <span style={{ color: 'var(--ink)' }}>{posts}</span></label>
          <input id="posts" type="range" min={4} max={90} value={posts} onChange={(e) => setPosts(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--pl-accent)' }} />
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        <div style={{ ...card, borderColor: 'var(--pl-accent)', background: 'var(--pl-accent-soft)' }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6 }}>PersonaLink · {r.pl.planName}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}>{inr(r.pl.monthlyInr)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-4)' }}>/mo</span></div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 4 }}>{inr(r.pl.yearOneInr)} / year · INR, GST invoice</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6 }}>{c.name} · {r.competitor.planName}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-2)', letterSpacing: '-0.03em' }}>{inr(r.competitor.yearOneInr)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-4)' }}>{r.competitor.isLifetime ? ' once' : ' / year'}</span></div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 4 }}>USD-billed · + forex · no GST credit</div>
        </div>
        <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 6 }}>{r.plWins ? 'You’d save (year 1)' : 'Difference (year 1)'}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: r.plWins ? '#16a34a' : 'var(--ink)', letterSpacing: '-0.03em' }}>{inr(Math.abs(r.savingsInr))}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 4 }}>{r.plWins ? 'with PersonaLink' : 'before forex & GST'}</div>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: 14, lineHeight: 1.6 }}>
        Estimates use public USD list prices (≈₹84/USD) and exclude the ~2–4% forex fee on Indian cards and the 18% GST input-tax credit you lose with USD-billed tools — so the real gap is usually larger.
      </p>
    </div>
  )
}
