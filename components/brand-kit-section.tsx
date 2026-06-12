'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Upload, Check, Palette, Type, Plus, Star, Trash2 } from 'lucide-react'
import { BRAND_FONTS } from '@/lib/images/fonts'

const SAMPLE_HEADLINE = 'Consistency beats genius.'

interface Kit {
  id: string
  name: string | null
  accent_color: string | null
  primary_color: string | null
  logo_url: string | null
  font_family: string | null
  is_default: boolean
  created_at: string
}

export function BrandKitSection() {
  const [kits, setKits] = useState<Kit[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('My brand')
  const [accent, setAccent] = useState('#2B4DFF')
  const [previewAccent, setPreviewAccent] = useState('#2B4DFF')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [font, setFont] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function loadInto(kit: Kit | null) {
    setSelectedId(kit?.id ?? null)
    setName(kit?.name || 'My brand')
    const a = kit?.accent_color || '#2B4DFF'
    setAccent(a); setPreviewAccent(a)
    setLogoUrl(kit?.logo_url || null)
    setFont(kit?.font_family || '')
  }

  async function refresh(selectId?: string): Promise<Kit[]> {
    const d = await fetch('/api/brand-kit').then(r => r.json()).catch(() => ({ kits: [] }))
    const list: Kit[] = d.kits || []
    setKits(list)
    const pick = (selectId && list.find(k => k.id === selectId)) || list.find(k => k.is_default) || list[0] || null
    loadInto(pick)
    return list
  }

  useEffect(() => { refresh().finally(() => setLoading(false)) }, [])

  // Debounce the preview so dragging the colour picker doesn't spam the renderer.
  useEffect(() => {
    const t = setTimeout(() => setPreviewAccent(accent), 400)
    return () => clearTimeout(t)
  }, [accent])

  const selected = kits.find(k => k.id === selectedId) || null
  const isActive = selected ? selected.is_default : kits.length === 0
  const multi = kits.length > 1

  async function save() {
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/brand-kit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId || undefined, name, accent_color: accent, font_family: font || null }),
      })
      const d = await res.json().catch(() => ({}))
      await refresh(d.kit?.id || selectedId || undefined)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  async function addKit() {
    setBusy(true)
    try {
      const res = await fetch('/api/brand-kit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New client kit', accent_color: '#2B4DFF' }),
      })
      const d = await res.json().catch(() => ({}))
      await refresh(d.kit?.id)
    } finally { setBusy(false) }
  }

  async function activate() {
    if (!selectedId) return
    setBusy(true)
    try {
      await fetch('/api/brand-kit', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedId, makeActive: true }),
      })
      await refresh(selectedId)
    } finally { setBusy(false) }
  }

  async function removeKit() {
    if (!selectedId || !multi) return
    setBusy(true)
    try {
      await fetch(`/api/brand-kit?id=${encodeURIComponent(selectedId)}`, { method: 'DELETE' })
      await refresh()
    } finally { setBusy(false) }
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      if (selectedId) fd.append('kitId', selectedId)
      const res = await fetch('/api/brand-kit/logo', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok) { setLogoUrl(d.logo_url); refresh(d.kit_id || selectedId || undefined) }
    } finally { setUploading(false) }
  }

  const preview =
    `/api/og/card?type=quote&theme=midnight&ar=1080x1080` +
    `&headline=${encodeURIComponent(SAMPLE_HEADLINE)}` +
    `&name=${encodeURIComponent(name || 'Your brand')}` +
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
                Your colour, logo and font on every branded graphic — no watermark. Managing a few clients? Keep a separate kit for each.
              </div>
            </div>

            {/* Kit switcher */}
            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block mb-2">Editing kit</label>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedId ?? 'draft'}
                  onChange={e => loadInto(kits.find(k => k.id === e.target.value) || null)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] font-semibold min-w-[160px]"
                >
                  {kits.length === 0 && <option value="draft">My brand</option>}
                  {kits.map(k => (
                    <option key={k.id} value={k.id}>{k.name || 'Untitled'}{k.is_default ? '  · active' : ''}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={addKit}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Client kit
                </Button>
                {!isActive && (
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={activate} title="Use this kit for all new graphics">
                    <Star className="w-3.5 h-3.5" /> Set active
                  </Button>
                )}
                {multi && selected && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-red-600 hover:text-red-700" disabled={busy} onClick={removeKit}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {isActive
                ? <div className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> Active — used for all new graphics, carousels and banners.</div>
                : <div className="text-[11px] text-slate-400 mt-1.5">Not active. New graphics use your active kit until you switch.</div>}
            </div>

            <div>
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 block mb-2">Kit name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp" maxLength={60}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px]" />
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
              {saved ? 'Saved' : 'Save kit'}
            </Button>
          </div>

          {/* Live preview */}
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live preview</div>
            <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Brand preview" className="w-full h-full object-cover" />
            </div>
            <div className="text-[11px] text-slate-400">A sample quote card with this kit applied.</div>
          </div>
        </div>
      </div>
    </section>
  )
}
