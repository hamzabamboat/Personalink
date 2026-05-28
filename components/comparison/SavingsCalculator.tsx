'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  type Competitor,
  PL_PLANS,
  calcYearOne,
  inr,
  pickPlPlanFor,
  pickCompetitorPlanFor,
} from '@/lib/competitor-data'

type Props = {
  competitor: Competitor
}

export function SavingsCalculator({ competitor }: Props) {
  const [posts, setPosts] = useState(20)
  const [clients, setClients] = useState(1)
  const isAgency = clients > 1

  const breakdown = useMemo(() => calcYearOne(competitor, posts), [competitor, posts])
  const plPlanId = pickPlPlanFor(posts)
  const cPlan = pickCompetitorPlanFor(competitor, posts)

  // Agency mode: estimate competitor cost = per-seat × seats; PL is custom-quoted.
  const agencyCompYear = isAgency
    ? competitor.pricingModel === 'lifetime'
      ? (cPlan.oneTimeUsd ?? 0) * 84 * clients
      : (cPlan.monthlyUsd ?? 0) * 84 * 12 * clients
    : 0

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        background: 'var(--surface)',
        padding: 'clamp(20px, 4vw, 32px)',
        boxShadow: 'var(--sh-1)',
        display: 'grid',
        gap: 24,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          // savings calculator
        </div>
        <h3
          style={{
            fontSize: 'clamp(20px, 3vw, 26px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          See what you&apos;d save switching from {competitor.name}
        </h3>
      </div>

      {/* Sliders */}
      <div style={{ display: 'grid', gap: 18 }}>
        <Slider
          label="Posts per month"
          value={posts}
          min={5}
          max={100}
          step={1}
          onChange={setPosts}
          display={`${posts} post${posts === 1 ? '' : 's'}/mo`}
        />
        <Slider
          label="Number of LinkedIn accounts you manage"
          value={clients}
          min={1}
          max={30}
          step={1}
          onChange={setClients}
          display={clients === 1 ? 'Solo (just me)' : `Agency — ${clients} clients`}
        />
      </div>

      {/* Result */}
      <div
        style={{
          background: isAgency
            ? 'var(--surface-2)'
            : breakdown.plWins
              ? 'color-mix(in srgb, #10b981 8%, var(--surface))'
              : 'var(--surface-2)',
          border: isAgency
            ? '1px solid var(--line)'
            : breakdown.plWins
              ? '1px solid color-mix(in srgb, #10b981 32%, var(--line))'
              : '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          padding: 'clamp(18px, 3vw, 24px)',
        }}
      >
        {isAgency ? (
          <AgencyResult competitor={competitor} clients={clients} agencyCompYear={agencyCompYear} />
        ) : (
          <SoloResult
            competitor={competitor}
            breakdown={breakdown}
            plPlanLabel={PL_PLANS[plPlanId].name}
          />
        )}
      </div>

      <p
        style={{
          fontSize: 12,
          color: 'var(--ink-4)',
          lineHeight: 1.55,
          margin: 0,
          fontFamily: 'var(--f-mono)',
        }}
      >
        // exchange rate: ₹84/USD · {competitor.name} prices public as of 2026 ·
        excludes FX conversion fees (typically +2–4% on Indian cards)
      </p>
    </div>
  )
}

function SoloResult({
  competitor,
  breakdown,
  plPlanLabel,
}: {
  competitor: Competitor
  breakdown: ReturnType<typeof calcYearOne>
  plPlanLabel: string
}) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        <CostCard
          label="PersonaLink"
          plan={plPlanLabel}
          yearOne={breakdown.pl.yearOneInr}
          accent
        />
        <CostCard
          label={competitor.name}
          plan={
            breakdown.competitor.isLifetime && !/lifetime/i.test(breakdown.competitor.planName)
              ? `${breakdown.competitor.planName} (lifetime)`
              : breakdown.competitor.planName
          }
          yearOne={breakdown.competitor.yearOneInr}
        />
      </div>

      <div
        style={{
          textAlign: 'center',
          paddingTop: 6,
        }}
      >
        {breakdown.plWins ? (
          <>
            <div
              style={{
                fontSize: 'clamp(28px, 5vw, 40px)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: '#059669',
                lineHeight: 1.1,
              }}
            >
              You save {inr(breakdown.savingsInr)}/year
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>
              by switching to PersonaLink {plPlanLabel}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 'clamp(18px, 2.5vw, 22px)',
                fontWeight: 600,
                color: 'var(--ink)',
                lineHeight: 1.3,
              }}
            >
              {competitor.name} is {inr(Math.abs(breakdown.savingsInr))} cheaper in Year 1
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, maxWidth: 460, margin: '6px auto 0' }}>
              But it&apos;s a static toolkit — no ongoing voice tuning, no trend tracker, no GST invoices.
              See the honest comparison below for when {competitor.name} is the right pick.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AgencyResult({
  competitor,
  clients,
  agencyCompYear,
}: {
  competitor: Competitor
  clients: number
  agencyCompYear: number
}) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6 }}>
        Running {clients} accounts on <strong style={{ color: 'var(--ink)' }}>{competitor.name}</strong> at their per-seat rate would cost roughly{' '}
        <strong style={{ color: 'var(--ink)' }}>{inr(agencyCompYear)}/year</strong>.
      </div>
      <div
        style={{
          fontSize: 'clamp(22px, 3.5vw, 30px)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          lineHeight: 1.2,
        }}
      >
        PersonaLink agency plans are custom-priced — typically 50–70% cheaper.
      </div>
      <Link
        href="/for-agencies"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 22px',
          background: 'var(--ink)',
          color: 'var(--bg)',
          borderRadius: 'var(--r-md)',
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
          width: 'fit-content',
        }}
      >
        Get an agency quote
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 14, height: 14 }}>
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </Link>
    </div>
  )
}

function CostCard({
  label,
  plan,
  yearOne,
  accent,
}: {
  label: string
  plan: string
  yearOne: number
  accent?: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: accent
          ? '1px solid color-mix(in srgb, var(--pl-accent) 35%, var(--line))'
          : '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--f-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: accent ? 'var(--pl-accent)' : 'var(--ink-4)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6 }}>{plan}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
        }}
      >
        {inr(yearOne)}
        <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 400 }}> /yr</span>
      </div>
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{label}</span>
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--pl-accent)',
          }}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          accentColor: 'var(--pl-accent)',
          cursor: 'pointer',
        }}
      />
    </label>
  )
}
