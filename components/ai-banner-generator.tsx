'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ImageIcon, Sparkles, Loader2, Download, Copy, Check, Lock } from 'lucide-react'

/**
 * Inline AI banner generator for the Profile Beautifier "// banner image" card.
 * Sends the AI-written banner brief straight to gpt-image (/api/banner/ai),
 * renders the result, and offers Regenerate + Download HD. Quota-capped
 * (ai_banner_generations) — distinct from the cost-neutral template
 * BannerGenerator below it, which is unchanged.
 */
export function AiBannerGenerator({ brief }: { brief: string }) {
  const [remaining, setRemaining] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/banner/ai')
      .then(r => r.json())
      .then(d => { if (typeof d.remaining === 'number') setRemaining(d.remaining) })
      .catch(() => {})
  }, [])

  function copyBrief() {
    navigator.clipboard.writeText(brief)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function generate() {
    setGenerating(true); setError('')
    try {
      const res = await fetch('/api/banner/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || 'Generation failed')
        if (d.limitReached) setRemaining(0)
        return
      }
      setUrl(d.url)
      if (typeof d.remaining === 'number') setRemaining(d.remaining)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function download() {
    if (!url) return
    setDownloading(true)
    try {
      // Fetch as a blob so the image downloads reliably (cross-origin
      // <a download> is ignored by most browsers for storage URLs).
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'linkedin-banner.jpg'
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

  const exhausted = remaining === 0 && !url

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
          <span className="text-[11px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>// banner image</span>
        </div>
        <button onClick={copyBrief} title="Copy brief to clipboard"
          className="flex items-center gap-1 px-2 py-1 rounded transition-colors text-[11px] font-semibold"
          style={{ background: copied ? 'var(--surface-3)' : 'var(--bg-2)', color: copied ? '#2ec27e' : 'var(--pl-accent)', border: '1px solid var(--line)' }}>
          {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>{brief}</p>

      {error && <div className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="AI-generated banner" className="w-full rounded-lg" style={{ border: '1px solid var(--line)' }} />
      )}

      {url ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button onClick={download} disabled={downloading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-opacity disabled:opacity-60"
              style={{ border: '1px solid var(--line)', background: 'var(--bg-2)', color: 'var(--ink)' }}>
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download HD
            </button>
            <button onClick={generate} disabled={generating || remaining === 0}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: 'var(--pl-accent)' }}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Regenerate
            </button>
          </div>
          <div className="text-[11px]" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
            1584×396 · LinkedIn&apos;s exact banner size{remaining !== null ? ` · ${remaining} left this month` : ''}
          </div>
        </div>
      ) : exhausted ? (
        <div className="flex flex-col gap-2">
          <button disabled
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold text-white opacity-50"
            style={{ background: 'var(--pl-accent)' }}>
            <Lock className="w-4 h-4" /> No AI banners left this month
          </button>
          <Link href="/dashboard/upgrade" className="text-[12px] font-semibold text-center transition-opacity hover:opacity-70" style={{ color: 'var(--pl-accent)' }}>
            Upgrade for more →
          </Link>
        </div>
      ) : (
        <button onClick={generate} disabled={generating}
          className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ background: 'var(--pl-accent)' }}>
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating banner…</>
            : <><Sparkles className="w-4 h-4" /> Generate banner</>}
          {remaining !== null && !generating && (
            <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1, background: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: 99 }}>
              {remaining} left
            </span>
          )}
        </button>
      )}
    </div>
  )
}
