'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Sparkles, RefreshCw, Copy, Check, Lock, Wand2,
  User, AlignLeft, Tags, Camera, ImageIcon, Zap, ChevronRight,
  ArrowRight, RotateCcw, History,
} from 'lucide-react'
import Link from 'next/link'
import { BannerGenerator } from '@/components/banner-generator'

/* ── Types ──────────────────────────────────────────────── */
type ProfileData = {
  linkedin: { name: string | null; picture: string | null; headline: string | null }
  profile: { role: string | null; industry: string | null; company: string | null; current_about: string | null; current_skills: string[] | null }
  usage: { used: number; limit: number; remaining: number; plan: string }
  beautifications: BeautifyRecord[]
}

type BeautifyRecord = {
  id: string
  created_at: string
  input_headline: string | null
  input_about: string | null
  score_before: number | null
  score_after: number | null
  breakdown_before: Record<string, { score: number; max: number; tip: string }>
  breakdown_after: Record<string, { score: number; max: number; tip: string }>
  new_headline: string
  new_about: string
  suggested_skills: string[]
  profile_photo_brief: string | null
  banner_brief: string | null
  improvement_notes: string[]
}

type BeautifyResult = BeautifyRecord & { id: string }

/* ── Score ring ─────────────────────────────────────────── */
function ScoreRing({ score, size = 100, strokeWidth = 9 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = score >= 75 ? '#2ec27e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray .6s ease' }} />
    </svg>
  )
}

/* ── Score comparison block ─────────────────────────────── */
function ScoreComparison({ before, after, breakdownBefore, breakdownAfter }: {
  before: number; after: number
  breakdownBefore: Record<string, { score: number; max: number; tip: string }>
  breakdownAfter: Record<string, { score: number; max: number; tip: string }>
}) {
  const categories = ['headline', 'about', 'completeness', 'consistency', 'engagement']
  const labels: Record<string, string> = {
    headline: 'Headline', about: 'About', completeness: 'Completeness',
    consistency: 'Consistency', engagement: 'Engagement',
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
      <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <span className="text-[11px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
          // profile score
        </span>
      </div>
      <div className="p-4 sm:p-5">
        {/* Big score comparison — rings shrink on mobile */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: 88, height: 88 }}>
              <ScoreRing score={before} size={88} strokeWidth={8} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <strong style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-.02em' }}>{before}</strong>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, color: 'var(--ink-4)' }}>/100</span>
              </div>
            </div>
            <span className="text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>before</span>
          </div>

          <div className="flex flex-col items-center gap-1 px-2">
            <ArrowRight size={18} style={{ color: 'var(--pl-accent)' }} />
            <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: '#2ec27e', fontFamily: 'var(--f-mono)' }}>
              +{after - before} pts
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: 88, height: 88 }}>
              <ScoreRing score={after} size={88} strokeWidth={8} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <strong style={{ fontSize: 22, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-.02em' }}>{after}</strong>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, color: 'var(--ink-4)' }}>/100</span>
              </div>
            </div>
            <span className="text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>after</span>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="flex flex-col gap-2.5">
          {categories.map(cat => {
            const b = breakdownBefore[cat] ?? { score: 0, max: 20, tip: '' }
            const a = breakdownAfter[cat] ?? { score: 0, max: 20, tip: '' }
            const pctBefore = (b.score / b.max) * 100
            const pctAfter = (a.score / a.max) * 100
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px]" style={{ color: 'var(--ink-2)' }}>{labels[cat]}</span>
                  <span className="text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>
                    {b.score}/{b.max} → <span style={{ color: '#2ec27e' }}>{a.score}/{a.max}</span>
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--line-2)' }}>
                  <div className="absolute h-full rounded-full" style={{ width: `${pctBefore}%`, background: 'var(--ink-4)' }} />
                  <div className="absolute h-full rounded-full transition-all duration-700" style={{ width: `${pctAfter}%`, background: '#2ec27e', opacity: 0.85 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Copy button ────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} title="Copy to clipboard"
      className="flex items-center gap-1 px-2 py-1 rounded transition-colors text-[11px] font-semibold"
      style={{ background: copied ? 'var(--surface-3)' : 'var(--bg-2)', color: copied ? '#2ec27e' : 'var(--pl-accent)', border: '1px solid var(--line)' }}>
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/* ── Side-by-side comparison card ──────────────────────── */
function CompareCard({ label, icon: Icon, before, after }: {
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
  before: string
  after: string
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
      <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <Icon size={14} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
        <span className="text-[11px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
          // {label}
        </span>
      </div>
      {/* Stacked on mobile, side-by-side on sm+ */}
      <div className="flex flex-col sm:grid sm:grid-cols-2">
        <div
          className="p-4 border-b sm:border-b-0 sm:border-r"
          style={{ borderColor: 'var(--line)' }}
        >
          <div className="text-[10px] mb-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>CURRENT</div>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-3)', whiteSpace: 'pre-wrap' }}>
            {before || <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>Not provided</span>}
          </p>
        </div>
        <div className="p-4" style={{ background: 'var(--bg-2)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: '#2ec27e', letterSpacing: '.04em' }}>OPTIMISED</span>
            <CopyBtn text={after} />
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink)', fontWeight: 450, whiteSpace: 'pre-wrap' }}>
            {after}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Results section ────────────────────────────────────── */
function ResultsSection({ result }: { result: BeautifyResult }) {
  return (
    <div className="flex flex-col gap-5 mt-6">
      {/* Score comparison */}
      <ScoreComparison
        before={result.score_before ?? 0}
        after={result.score_after ?? 0}
        breakdownBefore={result.breakdown_before ?? {}}
        breakdownAfter={result.breakdown_after ?? {}}
      />

      {/* Headline */}
      <CompareCard
        label="headline"
        icon={User}
        before={result.input_headline || ''}
        after={result.new_headline}
      />

      {/* About */}
      <CompareCard
        label="about / bio"
        icon={AlignLeft}
        before={result.input_about || ''}
        after={result.new_about}
      />

      {/* Skills */}
      {result.suggested_skills?.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
            <Tags size={14} style={{ color: 'var(--pl-accent)', flexShrink: 0 }} strokeWidth={1.75} />
            <span className="text-[11px] flex-1 min-w-0" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
              // suggested skills
            </span>
            <CopyBtn text={result.suggested_skills.join(', ')} />
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {result.suggested_skills.map(skill => (
              <span key={skill}
                className="px-2.5 py-1 rounded-full text-[12px] leading-tight"
                style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: '1px solid var(--pl-accent)', opacity: 0.85, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Photo & Banner briefs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.profile_photo_brief && (
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={14} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
                <span className="text-[11px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>// profile photo</span>
              </div>
              <CopyBtn text={result.profile_photo_brief} />
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{result.profile_photo_brief}</p>
            <Link href="/dashboard/upload"
              className="text-[12px] font-semibold flex items-center gap-1 mt-auto transition-opacity hover:opacity-70"
              style={{ color: 'var(--pl-accent)' }}>
              Generate with AI image tool <ChevronRight size={11} />
            </Link>
          </div>
        )}
        {result.banner_brief && (
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
                <span className="text-[11px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>// banner image</span>
              </div>
              <CopyBtn text={result.banner_brief} />
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{result.banner_brief}</p>
            <Link href="/dashboard/upload"
              className="text-[12px] font-semibold flex items-center gap-1 mt-auto transition-opacity hover:opacity-70"
              style={{ color: 'var(--pl-accent)' }}>
              Generate with AI image tool <ChevronRight size={11} />
            </Link>
          </div>
        )}
      </div>

      <BannerGenerator />

      {/* Improvement notes */}
      {result.improvement_notes?.length > 0 && (
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
          <span className="text-[11px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>// what changed & why</span>
          <ul className="flex flex-col gap-2">
            {result.improvement_notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pl-accent)', flexShrink: 0, marginTop: 6 }} />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────── */
export default function ProfileImprovePage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [beautifying, setBeautifying] = useState(false)
  const [activeResult, setActiveResult] = useState<BeautifyResult | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Form state
  const [headline, setHeadline] = useState('')
  const [about, setAbout] = useState('')
  const [skills, setSkills] = useState('')
  const [guidance, setGuidance] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/profile/beautify')
      const d = await r.json()
      setData(d)
      // Pre-fill form from saved data
      if (d.linkedin?.headline && !headline) setHeadline(d.linkedin.headline)
      if (d.profile?.current_about && !about) setAbout(d.profile.current_about)
      if (d.profile?.current_skills?.length && !skills) setSkills(d.profile.current_skills.join(', '))
      // Show most recent beautification if exists
      if (d.beautifications?.length > 0 && !activeResult) setActiveResult(d.beautifications[0])
    } catch {
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function fetchFromLinkedIn() {
    setFetching(true)
    try {
      const r = await fetch('/api/linkedin/fetch-profile')
      if (!r.ok) {
        const e = await r.json()
        toast.error(e.error || 'Could not reach LinkedIn — try again')
        return
      }
      const d = await r.json()
      let synced = 0
      // LinkedIn's public API only returns name + picture; headline requires a
      // partner-level scope so it almost never comes back — don't surface that as an error
      if (d.headline) { setHeadline(d.headline); synced++ }
      if (d.current_about) { setAbout(d.current_about); synced++ }
      if (d.current_skills?.length) { setSkills(d.current_skills.join(', ')); synced++ }
      if (synced > 0) {
        toast.success('Synced your saved profile data')
      } else {
        toast.info('Connection verified — fill in your details below')
      }
    } catch {
      toast.error('LinkedIn fetch failed — check your connection')
    } finally {
      setFetching(false)
    }
  }

  async function handleBeautify() {
    if (!headline.trim() && !about.trim() && !guidance.trim()) {
      toast.error('Add a headline or bio — or tell us how you want to come across')
      return
    }
    setBeautifying(true)
    try {
      const r = await fetch('/api/profile/beautify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: headline.trim() || undefined,
          about: about.trim() || undefined,
          skills: skills.trim() ? skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
          guidance: guidance.trim() || undefined,
        }),
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.upgrade) {
          toast.error('Profile Beautifier is a Standard/Pro feature')
        } else {
          toast.error(d.error || 'Beautification failed')
        }
        return
      }
      setActiveResult(d)
      setData(prev => prev ? { ...prev, usage: { ...prev.usage, used: prev.usage.used + 1, remaining: Math.max(0, prev.usage.remaining - 1) } } : prev)
      toast.success('Profile optimised!')
      // Scroll to results
      setTimeout(() => document.getElementById('beautify-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      toast.error('Something went wrong — please try again')
    } finally {
      setBeautifying(false)
    }
  }

  const plan = data?.usage.plan || 'starter'
  const isLocked = plan === 'starter'
  const isExhausted = !isLocked && data?.usage.remaining === 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Wand2 size={28} style={{ color: 'var(--pl-accent)', opacity: 0.6 }} strokeWidth={1.5} />
          <span className="text-[13px]" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-7">

      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 size={20} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--ink)', letterSpacing: '-.02em' }}>
            Profile Beautifier
          </h1>
          {!isLocked && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: plan === 'pro' ? 'var(--pl-accent)' : 'var(--surface-3)', color: plan === 'pro' ? '#fff' : 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
              {plan}
            </span>
          )}
        </div>
        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          AI rewrites your headline, bio, and skills to attract more opportunities — then scores the before & after.
        </p>
      </div>

      {/* Locked state for starter */}
      {isLocked && (
        <div className="rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center gap-4 mb-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--pl-accent-soft)' }}>
            <Lock size={22} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-[16px] sm:text-[17px] font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>Standard & Pro feature</h2>
            <p className="text-[13px] sm:text-[13.5px] max-w-sm mx-auto" style={{ color: 'var(--ink-3)', lineHeight: 1.6 }}>
              AI rewrites your headline, bio, skills and suggests your ideal profile photo & banner.
              Standard gets 1 beautification/month, Pro gets 2.
            </p>
          </div>
          <Link href="/dashboard/upgrade"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-90 w-full sm:w-auto justify-center"
            style={{ background: 'var(--pl-accent)' }}>
            <Zap size={14} strokeWidth={2} />
            Upgrade to Standard
          </Link>
        </div>
      )}

      {/* Usage badge */}
      {!isLocked && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={14} style={{ color: 'var(--pl-accent)', flexShrink: 0 }} strokeWidth={1.75} />
            <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>
              <strong style={{ color: 'var(--ink)' }}>{data?.usage.remaining}</strong> of <strong style={{ color: 'var(--ink)' }}>{data?.usage.limit}</strong> beautification{data?.usage.limit !== 1 ? 's' : ''} remaining this month
            </span>
          </div>
          {isExhausted && plan !== 'pro' && (
            <Link href="/dashboard/upgrade"
              className="text-[12px] font-semibold flex items-center gap-0.5 shrink-0 transition-opacity hover:opacity-70"
              style={{ color: 'var(--pl-accent)' }}>
              Upgrade for more <ChevronRight size={11} />
            </Link>
          )}
        </div>
      )}

      {/* Input form */}
      <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid var(--line)', background: 'var(--surface)', opacity: isLocked ? 0.5 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          <span className="text-[11px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>// your current profile</span>
          <button
            onClick={fetchFromLinkedIn}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity disabled:opacity-60 hover:opacity-80 shrink-0"
            style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' }}>
            <RefreshCw size={12} className={fetching ? 'animate-spin' : ''} strokeWidth={2} />
            {fetching ? 'Syncing…' : 'Sync saved data'}
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* How you want to come across — direction / first-bio seed */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-sans)' }}>
              How do you want to come across? <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={guidance}
              onChange={e => setGuidance(e.target.value)}
              rows={3}
              placeholder="e.g. Confident but approachable, lead with my fintech experience, keep it concise. — New to LinkedIn with no bio yet? Just describe what you do and we'll write your first one."
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none resize-y transition-colors"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', lineHeight: 1.6 }}
            />
            <span className="text-[11px] mt-1 block" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
              Tell us the tone &amp; emphasis you want — or describe yourself if this is your first bio.
            </span>
          </div>

          {/* Headline */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-semibold" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-sans)' }}>
                Current headline
              </label>
              <span className="text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>
                paste from LinkedIn
              </span>
            </div>
            <input
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="e.g. Product Manager at Acme | Building things people love"
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-colors"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
            <span className="text-[11px] mt-1 block" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
              {headline.length}/220 chars · LinkedIn doesn't share this via API
            </span>
          </div>

          {/* About */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-sans)' }}>
              Current bio / About section
            </label>
            <textarea
              value={about}
              onChange={e => setAbout(e.target.value)}
              rows={6}
              placeholder="Paste your current LinkedIn About section here — or leave blank for a fresh start based on your role & voice"
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none resize-y transition-colors"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', lineHeight: 1.6, minHeight: 120 }}
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-sans)' }}>
              Current skills <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(comma-separated)</span>
            </label>
            <input
              value={skills}
              onChange={e => setSkills(e.target.value)}
              placeholder="e.g. Product Strategy, Go-to-Market, User Research, SQL"
              className="w-full px-3.5 py-2.5 rounded-lg text-[13px] outline-none transition-colors"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
              Leave blank and we'll suggest skills based on your role
            </p>
          </div>
        </div>

        {/* Beautify CTA */}
        <div className="px-5 pb-5">
          <button
            onClick={handleBeautify}
            disabled={beautifying || isExhausted || isLocked}
            className="w-full py-3 rounded-xl text-[14px] font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ background: beautifying ? 'var(--ink-4)' : 'var(--pl-accent)' }}
          >
            {beautifying ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Beautifying your profile…
              </>
            ) : isExhausted ? (
              <>
                <Lock size={15} />
                No beautifications left this month
              </>
            ) : (
              <>
                <Wand2 size={15} strokeWidth={2} />
                Beautify my profile
              </>
            )}
          </button>
          {isExhausted && (
            <p className="text-[12px] text-center mt-2" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
              Resets on the 1st · <Link href="/dashboard/upgrade" style={{ color: 'var(--pl-accent)' }}>upgrade for more</Link>
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      {activeResult && (
        <div id="beautify-results">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[12px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
              // results · {new Date(activeResult.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
            </span>
            {(data?.beautifications?.length ?? 0) > 1 && (
              <button
                onClick={() => setShowHistory(h => !h)}
                className="flex items-center gap-1.5 text-[12px] font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--pl-accent)' }}>
                <History size={13} />
                {showHistory ? 'Hide' : 'View'} history
              </button>
            )}
          </div>

          {/* History list */}
          {showHistory && (data?.beautifications?.length ?? 0) > 1 && (
            <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
              {data!.beautifications.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => { setActiveResult(b); setShowHistory(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-3"
                  style={{ borderBottom: i < data!.beautifications.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <RotateCcw size={13} style={{ color: 'var(--ink-4)', flexShrink: 0 }} />
                  <span className="text-[13px] flex-1 truncate" style={{ color: 'var(--ink-2)' }}>
                    {b.new_headline || 'Beautification'}
                  </span>
                  <span className="text-[11px] shrink-0" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>
                    {b.score_before}→{b.score_after} · {new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </button>
              ))}
            </div>
          )}

          <ResultsSection result={activeResult} />
        </div>
      )}
    </div>
  )
}
