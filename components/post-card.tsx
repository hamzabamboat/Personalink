'use client'

import { useState } from 'react'
import { CheckCircle2, Pencil, Send, Trash2, X } from 'lucide-react'

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Draft' },
  pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
  publishing: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Publishing' },
  published: { bg: 'bg-green-100', text: 'text-green-700', label: 'Published' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
}

export type PostCardProps = {
  id: string
  content: string
  scheduledAt?: string | null
  status: string
  imageUrls?: string[] | null
  onEdit?: () => void
  onDelete?: () => void
  onPostNow?: () => void
  onApprove?: () => void
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

export function PostCard({ content, scheduledAt, status, imageUrls, onEdit, onDelete, onPostNow, onApprove }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.draft

  const dateStr = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
      + ' · '
      + new Date(scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null

  const isLong = content.length > 200
  const images = imageUrls?.filter(Boolean) || []

  return (
    <>
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all p-4">
        <p className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {content}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[12px] text-brand font-medium mt-1 hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}

        {/* Image thumbnails */}
        {images.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxUrl(url)}
                className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-100 hover:border-brand/40 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate mr-2">
            {dateStr || '—'}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {images.length > 0 && (
              <span className="text-[11px] text-slate-400">📷 {images.length}</span>
            )}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
              {s.label}
            </span>
            <div className="flex items-center gap-0.5 ml-1">
              {onApprove && status === 'pending_approval' && (
                <button
                  onClick={onApprove}
                  title="Approve post"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={onEdit}
                  title="Edit post"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {onPostNow && (
                <button
                  onClick={onPostNow}
                  title="Post now"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  title="Delete post"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </>
  )
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm p-4 animate-pulse">
      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded mb-2 w-full" />
      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded mb-2 w-4/5" />
      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/5" />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-32" />
        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full w-16" />
      </div>
    </div>
  )
}
