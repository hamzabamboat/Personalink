'use client'

import { useState, useEffect } from 'react'
import { supabase, PostSuggestion, Post } from '@/lib/supabase'
import Link from 'next/link'

function formatAge(createdAt: string): { label: string; fresh: boolean } {
  const ms = Date.now() - new Date(createdAt).getTime()
  const minutes = ms / (1000 * 60)
  const hours = ms / (1000 * 60 * 60)
  const days = ms / (1000 * 60 * 60 * 24)
  if (minutes < 2) return { label: 'just now', fresh: true }
  if (hours < 1) return { label: `${Math.floor(minutes)}m ago`, fresh: true }
  if (hours < 6) return { label: `${Math.floor(hours)}h ago`, fresh: true }
  if (hours < 24) return { label: `${Math.floor(hours)} hours ago`, fresh: false }
  return { label: `${Math.floor(days)} day${Math.floor(days) !== 1 ? 's' : ''} ago`, fresh: false }
}
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  RefreshCw,
  Flame,
  TrendingUp,
  BookOpen,
  Repeat2,
  Lightbulb,
  X,
  ArrowRight,
  Zap,
  Lock,
  ThumbsUp,
  Eye,
} from 'lucide-react'
import { EmptyState } from '@/components/empty-state'

type SuggestionTab = 'trending' | 'history' | 'stories' | 'repurpose'

export default function SuggestionsPage() {
  const [tab, setTab] = useState<SuggestionTab>('trending')
  const [suggestions, setSuggestions] = useState<PostSuggestion[]>([])
  const [topPosts, setTopPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [repurposedPost, setRepurposedPost] = useState<Post | null>(null)
  const [repurposed, setRepurposed] = useState<string[]>([])
  const [repurposing, setRepurposing] = useState(false)
  const [plan, setPlan] = useState('starter')
  const [userId, setUserId] = useState<string | null>(null)
  const [ideasAge, setIdeasAge] = useState<string | null>(null)
  const [ideasFresh, setIdeasFresh] = useState(true)

  function applySuggestions(data: PostSuggestion[], lastGeneratedAt?: string | null) {
    setSuggestions(data)
    const ts = lastGeneratedAt || (data.length > 0 ? data[0].created_at : null)
    if (ts) {
      const { label, fresh } = formatAge(ts)
      setIdeasAge(label)
      setIdeasFresh(fresh)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const meRes = await fetch('/api/me')
        const { user, profile } = await meRes.json()
        if (!user) { window.location.href = '/'; return }
        if (cancelled) return
        setPlan(profile?.plan || 'starter')
        setUserId(user.id)

        const [suggestionsRes, postsRes] = await Promise.all([
          fetch('/api/suggestions/refresh'),
          supabase.from('posts').select('*').eq('user_id', user.id).eq('status', 'published').order('reactions', { ascending: false }).limit(10),
        ])
        if (cancelled) return

        const suggestionsData = await suggestionsRes.json()
        const data: PostSuggestion[] = suggestionsData.suggestions || []
        applySuggestions(data, suggestionsData.last_generated_at)
        setTopPosts(postsRes.data || [])

        // Auto-refresh in background if ideas are stale (older than 6 hours)
        if (data.length > 0) {
          const hoursDiff = (Date.now() - new Date(data[0].created_at).getTime()) / (1000 * 60 * 60)
          if (hoursDiff >= 6) {
            fetch('/api/suggestions/refresh', { method: 'POST' })
              .then(r => r.json())
              .then(d => {
                if (!cancelled && d.suggestions?.length > 0) applySuggestions(d.suggestions, d.last_generated_at)
              })
              .catch(() => {})
          }
        }
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshSuggestions() {
    setGenerating(true)
    const res = await fetch('/api/suggestions/refresh', { method: 'POST' })
    const data = await res.json()
    setGenerating(false)
    if (data.error) { toast.error('Error refreshing: ' + data.error); return }
    if (data.suggestions?.length > 0) {
      applySuggestions(data.suggestions, data.last_generated_at)
      toast.success('Fresh ideas generated!')
    } else {
      toast.error(data.error || 'No ideas were generated. Please try again.')
    }
  }

  async function dismissSuggestion(id: string) {
    setSuggestions(s => s.filter(x => x.id !== id))
    fetch('/api/suggestions/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }

  async function repurposePost(post: Post) {
    setRepurposedPost(post)
    setRepurposing(true)
    const res = await fetch('/api/posts/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: post.id }) })
    const data = await res.json()
    setRepurposing(false)
    if (data.error) { toast.error('Error: ' + data.error); return }
    setRepurposed(data.angles || [])
  }

  const bySource = {
    trending: suggestions.filter(s => ['news', 'trends'].includes(s.source)),
    history: suggestions.filter(s => s.source === 'history'),
    stories: suggestions.filter(s => s.source === 'story_bank'),
  }

  const SOURCE_LABEL: Record<string, string> = {
    news: 'Trending',
    trends: 'Trending',
    history: 'Your History',
    story_bank: 'Story Bank',
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-7 w-full">
        <div className="h-8 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const currentSuggestions = tab === 'trending' ? bySource.trending : tab === 'history' ? bySource.history : bySource.stories

  const emptyIcons = {
    trending: Flame,
    history: TrendingUp,
    stories: BookOpen,
  }

  return (
    <div className="p-3 sm:p-4 md:p-7 w-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-5 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 tracking-tight">Post Ideas</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-400 text-sm font-medium">Fresh ideas tailored to your industry and voice</p>
            {ideasAge && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ideasFresh ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {ideasFresh ? '● ' : '⚠ '}{generating ? 'Refreshing...' : `Generated ${ideasAge}`}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={refreshSuggestions} disabled={generating} size="sm" className="gap-1.5 border-slate-200 w-full sm:w-auto">
          <RefreshCw className={`size-3.5 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating...' : 'Refresh Ideas'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SuggestionTab)}>
        <TabsList className="mb-6 h-10 gap-1 p-1 w-full justify-start">
          <TabsTrigger value="trending" className="gap-1.5 text-[13px]">
            <Flame className="w-3.5 h-3.5" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-[13px]">
            <TrendingUp className="w-3.5 h-3.5" />
            Your History
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-1.5 text-[13px]">
            <BookOpen className="w-3.5 h-3.5" />
            Story Bank
          </TabsTrigger>
          <TabsTrigger value="repurpose" className="gap-1.5 text-[13px]" disabled={plan === 'starter'}>
            <Repeat2 className="w-3.5 h-3.5" />
            Repurpose
            {plan === 'starter' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-brand-light text-brand ml-0.5">PRO</Badge>}
          </TabsTrigger>
        </TabsList>

        {(['trending', 'history', 'stories'] as SuggestionTab[]).map(tabId => (
          <TabsContent key={tabId} value={tabId} className="w-full">
            {currentSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full min-h-[400px] text-center">
                <EmptyState
                  icon={emptyIcons[tabId as keyof typeof emptyIcons]}
                  title="No suggestions yet"
                  subtitle='Click "Refresh Ideas" to generate fresh post ideas for your industry.'
                  ctaLabel={generating ? 'Generating...' : 'Generate Ideas Now'}
                  onCta={generating ? undefined : refreshSuggestions}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                {currentSuggestions.map(s => (
                  <div key={s.id} className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 hover:border-brand hover:shadow-md transition-all bg-white dark:bg-slate-900 flex flex-col shadow-sm">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-brand bg-brand-light px-2.5 py-1 rounded-full uppercase tracking-wide">
                        {SOURCE_LABEL[s.source] || 'General'}
                      </span>
                      <button
                        onClick={() => dismissSuggestion(s.id)}
                        className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors p-0.5"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-sm leading-snug flex-1">{s.suggestion_text}</p>
                    {s.why_it_works && (
                      <p className="text-slate-500 dark:text-slate-400 text-xs mb-3 leading-relaxed line-clamp-2">{s.why_it_works}</p>
                    )}
                    {s.hashtags && s.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {s.hashtags.slice(0, 3).map(h => (
                          <span key={h} className="text-[11px] text-brand bg-brand-light px-1.5 py-0.5 rounded">#{h}</span>
                        ))}
                      </div>
                    )}
                    <Link href={`/dashboard/generate?idea=${encodeURIComponent(s.suggestion_text)}`} className="mt-auto">
                      <Button size="sm" className="w-full gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Use this idea
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="repurpose">
          {plan === 'starter' ? (
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="relative inline-block mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                    <Repeat2 className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                    <Lock className="w-3 h-3 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Repurpose Engine is a Pro feature</h2>
                <p className="text-slate-500 text-sm mb-7 max-w-sm mx-auto">Turn your best post into 3 new angles. Maximum reach, minimum effort.</p>
                <Button render={<Link href="/dashboard/settings?tab=plan" />} className="gap-1.5">
                  <Zap className="w-4 h-4" />
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          ) : !repurposedPost ? (
            <div>
              <div className="text-[13px] font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Repeat2 className="w-4 h-4 text-slate-400" />
                Pick a post to repurpose:
              </div>
              {topPosts.length === 0 ? (
                <Card className="border-slate-100 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Repeat2 className="w-8 h-8 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
                    <div className="text-sm text-slate-400">No published posts yet. Publish some posts first!</div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {topPosts.map(post => (
                    <Card
                      key={post.id}
                      className="border-slate-100 shadow-sm card-hover cursor-pointer group"
                      onClick={() => repurposePost(post)}
                    >
                      <CardContent className="pt-4 pb-4">
                        <p className="text-sm text-slate-600 leading-relaxed mb-2.5 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.content}</p>
                        <div className="flex gap-4 items-center">
                          <div className="flex gap-3">
                            {post.reactions != null && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <ThumbsUp className="w-3 h-3" /> {post.reactions}
                              </span>
                            )}
                            {post.impressions != null && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Eye className="w-3 h-3" /> {post.impressions?.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="ml-auto flex items-center gap-1 text-xs text-brand font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            <Repeat2 className="w-3 h-3" /> Repurpose
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <Button variant="ghost" size="sm" onClick={() => { setRepurposedPost(null); setRepurposed([]) }} className="mb-5 -ml-2 text-slate-500 gap-1.5">
                ← Pick a different post
              </Button>
              {repurposing ? (
                <Card className="border-slate-100 shadow-sm">
                  <CardContent className="py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-pro/10 flex items-center justify-center mx-auto mb-4">
                      <Repeat2 className="w-6 h-6 text-pro animate-spin" strokeWidth={1.5} />
                    </div>
                    <div className="text-sm text-slate-500 font-medium">Generating 3 new angles...</div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  {repurposed.map((angle, i) => (
                    <Card key={i} className="border-slate-100 shadow-sm card-hover">
                      <CardContent className="pt-5 pb-5">
                        <div className="text-[11px] font-bold text-brand uppercase tracking-wider mb-3">Angle {i + 1}</div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">{angle}</p>
                        <Button
                          render={<Link href={`/dashboard/generate?idea=${encodeURIComponent(angle.slice(0, 100))}`} />}
                          size="sm" variant="outline"
                          className="gap-1.5 border-slate-200"
                        >
                          Use this angle <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
