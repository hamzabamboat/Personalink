'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PostImage } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { CloudUpload, CheckCircle2, X, Trash2, Loader2, Image as ImageIcon, ExternalLink } from 'lucide-react'

const MOOD_COLORS: Record<string, string> = {
  professional: 'bg-blue-100 text-blue-700',
  casual: 'bg-amber-100 text-amber-700',
  celebratory: 'bg-emerald-100 text-emerald-700',
  'behind-the-scenes': 'bg-purple-100 text-purple-700',
  educational: 'bg-cyan-100 text-cyan-700',
  inspirational: 'bg-rose-100 text-rose-700',
}

type UploadFile = {
  name: string
  status: 'uploading' | 'analysing' | 'done' | 'error'
  progress: number
  error?: string
}

function ImageCard({ image, onDelete }: { image: PostImage; onDelete: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isAnalysed = !!image.analysed_at
  const topics = image.ai_topics || []

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/images/${image.id}`, { method: 'DELETE' })
    onDelete(image.id)
  }

  return (
    <div className="relative group rounded-xl overflow-hidden border border-slate-100 bg-white shadow-sm">
      <div className="aspect-square relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.public_url} alt={image.file_name || ''} className="w-full h-full object-cover" />

        {!isAnalysed && (
          <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
            <span className="text-white text-[11px] font-semibold">Analysing...</span>
          </div>
        )}

        {isAnalysed && (
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
            <div className="flex justify-end gap-1.5">
              <Link
                href={`/dashboard/generate?imageId=${image.id}`}
                className="text-[11px] font-semibold bg-white text-slate-800 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-brand hover:text-white transition-colors"
              >
                Use in Post <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1 rounded-lg bg-red-500/80 text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {image.ai_description && (
              <p className="text-white text-[11px] leading-snug line-clamp-3">{image.ai_description}</p>
            )}
          </div>
        )}
      </div>

      <div className="p-2.5">
        {image.ai_mood && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${MOOD_COLORS[image.ai_mood] || 'bg-slate-100 text-slate-600'}`}>
            {image.ai_mood}
          </span>
        )}
        {topics.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {topics.slice(0, 2).map(t => (
              <span key={t} className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 rounded-full px-1.5 py-0.5">{t}</span>
            ))}
            {topics.length > 2 && (
              <span className="text-[10px] text-slate-400">+{topics.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-2 p-3 rounded-xl">
          <p className="text-[12px] font-semibold text-slate-700 text-center">Delete this photo?</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting} className="h-7 text-[11px]">
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)} className="h-7 text-[11px]">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function UploadPage() {
  const router = useRouter()
  const [images, setImages] = useState<PostImage[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadImages = useCallback(async () => {
    const res = await fetch('/api/images')
    const data = await res.json()
    setImages(data.images || [])
    setLoadingImages(false)
  }, [])

  useEffect(() => { loadImages() }, [loadImages])

  // Poll for analysis completion on unanalysed images
  useEffect(() => {
    const unanalysed = images.filter(img => !img.analysed_at)
    if (!unanalysed.length) return
    const timer = setTimeout(loadImages, 3000)
    return () => clearTimeout(timer)
  }, [images, loadImages])

  async function uploadFiles(files: File[]) {
    const allowed = files.filter(f => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'].includes(f.type))
    if (!allowed.length) return

    const chunks: File[][] = []
    for (let i = 0; i < allowed.length; i += 4) chunks.push(allowed.slice(i, i + 4))

    for (const chunk of chunks) {
      const queueEntries: UploadFile[] = chunk.map(f => ({ name: f.name, status: 'uploading', progress: 50 }))
      setUploadQueue(q => [...q, ...queueEntries])

      const form = new FormData()
      chunk.forEach(f => form.append('files', f))

      try {
        setUploadQueue(q => q.map(e => chunk.find(f => f.name === e.name) ? { ...e, status: 'analysing', progress: 80 } : e))
        const res = await fetch('/api/images/upload', { method: 'POST', body: form })
        const data = await res.json()

        for (const result of data.results || []) {
          if (result.image) {
            setImages(prev => [result.image, ...prev])
            setUploadQueue(q => q.map(e => e.name === result.image.file_name ? { ...e, status: 'done', progress: 100 } : e))
          } else if (result.error) {
            setUploadQueue(q => q.map(e => {
              const name = result.error.split(':')[0]
              return e.name === name ? { ...e, status: 'error', error: result.error, progress: 0 } : e
            }))
          }
        }
      } catch {
        setUploadQueue(q => q.map(e => chunk.find(f => f.name === e.name) ? { ...e, status: 'error', error: 'Upload failed', progress: 0 } : e))
      }
    }

    // Clear done entries after delay
    setTimeout(() => setUploadQueue(q => q.filter(e => e.status !== 'done')), 3000)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    uploadFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }

  return (
    <div className="p-4 md:p-7 max-w-[900px]">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 tracking-tight">Photo Library</h1>
        <p className="text-sm text-gray-500 leading-relaxed">Upload photos — AI analyses them for LinkedIn post hooks, mood, and topics so you can use them in your posts.</p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-4 ${
          dragOver ? 'border-brand bg-brand-light/30' : 'border-slate-200 hover:border-brand/50 hover:bg-slate-50'
        }`}
      >
        <CloudUpload className="w-10 h-10 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
        <div className="text-base font-semibold text-slate-700">Drag photos here or click to browse</div>
        <div className="text-sm text-slate-400 mt-1">JPG, PNG, WebP, HEIC — up to 10 MB each, 4 at a time</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          onChange={handleInput}
        />
      </div>

      {/* Upload queue */}
      {uploadQueue.length > 0 && (
        <div className="flex flex-col gap-2 mb-6">
          {uploadQueue.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-slate-700 truncate">{f.name}</div>
                {f.status === 'uploading' && (
                  <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full w-1/2 animate-pulse" />
                  </div>
                )}
                {f.status === 'analysing' && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin text-violet-500" />
                    <span className="text-[11px] text-violet-600 font-medium">Analysing with AI...</span>
                  </div>
                )}
                {f.status === 'error' && <div className="text-[11px] text-red-500 mt-0.5">{f.error}</div>}
              </div>
              {f.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              {f.status === 'error' && <X className="w-4 h-4 text-red-500 shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {/* Photo library */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] font-semibold text-slate-700">Your Photos {images.length > 0 && `(${images.length})`}</div>
      </div>

      {loadingImages ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <ImageIcon className="w-12 h-12 text-slate-200 mb-3" strokeWidth={1.5} />
          <div className="font-semibold text-slate-700 mb-1">No photos yet</div>
          <div className="text-sm text-slate-400 mb-4">Upload your first photo above</div>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
            <CloudUpload className="w-4 h-4" /> Upload Photos
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(img => (
            <ImageCard
              key={img.id}
              image={img}
              onDelete={id => setImages(prev => prev.filter(i => i.id !== id))}
            />
          ))}
        </div>
      )}

      <div className="mt-8 flex gap-3">
        <Button onClick={() => router.push('/dashboard/generate')} variant="outline" className="gap-2">
          Generate a post →
        </Button>
      </div>
    </div>
  )
}
