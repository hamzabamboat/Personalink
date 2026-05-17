'use client'

import { X, Zap, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const PLAN_NAMES: Record<string, string> = { starter: 'Starter', standard: 'Standard', pro: 'Pro' }
const NEXT_PLAN: Record<string, string> = { starter: 'standard', standard: 'pro' }

const FEATURE_LABELS: Record<string, string> = {
  posts_generated: 'Post Generations',
  profile_analyses: 'Profile Analyses',
  voice_transcriptions: 'Voice Transcriptions',
  image_uploads: 'Image Uploads',
  trend_refreshes: 'Trend Refreshes',
  story_entries: 'Story Bank Entries',
  story_conversions: 'Story Conversions',
  batch_runs: 'Batch Generation Runs',
  repurpose_runs: 'Repurpose Runs',
}

const UPGRADE_BENEFITS: Record<string, Record<string, string[]>> = {
  starter: {
    standard: [
      '20 posts/month (was 12)',
      '8 voice note transcriptions',
      '30 image uploads (was 10)',
      '15 trend refreshes',
      'Analytics dashboard',
    ],
    pro: [
      '30 posts/month',
      '20 voice transcriptions',
      '80 image uploads',
      '10 repurpose runs/month',
      'Bulk generate 30 days',
    ],
  },
  standard: {
    pro: [
      '30 posts/month (was 20)',
      '20 voice transcriptions (was 8)',
      '80 image uploads (was 30)',
      '10 repurpose runs/month',
      'Bulk generate 30 days',
    ],
  },
}

type Config = {
  feature: string
  plan: string
  used: number
  limit: number
  toastId?: string | number
}

function UpgradeModalContent({ feature, plan, used, limit, toastId }: Config) {
  const nextPlan = NEXT_PLAN[plan]
  const featureLabel = FEATURE_LABELS[feature] || feature
  const benefits = nextPlan ? (UPGRADE_BENEFITS[plan]?.[nextPlan] ?? []) : []

  function dismiss() {
    if (toastId !== undefined) toast.dismiss(toastId)
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-[340px] max-w-[calc(100vw-32px)]">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-amber-500" strokeWidth={2} />
        </div>
        <button onClick={dismiss} className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <h3 className="font-bold text-slate-900 text-[17px] mb-1 leading-snug">
        You&apos;ve hit your {featureLabel} limit
      </h3>
      <p className="text-slate-500 text-sm mb-4">
        {used}/{limit} used on the{' '}
        <span className="font-semibold text-slate-700">{PLAN_NAMES[plan] ?? plan} plan</span>{' '}
        this month.
      </p>

      {nextPlan && benefits.length > 0 && (
        <div className="rounded-xl p-3.5 mb-4" style={{ background: 'var(--pl-accent-soft)', border: '1px solid color-mix(in oklab, var(--pl-accent) 20%, transparent)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--pl-accent)' }}>
            Upgrade to {PLAN_NAMES[nextPlan]}
          </div>
          <ul className="flex flex-col gap-1.5">
            {benefits.map(b => (
              <li key={b} className="text-xs flex items-center gap-2" style={{ color: 'var(--ink-2)' }}>
                <Check className="w-3 h-3 shrink-0" style={{ color: 'var(--pl-accent)' }} strokeWidth={2.5} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {nextPlan ? (
          <Link
            href="/dashboard/upgrade"
            onClick={dismiss}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity" style={{ background: 'var(--pl-accent)' }}
          >
            Upgrade to {PLAN_NAMES[nextPlan]}
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <p className="text-xs text-slate-400 text-center">
            You&apos;re on Pro. Limits reset on the 1st of each month.
          </p>
        )}
        <button
          onClick={dismiss}
          className="w-full py-2 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}

export function showUpgradeModal(config: Omit<Config, 'toastId'>) {
  toast.custom(id => <UpgradeModalContent {...config} toastId={id} />, {
    duration: Infinity,
    position: 'top-center',
  })
}
