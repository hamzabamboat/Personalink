'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RequestPayoutButton({ enabled, balanceInr }: { enabled: boolean; balanceInr: number }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function onClick() {
    if (!enabled || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/affiliate/payout-request', { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? 'Could not request payout.')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setSubmitting(false)
      // Refresh server data so balance + pending stats update.
      router.refresh()
    } catch {
      setError('Network error. Try again in a moment.')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-[13px] font-semibold" style={{ color: 'var(--pl-accent)' }}>
        Payout requested ✓ We&apos;ll email you when it&apos;s processed.
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={!enabled || submitting}
        className="px-5 py-2.5 rounded-xl text-[13.5px] font-bold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: enabled ? 'var(--ink)' : 'var(--surface-2)', color: enabled ? 'var(--bg)' : 'var(--ink-4)' }}
        aria-disabled={!enabled}
      >
        {submitting ? 'Requesting…' : `Request ₹${Math.round(balanceInr).toLocaleString('en-IN')}`}
      </button>
      {error && <div className="text-[12px]" style={{ color: '#dc2626' }}>{error}</div>}
    </div>
  )
}
