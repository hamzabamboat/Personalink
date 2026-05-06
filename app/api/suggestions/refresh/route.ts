import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { generateSuggestionsForUser } from '@/lib/anthropic'
import { getTrendsForProfile } from '@/lib/trends'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })

  // Get trending news
  let trendingNews: string[] = []
  try {
    const trends = await getTrendsForProfile(profile)
    trendingNews = [
      ...trends.trendingTopics.slice(0, 3),
      ...trends.newsArticles.slice(0, 3).map((a: { title: string }) => a.title),
    ]
  } catch {}

  // Get recent post topics
  const { data: recentPosts } = await supabaseAdmin
    .from('posts')
    .select('generation_prompt, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
  const recentTopics = (recentPosts || []).map(p => p.generation_prompt || p.content?.slice(0, 80)).filter(Boolean) as string[]

  // Generate suggestions
  const suggestions = await generateSuggestionsForUser(profile, trendingNews, recentTopics)

  if (suggestions.length > 0) {
    // Dismiss old pending
    await supabaseAdmin.from('post_suggestions').update({ status: 'dismissed' }).eq('user_id', user.id).eq('status', 'pending')
    // Insert new
    await supabaseAdmin.from('post_suggestions').insert(
      suggestions.map(s => ({
        user_id: user.id,
        suggestion_text: s.suggestion_text,
        angle: s.angle,
        hashtags: s.hashtags,
        why_it_works: s.why_it_works,
        source: s.source || 'news',
        status: 'pending',
      }))
    )
  }

  return NextResponse.json({ count: suggestions.length })
}
