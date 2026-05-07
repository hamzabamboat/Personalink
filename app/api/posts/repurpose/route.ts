import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { repurposePost } from '@/lib/anthropic'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = profile?.plan || 'starter'

  // Repurpose is Pro only
  if (plan !== 'pro') {
    return NextResponse.json({
      error: 'Repurpose is a Pro feature. Upgrade to unlock.',
      feature: 'repurpose_runs',
      used: 0,
      limit: 0,
      plan,
    }, { status: 403 })
  }

  // Check repurpose_runs limit
  const repurposeCheck = await checkLimit(user.id, plan, 'repurpose_runs')
  if (!repurposeCheck.allowed) {
    await logViolation(user.id, 'repurpose_runs', plan)
    return NextResponse.json({
      error: `You've used all ${repurposeCheck.limit} repurpose runs this month.`,
      feature: 'repurpose_runs',
      used: repurposeCheck.used,
      limit: repurposeCheck.limit,
      plan,
    }, { status: 429 })
  }

  const { postId } = await request.json()
  if (!postId) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('content')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single()
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const { data: fullProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const angles = await repurposePost(post.content, fullProfile || profile)
  await incrementUsage(user.id, 'repurpose_runs')

  return NextResponse.json({ angles })
}
