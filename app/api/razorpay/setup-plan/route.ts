// One-time setup: POST /api/razorpay/setup-plan
// Creates the ₹2,500/mo plan in Razorpay and returns the plan_id.
// Copy that plan_id into .env.local as RAZORPAY_PLAN_ID, then never call this again.

import { NextRequest, NextResponse } from 'next/server'
import { razorpay, PLAN_AMOUNTS, PLAN_CURRENCY } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plan = await razorpay.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name: 'PersonaLink Pro',
      amount: PLAN_AMOUNTS.standard,
      currency: PLAN_CURRENCY,
      description: 'AI LinkedIn content manager — unlimited posts, voice notes & scheduling',
    },
    notes: { product: 'personalink' },
  })

  return NextResponse.json({
    plan_id: (plan as { id: string }).id,
    message: 'Copy this plan_id into .env.local as RAZORPAY_PLAN_ID',
  })
}
