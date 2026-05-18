'use client'

import { useState, useEffect, useCallback } from 'react'
import { PostImage } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Check, Loader2, Image as ImageIcon, CloudUpload, Wand2, Sparkles } from 'lucide-react'
import Link from 'next/link'

const MOOD_COLORS: Record<string, string> = {
  professional: 'bg-blue-100 text-blue-700',
  casual: 'bg-amber-100 text-amber-700',
  celebratory: 'bg-emerald-100 text-emerald-700',
  'behind-the-scenes': 'bg-purple-100 text-purple-700',
  educational: 'bg-cyan-100 text-cyan-700',
  inspirational: 'bg-rose-100 text-rose-700',
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (images: PostImage[]) => void
  maxSelect?: number
  alreadySelected?: string[]
  onHookSelect?: (hook: string) => void
  plan?: string
  postContent?: string
  defaultTab?: 'library' | 'ai'
}

function ImageGrid({
  images,
  selected,
  maxSelect,
  onToggle,
  loading,
}: {
  images: PostImage[]
  selected: string[]
  maxSelect: number
  onToggle: (img: PostImage) => void
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!images.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="w-10 h-10 text-slate-200 mb-2" strokeWidth={1.5} />
        <div className="font-semibold text-slate-600 mb-1">No photos in library</div>
        <div className="text-sm text-slate-400 mb-4">Upload photos to use them in posts</div>
        <Link href="/dashboard/upload">
          <Button variant="outline" size="sm" className="gap-1.5">
            <CloudUpload className="w-3.5 h-3.5" /> Go to Photo Library
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {images.map(img => {
        const isSelected = selected.includes(img.id)
        const atMax = selected.length >= maxSelect && !isSelected

        return (
          <button
            key={img.id}
            onClick={() => !atMax && onToggle(img)}
            disabled={atMax}
            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
              isSelected ? 'border-brand shadow-md' : atMax ? 'border-transparent opacity-40 cursor-not-allowed' : 'border-transparent hover:border-brand/40'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.public_url} alt={img.file_name || ''} className="w-full h-full object-cover" />

            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand flex items-center justify-center shadow">
                <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
              </div>
            )}

            {!img.analysed_at && (
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            )}

            {img.ai_mood && img.analysed_at && (
              <div className="absolute bottom-0 inset-x-0 p-1">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${MOOD_COLORS[img.ai_mood] || 'bg-slate-100 text-slate-600'}`}>
                  {img.ai_mood}
                </span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function AiGenerateTab({
  postContent,
  onSelect,
  onClose,
}: {
  postContent: string
  onSelect: (images: PostImage[]) => void
  onClose: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<PostImage | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [prompt, setPrompt] = useState('')

  async function generate() {
    setGenerating(true)
    setError('')
    setGeneratedImage(null)

    try {
      const res = await fetch('/api/images/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postContent }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Generation failed')
        return
      }

      setGeneratedImage(data.image)
      setRemaining(data.remaining)
      setPrompt(data.prompt || '')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  function useImage() {
    if (generatedImage) {
      onSelect([generatedImage])
      onClose()
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="text-sm text-slate-500 leading-relaxed">
        AI generates a professional image tailored to your post content using DALL-E 3. The image will be saved to your photo library.
      </div>

      {remaining !== null && (
        <div className="text-[12px] text-slate-400">
          {remaining} generation{remaining !== 1 ? 's' : ''} remaining this month
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
          {error.includes('Upgrade') && (
            <Link href="/dashboard/settings?tab=plan" className="ml-1 font-semibold underline">
              Upgrade →
            </Link>
          )}
        </div>
      )}

      {generatedImage ? (
        <div className="flex flex-col gap-3 flex-1">
          <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedImage.public_url} alt="AI generated" className="w-full h-full object-cover" />
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-bold bg-brand text-white px-2 py-0.5 rounded-full">AI Generated</span>
            </div>
          </div>

          {prompt && (
            <div className="text-[11px] text-slate-400 italic line-clamp-2">
              Prompt: {prompt}
            </div>
          )}

          <div className="flex gap-2 mt-auto">
            <Button onClick={useImage} className="flex-1 gap-2">
              <Check className="w-4 h-4" /> Use This Image
            </Button>
            <Button variant="outline" onClick={generate} disabled={generating} className="gap-1.5">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Regenerate
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          {generating ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
              </div>
              <div className="text-sm text-slate-500">Generating your image…<br /><span className="text-[12px] text-slate-400">This takes about 10–15 seconds</span></div>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-slate-300" />
              </div>
              <Button onClick={generate} className="gap-2 px-6">
                <Wand2 className="w-4 h-4" /> Generate Image
              </Button>
              <div className="text-[12px] text-slate-400 text-center max-w-xs">
                AI will analyse your post and create a professional LinkedIn image automatically
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SelectorContent({
  onClose,
  onSelect,
  maxSelect = 4,
  alreadySelected = [],
  onHookSelect,
  plan = 'starter',
  postContent = '',
  defaultTab = 'library',
}: Omit<Props, 'open'>) {
  const [images, setImages] = useState<PostImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string[]>(alreadySelected)
  const [tab, setTab] = useState<'library' | 'ai'>(defaultTab)

  const canGenerateAi = plan === 'standard' || plan === 'pro'

  const loadImages = useCallback(async () => {
    const res = await fetch('/api/images')
    const data = await res.json()
    setImages(data.images || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadImages() }, [loadImages])

  function toggle(img: PostImage) {
    setSelected(prev =>
      prev.includes(img.id) ? prev.filter(id => id !== img.id) : [...prev, img.id]
    )
  }

  const selectedImages = images.filter(img => selected.includes(img.id))
  const allHooks = selectedImages.flatMap(img => img.ai_post_hooks || [])

  function handleUse() {
    onSelect(selectedImages)
    onClose()
  }

  return (
    <div className="flex flex-col h-full">
      {canGenerateAi && (
        <div className="flex gap-1 mb-3 bg-slate-50 rounded-lg p-1 shrink-0">
          <button
            onClick={() => setTab('library')}
            className={`flex-1 text-[13px] font-medium py-1.5 rounded-md transition-all ${tab === 'library' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            My Library
          </button>
          <button
            onClick={() => setTab('ai')}
            className={`flex-1 text-[13px] font-medium py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5 ${tab === 'ai' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Wand2 className="w-3.5 h-3.5" /> Generate with AI
          </button>
        </div>
      )}

      {tab === 'ai' && canGenerateAi ? (
        <AiGenerateTab postContent={postContent} onSelect={onSelect} onClose={onClose} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-1 text-sm text-slate-500 shrink-0">
            <span>{selected.length} selected / {maxSelect} max</span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 pb-2">
            <ImageGrid images={images} selected={selected} maxSelect={maxSelect} onToggle={toggle} loading={loading} />
          </div>

          {allHooks.length > 0 && (
            <div className="border-t border-slate-100 pt-3 mt-3 shrink-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Suggested angles from your photos</div>
              <div className="flex flex-wrap gap-1.5">
                {allHooks.map((hook, i) => (
                  <button
                    key={i}
                    onClick={() => { onHookSelect?.(hook); onClose() }}
                    className="text-[12px] bg-slate-50 text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-brand/40 hover:bg-brand-light/30 hover:text-brand transition-all text-left"
                  >
                    {hook}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 mt-3 shrink-0">
            <Button onClick={handleUse} disabled={selected.length === 0} className="w-full gap-2">
              Use Selected ({selected.length})
            </Button>
            <Link href="/dashboard/upload" className="block text-center text-[12px] text-slate-400 hover:text-brand mt-2 transition-colors">
              Upload new photos →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export function ImageSelector({ open, onClose, onSelect, maxSelect = 4, alreadySelected = [], onHookSelect, plan = 'starter', postContent = '', defaultTab = 'library' }: Props) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={o => !o && onClose()}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle>Select Photos</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <SelectorContent onClose={onClose} onSelect={onSelect} maxSelect={maxSelect} alreadySelected={alreadySelected} onHookSelect={onHookSelect} plan={plan} postContent={postContent} defaultTab={defaultTab} />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Select Photos</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <SelectorContent onClose={onClose} onSelect={onSelect} maxSelect={maxSelect} alreadySelected={alreadySelected} onHookSelect={onHookSelect} plan={plan} postContent={postContent} defaultTab={defaultTab} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
