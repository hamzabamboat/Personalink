'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Download, Layers, Check, CalendarClock, Link2 } from 'lucide-react'
import { THEMES } from '@/lib/images/presets'
import type { Carousel, CarouselSlide } from '@/lib/supabase'

const PREFILL_KEY = 'pl_carousel_prefill'

const SLIDE_COUNTS = [4, 5, 6, 7, 8]

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${active ? 'border-brand bg-brand-light/40 text-brand' : 'border-slate-200 text-slate-600 hover:border-brand/40'}`}>
      {children}
    </button>
  )
}

function CarouselContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [limit, setLimit] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [topic, setTopic] = useState('')
  const [theme, setTheme] = useState<string>(THEMES[0].id)
  const [slideCount, setSlideCount] = useState(6)
  const [generating, setGenerating] = useState(false)
  const [carousel, setCarousel] = useState<Carousel | null>(null)
  const [slides, setSlides] = useState<CarouselSlide[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // When launched from a post ("Make carousel"), we keep the post id so the
  // finished carousel can be attached back to that post and scheduled.
  const [postId, setPostId] = useState<string | null>(null)
  const [attaching, setAttaching] = useState(false)
  const [attached, setAttached] = useState(false)

  useEffect(() => {
    fetch('/api/carousels/generate')
      .then(r => r.json())
      .then(d => { setLimit(d.limit ?? 0); setRemaining(d.remaining ?? 0) })
      .catch(() => { setLimit(0) })
  }, [])

  // Prefill from a post the user clicked "Make carousel" on. The content +
  // post id are stashed in sessionStorage (not the URL — posts can be long and
  // are the user's own content) and consumed once here.
  useEffect(() => {
    if (searchParams.get('from') !== 'post') return
    try {
      const raw = sessionStorage.getItem(PREFILL_KEY)
      if (!raw) return
      const { postId: pid, content } = JSON.parse(raw) as { postId?: string; content?: string }
      if (content) setTopic(content)
      if (pid) setPostId(pid)
      sessionStorage.removeItem(PREFILL_KEY)
    } catch { /* ignore malformed prefill */ }
  }, [searchParams])

  // Attach the rendered slides to the linked post as its images. LinkedIn
  // renders a multi-image post as a native swipeable carousel, so the existing
  // scheduler/publisher posts it as a real carousel — no separate doc upload.
  async function attachToPost() {
    if (!postId || !carousel?.png_urls?.length) return
    setAttaching(true); setError('')
    try {
      const res = await fetch(`/api/posts/${postId}/update`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_urls: carousel.png_urls }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Could not attach the carousel to your post.'); return }
      setAttached(true)
      router.push(`/dashboard/posts?edit=${postId}`)
    } catch { setError('Something went wrong attaching the carousel.') }
    finally { setAttaching(false) }
  }

  async function generate() {
    if (!topic.trim()) { setError('Enter a topic or paste a post first.'); return }
    setGenerating(true); setError(''); setCarousel(null)
    try {
      const res = await fetch('/api/carousels/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: topic, theme, slideCount, postId: postId || undefined }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Generation failed'); return }
      setCarousel(d.carousel); setSlides(d.carousel?.slides || []); setRemaining(d.remaining ?? remaining)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setGenerating(false) }
  }

  async function applyEdits() {
    if (!carousel) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/carousels/${carousel.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slides, theme }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Update failed'); return }
      setCarousel(d.carousel)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setSaving(false) }
  }

  function updateSlide(i: number, field: 'headline' | 'body', value: string) {
    setSlides(prev => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  if (limit === 0) {
    return (
      <div className="db-screen" data-tour="carousel">
        <div className="db-screen__head"><div><div className="db-screen__eyebrow">// Carousels</div><h1 className="db-screen__title">Swipeable carousels, <em>in your brand.</em></h1></div></div>
        <div className="rounded-2xl border border-slate-200 p-10 text-center">
          <Layers className="w-10 h-10 mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
          <div className="font-semibold text-slate-700 mb-1">Carousels are on Standard &amp; Pro</div>
          <div className="text-sm text-slate-400 mb-4">Turn any idea into a swipeable PDF carousel — in your colours, no watermark.</div>
          <Link href="/dashboard/settings?tab=plan"><Button>Upgrade</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="db-screen" data-tour="carousel">
      <div className="db-screen__head">
        <div><div className="db-screen__eyebrow">// Carousels</div><h1 className="db-screen__title">Swipeable carousels, <em>in your brand.</em></h1></div>
      </div>

      {postId && (
        <div className="flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-xl text-[13px] font-medium"
          style={{ background: 'var(--pl-accent-soft)', border: '1px solid color-mix(in srgb, var(--pl-accent) 30%, transparent)', color: 'var(--pl-accent)' }}>
          <Link2 className="w-4 h-4 shrink-0" />
          Linked to your post — generate below, then attach the slides and schedule it.
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 shadow-sm bg-white dark:bg-slate-900 p-6 mb-6 flex flex-col gap-4">
        <div>
          <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">What&apos;s it about?</label>
          <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
            placeholder="A topic, or paste a post — e.g. '5 LinkedIn mistakes that quietly kill your reach'"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] resize-none" />
        </div>
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Theme</div>
            <div className="flex gap-2">{THEMES.map(t => (
              <button key={t.id} type="button" onClick={() => setTheme(t.id)} title={t.label} aria-label={t.label} aria-pressed={theme === t.id}
                className={`relative w-9 h-9 rounded-lg overflow-hidden transition ${theme === t.id ? 'ring-2 ring-offset-2 ring-slate-900' : 'ring-1 ring-slate-200'}`}
                style={{ background: t.bg }}>
                <span style={{ position: 'absolute', right: 4, bottom: 4, width: 12, height: 12, borderRadius: 999, background: t.accent }} />
              </button>
            ))}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Slides</div>
            <div className="flex gap-1.5">{SLIDE_COUNTS.map(n => <Chip key={n} active={slideCount === n} onClick={() => setSlideCount(n)}>{n}</Chip>)}</div>
          </div>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}{error.includes('Upgrade') && <Link href="/dashboard/settings?tab=plan" className="ml-1 underline font-semibold">Upgrade →</Link>}</div>}
        <div className="flex items-center gap-3">
          <Button onClick={generate} disabled={generating} className="gap-2">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Designing your carousel…</> : <><Sparkles className="w-4 h-4" /> Generate carousel</>}
          </Button>
          {remaining !== null && <span className="text-[12px] text-slate-400">{remaining} left this month</span>}
        </div>
      </div>

      {carousel && (
        <div className="rounded-2xl border border-slate-100 shadow-sm bg-white dark:bg-slate-900 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-bold text-slate-800 dark:text-slate-100">Your carousel · {slides.length} slides</div>
            <div className="flex items-center gap-2">
              {carousel.pdf_url && (
                <a href={carousel.pdf_url} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="gap-1.5"><Download className="w-4 h-4" /> Download PDF</Button>
                </a>
              )}
              {postId && (
                <Button onClick={attachToPost} disabled={attaching || attached} className="gap-1.5">
                  {attaching ? <><Loader2 className="w-4 h-4 animate-spin" /> Attaching…</>
                    : attached ? <><Check className="w-4 h-4" /> Added — scheduling…</>
                    : <><CalendarClock className="w-4 h-4" /> Add to post &amp; schedule</>}
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {(carousel.png_urls || []).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Slide ${i + 1}`} className="h-64 rounded-xl border border-slate-100 shrink-0" />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Edit copy</div>
            {slides.map((s, i) => (
              <div key={i} className="rounded-lg border border-slate-100 p-3 flex flex-col gap-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase">{s.kind} · slide {i + 1}</div>
                <input value={s.headline} onChange={e => updateSlide(i, 'headline', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-[13px] font-semibold" />
                <textarea value={s.body || ''} onChange={e => updateSlide(i, 'body', e.target.value)} rows={2}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 text-[13px] resize-none" />
              </div>
            ))}
            <Button onClick={applyEdits} disabled={saving} variant="outline" className="gap-2 self-start">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Re-rendering…</> : <><Check className="w-4 h-4" /> Apply edits &amp; re-render</>}
            </Button>
          </div>

          <div className="text-[11px] text-slate-400">
            {postId
              ? 'Tip: “Add to post & schedule” attaches these slides to your post as a native LinkedIn swipeable carousel — then pick a time and schedule.'
              : 'To post: download the PDF and upload it to LinkedIn as a document post.'}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CarouselPage() {
  return <Suspense><CarouselContent /></Suspense>
}
