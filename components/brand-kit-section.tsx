'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Upload, Check, Palette, Type } from 'lucide-react'
import { BRAND_FONTS } from '@/lib/images/fonts'

const SAMPLE_HEADLINE = 'Consistency beats genius.'

export function BrandKitSection() {
  const [accent, setAccent] = useState('#2B4DFF')
  const [previewAccent, setPreviewAccent] = useState('#2B4DFF')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [font, setFont] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/brand-kit')
      .then(r => r.json())
      .then(d => {
        if (d.kit) {
          const a = d.kit.accent_color || '#2B4DFF'
          setAccent(a); setPreviewAccent(a); setLogoUrl(d.kit.logo_url || null)
          setFont(d.kit.font_family || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Debounce the preview so dragging the colour picker doesn't spam the renderer.
  useEffect(() => {
    const t = setTimeout(() => setPreviewAccent(accent), 400)
    return () => clearTimeout(t)
  }, [accent])

  async function save() {
    setSaving(true); setSaved(false)
    try {
      await fetch('/api/brand-kit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accent_color: accent, font_family: font || null }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/brand-kit/logo', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok) setLogoUrl(d.logo_url)
    } finally { setUploading(false) }
  }

  const preview =
    `/api/og/card?type=quote&theme=midnight&ar=1080x1080` +
    `&headline=${encodeURIComponent(SAMPLE_HEADLINE)}` +
    `&name=${encodeURIComponent('Your brand')}` +
    `&accent=${encodeURIComponent(previewAccent)}` +
    (font ? `&font=${encodeURIComponent(font)}` : '') +
    (logoUrl ? `&logo=${encodeURIComponent(logoUrl)}` : '')

  return (
    <section className="mb-8" data-tour="brand-kit">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Brand kit</div>
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-[14px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand" /> Make every graphic yours
              </div>
              <div className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Your brand colour and logo are applied to every branded graphic — automatically, with no watermark.
              </div>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block mb-2">Brand colour</label>
              <div className="flex items-center gap-3">
                <input type="color" value={accent} onChange={e => setAccent(e.target.value)} className="w-12 h-12 rounded-lg border border-slate-200 cursor-pointer bg-transparent" aria-label="Brand colour" />
                <input type="text" value={accent} onChange={e => setAccent(e.target.value)} className="w-28 px-3 py-2 rounded-lg border border-slate-200 text-[13px] font-mono uppercase" />
              </div>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block mb-2">Logo</label>
              <div className="flex items-center gap-3">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="logo" className="h-12 w-12 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1" />
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogo} className="hidden" />
                <Button variant="outline" size="sm" className="gap-1.5" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {logoUrl ? 'Replace logo' : 'Upload logo'}
                </Button>
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">PNG, JPG, WebP or SVG · max 2 MB.</div>
            </div>

            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-brand" /> Brand font
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setFont('')}
                  className={`text-left px-3 py-1.5 rounded-lg border transition-all ${font === '' ? 'border-brand bg-brand-light/40' : 'border-slate-200 hover:border-brand/40'}`}>
                  <div className={`text-[12.5px] font-semibold ${font === '' ? 'text-brand' : 'text-slate-700 dark:text-slate-300'}`}>System</div>
                  <div className="text-[10px] text-slate-400">Clean default</div>
                </button>
                {BRAND_FONTS.map(f => (
                  <button key={f.id} type="button" onClick={() => setFont(f.id)}
                    className={`text-left px-3 py-1.5 rounded-lg border transition-all ${font === f.id ? 'border-brand bg-brand-light/40' : 'border-slate-200 hover:border-brand/40'}`}>
                    <div className={`text-[12.5px] font-semibold ${font === f.id ? 'text-brand' : 'text-slate-700 dark:text-slate-300'}`}>{f.label}</div>
                    <div className="text-[10px] text-slate-400">{f.vibe}</div>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">Applied to branded graphics, carousels and your banner. AI photos are unaffected.</div>
            </div>

            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
              Branded graphics use your full brand. AI photos can carry your logo, but their colours come from the AI — they can’t be brand-matched exactly.
            </div>

            <Button onClick={save} disabled={saving || loading} className="gap-2 self-start">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
              {saved ? 'Saved' : 'Save brand kit'}
            </Button>
          </div>

          {/* Live preview */}
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live preview</div>
            <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Brand preview" className="w-full h-full object-cover" />
            </div>
            <div className="text-[11px] text-slate-400">A sample quote card with your brand applied.</div>
          </div>
        </div>
      </div>
    </section>
  )
}
