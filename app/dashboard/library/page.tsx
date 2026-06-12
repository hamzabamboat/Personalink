'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Bookmark, BookmarkCheck, Wand2, Lightbulb, Sparkles } from 'lucide-react'
import type { LibraryItem } from '@/lib/supabase'

type FormatFilter = 'all' | 'text' | 'list' | 'story'

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${active ? 'border-brand bg-brand-light/40 text-brand' : 'border-slate-200 text-slate-600 hover:border-brand/40'}`}>
      {children}
    </button>
  )
}

// Build the prefill we hand the generator: the proven structure as the "idea".
function remixIdea(item: LibraryItem): string {
  const hook = item.hook_type ? ` (${item.hook_type} hook)` : ''
  return `Write a LinkedIn post in my voice using this proven structure${hook}:\n\n${item.template_text || ''}\n\nReplace the [brackets] with my own story and specifics.`
}

export default function LibraryPage() {
  const router = useRouter()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [format, setFormat] = useState<FormatFilter>('all')
  const [savedOnly, setSavedOnly] = useState(false)
  const [contribute, setContribute] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [ingestMsg, setIngestMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (format !== 'all') qs.set('format', format)
      if (savedOnly) qs.set('saved', '1')
      const d = await fetch(`/api/library?${qs.toString()}`).then(r => r.json())
      setItems(d.items || [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [format, savedOnly])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/library/contribute').then(r => r.json()).then(d => setContribute(!!d.enabled)).catch(() => {})
  }, [])

  async function toggleSave(item: LibraryItem) {
    // optimistic
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, saved: !i.saved } : i))
    try {
      const d = await fetch('/api/library/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      }).then(r => r.json())
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, saved: !!d.saved } : i))
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, saved: item.saved } : i)) // revert
    }
  }

  function remix(item: LibraryItem) {
    router.push(`/dashboard/generate?idea=${encodeURIComponent(remixIdea(item))}`)
  }

  async function toggleContribute() {
    const next = !contribute
    setContribute(next)
    await fetch('/api/library/contribute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    }).catch(() => {})
    if (next) ingest()
  }

  async function ingest() {
    setIngesting(true); setIngestMsg('')
    try {
      const res = await fetch('/api/library/ingest', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) { setIngestMsg(d.error || 'Could not analyse your posts yet.'); return }
      setIngestMsg(d.inserted > 0 ? `Added ${d.inserted} pattern${d.inserted === 1 ? '' : 's'} from your top posts.` : 'No new top posts to analyse yet — keep publishing!')
      load()
    } catch { setIngestMsg('Something went wrong.') }
    finally { setIngesting(false) }
  }

  return (
    <div className="db-screen" data-tour="library">
      <div className="db-screen__head">
        <div>
          <div className="db-screen__eyebrow">// Inspiration library</div>
          <h1 className="db-screen__title">Proven post patterns, <em>remixed in your voice.</em></h1>
        </div>
      </div>

      <p className="text-[14px] text-slate-500 max-w-2xl mb-5 leading-relaxed">
        Hand-picked patterns behind posts that consistently perform — the hook, why it works, and a reusable template.
        Hit <span className="font-semibold text-slate-700">Remix in my voice</span> and we&apos;ll draft one in your fingerprint. No scraping, no copied text.
      </p>

      {/* Contribute opt-in */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 mb-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={contribute} onChange={toggleContribute} className="w-4 h-4 accent-[var(--pl-accent)]" />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Contribute my top posts (anonymized)</span>
        </label>
        <span className="text-[12px] text-slate-400 flex-1 min-w-[200px]">We analyse only the <em>pattern</em> of your best posts — never the text or your name.</span>
        {contribute && (
          <Button variant="outline" size="sm" className="gap-1.5" disabled={ingesting} onClick={ingest}>
            {ingesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Analyse my posts
          </Button>
        )}
        {ingestMsg && <span className="text-[12px] text-emerald-600 w-full">{ingestMsg}</span>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Format</span>
        {(['all', 'text', 'list', 'story'] as FormatFilter[]).map(f => (
          <Chip key={f} active={format === f} onClick={() => setFormat(f)}>{f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}</Chip>
        ))}
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Chip active={savedOnly} onClick={() => setSavedOnly(s => !s)}>★ Saved</Chip>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Lightbulb className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <div className="text-[14px] font-semibold text-slate-600">{savedOnly ? 'No saved patterns yet' : 'Nothing here yet'}</div>
          <div className="text-[12px] text-slate-400 mt-1">{savedOnly ? 'Tap the bookmark on a pattern to save it here.' : 'Try a different filter.'}</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map(item => (
            <article key={item.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.hook_type && <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-brand-light/50 text-brand border border-brand/20">{item.hook_type}</span>}
                {item.format && <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{item.format}</span>}
                {item.niche && item.niche !== 'general' && <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{item.niche}</span>}
                <span className="flex-1" />
                {item.source === 'first_party'
                  ? <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Your post</span>
                  : item.engagement_tier === 'top' && <span className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Top tier</span>}
              </div>

              {item.title && <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 leading-snug">{item.title}</h3>}
              {item.pattern_summary && <p className="text-[13px] text-slate-500 leading-relaxed">{item.pattern_summary}</p>}

              {item.template_text && (
                <pre className="text-[12px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 rounded-lg p-3 whitespace-pre-wrap font-sans leading-relaxed max-h-44 overflow-auto">{item.template_text}</pre>
              )}

              <div className="flex items-center gap-2 mt-auto pt-1">
                <Button onClick={() => remix(item)} size="sm" className="gap-1.5 flex-1">
                  <Wand2 className="w-3.5 h-3.5" /> Remix in my voice
                </Button>
                <Button onClick={() => toggleSave(item)} variant="outline" size="sm" className="gap-1.5" title={item.saved ? 'Saved' : 'Save to swipe file'}>
                  {item.saved ? <BookmarkCheck className="w-4 h-4 text-brand" /> : <Bookmark className="w-4 h-4" />}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
