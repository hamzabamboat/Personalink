'use client'

import { useEffect, useState } from 'react'

export function UpgradeBanner() {
  const [data, setData] = useState<{ used: number; limit: number; plan: string } | null>(null)

  useEffect(() => {
    fetch('/api/usage/posts').then(r => r.ok ? r.json() : null).then(setData).catch(() => {})
  }, [])

  if (!data || data.plan !== 'free') return null
  const remaining = Math.max(0, data.limit - data.used)

  // Only nudge near/at the limit: "1 left" at remaining===1, "used up" at 0.
  if (remaining > 1) return null

  const atLimit = remaining === 0
  return (
    <div style={{
      background: atLimit ? 'color-mix(in srgb, #b91c1c 8%, var(--surface))' : 'color-mix(in srgb, var(--pl-accent) 8%, var(--surface))',
      border: `1px solid ${atLimit ? 'color-mix(in srgb,#b91c1c 30%,var(--line))' : 'color-mix(in srgb,var(--pl-accent) 30%,var(--line))'}`,
      borderRadius: 12, padding: '12px 16px', margin: '0 0 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontSize: 14, color: 'var(--ink-2,var(--ink))' }}>
        {atLimit
          ? `You've used all ${data.limit} free posts this month. Upgrade to keep generating.`
          : `1 free post left this month. Upgrade to Starter for 12 posts/month →`}
      </div>
      <a href="/upgrade" style={{
        background: 'var(--pl-accent)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '8px 14px',
        borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap',
      }}>Upgrade</a>
    </div>
  )
}
