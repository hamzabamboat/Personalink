'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import posthog from 'posthog-js'
import { PLAN_FEATURES } from '@/lib/supabase'
import { MCQ_QUESTIONS, MULTI_SELECT_QUESTIONS } from '@/lib/onboarding-questions'
import { getCurrency, getPaymentProcessor } from '@/lib/currency'
import { TIER_LIMITS } from '@/lib/pricing-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { QuarterRings } from '@/components/concentric-rings'
import { WordMark } from '@/components/word-mark'
import { StepIdentity } from '@/components/onboarding/StepIdentity'
import { StepPersonalityQuiz } from '@/components/onboarding/StepPersonalityQuiz'
import { StepWritingSample } from '@/components/onboarding/StepWritingSample'
import { StepContentPillars } from '@/components/onboarding/StepContentPillars'
import { StepControlPreference } from '@/components/onboarding/StepControlPreference'
import { StepImageBrief } from '@/components/onboarding/StepImageBrief'

const TOTAL_STEPS = 7


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

const PLAN_META = [
  { id: 'free', label: 'Free', posts: TIER_LIMITS.free.postsPerMonth ?? 3, features: PLAN_FEATURES.free, color: '#10b981' },
  { id: 'starter', label: 'Starter', posts: TIER_LIMITS.starter.postsPerMonth ?? 12, features: PLAN_FEATURES.starter, color: '#64748b' },
  { id: 'standard', label: 'Standard', posts: TIER_LIMITS.standard.postsPerMonth ?? 22, features: PLAN_FEATURES.standard, color: '#0A66C2', popular: true },
  { id: 'pro', label: 'Pro', posts: TIER_LIMITS.pro.postsPerMonth ?? 50, features: PLAN_FEATURES.pro, color: '#7c3aed' },
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

  // Restore progress from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const { step: savedStep, form: savedForm } = JSON.parse(saved)
        if (savedStep) setStep(savedStep)
        if (savedForm) setForm(savedForm)
      }
    } catch {}
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

  function toggleMcq(qid: string, opt: string) {
    setForm(f => {
      if (MULTI_SELECT_QUESTIONS.includes(qid)) {
        const cur = Array.isArray(f.mcq_answers[qid]) ? (f.mcq_answers[qid] as string[]) : []
        const next = cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt]
        return { ...f, mcq_answers: { ...f.mcq_answers, [qid]: next } }
      }
      return { ...f, mcq_answers: { ...f.mcq_answers, [qid]: opt } }
    })
  }

  function togglePillar(p: string) {
    setForm(f => {
      const current = f.content_pillars
      if (current.includes(p)) return { ...f, content_pillars: current.filter(x => x !== p) }
      if (current.length >= 3) return f
      return { ...f, content_pillars: [...current, p] }
    })
  }

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

  async function handleFinish() {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/onboarding/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Failed to save'); setSaving(false); return }
      sessionStorage.removeItem(STORAGE_KEY)

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
          window.location.href = '/dashboard'
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
  const currencyInfo = getCurrency(userCountry)
  const PLANS = PLAN_META.map(p => ({
    ...p,
    price: p.id === 'free' ? 0 : (currencyInfo[p.id as keyof typeof currencyInfo] as number),
  }))

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

        {/* Step 2 — MCQ */}
        {step === 2 && (
          <div className="animate-fade">
            <div className="mb-6 md:mb-8">
              <div className="text-[13px] font-semibold text-brand mb-2">STEP 2 — PERSONALITY QUIZ</div>
              <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">Your LinkedIn personality</h1>
              <p className="text-slate-500 text-base">Helps our AI match your communication style perfectly.</p>
            </div>
            <StepPersonalityQuiz
              answers={form.mcq_answers}
              onToggle={toggleMcq}
            />
            <NavButtons onNext={() => {
              const allAnswered = MCQ_QUESTIONS.every(q => {
                const a = form.mcq_answers[q.id]
                return Array.isArray(a) ? a.length > 0 : !!a
              })
              if (!allAnswered) { setError('Please answer all questions.'); return }
              nextStep()
            }} onPrev={prevStep} step={step} />
          </div>
        )}

        {/* Step 3 — Writing Sample */}
        {step === 3 && (
          <div className="animate-fade">
            <div className="mb-6 md:mb-8">
              <div className="text-[13px] font-semibold text-brand mb-2">STEP 3 — WRITING SAMPLE</div>
              <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">Write like you normally do</h1>
              <p className="text-slate-500 text-base">Write 2-3 paragraphs about anything you did recently — a meeting, a decision, a lesson. We analyse your vocabulary, tone, and rhythm to build your voice fingerprint.</p>
            </div>
            <StepWritingSample
              value={form.writing_sample}
              onChange={value => setForm(f => ({ ...f, writing_sample: value }))}
              wordCount={wordCount}
            />
            <NavButtons onNext={() => {
              if (wordCount < 40) { setError('Please write at least 40 words so we can analyse your voice.'); return }
              posthog.capture('voice_samples_submitted', { sample_count: 1 })
              nextStep()
            }} onPrev={prevStep} step={step} />
          </div>
        )}

        {/* Step 4 — Content Pillars */}
        {step === 4 && (
          <div className="animate-fade">
            <div className="mb-6 md:mb-8">
              <div className="text-[13px] font-semibold text-brand mb-2">STEP 4 — CONTENT PILLARS</div>
              <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">Pick your 3 content pillars</h1>
              <p className="text-slate-500 text-base">These are the themes your posts will rotate across. Pick exactly 3.</p>
            </div>
            <StepContentPillars
              selected={form.content_pillars}
              onToggle={togglePillar}
            />
            <NavButtons onNext={() => {
              if (form.content_pillars.length !== 3) { setError('Please select exactly 3 content pillars.'); return }
              nextStep()
            }} onPrev={prevStep} step={step} />
          </div>
        )}

        {/* Step 5 — Control Preferences */}
        {step === 5 && (
          <div className="animate-fade">
            <div className="mb-6 md:mb-8">
              <div className="text-[13px] font-semibold text-brand mb-2">STEP 5 — CONTROL PREFERENCES</div>
              <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">How much control do you want?</h1>
              <p className="text-slate-500 text-base">You can change this anytime from Settings.</p>
            </div>
            <StepControlPreference
              value={form.control_preference}
              onChange={value => setForm(f => ({ ...f, control_preference: value }))}
            />
            <NavButtons onNext={() => {
              if (!form.control_preference) { setError('Please choose a control preference.'); return }
              nextStep()
            }} onPrev={prevStep} step={step} />
          </div>
        )}

        {/* Step 6 — Image Brief */}
        {step === 6 && (
          <div className="animate-fade">
            <div className="mb-6 md:mb-8">
              <div className="text-[13px] font-semibold text-brand mb-2">STEP 6 — MONTHLY IMAGE BRIEF</div>
              <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">Your photo content brief</h1>
              <p className="text-slate-500 text-base">Based on your industry and pillars, here are 5 photo prompts to shoot this month. Images boost engagement by 3x.</p>
            </div>
            <StepImageBrief firstPillar={form.content_pillars[0]} />
            <NavButtons onNext={nextStep} onPrev={prevStep} step={step} />
          </div>
        )}

        {/* Step 7 — Plan Selection */}
        {step === 7 && (
          <div className="animate-fade">
            <div className="mb-6 md:mb-8">
              <div className="text-[13px] font-semibold text-brand mb-2">STEP 7 — CHOOSE YOUR PLAN</div>
              <h1 className="text-[22px] md:text-[32px] font-extrabold text-slate-900 mb-2">Try free for 7 days</h1>
              <p className="text-slate-500 text-base">Pick a plan — you won&apos;t be charged for 7 days. Cancel anytime.</p>
            </div>
            <div className="flex flex-col gap-4 mb-8">
              {PLANS.map(p => {
                const selected = form.plan === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setForm(f => ({ ...f, plan: p.id }))}
                    className={`p-6 rounded-xl border-2 text-left transition-all relative ${selected ? '' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    style={selected ? { borderColor: p.color, background: p.color + '10' } : {}}
                  >
                    {p.popular && (
                      <div className="absolute -top-2.5 right-4 bg-amber-400 text-white rounded-full px-3 py-0.5 text-[11px] font-bold">Most Popular</div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-bold text-[17px] mb-0.5" style={{ color: p.color }}>{p.label}</div>
                        <div className="text-[13px] text-slate-500">{p.posts} posts/month</div>
                      </div>
                      <div className="text-right">
                        {p.id === 'free' ? (
                          <>
                            <div className="text-[13px] font-bold text-emerald-600 mb-0.5">Free forever</div>
                            <div className="text-sm text-slate-400">No card required</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[13px] font-bold text-emerald-600 mb-0.5">Free for 7 days</div>
                            <div className="text-sm text-slate-400">then {currencyInfo.symbol}{p.price.toLocaleString()}/mo</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.features.slice(0, 4).map(f => (
                        <span key={f} className="text-xs text-slate-500 bg-slate-100 rounded-md px-2.5 py-1">{f}</span>
                      ))}
                      {p.features.length > 4 && <span className="text-xs text-slate-400">+{p.features.length - 4} more</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            {/* Access code section */}
            <div className="mb-4">
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
              <Button onClick={handleFinishWithCode} disabled={saving} className="w-full h-14 text-[17px] font-bold mb-2.5 bg-emerald-600 hover:bg-emerald-700">
                {saving ? <><Loader2 className="size-5 mr-2 animate-spin" /> Activating...</> : `Activate ${appliedCode.plan.charAt(0).toUpperCase() + appliedCode.plan.slice(1)} Plan →`}
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving} className="w-full h-14 text-[17px] font-bold mb-2.5">
                {saving ? <><Loader2 className="size-5 mr-2 animate-spin" /> Setting up your account...</> : 'Start Free Trial →'}
              </Button>
            )}
            {!appliedCode && <p className="text-center text-[12px] text-slate-400 mb-2">Card required. No charge for 7 days. Cancel anytime.</p>}
            <Button variant="outline" onClick={prevStep} className="w-full">← Back</Button>
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
