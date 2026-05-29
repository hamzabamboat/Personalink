'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AUDIENCE_SIZES,
  PROMOTION_CHANNELS,
  PAYOUT_METHODS,
} from '@/lib/affiliate'

export function AffiliateApplyForm({ prefillName, prefillEmail }: { prefillName: string; prefillEmail: string }) {
  const router = useRouter()
  const [fullName, setFullName] = useState(prefillName)
  const [email, setEmail] = useState(prefillEmail)
  const [audienceSize, setAudienceSize] = useState<string>('')
  const [audienceDescription, setAudienceDescription] = useState('')
  const [channels, setChannels] = useState<string[]>([])
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [payoutMethod, setPayoutMethod] = useState<string>('')
  const [payoutDetails, setPayoutDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleChannel(c: string) {
    setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) return setError('Please share your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please share a valid email.')
    if (!audienceSize) return setError('Pick an audience size.')
    if (audienceDescription.trim().length < 20) return setError('Tell us a bit more about your audience (at least 20 characters).')
    if (audienceDescription.length > 600) return setError('Keep the audience description under 600 characters.')
    if (channels.length === 0) return setError('Pick at least one channel.')
    if (!payoutMethod) return setError('Pick a payout method.')
    if (!payoutDetails.trim()) return setError('Add your payout details.')

    setSubmitting(true)
    try {
      const res = await fetch('/api/affiliate/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          audience_size: audienceSize,
          audience_description: audienceDescription.trim(),
          promotion_channels: channels,
          website_url: websiteUrl.trim() || undefined,
          linkedin_url: linkedinUrl.trim() || undefined,
          payout_method: payoutMethod,
          payout_details: payoutDetails.trim(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? 'Something went wrong. Try again or email partners@personalink.in.')
        setSubmitting(false)
        return
      }
      router.push('/affiliate/thank-you')
    } catch (err) {
      setError('Network error. Try again in a moment.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field label="Your name">
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-lg text-[14px]"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </Field>

      <Field label="Email" hint="Where we’ll send approval, monthly reports, and payouts.">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-lg text-[14px]"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </Field>

      <Field label="Audience size">
        <div className="flex flex-wrap gap-2">
          {AUDIENCE_SIZES.map(s => (
            <Chip key={s} active={audienceSize === s} onClick={() => setAudienceSize(s)}>{s}</Chip>
          ))}
        </div>
      </Field>

      <Field label="Who are they?" hint="One or two sentences. Industry, role, what they care about.">
        <textarea
          value={audienceDescription}
          onChange={e => setAudienceDescription(e.target.value)}
          rows={4}
          maxLength={600}
          className="w-full px-3 py-2.5 rounded-lg text-[14px] leading-relaxed"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          placeholder="e.g. Indian B2B SaaS founders raising their Series A. They post on LinkedIn between fundraising calls."
        />
        <div className="text-right text-[11px] mt-1" style={{ color: 'var(--ink-4)' }}>
          {audienceDescription.length} / 600
        </div>
      </Field>

      <Field label="Where will you promote?" hint="Pick all that apply.">
        <div className="flex flex-wrap gap-2">
          {PROMOTION_CHANNELS.map(c => (
            <Chip key={c} active={channels.includes(c)} onClick={() => toggleChannel(c)}>{c}</Chip>
          ))}
        </div>
      </Field>

      <Field label="Website or main channel URL" optional>
        <input
          type="url"
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
          placeholder="https://"
          className="w-full px-3 py-2.5 rounded-lg text-[14px]"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </Field>

      <Field label="LinkedIn profile URL" optional>
        <input
          type="url"
          value={linkedinUrl}
          onChange={e => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/in/"
          className="w-full px-3 py-2.5 rounded-lg text-[14px]"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </Field>

      <Field label="Payout method">
        <div className="flex flex-wrap gap-2">
          {PAYOUT_METHODS.map(m => (
            <Chip key={m} active={payoutMethod === m} onClick={() => setPayoutMethod(m)}>{m}</Chip>
          ))}
        </div>
      </Field>

      <Field label="Payout details" hint="UPI ID, PayPal email, Wise tag, or bank IFSC + account number.">
        <input
          type="text"
          value={payoutDetails}
          onChange={e => setPayoutDetails(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg text-[14px]"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }}
        />
      </Field>

      {error && (
        <div className="rounded-lg px-3 py-2 text-[13px]" style={{ background: '#fee2e2', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="px-6 py-3 rounded-xl text-[14px] font-bold transition-opacity disabled:opacity-50"
        style={{ background: 'var(--ink)', color: 'var(--bg)', boxShadow: 'var(--sh-3)' }}
      >
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>

      <p className="text-[12px] text-center" style={{ color: 'var(--ink-4)' }}>
        By submitting you agree to our affiliate terms. We’ll email you within one working day.
      </p>
    </form>
  )
}

function Field({ label, hint, children, optional }: { label: string; hint?: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>
          {label}{optional && <span className="font-normal" style={{ color: 'var(--ink-4)' }}> (optional)</span>}
        </span>
      </div>
      {hint && <span className="text-[12px] -mt-1" style={{ color: 'var(--ink-4)' }}>{hint}</span>}
      {children}
    </label>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition-colors"
      style={{
        background: active ? 'var(--ink)' : 'var(--surface)',
        color: active ? 'var(--bg)' : 'var(--ink-3)',
        border: '1px solid var(--line)',
      }}
    >
      {children}
    </button>
  )
}
