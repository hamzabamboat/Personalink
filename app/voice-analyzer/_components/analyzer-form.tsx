'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { motion, AnimatePresence } from 'framer-motion'

const LINKEDIN_URL_RE = /^https?:\/\/(www\.)?linkedin\.com\/(posts|feed\/update|pulse)\//i

const PROGRESS_LINES = [
  'Reading your rhythm…',
  'Mapping your vocabulary…',
  'Listening for signature phrases…',
  'Sizing up your hooks…',
  'Tuning the emotional register…',
  'Finalising your fingerprint…',
]

type SampleErr = { index: number; message: string }

export function AnalyzerForm() {
  const router = useRouter()
  const [samples, setSamples] = useState<[string, string, string]>(['', '', ''])
  const [loading, setLoading] = useState(false)
  const [progressIdx, setProgressIdx] = useState(0)
  const [topError, setTopError] = useState<string | null>(null)
  const [sampleErrors, setSampleErrors] = useState<SampleErr[]>([])
  const startedRef = useRef(false)

  const filledCount = samples.filter(s => s.trim().length > 0).length
  const canSubmit = filledCount === 3 && !loading

  // Rotate the progress message every ~1.2s while loading
  useEffect(() => {
    if (!loading) return
    setProgressIdx(0)
    const t = setInterval(() => {
      setProgressIdx(i => (i + 1) % PROGRESS_LINES.length)
    }, 1200)
    return () => clearInterval(t)
  }, [loading])

  const updateSample = (idx: 0 | 1 | 2, value: string) => {
    setSamples(prev => {
      const next = [...prev] as [string, string, string]
      next[idx] = value
      return next
    })
    if (sampleErrors.some(e => e.index === idx)) {
      setSampleErrors(prev => prev.filter(e => e.index !== idx))
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setTopError(null)
    setSampleErrors([])
    setLoading(true)

    if (!startedRef.current) {
      try {
        posthog.capture('voice_analyzer_started', {
          sample_kinds: samples.map(s => (LINKEDIN_URL_RE.test(s.trim()) ? 'url' : 'text')),
        })
      } catch { /* posthog optional */ }
      startedRef.current = true
    }

    try {
      const res = await fetch('/api/voice-analyzer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples }),
      })
      const data = await res.json()
      if (!data?.ok) {
        setTopError(data?.error || 'Something went wrong. Try again.')
        if (Array.isArray(data?.sampleErrors)) setSampleErrors(data.sampleErrors)
        setLoading(false)
        return
      }
      // Success — navigate to the shareable results page
      router.push(`/voice-analyzer/results/${data.token}`)
    } catch {
      setTopError('Network hiccup. Try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {[0, 1, 2].map(i => {
        const value = samples[i as 0 | 1 | 2]
        const looksUrl = LINKEDIN_URL_RE.test(value.trim())
        const err = sampleErrors.find(e => e.index === i)
        return (
          <SampleField
            key={i}
            index={i}
            value={value}
            looksUrl={looksUrl}
            error={err?.message}
            disabled={loading}
            onChange={v => updateSample(i as 0 | 1 | 2, v)}
          />
        )
      })}

      {topError && (
        <div
          role="alert"
          style={{
            background: 'color-mix(in srgb, #ef4444 8%, var(--surface))',
            border: '1px solid color-mix(in srgb, #ef4444 30%, var(--line))',
            borderRadius: 12,
            padding: '12px 14px',
            color: '#b91c1c',
            fontSize: 14,
          }}
        >
          {topError}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          background: canSubmit ? 'var(--pl-accent)' : 'color-mix(in srgb, var(--pl-accent) 45%, var(--surface))',
          color: '#fff',
          fontWeight: 600,
          fontSize: 16,
          padding: '14px 22px',
          borderRadius: 12,
          border: 'none',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          boxShadow: canSubmit ? 'var(--sh-blue)' : 'none',
          transition: 'background .15s, box-shadow .15s, transform .1s',
          height: 52,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.span
              key={`progress-${progressIdx}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Spinner /> {PROGRESS_LINES[progressIdx]}
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              Analyze My Voice {filledCount > 0 && filledCount < 3 ? `· ${filledCount}/3` : ''}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <p style={{ fontSize: 12, color: 'var(--ink-4)', textAlign: 'center', margin: 0 }}>
        Takes ~20 seconds. We&apos;ll generate a shareable card you can post.
      </p>
    </form>
  )
}

function SampleField({
  index,
  value,
  looksUrl,
  error,
  disabled,
  onChange,
}: {
  index: number
  value: string
  looksUrl: boolean
  error?: string
  disabled: boolean
  onChange: (v: string) => void
}) {
  const charCount = value.length
  const hint = useMemo(() => {
    if (looksUrl) return 'Looks like a LinkedIn URL. We\'ll try to fetch it — if LinkedIn blocks the fetch, paste the post text instead.'
    if (charCount === 0) return 'Paste a LinkedIn post or its URL.'
    if (charCount < 80) return `Add a bit more — aim for at least 80 characters.`
    return `${charCount} chars`
  }, [looksUrl, charCount])

  return (
    <div>
      <label
        htmlFor={`sample-${index}`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: 'var(--f-mono)',
          fontSize: 11,
          letterSpacing: '.06em',
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        <span>// post {index + 1}</span>
        <span style={{ color: error ? '#b91c1c' : 'var(--ink-4)', textTransform: 'none', letterSpacing: 0, fontSize: 12 }}>
          {error || hint}
        </span>
      </label>
      <textarea
        id={`sample-${index}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        rows={looksUrl ? 1 : 5}
        placeholder={
          index === 0
            ? 'Paste a recent LinkedIn post you wrote. Or drop the post URL.'
            : index === 1
            ? 'Another post you wrote — the more varied, the sharper your fingerprint.'
            : 'One more. Three samples is the sweet spot.'
        }
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'var(--surface)',
          border: `1px solid ${error ? 'color-mix(in srgb, #ef4444 50%, var(--line))' : 'var(--line)'}`,
          borderRadius: 12,
          color: 'var(--ink)',
          fontSize: 15,
          lineHeight: 1.5,
          fontFamily: 'var(--f-sans)',
          resize: 'vertical',
          minHeight: looksUrl ? 48 : 120,
          transition: 'border-color .15s, box-shadow .15s',
          outline: 'none',
          opacity: disabled ? 0.7 : 1,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--pl-accent)'
          e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--pl-accent) 18%, transparent)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error
            ? 'color-mix(in srgb, #ef4444 50%, var(--line))'
            : 'var(--line)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

function Spinner() {
  return (
    <motion.span
      aria-hidden
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,.4)',
        borderTopColor: '#fff',
      }}
    />
  )
}
