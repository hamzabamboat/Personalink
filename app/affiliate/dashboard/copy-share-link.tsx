'use client'

import { useState } from 'react'

export function CopyShareLink({ shareLink, refCode }: { shareLink: string; refCode: string }) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* ignore — user can select+copy manually */
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div
        className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-mono break-all"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        title={`Referral code: ${refCode}`}
      >
        {shareLink}
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="px-4 py-2.5 rounded-lg text-[13px] font-bold transition-colors"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}
