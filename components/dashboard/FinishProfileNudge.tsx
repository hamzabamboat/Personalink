'use client'

import Link from 'next/link'
import { Sparkles, X } from 'lucide-react'

interface FinishProfileNudgeProps {
  plan: string
  onDismiss?: () => void
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function FinishProfileNudge({ plan, onDismiss }: FinishProfileNudgeProps) {
  const planLabel = capitalize(plan)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px 22px',
        borderRadius: 14,
        marginBottom: 20,
        background: 'color-mix(in srgb, var(--pl-accent) 9%, var(--surface))',
        border: '1.5px solid color-mix(in srgb, var(--pl-accent) 40%, var(--line))',
        boxShadow: '0 2px 12px color-mix(in srgb, var(--pl-accent) 10%, transparent)',
        position: 'relative',
      }}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <X size={14} strokeWidth={2} />
      </button>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingRight: 28 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--pl-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={17} color="#fff" strokeWidth={1.75} />
        </div>
        <div>
          <h3
            style={{
              margin: '0 0 4px',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--ink)',
              lineHeight: 1.3,
              fontFamily: 'var(--f-sans)',
            }}
          >
            You&apos;re all set on {planLabel} — finish tuning your voice.
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: 'var(--ink-2)',
              lineHeight: 1.55,
              fontFamily: 'var(--f-sans)',
            }}
          >
            Take ~2 minutes to complete your profile so every post sounds exactly like you wrote it — not like generic AI copy.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Link
          href="/dashboard/finish-profile"
          onClick={onDismiss}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            paddingLeft: 18,
            paddingRight: 18,
            borderRadius: 8,
            background: 'var(--pl-accent)',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: 'var(--f-sans)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Finish now
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 36,
            paddingLeft: 14,
            paddingRight: 14,
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid color-mix(in srgb, var(--pl-accent) 35%, var(--line))',
            color: 'var(--ink-2)',
            fontSize: 13.5,
            fontWeight: 500,
            fontFamily: 'var(--f-sans)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Later
        </button>
      </div>
    </div>
  )
}
