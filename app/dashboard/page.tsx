'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Post, UserProfile } from '@/lib/supabase'
import { ConcentricRings, QuarterRings } from '@/components/concentric-rings'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Sparkles,
  BookOpen,
  CalendarDays,
  ImageIcon,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { showUpgradeModal } from '@/components/upgrade-limit-modal'
import { PostCard, PostCardSkeleton } from '@/components/post-card'
import { EmptyState } from '@/components/empty-state'

type ProfileAnalysis = {
  score: number
  improvements: string[]
  analysed_at: string
}

const TIPS = [
  'Posts with a personal story get 3× more comments than pure opinion pieces.',
  'Ask a question at the end — it doubles the comment rate.',
  'The first line is 80% of the post. Rewrite it until it demands a click.',
  'Post between 7–9 AM or 5–6 PM in your timezone for maximum reach.',
  'Short paragraphs win on LinkedIn. One idea per line.',
  'Carousels get 3× the impressions of text posts — try one this week.',
  'Consistency beats virality. One post per week for 3 months beats a one-hit wonder.',
  'Numbers in your headline increase click-through by 36%. Try "5 lessons from..."',
  'Tag 1–2 people max — over-tagging kills reach.',
  "Don't start with \"I\". Open with your hook statement instead.",
  'Emojis boost engagement by 48% when used sparingly — max 3 per post.',
  'A post that teaches one thing beats a post that covers ten.',
  'Reply to every comment in the first hour — LinkedIn rewards it with more reach.',
  'Your headline is your tagline. Describe what you do for others, not just your title.',
  'Native video gets 5× the reach of shared links — record something this week.',
  'DM someone who commented with a genuine follow-up. Most don\'t. You\'ll stand out.',
  'Hook formula: "[Counterintuitive claim]. Here\'s why..." — try it today.',
  'Posts that share failures get more engagement than posts that share wins.',
  'Write your post, then cut the first paragraph. It\'s almost never your real hook.',
  'Use "You" in your posts, not "One" or "People" — it feels personal.',
  'Share one thing you learned this week. The bar is low; the rewards are high.',
  'A strong CTA beats a weak post. End every post with one clear next step.',
  'Comment on 3 posts before you post your own — the algorithm notices.',
  'LinkedIn rewards dwell time. Line breaks make people scroll longer.',
  'Your profile photo gets 14× more views with a professional headshot.',
  'Post on Tuesdays and Wednesdays — data shows 20% higher engagement vs Mondays.',
  'B2B buyers check LinkedIn before meetings. Your last post is their first impression.',
  'Screenshot and share something you read this week — curation builds credibility fast.',
  'Add a "so what" to every data point. Facts + insight = thought leadership.',
  'Repost with your own commentary — it generates 2× more conversation than a silent share.',
  'Celebrate someone else\'s win publicly. Generosity on LinkedIn compounds over time.',
]

function ScoreRing({ score }: { score: number }) {
  const r = 36
  const c = 2 * Math.PI * r
  const filled = (score / 100) * c
  const color = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#ef4444'
  return (
    <svg width={88} height={88} viewBox="0 0 88 88" className="-rotate-90">
      <circle cx={44} cy={44} r={r} fill="none" stroke="#f1f5f9" strokeWidth={7} />
      <circle cx={44} cy={44} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round" />
    </svg>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null)
  const [reanalysing, setReanalysing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [monthStats, setMonthStats] = useState({ generated: 0, published: 0, pending: 0 })

  useEffect(() => {
    if (upgraded) toast.success('Subscription activated! Welcome to the plan.')
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const meRes = await fetch('/api/me')
        if (!meRes.ok) { window.location.href = '/'; return }
        const { user: u, profile: p } = await meRes.json()
        if (!u || cancelled) return
        if (!cancelled) setProfile(p)

        const now = new Date()
        const createdMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const [scheduledRes, analysisRes, monthRes] = await Promise.all([
          fetch('/api/posts?status=scheduled&order=scheduled_at&limit=5').then(r => r.json()),
          fetch('/api/profile/analyse').then(r => r.json()),
          fetch(`/api/posts?created_month=${createdMonth}`).then(r => r.json()),
        ])

        if (!cancelled) {
          setPosts(scheduledRes.posts || [])
          const latestAnalysis = analysisRes?.analyses?.[0]
          if (latestAnalysis) {
            setAnalysis(latestAnalysis)
            setScore(latestAnalysis.score)
          }
          const all: Post[] = monthRes.posts || []
          setMonthStats({
            generated: all.length,
            published: all.filter(p => p.status === 'published').length,
            pending: all.filter(p => p.status === 'pending_approval' || p.status === 'scheduled').length,
          })
        }
      } catch {
        /* non-fatal — page stays in loading state */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleReanalyse() {
    setReanalysing(true)
    try {
      const res = await fetch('/api/profile/analyse', { method: 'POST' })
      const data = await res.json()
      if (res.status === 429 && data.feature) {
        showUpgradeModal({ feature: data.feature, plan: data.plan, used: data.used, limit: data.limit })
        return
      }
      if (data.error) { toast.error('Analysis failed: ' + data.error); return }
      setAnalysis({ ...data, analysed_at: new Date().toISOString() })
      setScore(data.score)
      toast.success('Profile analysed! Score: ' + data.score + '/100')
    } catch {
      toast.error('Failed to analyse profile.')
    } finally {
      setReanalysing(false)
    }
  }

  const firstName = profile?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const postsUsed = profile?.posts_used_this_month || 0
  const postsLimit = profile?.posts_limit || 12
  const pillars = profile?.content_pillars || []
  const plan = profile?.plan || 'starter'
  const planColor = plan === 'pro' ? '#7c3aed' : plan === 'standard' ? '#0B458B' : '#64748b'
  const _now = new Date()
  const _dayOfYear = Math.floor((_now.getTime() - new Date(_now.getFullYear(), 0, 0).getTime()) / 86400000)
  const tipOfDay = TIPS[_dayOfYear % TIPS.length]

  if (loading) {
    return (
      <div className="p-4 md:p-7">
        {/* Welcome skeleton */}
        <div className="animate-pulse mb-7">
          <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-64 mb-2" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-40" />
        </div>
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
            {[...Array(3)].map((_, i) => <PostCardSkeleton key={i} />)}
          </div>
          <div className="flex flex-col gap-4">
            <div className="animate-pulse h-48 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="animate-pulse h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-7">
      {/* Welcome card */}
      <div className="mb-5 md:mb-6 relative overflow-hidden">
        <QuarterRings size={300} color="blue" className="absolute -top-10 -right-10 pointer-events-none hidden lg:block" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-1">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-slate-400 font-medium">{todayStr}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-600 rounded-full px-2.5 sm:px-3 py-1 text-[12px] sm:text-[13px] font-semibold whitespace-nowrap">
              {postsUsed}/{postsLimit} posts
            </span>
            <Button render={<Link href="/dashboard/generate" />} className="gap-2 shadow-sm">
              <Sparkles className="w-4 h-4" />
              Generate
            </Button>
          </div>
        </div>
      </div>

      {/* Main 2-column grid */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left column (col-span-2) ── */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Quick actions */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick actions</div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { href: '/dashboard/generate', label: 'Generate Post', sub: 'Write with AI', icon: Sparkles, bg: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/50' },
                { href: '/dashboard/story-bank', label: 'Add a Story', sub: 'Build your bank', icon: BookOpen, bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50' },
                { href: '/dashboard/calendar', label: 'Calendar', sub: 'See your schedule', icon: CalendarDays, bg: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-900/50' },
                { href: '/dashboard/upload', label: 'Upload Photos', sub: 'Boost engagement', icon: ImageIcon, bg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/50' },
              ].map(a => {
                const Icon = a.icon
                return (
                  <Link key={a.href} href={a.href}
                    className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl ${a.bg} border border-transparent hover:shadow-md transition-all duration-200 group`}>
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${a.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${a.iconColor}`} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[12px] sm:text-[13px] font-bold ${a.iconColor} leading-tight truncate`}>{a.label}</div>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{a.sub}</div>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-300 shrink-0 group-hover:translate-x-0.5 transition-transform hidden sm:block" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Upcoming scheduled posts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Posts</div>
              <Link href="/dashboard/calendar" className="text-[12px] text-brand font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {posts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <EmptyState
                  icon={CalendarDays}
                  title="No posts scheduled"
                  subtitle="Generate your first post and schedule it to go live automatically."
                  ctaLabel="Generate a post"
                  ctaHref="/dashboard/generate"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {posts.map(post => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    content={post.content}
                    scheduledAt={post.scheduled_at}
                    status={post.status}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">
          {/* LinkedIn score card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 relative overflow-hidden">
            <ConcentricRings size={160} className="absolute inset-0 m-auto pointer-events-none" opacity={0.05} />
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 relative">LinkedIn Score</div>
            {analysis ? (
              <>
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative shrink-0">
                    <ScoreRing score={analysis.score} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[18px] font-extrabold text-slate-900 dark:text-slate-100">{analysis.score}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{analysis.score}<span className="text-sm text-slate-400 font-normal">/100</span></div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {(() => {
                        const days = Math.floor((Date.now() - new Date(analysis.analysed_at).getTime()) / (1000 * 60 * 60 * 24))
                        if (days < 1) return 'Analysed today'
                        if (days === 1) return 'Analysed yesterday'
                        if (days < 7) return `Analysed ${days} days ago`
                        return `Analysed on ${new Date(analysis.analysed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                      })()}
                    </div>
                  </div>
                </div>
                {analysis.improvements?.slice(0, 2).map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start text-[12px] text-slate-500 dark:text-slate-400 mb-1.5">
                    <span className="text-brand mt-0.5 shrink-0">→</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center mx-auto mb-3">
                  <span className="text-[22px] font-extrabold text-slate-200 dark:text-slate-700">?</span>
                </div>
                <p className="text-[12px] text-slate-400 mb-3">Run an AI analysis of your LinkedIn profile</p>
              </div>
            )}
            <button
              onClick={handleReanalyse}
              disabled={reanalysing}
              className="mt-3 w-full py-2 px-3 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
              style={{ background: planColor + '15', color: planColor }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reanalysing ? 'animate-spin' : ''}`} />
              {reanalysing ? 'Analysing...' : 'Analyse Profile'}
            </button>
          </div>

          {/* Month stats */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">This Month</div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Generated', value: monthStats.generated, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
                { label: 'Published', value: monthStats.published, bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-400' },
                { label: 'Pending', value: monthStats.pending, bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400' },
              ].map(stat => (
                <div key={stat.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${stat.bg}`}>
                  <span className={`text-sm font-bold ${stat.text}`}>{stat.value}</span>
                  <span className={`text-[11px] font-medium ${stat.text} opacity-80`}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content pillars */}
          {pillars.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Content Pillars</div>
              <div className="flex flex-wrap gap-2">
                {pillars.map(p => (
                  <Link
                    key={p}
                    href={`/dashboard/generate?idea=${encodeURIComponent(p)}`}
                    className="text-[12px] font-medium px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    {p}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tip card */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-white">
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-70">Tip of the day</div>
            <p className="text-[13px] leading-relaxed font-medium">{tipOfDay}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>
}
