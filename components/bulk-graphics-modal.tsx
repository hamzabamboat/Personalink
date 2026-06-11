'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Check, Layers } from 'lucide-react'
import { STYLE_PRESETS, THEMES } from '@/lib/images/presets'

const TEMPLATE_STYLES = STYLE_PRESETS.filter(p => p.kind === 'template')

interface BulkResult { generated: number; eligible: number; stoppedForQuota?: boolean }

export function BulkGraphicsModal({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(TEMPLATE_STYLES[0].templateType!)
  const [theme, setTheme] = useState(THEMES[0].id)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [error, setError] = useState('')

  async function run() {
    setRunning(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/images/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateType: type, theme }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Bulk generation failed'); return }
      setResult(d)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setRunning(false) }
  }

  function close() { setOpen(false); setResult(null); setError('') }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-[13px] font-semibold rounded-lg px-3.5 py-2 border border-brand/30 text-brand bg-brand-light/30 hover:bg-brand-light/60 transition-all"
      >
        <Layers className="w-4 h-4" /> Add a graphic to every post
      </button>

      <Dialog open={open} onOpenChange={o => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add a branded graphic to every post</DialogTitle></DialogHeader>

          {result ? (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                <Check className="w-5 h-5" /> Added {result.generated} graphic{result.generated !== 1 ? 's' : ''}.
              </div>
              {result.generated === 0 && (
                <div className="text-sm text-slate-500">Every post already has an image — nothing to do.</div>
              )}
              {result.stoppedForQuota && (
                <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">You hit this month's limit before the rest. Upgrade for more.</div>
              )}
              <Button onClick={() => { close(); onDone?.() }} className="w-full">Done</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-1">
              <p className="text-sm text-slate-500 leading-relaxed">
                We'll create a graphic for each post that doesn't have one yet — in your brand, no watermark.
              </p>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Style</div>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_STYLES.map(s => (
                    <button key={s.id} type="button" onClick={() => setType(s.templateType!)}
                      className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${type === s.templateType ? 'border-brand bg-brand-light/40 text-brand' : 'border-slate-200 text-slate-600 hover:border-brand/40'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Theme</div>
                <div className="flex flex-wrap gap-1.5">
                  {THEMES.map(t => (
                    <button key={t.id} type="button" onClick={() => setTheme(t.id)}
                      className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${theme === t.id ? 'border-brand bg-brand-light/40 text-brand' : 'border-slate-200 text-slate-600 hover:border-brand/40'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
              <Button onClick={run} disabled={running} className="w-full gap-2">
                {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Designing…</> : <><Sparkles className="w-4 h-4" /> Generate for all posts</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
