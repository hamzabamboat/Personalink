'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check, ArrowRight, Zap } from 'lucide-react'
import { PLAN_FEATURES } from '@/lib/supabase'

const PLANS = [
  { id: 'starter', label: 'Starter', price: 999, posts: 12, features: PLAN_FEATURES.starter, color: '#64748b' },
  { id: 'standard', label: 'Standard', price: 2499, posts: 20, features: PLAN_FEATURES.standard, color: '#0B458B', popular: true },
  { id: 'pro', label: 'Pro', price: 4999, posts: 30, features: PLAN_FEATURES.pro, color: '#7c3aed' },
]

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); setLoading(null); return }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch {
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="max-w-[900px] mx-auto h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center">
            <div className="bg-white rounded-xl px-3 py-1.5 inline-flex items-center justify-center shadow-sm border border-slate-100">
              <img src="/logo-text.png" alt="PersonaLink" className="h-7 w-auto" />
            </div>
          </Link>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
            ← Back to dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 py-10 md:py-14">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-light text-brand rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Zap className="w-3.5 h-3.5" />
            Upgrade your plan
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Choose your plan
          </h1>
          <p className="text-slate-500 text-base max-w-md mx-auto">
            Start with a 7-day free trial. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <Card
              key={plan.id}
              className={`relative border-2 shadow-sm transition-shadow hover:shadow-md ${plan.popular ? 'border-brand shadow-md' : 'border-slate-200'}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">Most popular</span>
                </div>
              )}
              <CardContent className="pt-6 pb-6">
                <div className="mb-5">
                  <div className="font-bold text-lg text-slate-900 mb-1" style={{ color: plan.color }}>{plan.label}</div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    ₹{plan.price.toLocaleString('en-IN')}
                    <span className="text-base font-medium text-slate-400">/mo</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">{plan.posts} posts/month</div>
                </div>
                <div className="flex flex-col gap-2 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: plan.color + '18' }}>
                        <Check className="w-2.5 h-2.5" style={{ color: plan.color }} strokeWidth={2.5} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id}
                  className="w-full gap-2 font-semibold"
                  style={{ background: plan.color }}
                >
                  {loading === plan.id ? 'Loading...' : (
                    <>Start Free Trial <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
                <p className="text-center text-xs text-slate-400 mt-2">Free 7 days, then ₹{plan.price.toLocaleString('en-IN')}/mo</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
