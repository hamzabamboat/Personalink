'use client'

import { useState, useEffect, useCallback } from 'react'
import { PostImage } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Check, Loader2, Image as ImageIcon, CloudUpload, Wand2, Sparkles, Type as TypeIcon, Palette } from 'lucide-react'
import Link from 'next/link'
import { STYLE_PRESETS, THEMES, ASPECT_RATIOS, type AspectRatioId } from '@/lib/images/presets'
import { getTierLimits } from '@/lib/pricing-config'

const AI_STYLES = STYLE_PRESETS.filter(p => p.kind === 'ai_photo')
const TEMPLATE_STYLES = STYLE_PRESETS.filter(p => p.kind === 'template')
const RATIOS = Object.entries(ASPECT_RATIOS) as [AspectRatioId, { w: number; h: number; label: string }][]

type TabId = 'library' | 'graphic' | 'ai'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (images: PostImage[]) => void
  maxSelect?: number
  alreadySelected?: string[]
  onHookSelect?: (hook: string) => void
  plan?: string
  postContent?: string
  defaultTab?: TabId
}

function remainingLabel(remaining: number | null, limit: number | null): string {
  if (remaining === null) return ''
  if (limit !== null && limit >= 9999) return 'Unlimited left'
  return `${remaining} left this month`
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
        active ? 'border-brand bg-brand-light/40 text-brand' : disabled ? 'border-slate-100 text-slate-300' : 'border-slate-200 text-slate-600 hover:border-brand/40'
      }`}
    >
      {children}
    </button>
  )
}

/* ───────────────────────── Library tab ───────────────────────── */

function ImageGrid({ images, selected, maxSelect, onToggle, loading }: {
  images: PostImage[]; selected: string[]; maxSelect: number; onToggle: (img: PostImage) => void; loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" />)}
      </div>
    )
  }
  if (!images.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="w-10 h-10 text-slate-200 mb-2" strokeWidth={1.5} />
        <div className="font-semibold text-slate-600 mb-1">No photos in library</div>
        <div className="text-sm text-slate-400 mb-4">Upload photos, or make a branded graphic instead</div>
        <Link href="/dashboard/upload"><Button variant="outline" size="sm" className="gap-1.5"><CloudUpload className="w-3.5 h-3.5" /> Go to Photo Library</Button></Link>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map(img => {
        const isSelected = selected.includes(img.id)
        const atMax = selected.length >= maxSelect && !isSelected
        return (
          <button key={img.id} onClick={() => !atMax && onToggle(img)} disabled={atMax}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-brand shadow-md' : atMax ? 'border-transparent opacity-40 cursor-not-allowed' : 'border-transparent hover:border-brand/40'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.public_url} alt={img.file_name || ''} className="w-full h-full object-cover" />
            {isSelected && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand flex items-center justify-center shadow"><Check className="w-3 h-3 text-white" strokeWidth={2.5} /></div>}
          </button>
        )
      })}
    </div>
  )
}

/* ───────────────────────── Branded graphic tab ───────────────────────── */

function GraphicTab({ postContent, onSelect, onClose }: { postContent: string; onSelect: (i: PostImage[]) => void; onClose: () => void }) {
  const [type, setType] = useState(TEMPLATE_STYLES[0].templateType!)
  const [theme, setTheme] = useState(THEMES[0].id)
  const [ratio, setRatio] = useState<AspectRatioId>('1080x1350')
  const [generating, setGenerating] = useState(false)
  const [image, setImage] = useState<PostImage | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [limit, setLimit] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/images/template').then(r => r.json()).then(d => { setRemaining(d.remaining ?? null); setLimit(d.limit ?? null) }).catch(() => {})
  }, [])

  async function generate() {
    setGenerating(true); setError(''); setImage(null)
    try {
      const res = await fetch('/api/images/template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postContent, templateType: type, theme, aspectRatio: ratio }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Generation failed'); return }
      setImage(data.image); setRemaining(data.remaining ?? remaining)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setGenerating(false) }
  }

  return (
    <div className="flex flex-col h-full gap-3 overflow-y-auto">
      <div className="text-sm text-slate-500 leading-relaxed">
        Turn this post into a <strong>branded graphic</strong> — your colours &amp; logo, never a watermark. {remaining !== null && <span className="text-slate-400">· {remainingLabel(remaining, limit)}</span>}
      </div>

      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Style</div>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_STYLES.map(s => <Chip key={s.id} active={type === s.templateType} onClick={() => setType(s.templateType!)}>{s.label}</Chip>)}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Theme</div>
        <div className="flex flex-wrap gap-1.5">
          {THEMES.map(t => <Chip key={t.id} active={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</Chip>)}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Size</div>
        <div className="flex flex-wrap gap-1.5">
          {RATIOS.map(([id, r]) => <Chip key={id} active={ratio === id} onClick={() => setRatio(id)}>{r.label}</Chip>)}
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}{error.includes('Upgrade') && <Link href="/dashboard/settings?tab=plan" className="ml-1 font-semibold underline">Upgrade →</Link>}</div>}

      {image ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.public_url} alt="Branded graphic" className="w-full h-auto" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { onSelect([image]); onClose() }} className="flex-1 gap-2"><Check className="w-4 h-4" /> Add to post</Button>
            <Button variant="outline" onClick={generate} disabled={generating} className="gap-1.5">{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Redo</Button>
          </div>
        </div>
      ) : (
        <Button onClick={generate} disabled={generating} className="gap-2 mt-1">{generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Designing…</> : <><TypeIcon className="w-4 h-4" /> Generate graphic</>}</Button>
      )}

      <Link href="/dashboard/settings#brand-kit" className="text-[12px] text-slate-400 hover:text-brand inline-flex items-center gap-1 mt-1"><Palette className="w-3 h-3" /> Personalise colours &amp; logo →</Link>
    </div>
  )
}

/* ───────────────────────── AI photo tab ───────────────────────── */

function AiPhotoTab({ postContent, plan, onSelect, onClose }: { postContent: string; plan: string; onSelect: (i: PostImage[]) => void; onClose: () => void }) {
  const [style, setStyle] = useState(AI_STYLES[0].id)
  const [ratio, setRatio] = useState<AspectRatioId>('1080x1350')
  const [variations, setVariations] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [images, setImages] = useState<PostImage[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/images/ai-generate').then(r => r.json()).then(d => setRemaining(d.remaining ?? null)).catch(() => {})
  }, [])

  async function generate() {
    setGenerating(true); setError(''); setImages([]); setPicked(null)
    try {
      const res = await fetch('/api/images/ai-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postContent, stylePreset: style, aspectRatio: ratio, variations }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Generation failed'); return }
      const imgs: PostImage[] = data.images || (data.image ? [data.image] : [])
      setImages(imgs); setPicked(imgs[0]?.id ?? null); setRemaining(data.remaining ?? remaining)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setGenerating(false) }
  }

  const pickedImage = images.find(i => i.id === picked) || images[0] || null

  return (
    <div className="flex flex-col h-full gap-3 overflow-y-auto">
      <div className="text-sm text-slate-500 leading-relaxed">
        A photorealistic AI image for your post. {remaining !== null && <span className="text-slate-400">· {remaining} left this month</span>}
        <span className="block text-[11px] text-slate-400 mt-0.5">Failed renders are never charged.</span>
      </div>

      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Style</div>
        <div className="flex flex-wrap gap-1.5">{AI_STYLES.map(s => <Chip key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>{s.label}</Chip>)}</div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Size</div>
        <div className="flex flex-wrap gap-1.5">{RATIOS.map(([id, r]) => <Chip key={id} active={ratio === id} onClick={() => setRatio(id)}>{r.label}</Chip>)}</div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Variations <span className="font-normal normal-case text-slate-300">(each uses one generation)</span></div>
        <div className="flex flex-wrap gap-1.5">{[1, 2, 3, 4].map(n => <Chip key={n} active={variations === n} onClick={() => setVariations(n)}>{n}</Chip>)}</div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}{error.includes('Upgrade') && <Link href="/dashboard/settings?tab=plan" className="ml-1 font-semibold underline">Upgrade →</Link>}</div>}

      {images.length > 0 ? (
        <div className="flex flex-col gap-3">
          {images.length > 1 ? (
            <div className="grid grid-cols-2 gap-2">
              {images.map(img => (
                <button key={img.id} onClick={() => setPicked(img.id)} className={`relative rounded-xl overflow-hidden border-2 transition-all ${picked === img.id ? 'border-brand shadow-md' : 'border-transparent hover:border-brand/40'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.public_url} alt="" className="w-full h-auto" />
                  {picked === img.id && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand flex items-center justify-center shadow"><Check className="w-3 h-3 text-white" strokeWidth={2.5} /></div>}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[0].public_url} alt="AI generated" className="w-full h-auto" />
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={() => { if (pickedImage) { onSelect([pickedImage]); onClose() } }} disabled={!pickedImage} className="flex-1 gap-2"><Check className="w-4 h-4" /> Add to post</Button>
            <Button variant="outline" onClick={generate} disabled={generating} className="gap-1.5">{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Redo</Button>
          </div>
        </div>
      ) : (
        <Button onClick={generate} disabled={generating} className="gap-2 mt-1">{generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate AI image</>}</Button>
      )}
    </div>
  )
}

/* ───────────────────────── Shell ───────────────────────── */

function SelectorContent({ onClose, onSelect, maxSelect = 4, alreadySelected = [], plan = 'starter', postContent = '', defaultTab }: Omit<Props, 'open'>) {
  const canAi = getTierLimits(plan).perFeature.ai_image_generations > 0
  const [images, setImages] = useState<PostImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>(alreadySelected)
  const [tab, setTab] = useState<TabId>(defaultTab || 'graphic')

  const loadImages = useCallback(async () => {
    const res = await fetch('/api/images'); const data = await res.json()
    setImages(data.images || []); setLoading(false)
  }, [])
  useEffect(() => { loadImages() }, [loadImages])

  function toggle(img: PostImage) {
    setSelected(prev => prev.includes(img.id) ? prev.filter(id => id !== img.id) : [...prev, img.id])
  }
  const selectedImages = images.filter(img => selected.includes(img.id))

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'graphic', label: 'Branded graphic', icon: <TypeIcon className="w-3.5 h-3.5" /> },
    ...(canAi ? [{ id: 'ai' as TabId, label: 'AI photo', icon: <Sparkles className="w-3.5 h-3.5" /> }] : []),
    { id: 'library', label: 'My library', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 mb-3 bg-slate-50 rounded-lg p-1 shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 text-[13px] font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'graphic' && <GraphicTab postContent={postContent} onSelect={onSelect} onClose={onClose} />}
      {tab === 'ai' && canAi && <AiPhotoTab postContent={postContent} plan={plan} onSelect={onSelect} onClose={onClose} />}
      {tab === 'library' && (
        <>
          <div className="flex items-center justify-between mb-1 text-sm text-slate-500 shrink-0"><span>{selected.length} selected / {maxSelect} max</span></div>
          <div className="flex-1 overflow-y-auto min-h-0 pb-2"><ImageGrid images={images} selected={selected} maxSelect={maxSelect} onToggle={toggle} loading={loading} /></div>
          <div className="pt-3 border-t border-slate-100 mt-3 shrink-0">
            <Button onClick={() => { onSelect(selectedImages); onClose() }} disabled={selected.length === 0} className="w-full gap-2">Use Selected ({selected.length})</Button>
            <Link href="/dashboard/upload" className="block text-center text-[12px] text-slate-400 hover:text-brand mt-2 transition-colors">Upload new photos →</Link>
          </div>
        </>
      )}
    </div>
  )
}

export function ImageSelector({ open, onClose, onSelect, maxSelect = 4, alreadySelected = [], onHookSelect, plan = 'starter', postContent = '', defaultTab }: Props) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640); check()
    window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  const inner = <SelectorContent onClose={onClose} onSelect={onSelect} maxSelect={maxSelect} alreadySelected={alreadySelected} onHookSelect={onHookSelect} plan={plan} postContent={postContent} defaultTab={defaultTab} />

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={o => !o && onClose()}>
        <SheetContent side="bottom" className="h-[88vh] flex flex-col">
          <SheetHeader className="shrink-0"><SheetTitle>Add an image</SheetTitle></SheetHeader>
          <div className="flex-1 overflow-hidden">{inner}</div>
        </SheetContent>
      </Sheet>
    )
  }
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl h-[82vh] flex flex-col">
        <DialogHeader className="shrink-0"><DialogTitle>Add an image</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-hidden">{inner}</div>
      </DialogContent>
    </Dialog>
  )
}
