'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Wand2, Lock, Loader2, Check, Sparkles } from 'lucide-react'
import type { PostImage } from '@/lib/supabase'
import { STYLE_PRESETS, ASPECT_RATIOS, type AspectRatioId } from '@/lib/images/presets'
import { getTierLimits } from '@/lib/pricing-config'

const AI_STYLES = STYLE_PRESETS.filter(p => p.kind === 'ai_photo')
const RATIOS = Object.entries(ASPECT_RATIOS) as [AspectRatioId, { w: number; h: number; label: string }][]

// "Build a stock of visuals" — prompt → AI image, saved to the library.
export function LibraryImageGenerator({ plan, onGenerated }: { plan: string; onGenerated: (img: PostImage) => void }) {
  const canGenerate = getTierLimits(plan).perFeature.ai_image_generations > 0
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState(AI_STYLES[0].id)
  const [ratio, setRatio] = useState<AspectRatioId>('1080x1080')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<PostImage | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!canGenerate) return
    fetch('/api/images/ai-generate')
      .then(r => r.json())
      .then(d => { if (typeof d.remaining === 'number') setRemaining(d.remaining) })
      .catch(() => {})
  }, [canGenerate])

  async function generate() {
    if (!prompt.trim()) { setError('Describe the image you want first.'); return }
    setGenerating(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/images/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, stylePreset: style, aspectRatio: ratio }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Generation failed'); return }
      const img: PostImage | null = data.image || (data.images && data.images[0]) || null
      if (img) {
        setResult(img)
        onGenerated(img)
        if (typeof data.remaining === 'number') setRemaining(data.remaining)
      }
    } catch { setError('Something went wrong. Please try again.') }
    finally { setGenerating(false) }
  }

  if (!canGenerate) {
    return (
      <Link href="/dashboard/settings?tab=plan" className="btn-dash btn-dash--outline flex items-center gap-1.5" title="Upgrade to a paid plan to generate AI visuals">
        <Lock size={12} /> Generate a visual
        <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--ink-6)', color: 'var(--ink-3)', padding: '1px 6px', borderRadius: 99 }}>PAID</span>
      </Link>
    )
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-dash btn-dash--primary flex items-center gap-1.5">
        <Sparkles size={14} /> Generate a visual
        {remaining !== null && (
          <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', padding: '2px 6px', borderRadius: 99 }}>{remaining} left</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={o => { if (!o) { setOpen(false); setResult(null); setError('') } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Generate a visual for your library</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-1">
            <div>
              <label className="text-[12px] font-semibold text-slate-600 mb-1.5 block">Describe the image</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. a calm minimalist desk at sunrise, soft natural light, no people"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] resize-none"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Style</div>
              <div className="flex flex-wrap gap-1.5">
                {AI_STYLES.map(s => (
                  <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                    className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${style === s.id ? 'border-brand bg-brand-light/40 text-brand' : 'border-slate-200 text-slate-600 hover:border-brand/40'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Size</div>
              <div className="flex flex-wrap gap-1.5">
                {RATIOS.map(([id, r]) => (
                  <button key={id} type="button" onClick={() => setRatio(id)}
                    className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${ratio === id ? 'border-brand bg-brand-light/40 text-brand' : 'border-slate-200 text-slate-600 hover:border-brand/40'}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}{error.includes('Upgrade') && <Link href="/dashboard/settings?tab=plan" className="ml-1 font-semibold underline">Upgrade →</Link>}
              </div>
            )}

            {result ? (
              <div className="flex flex-col gap-2">
                <div className="rounded-xl overflow-hidden border border-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.public_url} alt="Generated visual" className="w-full h-auto" />
                </div>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold"><Check className="w-4 h-4" /> Saved to your library.</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setResult(null); setPrompt('') }} className="flex-1">Generate another</Button>
                  <Button onClick={() => { setOpen(false); setResult(null) }} className="flex-1">Done</Button>
                </div>
              </div>
            ) : (
              <Button onClick={generate} disabled={generating} className="gap-2">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Wand2 className="w-4 h-4" /> Generate</>}
              </Button>
            )}

            <div className="text-[11px] text-slate-400">These count toward your monthly AI image generations. Failed renders are free.</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
