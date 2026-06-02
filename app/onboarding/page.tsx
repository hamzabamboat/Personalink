'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import posthog from 'posthog-js'
import { getCurrency, getPaymentProcessor } from '@/lib/currency'
import { resolvePlanFromParam } from '@/lib/onboarding-plan'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { QuarterRings } from '@/components/concentric-rings'
import { WordMark } from '@/components/word-mark'
import { StepIdentity } from '@/components/onboarding/StepIdentity'
import { StepWritingSample } from '@/components/onboarding/StepWritingSample'

const TOTAL_STEPS = 2

type PreviewState = 'idle' | 'loading' | 'ready' | 'error'


const INDUSTRIES = [
  'Software & SaaS', 'Information Technology', 'Artificial Intelligence', 'Cybersecurity',
  'Data & Analytics', 'Blockchain & Crypto', 'Electronics & Hardware', 'Telecommunications',
  'Fintech', 'Banking', 'Financial Services', 'Insurance', 'Investment & Venture Capital',
  'Accounting', 'Management Consulting', 'Marketing & Advertising', 'Public Relations',
  'Sales', 'Human Resources & Recruiting', 'Design (UX/UI)', 'Media & Entertainment',
  'Publishing', 'Gaming', 'E-commerce', 'Retail', 'Consumer Goods (FMCG)',
  'Manufacturing', 'Automotive', 'Aerospace & Defense', 'Energy & Utilities',
  'Oil & Gas', 'Renewable Energy', 'Construction', 'Real Estate', 'Architecture',
  'Engineering', 'Transportation & Logistics', 'Supply Chain', 'Hospitality & Tourism',
  'Food & Beverage', 'Agriculture', 'Healthcare', 'Pharmaceuticals', 'Biotechnology',
  'Medical Devices', 'Education', 'EdTech', 'Non-Profit', 'Government & Public Sector',
  'Legal', 'Fashion & Apparel', 'Sports & Fitness', 'Beauty & Wellness',
  'Climate & Sustainability', 'Travel',
]

type FormData = {
  name: string; role: string; industry: string; company: string; age: string; linkedin_url: string
  mcq_answers: Record<string, string | string[]>; writing_sample: string; content_pillars: string[]
  control_preference: 'autopilot' | 'approve' | 'suggest' | ''; plan: string
}

const STORAGE_KEY = 'onboarding_progress'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [industryOther, setIndustryOther] = useState(false)
  const [userCountry, setUserCountry] = useState('IN')
  const [form, setForm] = useState<FormData>({
    name: '', role: '', industry: '', company: '', age: '', linkedin_url: '',
    mcq_answers: {}, writing_sample: '', content_pillars: [], control_preference: '', plan: 'free',
  })
  const [codeInput, setCodeInput] = useState('')
  const [codeChecking, setCodeChecking] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [appliedCode, setAppliedCode] = useState<{ code: string; plan: string } | null>(null)
  const [showCodeField, setShowCodeField] = useState(false)
  const [previewState, setPreviewState] = useState<PreviewState>('idle')
  const [previewPost, setPreviewPost] = useState('')
  const onboardingStartFiredRef = useRef(false)

  useEffect(() => { document.title = 'Getting Started — PersonaLink' }, [])

  useEffect(() => {
    if (!onboardingStartFiredRef.current) {
      onboardingStartFiredRef.current = true
      posthog.capture('onboarding_started')
    }
  }, [])

  useEffect(() => {
    const match = document.cookie.match(/user_country=([^;]+)/)
    if (match) setUserCountry(match[1])
  }, [])

  // Restore progress from sessionStorage on mount, then apply ?plan= with precedence
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { step: savedStep, form: savedForm } = JSON.parse(saved)
        if (savedStep) setStep(savedStep)
        if (savedForm) setForm(savedForm)
      }
    } catch {}

    // ?plan= takes precedence over any sessionStorage-restored plan
    const param = new URLSearchParams(window.location.search).get('plan')
    const { plan } = resolvePlanFromParam(param)
    setForm(f => ({ ...f, plan }))
  }, [])

  // Persist progress whenever step or form changes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, form }))
    } catch {}
  }, [step, form])

  // If a restored/custom industry isn't in the preset list, switch to the "Other" input
  useEffect(() => {
    if (form.industry && !INDUSTRIES.includes(form.industry)) setIndustryOther(true)
  }, [form.industry])

  function nextStep() { setError(''); if (step < TOTAL_STEPS) setStep(s => s + 1) }
  function prevStep() { setError(''); if (step > 1) setStep(s => s - 1) }

  async function checkCode() {
    if (!codeInput.trim()) return
    setCodeChecking(true); setCodeError(''); setAppliedCode(null)
    const res = await fetch(`/api/access-codes/validate?code=${encodeURIComponent(codeInput.trim())}`)
    const d = await res.json()
    if (d.valid) {
      setAppliedCode({ code: d.code, plan: d.plan })
      setForm(f => ({ ...f, plan: d.plan }))
    } else {
      setCodeError(d.error || 'Invalid code')
    }
    setCodeChecking(false)
  }

  async function generatePreview() {
    setPreviewState('loading')
    try {
      const res = await fetch('/api/onboarding/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          role: form.role,
          industry: form.industry,
          writing_sample: form.writing_sample,
        }),
      })
      const data = await res.json()
      if (data.error || !data.post) {
        setPreviewState('error')
        return
      }
      setPreviewPost(data.post)
      setPreviewState('ready')
      posthog.capture('preview_generated')
    } catch {
      setPreviewState('error')
    }
  }

  function finishOnboarding() {
    if (appliedCode) {
      handleFinishWithCode()
    } else {
      proceedFromCore()
    }
  }

  async function handleFinishWithCode() {
    if (!appliedCode) return
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/access-codes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: appliedCode.code, ...form }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Failed to apply code'); setSaving(false); return }
      sessionStorage.removeItem(STORAGE_KEY)
      router.push('/dashboard')
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  // proceedFromCore: save core fields then branch by plan.
  // Named clearly so a future preview step can be inserted before the branch.
  async function proceedFromCore() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/onboarding/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Failed to save'); setSaving(false); return }
      sessionStorage.removeItem(STORAGE_KEY)
      posthog.capture('core_completed', { plan: form.plan })

      // Free tier — no checkout needed, jump straight to the dashboard.
      if (form.plan === 'free') {
        router.push('/dashboard')
        return
      }

      const processor = getPaymentProcessor(userCountry)
      const currencyInfo = getCurrency(userCountry)

      if (processor === 'dodo') {
        const subRes = await fetch('/api/dodo/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: form.plan, currency: currencyInfo.code, force_new: true }),
        })
        const subData = await subRes.json()
        if (subData.error) { setError(subData.error); setSaving(false); return }
        if (!subData.checkout_url) { setError('No checkout link returned. Please try again.'); setSaving(false); return }
        window.location.href = subData.checkout_url
        return
      }

      // Razorpay for Indian users
      const subRes = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: form.plan }),
      })
      const subData = await subRes.json()
      if (subData.error) { setError(subData.error); setSaving(false); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: subData.subscription_id,
        name: 'PersonaLink',
        description: `${form.plan.charAt(0).toUpperCase() + form.plan.slice(1)} Plan — 7-day free trial`,
        theme: { color: '#0A66C2' },
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              plan: form.plan,
            }),
          })
          const verifyData = await verifyRes.json()
          if (verifyData.error) { setError('Payment verification failed. Please email support@personalink.in'); setSaving(false); return }
          posthog.capture('payment_completed', { plan: form.plan, processor: 'razorpay' })
          // Note: Dodo payments redirect to a hosted checkout so payment_completed cannot be
          // captured client-side here — fire it server-side from the Dodo webhook/return handler (future task).
          window.location.href = '/dashboard/finish-profile'
        },
        modal: { ondismiss: () => setSaving(false) },
      })
      rzp.open()
    } catch {
      setError('Network error. Please try again.')
      setSaving(false)
    }
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100
  const wordCount = form.writing_sample.split(/\s+/).filter(Boolean).length

  return (
    <>
    {getPaymentProcessor(userCountry) === 'razorpay' && <Script src="https://checkout.razorpay.com/v1/checkout.js" />}
    <div className="min-h-screen relative" style={{ background: 'var(--bg)' }}>
      <QuarterRings size={400} color="blue" opacity={0.05} className="fixed bottom-0 right-0 pointer-events-none hidden lg:block" />
      {/* Header */}
      <div className="px-4 sm:px-6" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-[720px] mx-auto h-16 flex items-center justify-between">
          <WordMark icon wordmark iconSize={28} />
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', letterSpacing: '.04em' }}>Step {step} of {TOTAL_STEPS}</span>
        </div>
        {/* Progress bar */}
        <div className="max-w-[720px] mx-auto pb-0">
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--line-2)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--pl-accent)' }} />
          </div>
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-4 md:px-6 py-8 md:py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-6">{error}</div>
        )}

        {/* Step 1 — Basic Info */}
        {step === 1 && (
          <div className="animate-fade">
            <div className="mb-6 md:mb-8">
              <div className="text-[13px] font-semibold text-brand mb-2">STEP 1 — BASIC INFO</div>
              <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">Tell us about yourself</h1>
              <p className="text-slate-500 text-base">This helps us personalise your content pillars and voice.</p>
            </div>
            <StepIdentity
              form={form}
              onChange={updates => setForm(f => ({ ...f, ...updates }))}
              industryOther={industryOther}
              onIndustryOtherChange={setIndustryOther}
            />
            <NavButtons onNext={() => {
              if (!form.name || !form.role || !form.industry || !form.linkedin_url) {
                setError('Please fill in your name, role, industry, and LinkedIn URL.')
                return
              }
              nextStep()
            }} step={step} />
          </div>
        )}

        {/* Preview beat — shown after writing sample submission, before the branch */}
        {step === 2 && previewState !== 'idle' && (
          <div className="animate-fade">
            {previewState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="size-8 animate-spin" style={{ color: 'var(--pl-accent)' }} />
                <p className="text-base font-semibold" style={{ color: 'var(--ink-2)' }}>Writing a post in your voice…</p>
                <p className="text-sm text-center max-w-xs" style={{ color: 'var(--ink-4)' }}>We&apos;re analysing your writing sample to generate a personalised LinkedIn post.</p>
              </div>
            )}

            {previewState === 'ready' && (
              <div>
                <div className="mb-6 md:mb-8">
                  <div className="text-[13px] font-semibold text-brand mb-2">YOUR VOICE PREVIEW</div>
                  <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">Here&apos;s a post in your voice</h1>
                  <p className="text-slate-500 text-base">We&apos;ll generate more like this on your dashboard. This is your first one.</p>
                </div>
                <div
                  className="rounded-2xl p-5 mb-6 whitespace-pre-wrap text-sm leading-relaxed"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink-1)' }}
                >
                  {previewPost}
                </div>
                <div className="flex gap-3 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewState('idle')}
                    className="flex-1 h-[52px] text-[15px] font-semibold"
                  >
                    ← Edit sample
                  </Button>
                  <Button
                    onClick={finishOnboarding}
                    disabled={saving}
                    className="flex-[2] h-[52px] text-[15px] font-bold"
                    style={{ background: 'var(--pl-accent)' }}
                  >
                    {saving
                      ? <><Loader2 className="size-5 mr-2 animate-spin" /> Setting up your account…</>
                      : appliedCode
                        ? `Activate ${appliedCode.plan.charAt(0).toUpperCase() + appliedCode.plan.slice(1)} Plan →`
                        : form.plan === 'free' ? 'Get Started →' : 'Start Free Trial →'}
                  </Button>
                </div>
              </div>
            )}

            {previewState === 'error' && (
              <div>
                <div className="mb-6 md:mb-8">
                  <div className="text-[13px] font-semibold text-brand mb-2">ALMOST THERE</div>
                  <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">You&apos;re all set</h1>
                  <p className="text-slate-500 text-base">We&apos;ll generate your first post on the dashboard.</p>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewState('idle')}
                    className="flex-1 h-[52px] text-[15px] font-semibold"
                  >
                    ← Edit sample
                  </Button>
                  <Button
                    onClick={finishOnboarding}
                    disabled={saving}
                    className="flex-[2] h-[52px] text-[15px] font-bold"
                  >
                    {saving
                      ? <><Loader2 className="size-5 mr-2 animate-spin" /> Setting up your account…</>
                      : appliedCode
                        ? `Activate ${appliedCode.plan.charAt(0).toUpperCase() + appliedCode.plan.slice(1)} Plan →`
                        : form.plan === 'free' ? 'Continue to Dashboard →' : 'Start Free Trial →'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Writing Sample */}
        {step === 2 && previewState === 'idle' && (
          <div className="animate-fade">
            <div className="mb-6 md:mb-8">
              <div className="text-[13px] font-semibold text-brand mb-2">STEP 2 — WRITING SAMPLE</div>
              <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">Write like you normally do</h1>
              <p className="text-slate-500 text-base">Write 2-3 paragraphs about anything you did recently — a meeting, a decision, a lesson. We analyse your vocabulary, tone, and rhythm to build your voice fingerprint.</p>
            </div>
            <StepWritingSample
              value={form.writing_sample}
              onChange={value => setForm(f => ({ ...f, writing_sample: value }))}
              wordCount={wordCount}
            />

            {/* Access code affordance */}
            <div className="mt-4 mb-2">
              {!showCodeField ? (
                <button
                  onClick={() => setShowCodeField(true)}
                  className="text-sm text-slate-400 hover:text-brand transition-colors underline underline-offset-2"
                >
                  Have an access code?
                </button>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <p className="text-[13px] font-semibold text-slate-600 mb-3">Enter your access code</p>
                  <div className="flex gap-2">
                    <Input
                      value={codeInput}
                      onChange={e => { setCodeInput(e.target.value.toUpperCase()); setAppliedCode(null); setCodeError('') }}
                      placeholder="PERSONALINK-FREE-1234"
                      className="font-mono text-sm flex-1"
                      disabled={!!appliedCode}
                    />
                    {!appliedCode && (
                      <Button variant="outline" onClick={checkCode} disabled={codeChecking || !codeInput.trim()} className="shrink-0">
                        {codeChecking ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
                      </Button>
                    )}
                  </div>
                  {codeError && <p className="mt-2 text-[13px] text-red-500">{codeError}</p>}
                  {appliedCode && (
                    <div className="mt-3 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <p className="text-[13px] font-semibold">
                        Code applied! You get <span className="capitalize">{appliedCode.plan}</span> plan free.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {appliedCode ? (
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={prevStep} className="flex-1 h-[52px] text-[15px] font-semibold">← Back</Button>
                <Button
                  onClick={() => {
                    if (wordCount < 40) { setError('Please write at least 40 words so we can analyse your voice.'); return }
                    posthog.capture('voice_samples_submitted', { sample_count: 1 })
                    generatePreview()
                  }}
                  disabled={saving}
                  className="flex-[2] h-[52px] text-[15px] font-bold bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving ? <><Loader2 className="size-5 mr-2 animate-spin" /> Activating...</> : `Activate ${appliedCode.plan.charAt(0).toUpperCase() + appliedCode.plan.slice(1)} Plan →`}
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={prevStep} className="flex-1 h-[52px] text-[15px] font-semibold">← Back</Button>
                <Button
                  onClick={() => {
                    if (wordCount < 40) { setError('Please write at least 40 words so we can analyse your voice.'); return }
                    posthog.capture('voice_samples_submitted', { sample_count: 1 })
                    generatePreview()
                  }}
                  disabled={saving}
                  className="flex-[2] h-[52px] text-[15px] font-bold"
                >
                  {saving ? <><Loader2 className="size-5 mr-2 animate-spin" /> Setting up your account...</> : form.plan === 'free' ? 'Get Started →' : 'Start Free Trial →'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  )
}

function NavButtons({ onNext, onPrev }: { onNext: () => void; onPrev?: () => void; step?: number }) {
  return (
    <div className="flex gap-3 mt-8">
      {onPrev && (
        <Button variant="outline" onClick={onPrev} className="flex-1 h-[52px] text-[15px] font-semibold">← Back</Button>
      )}
      <Button onClick={onNext} className={`${onPrev ? 'flex-[2]' : 'flex-1'} h-[52px] text-[15px] font-bold`}>Continue →</Button>
    </div>
  )
}
