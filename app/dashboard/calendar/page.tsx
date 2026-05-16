'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Post } from '@/lib/supabase'
import type { PostImage } from '@/lib/supabase'
import { QuarterRings } from '@/components/concentric-rings'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PostCard } from '@/components/post-card'
import { EmptyState } from '@/components/empty-state'
import { ImageSelector } from '@/components/image-selector'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Sparkles, ChevronLeft, ChevronRight, Plus, X, CalendarDays, Pencil, Clock, ImageIcon } from 'lucide-react'

function utcToLocalInput(utcString: string): string {
  if (!utcString) return ''
  const date = new Date(utcString)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: 'Draft' },
  pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Pending' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Approved' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Scheduled' },
  publishing: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-400', label: 'Publishing' },
  published: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-400', label: 'Published' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-400', label: 'Failed' },
}

const LEGEND = ['scheduled', 'published', 'pending_approval', 'failed']

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  // Returns 0 (Mon) to 6 (Sun) — ISO week start Monday
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [addPostDay, setAddPostDay] = useState<number | null>(null)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editTime, setEditTime] = useState('')
  const [editImages, setEditImages] = useState<PostImage[]>([])
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const meRes = await fetch('/api/me')
        if (!meRes.ok) return
        const { user } = await meRes.json()
        if (!user || cancelled) return

        const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`
        const res = await fetch(`/api/posts?scheduled_month=${monthParam}&order=scheduled_at`)
        const data = await res.json()

        if (!cancelled) setPosts(data.posts || [])
      } catch {
        /* non-fatal — calendar just shows empty */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    closePanel()
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    closePanel()
  }

  function jumpToToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    closePanel()
  }

  function closePanel() {
    setPanelOpen(false)
    setSelectedDay(null)
    setEditingPost(null)
    setEditTime('')
    setEditImages([])
  }

  function startEditPost(post: Post) {
    setEditingPost(post)
    setEditTime(post.scheduled_at ? utcToLocalInput(post.scheduled_at) : '')
    setEditImages([])
  }

  async function savePostEdit() {
    if (!editingPost) return
    setSaving(true)
    const body: Record<string, unknown> = {}
    if (editTime) body.scheduled_at = new Date(editTime).toISOString()
    if (editImages.length > 0) body.image_urls = editImages.map(i => i.public_url)
    const res = await fetch(`/api/posts/${editingPost.id}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.post) {
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...data.post } : p))
      toast.success('Post updated')
    } else {
      toast.error(data.error || 'Failed to update post')
    }
    setSaving(false)
    setEditingPost(null)
    setEditTime('')
    setEditImages([])
  }

  function handleDayClick(day: number) {
    const dayPosts = getPostsForDay(day)
    if (dayPosts.length > 0) {
      setSelectedDay(day)
      setPanelOpen(true)
    } else if (!isDayPast(day)) {
      setAddPostDay(day)
    }
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOffset = getFirstDayOfWeek(year, month)
  const today = now.getDate()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month

  function isDayPast(day: number): boolean {
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return new Date(year, month, day) < todayMidnight
  }

  function getPostsForDay(day: number): Post[] {
    return posts.filter(p => {
      if (!p.scheduled_at) return false
      const d = new Date(p.scheduled_at)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : []

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const addPostDateStr = addPostDay
    ? `${MONTH_NAMES[month]} ${addPostDay}, ${year}`
    : ''

  return (
    <div className="p-3 sm:p-4 md:p-7 max-w-[960px]">
      <ImageSelector
        open={imageSelectorOpen}
        onClose={() => setImageSelectorOpen(false)}
        onSelect={imgs => setEditImages(imgs)}
        maxSelect={4}
        alreadySelected={editImages.map(i => i.id)}
      />
      {/* Header */}
      <div className="flex items-start justify-between mb-5 md:mb-6 relative overflow-hidden">
        <QuarterRings size={200} color="blue" className="absolute top-0 right-0 pointer-events-none hidden lg:block" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 tracking-tight">Content Calendar</h1>
          <p className="text-sm text-gray-500">All your scheduled posts at a glance.</p>
        </div>
        <Link href="/dashboard/generate">
          <Button size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Add post
          </Button>
        </Link>
      </div>

      {/* Calendar card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{MONTH_NAMES[month]} {year}</h2>
              <div className="text-[12px] text-slate-400">{posts.length} post{posts.length !== 1 ? 's' : ''} this month</div>
            </div>
            {(!isCurrentMonth) && (
              <button
                onClick={jumpToToday}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-brand-light text-brand hover:bg-brand/10 transition-colors"
              >
                Today
              </button>
            )}
          </div>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Day headers — Mon–Sun */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-7">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="min-h-[80px] md:min-h-[96px] border-b border-r border-slate-50 dark:border-slate-800 p-1.5">
                <div className="animate-pulse h-5 w-5 bg-slate-100 dark:bg-slate-800 rounded-full mb-1.5" />
                {i % 4 === 0 && <div className="animate-pulse h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`e-${i}`} className="min-h-[80px] md:min-h-[96px] border-b border-r border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20" />
              }
              const isToday = isCurrentMonth && day === today
              const isSelected = selectedDay === day && panelOpen
              const isPast = isDayPast(day)
              const dayPosts = getPostsForDay(day)
              const isClickable = dayPosts.length > 0 || !isPast

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[80px] md:min-h-[96px] border-b border-r border-slate-50 dark:border-slate-800 p-1.5 transition-colors ${
                    isClickable ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    isSelected
                      ? 'bg-brand-light/60 dark:bg-brand/10'
                      : isToday
                      ? 'bg-blue-50/60 dark:bg-blue-950/20'
                      : isPast
                      ? 'bg-slate-50/50 dark:bg-slate-800/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`text-[13px] font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-brand text-white'
                      : isSelected
                      ? 'bg-brand/20 text-brand'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {day}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayPosts.slice(0, 2).map(post => {
                      const s = STATUS_COLOR[post.status] || STATUS_COLOR.draft
                      return (
                        <div
                          key={post.id}
                          className={`text-[10px] rounded px-1 py-0.5 truncate font-medium leading-tight ${s.bg} ${s.text}`}
                        >
                          {post.content?.slice(0, 22)}…
                        </div>
                      )
                    })}
                    {dayPosts.length > 2 && (
                      <div className="text-[10px] text-slate-400 pl-0.5">+{dayPosts.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Color legend */}
      <div className="mt-4 flex flex-wrap gap-2.5">
        {LEGEND.map(key => {
          const s = STATUS_COLOR[key]
          if (!s) return null
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{s.label}</span>
            </div>
          )
        })}
      </div>

      {/* ── Slide-in day detail panel ── */}
      {panelOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            onClick={closePanel}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                {MONTH_NAMES[month]} {selectedDay}, {year}
              </h3>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedDayPosts.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No posts for this day"
                  subtitle="Generate a post and schedule it to this date."
                  ctaLabel="Generate a post"
                  ctaHref="/dashboard/generate"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {selectedDayPosts.map(post => (
                    <div key={post.id}>
                      <PostCard
                        id={post.id}
                        content={post.content}
                        scheduledAt={post.scheduled_at}
                        status={post.status}
                      />
                      {editingPost?.id === post.id ? (
                        <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-3">
                          <div>
                            <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Reschedule time</div>
                            <Input
                              type="datetime-local"
                              value={editTime}
                              onChange={e => setEditTime(e.target.value)}
                              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                              className="text-[13px] h-8"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Your local timezone</p>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Add photos</div>
                            {editImages.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {editImages.map(img => (
                                  <div key={img.id} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.public_url} alt="" className="w-full h-full object-cover" />
                                    <button
                                      onClick={() => setEditImages(prev => prev.filter(i => i.id !== img.id))}
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                    >
                                      <X className="w-3 h-3 text-white" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setImageSelectorOpen(true)}
                              className="text-[11px] font-medium text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-brand/40 hover:text-brand transition-all flex items-center gap-1.5"
                            >
                              <ImageIcon className="w-3 h-3" />
                              {editImages.length > 0 ? `${editImages.length} selected` : 'Pick from library'}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={savePostEdit} disabled={saving} className="flex-1 h-7 text-[12px]">
                              {saving ? 'Saving...' : 'Save'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingPost(null); setEditTime(''); setEditImages([]) }} className="h-7 text-[12px]">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditPost(post)}
                          className="mt-1.5 text-[11px] text-slate-400 hover:text-brand flex items-center gap-1 transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Edit time &amp; photos
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedDay && !isDayPast(selectedDay) && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <Link href="/dashboard/generate" className="w-full">
                  <Button size="sm" className="w-full gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add post to this date
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Empty day dialog ── */}
      <Dialog open={addPostDay !== null} onOpenChange={open => { if (!open) setAddPostDay(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a post for {addPostDateStr}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-2 mb-4">
            No posts scheduled for this day. Generate one with AI or write manually.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/generate" onClick={() => setAddPostDay(null)}>
              <Button className="w-full gap-2">
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </Button>
            </Link>
            <Link href="/dashboard/posts" onClick={() => setAddPostDay(null)}>
              <Button variant="outline" className="w-full gap-2">
                <CalendarDays className="w-4 h-4" />
                View all posts
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
