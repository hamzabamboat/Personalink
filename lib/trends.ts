import * as googleTrends from 'google-trends-api'
import { supabaseAdmin } from './supabase-admin'
import { anthropic } from './anthropic'
import { UserProfile } from './supabase'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export type NewsArticle = {
  title: string
  description: string
  url: string
  publishedAt: string
  source: string
}

export type PostIdea = {
  title: string
  angle: string
  whyItWorks: string
  source: 'news' | 'trends'
}

export type TrendResult = {
  newsArticles: NewsArticle[]
  trendingTopics: string[]
  postIdeas: PostIdea[]
  hashtags: string[]
  cachedAt: string
}

async function fetchNews(industry: string, topics: string[]): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey || apiKey.startsWith('your_')) return []

  const query = [industry, ...topics.slice(0, 2)].filter(Boolean).join(' OR ')
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${apiKey}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return (data.articles || [])
      .filter((a: { title?: string }) => a.title && a.title !== '[Removed]')
      .slice(0, 8)
      .map((a: {
        title: string
        description?: string
        url: string
        publishedAt: string
        source?: { name?: string }
      }) => ({
        title: a.title,
        description: a.description || '',
        url: a.url,
        publishedAt: a.publishedAt,
        source: a.source?.name || 'Unknown',
      }))
  } catch {
    return []
  }
}

async function fetchGoogleTrends(keywords: string[]): Promise<string[]> {
  const results: string[] = []
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  for (const keyword of keywords.slice(0, 3)) {
    try {
      const raw = await googleTrends.relatedQueries({ keyword, startTime: sevenDaysAgo })
      const parsed = JSON.parse(raw)
      const items: Array<{ query: string }> = parsed?.default?.rankedList?.[0]?.rankedKeyword || []
      results.push(...items.slice(0, 5).map(item => item.query))
    } catch {
      // Google Trends can be flaky — continue with whatever we have
    }
  }

  return [...new Set(results)].slice(0, 15)
}

async function analyzeWithClaude(
  profile: UserProfile,
  articles: NewsArticle[],
  trendingTopics: string[]
): Promise<{ postIdeas: PostIdea[]; hashtags: string[] }> {
  const industry = profile.topics?.join(', ') || profile.job_title || 'business'
  const role = profile.job_title ? `a ${profile.job_title}` : 'a professional'

  const newsBlock = articles.length
    ? articles.map(a => `- ${a.title}${a.description ? ': ' + a.description.slice(0, 100) : ''}`).join('\n')
    : '(no news available)'

  const trendsBlock = trendingTopics.length
    ? trendingTopics.map(t => `- ${t}`).join('\n')
    : '(no trend data available)'

  const prompt = `You are a LinkedIn content strategist. Based on recent news and trending topics in ${industry}, generate 5 LinkedIn post ideas for ${role}.

RECENT NEWS:
${newsBlock}

TRENDING TOPICS:
${trendsBlock}

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "postIdeas": [
    {
      "title": "Short, punchy idea title (max 10 words)",
      "angle": "The specific hook or angle for this post (1 sentence)",
      "whyItWorks": "Why this will perform well on LinkedIn right now (1 sentence)",
      "source": "news"
    }
  ],
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6", "hashtag7", "hashtag8"]
}

Rules: exactly 5 post ideas, exactly 8 hashtags without # symbol, source must be "news" or "trends".`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { postIdeas: [], hashtags: [] }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      postIdeas: (parsed.postIdeas || []).slice(0, 5),
      hashtags: (parsed.hashtags || []).slice(0, 8),
    }
  } catch {
    return { postIdeas: [], hashtags: [] }
  }
}

export async function getTrendsForProfile(profile: UserProfile): Promise<TrendResult> {
  const industry = profile.topics?.[0] || profile.job_title || 'business'
  const cacheAfter = new Date(Date.now() - CACHE_TTL_MS).toISOString()

  const { data: cached } = await supabaseAdmin
    .from('trends_cache')
    .select('data, fetched_at')
    .eq('industry', industry)
    .gte('fetched_at', cacheAfter)
    .maybeSingle()

  if (cached?.data) {
    return cached.data as TrendResult
  }

  const keywords = profile.topics?.length ? profile.topics : [industry]
  const [articles, trendingTopics] = await Promise.all([
    fetchNews(industry, keywords),
    fetchGoogleTrends(keywords),
  ])

  const { postIdeas, hashtags } = await analyzeWithClaude(profile, articles, trendingTopics)

  const result: TrendResult = {
    newsArticles: articles,
    trendingTopics,
    postIdeas,
    hashtags,
    cachedAt: new Date().toISOString(),
  }

  await supabaseAdmin
    .from('trends_cache')
    .upsert({ industry, data: result, fetched_at: new Date().toISOString() }, { onConflict: 'industry' })

  return result
}

export async function getPostInsights(userId: string): Promise<{
  scheduledCount: number
  publishedCount: number
  topSource: string
  bestHour: number | null
  insight: string
}> {
  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('status, source, scheduled_at, created_at')
    .eq('user_id', userId)
    .in('status', ['scheduled', 'published', 'approved', 'rejected', 'draft'])

  if (!posts?.length) {
    return { scheduledCount: 0, publishedCount: 0, topSource: 'ai_generated', bestHour: null, insight: 'Generate your first posts to see insights here.' }
  }

  const scheduled = posts.filter(p => ['scheduled', 'published', 'approved'].includes(p.status))
  const published = posts.filter(p => p.status === 'published')

  const sourceCounts = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.source] = (acc[p.source] || 0) + 1
    return acc
  }, {})
  const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ai_generated'

  const scheduledHours = scheduled
    .filter(p => p.scheduled_at)
    .map(p => new Date(p.scheduled_at!).getHours())
  const hourCounts = scheduledHours.reduce<Record<number, number>>((acc, h) => {
    acc[h] = (acc[h] || 0) + 1
    return acc
  }, {})
  const bestHour = scheduledHours.length
    ? Number(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0])
    : null

  const sourceLabel = topSource === 'voice_note' ? 'voice notes' : topSource === 'manual' ? 'manual writing' : 'AI-generated topics'
  const hourLabel = bestHour !== null ? `${bestHour}:00` : null
  const insight = published.length > 0
    ? `You've published ${published.length} post${published.length > 1 ? 's' : ''}. You use ${sourceLabel} most.${hourLabel ? ` Your go-to scheduling time is ${hourLabel}.` : ''}`
    : scheduled.length > 0
    ? `You have ${scheduled.length} post${scheduled.length > 1 ? 's' : ''} in the pipeline. ${sourceLabel} is your preferred format.`
    : `Start scheduling posts to unlock personalised insights.`

  return { scheduledCount: scheduled.length, publishedCount: published.length, topSource, bestHour, insight }
}
