import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  return cookie === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

const PLAN_PRICE: Record<string, number> = { starter: 999, standard: 2499, pro: 4999 }

export async function GET(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [usersRes, profilesRes, postsRes, scoresRes, subscriptionsRes, aiPostsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, subscription_status, created_at'),
    supabaseAdmin.from('user_profiles').select('user_id, plan, posts_used_this_month, posts_limit, onboarding_completed_at'),
    supabaseAdmin.from('posts').select('id, created_at'),
    supabaseAdmin.from('linkedin_scores').select('score'),
    supabaseAdmin.from('subscriptions').select('user_id, status, plan_id, start_date'),
    supabaseAdmin
      .from('posts')
      .select('ai_detection_score, ai_rewrite_attempts')
      .gte('created_at', thirtyDaysAgo)
      .not('ai_detection_score', 'is', null),
  ])

  const users = usersRes.data || []
  const profiles = profilesRes.data || []
  const posts = postsRes.data || []
  const scores = scoresRes.data || []
  const subscriptions = subscriptionsRes.data || []
  const aiPosts = aiPostsRes.data || []

  const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]))
  const activeUsers = users.filter(u => u.subscription_status === 'active')
  const mrr = activeUsers.reduce((sum, u) => sum + (PLAN_PRICE[profileMap[u.id]?.plan || 'starter'] || 0), 0)

  const newSignupsToday = users.filter(u => u.created_at >= startOfToday).length
  const postsToday = posts.filter(p => p.created_at >= startOfToday).length

  const newSubsThisMonth = subscriptions.filter(s => s.status === 'active' && s.start_date && s.start_date >= startOfMonth).length
  const newUsersThisMonth = users.filter(u => u.created_at >= startOfMonth).length
  const trialConversionRate = newUsersThisMonth > 0 ? Math.round((newSubsThisMonth / newUsersThisMonth) * 100) : 0

  const planCounts: Record<string, number> = { starter: 0, standard: 0, pro: 0 }
  for (const p of profiles) {
    const plan = p.plan || 'starter'
    planCounts[plan] = (planCounts[plan] || 0) + 1
  }
  const mostPopularPlan = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'starter'

  const avgLinkedinScore = scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
    : 0

  const usersAtLimit = profiles.filter(p => p.posts_used_this_month >= (p.posts_limit || 12)).length

  const completedOnboarding = profiles.filter(p => p.onboarding_completed_at).length
  const onboardingRate = profiles.length > 0 ? Math.round((completedOnboarding / profiles.length) * 100) : 0

  // Anti-AI-detection metrics — last 30 days of posts that ran through the gate
  const aiScoreSum = aiPosts.reduce((s, p) => s + (p.ai_detection_score ?? 0), 0)
  const avgAiDetectionScore = aiPosts.length > 0 ? Math.round(aiScoreSum / aiPosts.length) : 0
  const rewrittenCount = aiPosts.filter(p => (p.ai_rewrite_attempts ?? 0) >= 1).length
  const pctDraftsRewritten = aiPosts.length > 0 ? Math.round((rewrittenCount / aiPosts.length) * 100) : 0

  return NextResponse.json({
    new_signups_today: newSignupsToday,
    mrr,
    trial_conversion_rate: trialConversionRate,
    most_popular_plan: mostPopularPlan,
    avg_linkedin_score: avgLinkedinScore,
    total_posts_all_time: posts.length,
    users_at_post_limit: usersAtLimit,
    onboarding_completion_rate: onboardingRate,
    total_users: users.length,
    active_subscribers: activeUsers.length,
    posts_today: postsToday,
    avg_ai_detection_score: avgAiDetectionScore,
    pct_drafts_rewritten: pctDraftsRewritten,
    ai_posts_30d: aiPosts.length,
  })
}
