import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateLinkedInPosts } from '@/lib/anthropic'
import { analyzeContent } from '@/lib/compliance'
import { calculateSimilarityScore } from '@/lib/similarity'
import { checkLimit, incrementUsage } from '@/lib/usage-limits'
import { checkCircuitBreaker } from '@/lib/circuit-breaker'

export const maxDuration = 60

async function getUserByApiKey(key: string) {
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id, plan, posts_used_this_month, zapier_api_key')
    .eq('zapier_api_key', key)
    .maybeSingle()

  if (!profile) return null

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, subscription_status')
    .eq('id', profile.user_id)
    .maybeSingle()

  if (!user) return null

  return { user, profile }
}

export async function POST(request: NextRequest) {
  // Auth via Bearer token
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const found = await getUserByApiKey(token)
  if (!found) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const { user, profile } = found

  // Subscription check
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()
  const hasActiveSub =
    sub?.status === 'active' || sub?.status === 'trial' || sub?.status === 'trialing' ||
    user.subscription_status === 'access_code'
  const postsUsed = (profile.posts_used_this_month as number) || 0
  if (!hasActiveSub && postsUsed >= 3) {
    return NextResponse.json({ error: 'Trial limit reached. Upgrade to continue.' }, { status: 402 })
  }

  // Circuit breaker
  const cb = await checkCircuitBreaker()
  if (cb.open) {
    return NextResponse.json({ error: 'Service temporarily unavailable. Try again in a few minutes.' }, { status: 503 })
  }

  const plan = (profile.plan as string) || 'starter'

  // Monthly post limit check
  const postsCheck = await checkLimit(user.id, plan, 'posts_generated')
  if (!postsCheck.allowed) {
    return NextResponse.json({
      error: `Monthly post limit reached (${postsCheck.used}/${postsCheck.limit}). Upgrade your plan.`,
      feature: 'posts_generated',
    }, { status: 429 })
  }

  // Parse body
  let body: { topic?: string; context?: string; pillar?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { topic, context: additionalContext } = body

  if (!topic?.trim()) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  }

  // Fetch full profile for AI generation
  const { data: fullProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!fullProfile) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 400 })
  }

  // Recent posts for deduplication
  const { data: recentPostRows } = await supabaseAdmin
    .from('posts')
    .select('content, generation_prompt, topics_extracted, content_pillar')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const recentContents: string[] = (recentPostRows || []).map(p => p.content).filter(Boolean)
  const recentTopics: string[] = (recentPostRows || [])
    .flatMap(p => [p.generation_prompt, ...(Array.isArray(p.topics_extracted) ? p.topics_extracted : [])])
    .filter(Boolean)

  // Generate a single post (Zapier callers get one focused draft, not 3 options)
  const generated = await generateLinkedInPosts({
    profile: fullProfile,
    topic: topic.trim(),
    additionalContext,
    recentTopics,
  })

  const content = generated[0]?.trim()
  if (!content || content.length < 50) {
    return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
  }

  const scores = analyzeContent(content)
  const similarityScore = calculateSimilarityScore(content, recentContents)

  const fullRow = {
    user_id: user.id,
    content,
    status: 'draft',
    source: 'ai_generated',
    generation_prompt: topic.trim(),
    spam_score: scores.spam_score,
    humanity_score: scores.humanity_score,
    hook_similarity_score: scores.hook_similarity_score,
    originality_score: scores.originality_score,
    similarity_score: similarityScore,
    requires_manual_review: scores.requires_manual_review,
  }

  let result = await supabaseAdmin.from('posts').insert(fullRow).select().single()
  if (result.error) {
    // Fallback to minimal insert if schema columns are missing
    result = await supabaseAdmin
      .from('posts')
      .insert({ user_id: user.id, content, status: 'draft', source: 'ai_generated' })
      .select()
      .single()
  }

  if (result.error) {
    return NextResponse.json({ error: 'Failed to save draft.' }, { status: 500 })
  }

  await incrementUsage(user.id, 'posts_generated')

  return NextResponse.json({
    id: result.data.id,
    content: result.data.content,
    status: result.data.status,
    created_at: result.data.created_at,
    review_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.personalink.ai'}/dashboard/posts`,
  })
}
