'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Download, ImageIcon } from 'lucide-react'
import { THEMES } from '@/lib/images/presets'

// Generates a professional 1584x396 LinkedIn banner from the user's identity + brand kit.
export function BannerGenerator() {
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [tagline, setTagline] = useState('')
  const [keywords, setKeywords] = useState('')
  const [theme, setTheme] = useState<string>(THEMES[0].id)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        const p = (d?.profile || d?.user_profile || d || {}) as Record<string, unknown>
        if (typeof p.name === 'string') setName(p.name)
        if (typeof p.role === 'string') setDesignation(p.role)
        else if (typeof p.job_title === 'string') setDesignation(p.job_title)
        const kw = (p.content_pillars || p.topics) as unknown
        if (Array.isArray(kw) && kw.length) setKeywords(kw.slice(0, 4).join(', '))
      })
      .catch(() => {})
  }, [])

  async function downloadBanner() {
    if (!url) return
    setDownloading(true)
    try {
      // Fetch as a blob so the high-res PNG downloads reliably (cross-origin
      // <a download> is ignored by most browsers for storage URLs).
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'linkedin-banner.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  async function generate() {
    setGenerating(true); setError(''); setUrl(null)
    try {
      const res = await fetch('/api/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, designation, tagline, theme,
          keywords: keywords.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Generation failed'); return }
      setUrl(d.url)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setGenerating(false) }
  }

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" data-tour="banner" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
      <div className="flex items-center gap-2">
        <ImageIcon size={14} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
        <span className="text-[12px] font-bold" style={{ color: 'var(--ink-2)' }}>Generate a professional banner</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
        <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="Designation — e.g. Founder, Acme" className="px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
      </div>
      <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="One line on what you do (optional)" className="px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />
      <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Keywords, comma-separated — e.g. AI, Product, Growth" className="px-3 py-2 rounded-lg border border-slate-200 text-[13px]" />

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Theme</span>
        {THEMES.map(t => (
          <button key={t.id} type="button" onClick={() => setTheme(t.id)}
            className={`text-[12px] px-2.5 py-1 rounded-lg border transition-all ${theme === t.id ? 'border-brand bg-brand-light/40 text-brand' : 'border-slate-200 text-slate-600 hover:border-brand/40'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      {url ? (
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Your banner" className="w-full rounded-lg border border-slate-100" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadBanner} disabled={downloading} className="flex-1 gap-1.5">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download HD
            </Button>
            <Button onClick={generate} disabled={generating} className="gap-1.5">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Regenerate
            </Button>
          </div>
          <div className="text-[11px] text-slate-400">High-resolution PNG · 4752×1188 (3× LinkedIn's 1584×396) — crisp on any screen. Download and set it as your profile background.</div>
        </div>
      ) : (
        <Button onClick={generate} disabled={generating} className="gap-2 self-start">
          {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Designing…</> : <><Sparkles className="w-4 h-4" /> Generate banner</>}
        </Button>
      )}
    </div>
  )
}
