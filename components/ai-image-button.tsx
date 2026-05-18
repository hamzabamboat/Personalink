'use client'

import { useState, useEffect } from 'react'
import { Wand2, Lock } from 'lucide-react'
import { PostImage } from '@/lib/supabase'
import { ImageSelector } from '@/components/image-selector'
import Link from 'next/link'

interface Props {
  plan: string
  postContent?: string
  onSelect?: (images: PostImage[]) => void
  className?: string
}

export function AiImageButton({ plan, postContent = '', onSelect, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const canGenerate = plan === 'standard' || plan === 'pro'

  useEffect(() => {
    if (!canGenerate) return
    fetch('/api/images/ai-generate')
      .then(r => r.json())
      .then(d => { if (typeof d.remaining === 'number') setRemaining(d.remaining) })
      .catch(() => {})
  }, [canGenerate])

  function handleSelect(imgs: PostImage[]) {
    setRemaining(prev => (prev !== null ? Math.max(0, prev - 1) : prev))
    onSelect?.(imgs)
    setOpen(false)
  }

  if (!canGenerate) {
    return (
      <Link
        href="/dashboard/settings?tab=plan"
        className={`btn-dash btn-dash--outline flex items-center gap-1.5 ${className}`}
        title="Upgrade to Standard or Pro to generate images with AI"
      >
        <Lock size={12} />
        AI image
        <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--ink-6)', color: 'var(--ink-3)', padding: '1px 6px', borderRadius: 99 }}>
          STD+
        </span>
      </Link>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`btn-dash btn-dash--outline flex items-center gap-1.5 ${className}`}
        title={remaining !== null ? `${remaining} AI generation${remaining !== 1 ? 's' : ''} remaining this month` : 'Generate an image with AI'}
      >
        <Wand2 size={13} />
        AI image
        {remaining !== null && (
          <span style={{
            fontSize: 10, fontWeight: 700, lineHeight: 1,
            background: remaining === 0 ? '#fef2f2' : 'var(--pl-accent-soft)',
            color: remaining === 0 ? '#dc2626' : 'var(--pl-accent)',
            padding: '2px 6px', borderRadius: 99,
          }}>
            {remaining} left
          </span>
        )}
      </button>

      <ImageSelector
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        plan={plan}
        postContent={postContent}
        defaultTab="ai"
      />
    </>
  )
}
