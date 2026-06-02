'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import type { UserProfile } from '@/lib/supabase'
import { getProfileCompleteness, type CompletenessGroup } from '@/lib/profile-completeness'
import { MCQ_QUESTIONS, MULTI_SELECT_QUESTIONS } from '@/lib/onboarding-questions'
import { StepPersonalityQuiz } from '@/components/onboarding/StepPersonalityQuiz'
import { StepContentPillars } from '@/components/onboarding/StepContentPillars'
import { StepControlPreference } from '@/components/onboarding/StepControlPreference'

// ── Step metadata ────────────────────────────────────────────────────────────

const STEP_META: Record<CompletenessGroup, { title: string; subtitle: string }> = {
  quiz: {
    title: 'Personality Quiz',
    subtitle: 'Help us understand your voice and goals so every post sounds like you.',
  },
  pillars: {
    title: 'Content Pillars',
    subtitle: 'Pick exactly 3 topics that anchor your LinkedIn presence.',
  },
  control: {
    title: 'Posting Preference',
    subtitle: 'Choose how much control you want over what goes out.',
  },
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function FinishProfilePage() {
  const router = useRouter()

  // Remote data
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Derived: only the steps that still need completing (in canonical order)
  const [steps, setSteps] = useState<CompletenessGroup[]>([])
  const [stepIndex, setStepIndex] = useState(0)

  // Local form state — initialised from profile on load
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string | string[]>>({})
  const [contentPillars, setContentPillars] = useState<string[]>([])
  const [controlPreference, setControlPreference] = useState<
    'autopilot' | 'approve' | 'suggest' | ''
  >('')

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/me')
        if (!res.ok) {
          window.location.href = '/'
          return
        }
        const { profile: p } = await res.json()
        if (cancelled) return

        const { complete, missing } = getProfileCompleteness(p)
        if (complete) {
          router.replace('/dashboard')
          return
        }

        // Canonical order: quiz → pillars → control
        const ordered: CompletenessGroup[] = (['quiz', 'pillars', 'control'] as const).filter(g =>
          missing.includes(g),
        )

        setProfile(p)
        setSteps(ordered)

        // Resume from whatever is already saved
        setMcqAnswers((p?.mcq_answers as Record<string, string | string[]>) ?? {})
        setContentPillars(p?.content_pillars ?? [])
        setControlPreference((p?.control_preference as 'autopilot' | 'approve' | 'suggest') ?? '')
      } catch {
        /* non-fatal — leave loading spinner; user can refresh */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [router])

  // ── Quiz toggle ────────────────────────────────────────────────────────────
  function handleQuizToggle(qid: string, opt: string) {
    const isMulti = MULTI_SELECT_QUESTIONS.includes(qid)
    setMcqAnswers(prev => {
      if (isMulti) {
        const current = (prev[qid] as string[] | undefined) ?? []
        const next = current.includes(opt)
          ? current.filter(v => v !== opt)
          : [...current, opt]
        return { ...prev, [qid]: next }
      }
      return { ...prev, [qid]: opt }
    })
  }

  // ── Pillars toggle ─────────────────────────────────────────────────────────
  function handlePillarToggle(p: string) {
    setContentPillars(prev => {
      if (prev.includes(p)) return prev.filter(v => v !== p)
      if (prev.length >= 3) return prev
      return [...prev, p]
    })
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const currentStep = steps[stepIndex] as CompletenessGroup | undefined
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  function canAdvance(): boolean {
    if (!currentStep) return false
    if (currentStep === 'quiz') {
      return MCQ_QUESTIONS.every(q => {
        const ans = mcqAnswers[q.id]
        return Array.isArray(ans) ? ans.length > 0 : Boolean(ans)
      })
    }
    if (currentStep === 'pillars') return contentPillars.length === 3
    if (currentStep === 'control') return Boolean(controlPreference)
    return false
  }

  // ── Save + finish ──────────────────────────────────────────────────────────
  async function handleFinish() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Always include current plan to prevent resetting a paid tier
          plan: profile?.plan ?? 'free',
          mcq_answers: mcqAnswers,
          content_pillars: contentPillars,
          control_preference: controlPreference || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSaveError((data as { error?: string }).error ?? 'Save failed. Please try again.')
        return
      }
      posthog.capture('config_completed')
      router.push('/dashboard')
    } catch {
      setSaveError('Network error. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-5 md:p-8">
        <div
          style={{ height: 32, background: 'var(--surface-3)', borderRadius: 'var(--r-md)' }}
          className="animate-pulse mb-4 w-48"
        />
        <div
          style={{ height: 20, background: 'var(--surface-3)', borderRadius: 'var(--r-md)' }}
          className="animate-pulse mb-8 w-80"
        />
        <div
          style={{ height: 320, background: 'var(--surface-3)', borderRadius: 'var(--r-lg)' }}
          className="animate-pulse"
        />
      </div>
    )
  }

  // ── Edge case: steps resolved to empty after load (should have redirected) ─
  if (steps.length === 0 || !currentStep) {
    return null
  }

  const meta = STEP_META[currentStep]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <header className="mb-6">
        <p
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            letterSpacing: '.04em',
            marginBottom: 8,
          }}
        >
          {'// finish your profile'}
        </p>
        <h1
          style={{
            fontSize: 'clamp(20px, 3vw, 26px)',
            fontWeight: 700,
            color: 'var(--ink)',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {meta.title}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.55 }}>
          {meta.subtitle}
        </p>
      </header>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-7">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              style={{
                width: i < stepIndex ? 8 : i === stepIndex ? 10 : 8,
                height: i < stepIndex ? 8 : i === stepIndex ? 10 : 8,
                borderRadius: '50%',
                background:
                  i < stepIndex
                    ? 'var(--pl-accent)'
                    : i === stepIndex
                      ? 'var(--pl-accent)'
                      : 'var(--surface-3)',
                border: i === stepIndex ? '2px solid var(--pl-accent)' : 'none',
                opacity: i < stepIndex ? 0.5 : 1,
                transition: 'all .2s',
              }}
            />
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: i < stepIndex ? 'var(--pl-accent)' : 'var(--surface-3)',
                  opacity: i < stepIndex ? 0.4 : 1,
                  width: 24,
                  transition: 'background .2s',
                }}
              />
            )}
          </div>
        ))}
        <span
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            marginLeft: 6,
          }}
        >
          {stepIndex + 1} / {steps.length}
        </span>
      </div>

      {/* Step content */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          padding: '24px 20px',
          marginBottom: 20,
        }}
      >
        {currentStep === 'quiz' && (
          <StepPersonalityQuiz answers={mcqAnswers} onToggle={handleQuizToggle} />
        )}
        {currentStep === 'pillars' && (
          <StepContentPillars selected={contentPillars} onToggle={handlePillarToggle} />
        )}
        {currentStep === 'control' && (
          <StepControlPreference
            value={controlPreference as 'autopilot' | 'approve' | 'suggest' | ''}
            onChange={v => setControlPreference(v)}
          />
        )}
      </div>

      {/* Save error */}
      {saveError && (
        <div
          style={{
            background: 'rgba(239,68,68,.08)',
            border: '1px solid rgba(239,68,68,.25)',
            borderRadius: 'var(--r-md)',
            padding: '10px 14px',
            fontSize: 13,
            color: '#dc2626',
            marginBottom: 16,
          }}
        >
          {saveError}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        {/* Back */}
        <button
          type="button"
          onClick={() => setStepIndex(i => i - 1)}
          disabled={isFirst}
          style={{
            height: 40,
            padding: '0 18px',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--line)',
            background: 'var(--surface)',
            color: isFirst ? 'var(--ink-4)' : 'var(--ink-2)',
            fontFamily: 'var(--f-sans)',
            fontSize: 14,
            fontWeight: 500,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            opacity: isFirst ? 0.4 : 1,
            transition: 'opacity .15s',
          }}
        >
          Back
        </button>

        {/* Next / Finish */}
        {isLast ? (
          <button
            type="button"
            onClick={handleFinish}
            disabled={!canAdvance() || saving}
            style={{
              height: 40,
              padding: '0 22px',
              borderRadius: 'var(--r-md)',
              border: 'none',
              background: canAdvance() && !saving ? 'var(--pl-accent)' : 'var(--surface-3)',
              color: canAdvance() && !saving ? '#fff' : 'var(--ink-4)',
              fontFamily: 'var(--f-sans)',
              fontSize: 14,
              fontWeight: 600,
              cursor: canAdvance() && !saving ? 'pointer' : 'not-allowed',
              transition: 'background .15s, color .15s',
            }}
          >
            {saving ? 'Saving...' : 'Finish'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStepIndex(i => i + 1)}
            disabled={!canAdvance()}
            style={{
              height: 40,
              padding: '0 22px',
              borderRadius: 'var(--r-md)',
              border: 'none',
              background: canAdvance() ? 'var(--pl-accent)' : 'var(--surface-3)',
              color: canAdvance() ? '#fff' : 'var(--ink-4)',
              fontFamily: 'var(--f-sans)',
              fontSize: 14,
              fontWeight: 600,
              cursor: canAdvance() ? 'pointer' : 'not-allowed',
              transition: 'background .15s, color .15s',
            }}
          >
            Next
          </button>
        )}
      </div>

    </div>
  )
}
