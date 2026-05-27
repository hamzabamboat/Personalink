'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { motion } from 'framer-motion'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import type { ScoredVoiceFingerprint } from '@/lib/anthropic'

const DIM_LABELS: Array<{ key: keyof ScoredVoiceFingerprint['scores']; label: string; hint: string }> = [
  { key: 'burstiness', label: 'Burstiness', hint: 'How much you mix short, punchy lines with longer ones.' },
  { key: 'vocabulary', label: 'Vocabulary', hint: 'Plain words vs. specialist / sophisticated language.' },
  { key: 'personal', label: 'Personal', hint: 'How often you tell stories with real names, places, dates.' },
  { key: 'punctuation_play', label: 'Punctuation Play', hint: 'Use of dashes, fragments, line breaks, white space.' },
  { key: 'warmth', label: 'Warmth', hint: 'Reserved & clinical vs. warm & conversational.' },
  { key: 'hook_power', label: 'Hook Power', hint: 'How attention-grabbing your first lines are.' },
]

export function ResultsCard({ token, fingerprint }: { token: string; fingerprint: ScoredVoiceFingerprint }) {
  const router = useRouter()
  const firedRef = useRef(false)
  const [shared, setShared] = useState(false)
  const [email, setEmail] = useState('')
  const [emailState, setEmailState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [emailMsg, setEmailMsg] = useState<string | null>(null)

  // PostHog: fired once on mount (report rendered successfully)
  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    try {
      posthog.capture('voice_analyzer_completed', {
        token,
        scores: fingerprint.scores,
        has_phrases: (fingerprint.signature_phrases?.length ?? 0) > 0,
      })
    } catch { /* posthog optional */ }
  }, [token, fingerprint])

  const chartData = useMemo(
    () => DIM_LABELS.map(d => ({ dimension: d.label, value: fingerprint.scores[d.key] ?? 50 })),
    [fingerprint.scores],
  )

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/voice-analyzer/results/${token}`
    : `https://personalink.in/voice-analyzer/results/${token}`

  const onShare = async () => {
    const text = fingerprint.one_liner
      ? `My LinkedIn voice fingerprint: "${fingerprint.one_liner}" — try yours free:`
      : `I just analysed my LinkedIn voice on 6 dimensions. Try yours free:`

    try {
      posthog.capture('voice_analyzer_shared', { token })
    } catch { /* posthog optional */ }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'My LinkedIn Voice Fingerprint', text, url: shareUrl })
        setShared(true)
        return
      } catch { /* user dismissed */ }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`)
      setShared(true)
      setTimeout(() => setShared(false), 2400)
    } catch {
      window.prompt('Copy this link to share:', shareUrl)
    }
  }

  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailMsg('Enter a valid email.')
      setEmailState('error')
      return
    }
    setEmailState('saving')
    setEmailMsg(null)
    try {
      const res = await fetch('/api/voice-analyzer/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: trimmed }),
      })
      const data = await res.json()
      if (!data?.ok) {
        setEmailState('error')
        setEmailMsg(data?.error || 'Something went wrong. Try again.')
        return
      }
      try {
        posthog.capture('voice_analyzer_converted_to_signup', { token })
      } catch { /* posthog optional */ }
      setEmailState('done')
      // Bounce them into the main signup/onboarding flow. The API already
      // stashed the email in an httpOnly cookie for the LinkedIn callback,
      // so the redirect URL stays clean (no email in the query string).
      const redirectTo = typeof data.redirect_to === 'string' && data.redirect_to.startsWith('/')
        ? data.redirect_to
        : '/?from=voice-analyzer'
      router.push(redirectTo)
    } catch {
      setEmailState('error')
      setEmailMsg('Network hiccup. Try again.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(20px,3vw,28px)' }}>
      {/* Radar card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 20,
          padding: 'clamp(20px,4vw,32px)',
          boxShadow: 'var(--sh-1)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            letterSpacing: '.06em',
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          // 6-dimension fingerprint
        </div>
        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
              <PolarGrid stroke="var(--line)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--f-sans)' }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Voice"
                dataKey="value"
                stroke="var(--pl-accent)"
                fill="var(--pl-accent)"
                fillOpacity={0.32}
                isAnimationActive
                animationDuration={900}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {/* Score chips below the radar for clarity on small screens */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10,
            marginTop: 16,
          }}
        >
          {DIM_LABELS.map(d => (
            <div
              key={d.key}
              title={d.hint}
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {d.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>
                {fingerprint.scores[d.key]}
                <span style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 500 }}> / 100</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Phrases + avoidances */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 'clamp(16px,2.5vw,20px)',
        }}
      >
        <Panel title="Signature phrases" subtitle="Words and phrasings the model spotted in your samples.">
          {fingerprint.signature_phrases.length === 0 ? (
            <p style={{ color: 'var(--ink-4)', fontSize: 14, margin: 0 }}>None strong enough to lock in yet.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fingerprint.signature_phrases.map((p, i) => (
                <li
                  key={i}
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 13,
                    padding: '8px 10px',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    color: 'var(--ink-2, var(--ink))',
                  }}
                >
                  &ldquo;{p}&rdquo;
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Things you don't do" subtitle="Patterns the model never saw — your voice's negative space.">
          {fingerprint.avoidances.length === 0 ? (
            <p style={{ color: 'var(--ink-4)', fontSize: 14, margin: 0 }}>Nothing stood out as off-limits.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fingerprint.avoidances.map((p, i) => (
                <li key={i} style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--ink-3)' }}>
                  — {p}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Share row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '14px 16px',
        }}
      >
        <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
          Share your fingerprint — your post URL works on LinkedIn, Twitter, WhatsApp.
        </div>
        <button
          onClick={onShare}
          style={{
            background: 'var(--ink)',
            color: 'var(--bg)',
            fontWeight: 600,
            fontSize: 14,
            padding: '10px 16px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {shared ? 'Link copied ✓' : 'Share my result'}
        </button>
      </div>

      {/* Soft email gate CTA */}
      <motion.form
        onSubmit={onEmailSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--pl-accent) 8%, var(--surface)) 100%)',
          border: '1px solid color-mix(in srgb, var(--pl-accent) 25%, var(--line))',
          borderRadius: 20,
          padding: 'clamp(22px,4vw,32px)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 'clamp(20px,3.4vw,26px)', fontWeight: 500, letterSpacing: '-0.02em' }}>
          Lock in this fingerprint. Start generating posts in your voice.
        </h2>
        <p style={{ margin: '8px 0 18px', color: 'var(--ink-3)', fontSize: 15, lineHeight: 1.55 }}>
          We&apos;ll save this fingerprint to your PersonaLink account so every post you generate sounds like you.
          Free to start. ₹999/mo when you&apos;re ready.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@work.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={emailState === 'saving' || emailState === 'done'}
            style={{
              flex: '1 1 220px',
              padding: '12px 14px',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              color: 'var(--ink)',
              fontSize: 15,
              fontFamily: 'var(--f-sans)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={emailState === 'saving' || emailState === 'done'}
            style={{
              background: 'var(--pl-accent)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              padding: '12px 18px',
              borderRadius: 10,
              border: 'none',
              cursor: emailState === 'saving' ? 'wait' : 'pointer',
              boxShadow: 'var(--sh-blue)',
              minWidth: 160,
            }}
          >
            {emailState === 'saving' ? 'Saving…' : emailState === 'done' ? 'Redirecting…' : 'Save my fingerprint'}
          </button>
        </div>
        {emailMsg && (
          <div style={{ marginTop: 10, fontSize: 13, color: emailState === 'error' ? '#b91c1c' : 'var(--ink-3)' }}>
            {emailMsg}
          </div>
        )}
      </motion.form>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        padding: 'clamp(18px,3vw,24px)',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2, marginBottom: 14 }}>{subtitle}</div>
      )}
      {children}
    </div>
  )
}
