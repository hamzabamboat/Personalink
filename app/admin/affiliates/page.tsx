'use client'

import { useEffect, useState } from 'react'

type Affiliate = {
  id: string
  user_id: string
  email: string
  full_name: string
  ref_code: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  audience_size: string | null
  audience_description: string | null
  promotion_channels: string[] | null
  website_url: string | null
  linkedin_url: string | null
  payout_method: string | null
  payout_details: Record<string, unknown> | null
  applied_at: string
  approved_at: string | null
  rejected_reason: string | null
  commission_rate: number
  referral_count?: number
  total_commission_inr?: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
  suspended: 'bg-slate-100 text-slate-500',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function AdminAffiliatesPage() {
  const [rows, setRows] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'suspended'>('pending')
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/affiliates')
      const data = await res.json()
      setRows(data.affiliates ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function approve(id: string) {
    setPendingAction(id)
    try {
      const res = await fetch(`/api/admin/affiliates/${id}/approve`, { method: 'POST' })
      if (res.ok) await load()
      else { const d = await res.json(); alert(`Approve failed: ${d.error}`) }
    } finally { setPendingAction(null) }
  }

  async function reject(id: string) {
    const reason = prompt('Rejection reason (visible to applicant):')
    if (reason == null) return
    setPendingAction(id)
    try {
      const res = await fetch(`/api/admin/affiliates/${id}/reject`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) await load()
      else { const d = await res.json(); alert(`Reject failed: ${d.error}`) }
    } finally { setPendingAction(null) }
  }

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)
  const counts = {
    pending: rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
    suspended: rows.filter(r => r.status === 'suspended').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Affiliate applications</h1>
          <p className="text-[13px] text-slate-500">Approve, reject, or audit partner accounts.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['pending','approved','rejected','suspended','all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}{f !== 'all' && counts[f as keyof typeof counts] > 0 && ` (${counts[f as keyof typeof counts]})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 text-sm py-12">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-12">
          No {filter === 'all' ? '' : filter} applications.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="font-semibold text-slate-900">{a.full_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[a.status]}`}>
                      {a.status}
                    </span>
                    <span className="text-[12px] font-mono text-slate-500">{a.ref_code}</span>
                  </div>
                  <div className="text-[13px] text-slate-500 mb-2">
                    {a.email} · Applied {fmt(a.applied_at)}
                    {a.audience_size && <> · Audience {a.audience_size}</>}
                  </div>
                  {a.audience_description && (
                    <p className="text-[13px] text-slate-700 mb-2 leading-relaxed">{a.audience_description}</p>
                  )}
                  {a.promotion_channels && a.promotion_channels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {a.promotion_channels.map(c => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[12px] text-slate-500 space-y-0.5">
                    {a.website_url && <div>Web: <a href={a.website_url} target="_blank" rel="noopener" className="text-blue-600 underline">{a.website_url}</a></div>}
                    {a.linkedin_url && <div>LinkedIn: <a href={a.linkedin_url} target="_blank" rel="noopener" className="text-blue-600 underline">{a.linkedin_url}</a></div>}
                    {a.payout_method && <div>Payout: {a.payout_method} — <span className="font-mono">{(a.payout_details as { raw?: string })?.raw}</span></div>}
                    {a.status === 'rejected' && a.rejected_reason && (
                      <div className="text-red-600">Reason: {a.rejected_reason}</div>
                    )}
                    {a.status === 'approved' && (
                      <div>Referrals: {a.referral_count ?? 0} · Total credited: ₹{Math.round(a.total_commission_inr ?? 0).toLocaleString('en-IN')}</div>
                    )}
                  </div>
                </div>
                {a.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approve(a.id)}
                      disabled={pendingAction === a.id}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {pendingAction === a.id ? '…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => reject(a.id)}
                      disabled={pendingAction === a.id}
                      className="px-3 py-1.5 bg-white text-red-600 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
