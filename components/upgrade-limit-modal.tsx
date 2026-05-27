'use client'

import { X, Zap, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { FEATURE_LABELS, TIER_LABEL, TIER_LIMITS, getNextTier, type TierID } from '@/lib/pricing-config'

/**
 * Toast-style soft paywall shown when a per-feature limit is reached.
 * Benefits surfaced for upgrading match the next tier in the ladder
 * (free → starter → standard → pro). Pro users see a quiet "resets on the 1st" line.
 */

function nextTierBenefits(currentPlan: TierID, nextPlan: TierID, feature: string): string[] {
  const cur = TIER_LIMITS[currentPlan]
  const nxt = TIER_LIMITS[nextPlan]
  const benefits: string[] = []

  const curPosts = cur.postsPerMonth
  const nxtPosts = nxt.postsPerMonth
  if (nxtPosts != null && (curPosts == null || nxtPosts > curPosts)) {
    benefits.push(
      curPosts != null
        ? `${nxtPosts} posts/month (was ${curPosts})`
        : `${nxtPosts} posts/month`
    )
  } else if (nxtPosts == null) {
    benefits.push(`Unlimited posts/month`)
  }

  const curFp = cur.voiceFingerprints
  const nxtFp = nxt.voiceFingerprints
  if (nxtFp == null && curFp != null) {
    benefits.push('Unlimited voice fingerprints')
  } else if (nxtFp != null && (curFp == null || nxtFp > curFp)) {
    benefits.push(`${nxtFp} voice fingerprint${nxtFp !== 1 ? 's' : ''} (was ${curFp ?? 0})`)
  }

  // Per-feature deltas — show the one the user just bumped into, plus 2 other notable gains.
  const featuresToHighlight: Array<keyof typeof cur.perFeature> = [
    feature as keyof typeof cur.perFeature,
    'voice_transcriptions',
    'image_uploads',
    'ai_image_generations',
    'repurpose_runs',
  ]
  for (const fk of featuresToHighlight) {
    if (!(fk in nxt.perFeature)) continue
    const curVal = cur.perFeature[fk] as number
    const nxtVal = nxt.perFeature[fk] as number
    if (nxtVal > curVal && benefits.length < 5) {
      const label = FEATURE_LABELS[fk] ?? String(fk)
      benefits.push(`${nxtVal} ${label.toLowerCase()}/month`)
    }
  }

  // Boolean entitlement gains
  if (nxt.features.scheduling && !cur.features.scheduling) benefits.push('Post scheduling')
  if (!nxt.features.watermark && cur.features.watermark) benefits.push('No watermark')
  if (nxt.features.carousel && !cur.features.carousel) benefits.push('Carousel generator')
  if (nxt.features.api && !cur.features.api) benefits.push('Zapier + API access')

  // Dedupe and cap at 5.
  return Array.from(new Set(benefits)).slice(0, 5)
}

type Config = {
  feature: string
  plan: string
  used: number
  limit: number
  toastId?: string | number
}

function UpgradeModalContent({ feature, plan, used, limit, toastId }: Config) {
  const currentPlan = (plan ?? 'free') as TierID
  const nextPlan = getNextTier(currentPlan)
  const featureLabel = FEATURE_LABELS[feature as keyof typeof FEATURE_LABELS] || feature
  const benefits = nextPlan ? nextTierBenefits(currentPlan, nextPlan, feature) : []

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
        <span className="font-semibold text-slate-700">{TIER_LABEL[currentPlan] ?? currentPlan} plan</span>{' '}
        this month.
      </p>

      {nextPlan && benefits.length > 0 && (
        <div className="rounded-xl p-3.5 mb-4" style={{ background: 'var(--pl-accent-soft)', border: '1px solid color-mix(in oklab, var(--pl-accent) 20%, transparent)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--pl-accent)' }}>
            Upgrade to {TIER_LABEL[nextPlan]}
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
            Upgrade to {TIER_LABEL[nextPlan]}
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
