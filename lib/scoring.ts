import { supabaseAdmin } from './supabase-admin'

export async function computeLinkedInScore(userId: string): Promise<{
  score: number
  breakdown: { posting_consistency: number; avg_engagement: number; profile_completeness: number }
}> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [profileRes, postsRes] = await Promise.all([
    supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabaseAdmin
      .from('posts')
      .select('status, scheduled_at, published_at, impressions, reactions, engagement_score')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  const profile = profileRes.data
  const posts = postsRes.data || []

  // Posting consistency (30 pts): posts per month vs plan limit
  const publishedOrScheduled = posts.filter(p => ['published', 'scheduled', 'approved'].includes(p.status))
  const planLimit = profile?.posts_limit || 12
  const consistencyRatio = Math.min(publishedOrScheduled.length / planLimit, 1)
  const posting_consistency = Math.round(consistencyRatio * 30)

  // Avg engagement (40 pts): based on reactions/impressions ratio
  const postsWithEngagement = posts.filter(p => p.impressions && p.impressions > 0)
  let avg_engagement = 0
  if (postsWithEngagement.length > 0) {
    const avgRate = postsWithEngagement.reduce((sum, p) => {
      const rate = ((p.reactions || 0) / (p.impressions || 1)) * 100
      return sum + rate
    }, 0) / postsWithEngagement.length
    // 5% engagement rate = full score
    avg_engagement = Math.round(Math.min(avgRate / 5, 1) * 40)
  } else {
    // No data yet — give partial credit if they have posts
    avg_engagement = publishedOrScheduled.length > 0 ? 15 : 0
  }

  // Profile completeness (30 pts)
  const fields = [
    profile?.name, profile?.role, profile?.industry, profile?.company,
    profile?.voice_fingerprint, profile?.content_pillars?.length,
    profile?.mcq_answers, profile?.writing_sample, profile?.linkedin_url,
    profile?.control_preference,
  ]
  const filled = fields.filter(Boolean).length
  const profile_completeness = Math.round((filled / fields.length) * 30)

  const score = Math.min(posting_consistency + avg_engagement + profile_completeness, 100)

  return { score, breakdown: { posting_consistency, avg_engagement, profile_completeness } }
}

export async function recordLinkedInScore(userId: string) {
  const { score, breakdown } = await computeLinkedInScore(userId)
  await supabaseAdmin.from('linkedin_scores').insert({ user_id: userId, score, breakdown })
  return { score, breakdown }
}
