'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PLAN_FEATURES } from '@/lib/supabase'
import { ChevronLeft, Check, BarChart3, Mic, Repeat2, Zap, Users } from 'lucide-react'

const FEATURE_MAP: Record<string, { title: string; desc: string; icon: React.ElementType; iconColor: string; iconBg: string; minPlan: string }> = {
  analytics: { title: 'Analytics Dashboard', desc: 'LinkedIn Score history, engagement trends, best posting times heatmap, follower growth, and your top 3 posts of all time.', icon: BarChart3, iconColor: '#0A66C2', iconBg: '#e8f0fb', minPlan: 'Standard' },
  voice: { title: 'Voice Notes', desc: 'Record or upload audio, we transcribe with Whisper AI, and turn it into a polished LinkedIn post in your voice.', icon: Mic, iconColor: '#7c3aed', iconBg: '#f5f3ff', minPlan: 'Standard' },
  repurpose: { title: 'Repurpose Engine', desc: 'Take any high-performing post and instantly generate 3 fresh angles. Maximum reach from minimum effort.', icon: Repeat2, iconColor: '#dc2626', iconBg: '#fef2f2', minPlan: 'Pro' },
  bulk: { title: 'Bulk Generate', desc: 'Fill your entire next 30 days of posts with one click. AI rotates across your content pillars automatically.', icon: Zap, iconColor: '#d97706', iconBg: '#fffbeb', minPlan: 'Pro' },
  team: { title: 'Team Mode', desc: 'Manage up to 3 LinkedIn profiles from a single dashboard. Perfect for agencies and founders with multiple brands.', icon: Users, iconColor: '#059669', iconBg: '#ecfdf5', minPlan: 'Pro' },
}

const PLANS = [
  { id: 'standard', label: 'Standard', price: 2500, posts: 20, features: PLAN_FEATURES.standard, color: '#0A66C2' },
  { id: 'pro', label: 'Pro', price: 5000, posts: 30, features: PLAN_FEATURES.pro, color: '#7c3aed' },
]

function UpgradeContent() {
  const searchParams = useSearchParams()
  const feature = searchParams.get('feature') || ''
  const info = FEATURE_MAP[feature]

  return (
    <div className="p-8 max-w-3xl">
      <Button variant="ghost" size="sm" render={<Link href="/dashboard" />} className="mb-8 -ml-2 text-slate-500 gap-1.5">
        <ChevronLeft className="size-4" />
        Back to dashboard
      </Button>

      {info && (() => {
        const Icon = info.icon
        return (
          <Card className="mb-7 border-slate-100 shadow-sm">
            <CardContent className="pt-6 pb-6 flex gap-5 items-start">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: info.iconBg }}>
                <Icon className="w-7 h-7" style={{ color: info.iconColor }} strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">{info.title}</h1>
                <p className="text-slate-500 text-sm leading-relaxed mb-3 max-w-lg">{info.desc}</p>
                <Badge variant="secondary" className="text-brand bg-brand-light text-xs font-semibold">
                  Requires {info.minPlan} plan or above
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {!info && (
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Unlock more with an upgrade</h1>
          <p className="text-slate-400 font-medium text-sm">Get more posts, features, and tools to grow your LinkedIn presence.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {PLANS.map(plan => (
          <Card key={plan.id} className="overflow-hidden shadow-sm card-hover" style={{ border: `1.5px solid ${plan.color}25` }}>
            <CardContent className="pt-6 pb-6">
              <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: plan.color }}>{plan.label}</div>
              <div className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
                ₹{plan.price.toLocaleString('en-IN')}<span className="text-sm font-normal text-slate-400">/mo</span>
              </div>
              <div className="text-xs text-slate-400 mb-5">{plan.posts} posts/month · ₹{Math.round(plan.price / plan.posts)}/post</div>
              <div className="flex flex-col gap-2.5 mb-6">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: plan.color + '18' }}>
                      <Check className="w-2.5 h-2.5" style={{ color: plan.color }} strokeWidth={2.5} />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
              <Button
                render={<Link href="/dashboard/settings?tab=plan" />}
                className="w-full text-white gap-1.5"
                style={{ background: plan.color }}
              >
                Upgrade to {plan.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">All plans include a 7-day trial. Cancel anytime from Settings.</p>
    </div>
  )
}

export default function UpgradeDashboardPage() {
  return <Suspense><UpgradeContent /></Suspense>
}
