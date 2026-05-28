'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const CLIENT_COUNTS = ['1-2', '3-5', '6-15', '16+'] as const
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const
const TIMELINES = ['This week', 'This month', 'Next quarter', 'Just exploring'] as const
const SOURCES = ['LinkedIn', 'Google', 'Referral', 'Press', 'Other'] as const
const ROLES = ['Founder', 'Operations', 'Client Lead', 'Other'] as const
const TOOL_OPTIONS = ['Taplio', 'Hootsuite', 'Buffer', 'Manual', 'Other'] as const

type FormState = 'idle' | 'submitting' | 'error'

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  }
}

function track(event: string, props?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.posthog?.capture) {
    window.posthog.capture(event, props)
  }
}

export function InquiryForm() {
  const router = useRouter()
  const [state, setState] = useState<FormState>('idle')
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const startedRef = useRef(false)
  const completedFields = useRef<Set<string>>(new Set())

  const [tools, setTools] = useState<string[]>([])
  const [otherTool, setOtherTool] = useState('')
  const [clientCount, setClientCount] = useState<string>('')
  const [currency, setCurrency] = useState<string>('')
  const [timeline, setTimeline] = useState<string>('')

  function onAnyFocus() {
    if (!startedRef.current) {
      startedRef.current = true
      track('agency_form_started')
    }
  }

  function onFieldBlur(fieldName: string, hasValue: boolean) {
    if (!hasValue) return
    if (completedFields.current.has(fieldName)) return
    completedFields.current.add(fieldName)
    track('agency_form_field_completed', { field_name: fieldName })
  }

  function toggleTool(tool: string) {
    setTools(prev => (prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]))
    onFieldBlur('current_tools', true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state === 'submitting') return
    setState('submitting')
    setErrMsg(null)

    const form = e.currentTarget
    const fd = new FormData(form)

    const phoneRaw = (fd.get('phone') ?? '').toString().trim()
    const phoneCc = (fd.get('phone_cc') ?? '').toString().trim()
    const phone = phoneRaw ? `${phoneCc} ${phoneRaw}`.trim() : undefined

    const finalTools = tools.includes('Other') && otherTool
      ? [...tools.filter(t => t !== 'Other'), otherTool]
      : tools

    const payload = {
      agency_name: (fd.get('agency_name') ?? '').toString(),
      owner_name: (fd.get('owner_name') ?? '').toString(),
      owner_role: (fd.get('owner_role') ?? '').toString(),
      email: (fd.get('email') ?? '').toString(),
      phone,
      website: (fd.get('website') ?? '').toString(),
      linkedin_url: (fd.get('linkedin_url') ?? '').toString(),
      client_count: clientCount,
      current_tools: finalTools,
      primary_problem: (fd.get('primary_problem') ?? '').toString(),
      preferred_currency: currency,
      timeline,
      source: (fd.get('source') ?? '').toString(),
      _hp_url: (fd.get('_hp_url') ?? '').toString(),
    }

    try {
      const res = await fetch('/api/agency-inquiry/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrMsg(json.error ?? 'Something went wrong.')
        setState('error')
        return
      }
      track('agency_form_submitted', {
        client_count: payload.client_count,
        timeline: payload.timeline,
        source: payload.source,
      })
      router.push(json.redirect ?? '/agency-inquiry/thank-you')
    } catch {
      setErrMsg('Network error. Try again or email hello@personalink.in.')
      setState('error')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocusCapture={onAnyFocus}
      action="/api/agency-inquiry/submit"
      method="POST"
      style={formStyle}
      noValidate
    >
      {/* Honeypot — hidden from humans. */}
      <input
        type="text"
        name="_hp_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      {/* Block 1 — About you */}
      <BlockHeading>About you</BlockHeading>
      <Row>
        <Field name="agency_name" label="Agency name" placeholder="Atlas Growth Studio" required onBlurTrack={onFieldBlur} />
        <Field name="owner_name" label="Your name" placeholder="Aman Sharma" required onBlurTrack={onFieldBlur} />
      </Row>
      <SelectField name="owner_role" label="Your role at the agency" options={ROLES} required onBlurTrack={onFieldBlur} />

      {/* Block 2 — How to reach you */}
      <BlockHeading>How to reach you</BlockHeading>
      <Row>
        <Field name="email" label="Work email" type="email" placeholder="aman@youragency.com" required onBlurTrack={onFieldBlur} />
        <PhoneField onBlurTrack={onFieldBlur} />
      </Row>
      <Row>
        <Field name="website" label="Agency website" placeholder="https://youragency.com" type="url" onBlurTrack={onFieldBlur} />
        <Field name="linkedin_url" label="LinkedIn profile" placeholder="https://linkedin.com/in/..." type="url" onBlurTrack={onFieldBlur} />
      </Row>

      {/* Block 3 — Your setup */}
      <BlockHeading>Your setup</BlockHeading>
      <ChipGroup
        name="client_count"
        label="How many LinkedIn accounts do you manage?"
        options={CLIENT_COUNTS}
        value={clientCount}
        onChange={v => {
          setClientCount(v)
          onFieldBlur('client_count', true)
        }}
        required
      />
      <div>
        <FieldLabel required>Current tools you use</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TOOL_OPTIONS.map(tool => (
            <button
              key={tool}
              type="button"
              onClick={() => toggleTool(tool)}
              style={chipStyle(tools.includes(tool))}
              aria-pressed={tools.includes(tool)}
            >
              {tool}
            </button>
          ))}
        </div>
        {tools.includes('Other') && (
          <input
            type="text"
            value={otherTool}
            onChange={e => setOtherTool(e.target.value)}
            placeholder="Which tool?"
            style={{ ...inputStyle, marginTop: 10 }}
            maxLength={60}
          />
        )}
        {/* Hidden inputs so the no-JS form post still sends tool choices. */}
        {tools.map(t => (
          <input
            key={t}
            type="hidden"
            name="current_tools"
            value={t === 'Other' && otherTool ? otherTool : t}
          />
        ))}
      </div>

      {/* Block 4 — Your situation */}
      <BlockHeading>Your situation</BlockHeading>
      <ProblemField onBlurTrack={onFieldBlur} />
      <ChipGroup
        name="preferred_currency"
        label="Preferred billing currency"
        options={CURRENCIES}
        value={currency}
        onChange={v => {
          setCurrency(v)
          onFieldBlur('preferred_currency', true)
        }}
        required
      />
      <ChipGroup
        name="timeline"
        label="When do you want to start?"
        options={TIMELINES}
        value={timeline}
        onChange={v => {
          setTimeline(v)
          onFieldBlur('timeline', true)
        }}
        required
      />

      {/* Block 5 — Last thing */}
      <BlockHeading>Last thing</BlockHeading>
      <SelectField name="source" label="How did you hear about us?" options={SOURCES} required onBlurTrack={onFieldBlur} />

      {errMsg && (
        <div role="alert" style={errorStyle}>
          {errMsg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button type="submit" disabled={state === 'submitting'} style={submitBtnStyle(state === 'submitting')}>
          {state === 'submitting' ? 'Sending…' : 'Send inquiry — reply within 24 hours'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>
          No drip emails. No newsletter. One human reply.
        </span>
      </div>
    </form>
  )
}

/* ─── Styles ─── */

const formStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-lg)',
  padding: 'clamp(24px, 4vw, 36px)',
  boxShadow: 'var(--sh-1)',
  display: 'grid',
  gap: 20,
  position: 'relative',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-2)',
  fontSize: 14,
  fontFamily: 'inherit',
  color: 'var(--ink)',
  outline: 'none',
}

const errorStyle: React.CSSProperties = {
  padding: '12px 14px',
  background: 'color-mix(in srgb, #ef4444 8%, var(--surface-2))',
  border: '1px solid color-mix(in srgb, #ef4444 30%, var(--line))',
  borderRadius: 'var(--r-md)',
  color: '#b91c1c',
  fontSize: 13.5,
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    background: active ? 'var(--ink)' : 'var(--surface-2)',
    color: active ? 'var(--bg)' : 'var(--ink-2)',
    border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
    borderRadius: 'var(--r-pill)',
    fontSize: 13.5,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background .15s, color .15s, border-color .15s',
  }
}

function submitBtnStyle(busy: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 26px',
    background: 'var(--ink)',
    color: 'var(--bg)',
    border: 'none',
    borderRadius: 'var(--r-md)',
    fontWeight: 600,
    fontSize: 15,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.7 : 1,
    transition: 'opacity .15s',
  }
}

/* ─── Subcomponents ─── */

function BlockHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 11.5,
        fontFamily: 'var(--f-mono)',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--ink-4)',
        margin: '8px 0 4px',
      }}
    >
      {children}
    </h3>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 8 }}>
      {children}
      {required && <span style={{ color: 'var(--pl-accent)' }}> *</span>}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      {children}
    </div>
  )
}

function Field({
  name,
  label,
  type = 'text',
  placeholder,
  required,
  onBlurTrack,
}: {
  name: string
  label: string
  type?: string
  placeholder?: string
  required?: boolean
  onBlurTrack: (n: string, hasValue: boolean) => void
}) {
  return (
    <label style={{ display: 'block' }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        onBlur={e => onBlurTrack(name, e.target.value.trim().length > 0)}
        style={inputStyle}
      />
    </label>
  )
}

function SelectField({
  name,
  label,
  options,
  required,
  onBlurTrack,
}: {
  name: string
  label: string
  options: readonly string[]
  required?: boolean
  onBlurTrack: (n: string, hasValue: boolean) => void
}) {
  return (
    <label style={{ display: 'block' }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        name={name}
        required={required}
        defaultValue=""
        onBlur={e => onBlurTrack(name, e.target.value.length > 0)}
        style={{ ...inputStyle, appearance: 'auto' }}
      >
        <option value="" disabled>
          Choose one
        </option>
        {options.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

function ChipGroup({
  name,
  label,
  options,
  value,
  onChange,
  required,
}: {
  name: string
  label: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={chipStyle(value === opt)}
            aria-pressed={value === opt}
          >
            {opt}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value} required={required} />
    </div>
  )
}

function PhoneField({ onBlurTrack }: { onBlurTrack: (n: string, hasValue: boolean) => void }) {
  return (
    <label style={{ display: 'block' }}>
      <FieldLabel>Phone (optional)</FieldLabel>
      <div style={{ display: 'flex', gap: 8 }}>
        <select name="phone_cc" defaultValue="+91" style={{ ...inputStyle, width: 90, appearance: 'auto' }}>
          <option value="+91">+91</option>
          <option value="+1">+1</option>
          <option value="+44">+44</option>
          <option value="+61">+61</option>
          <option value="+65">+65</option>
          <option value="+971">+971</option>
        </select>
        <input
          type="tel"
          name="phone"
          placeholder="98765 43210"
          onBlur={e => onBlurTrack('phone', e.target.value.trim().length > 0)}
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>
    </label>
  )
}

function ProblemField({ onBlurTrack }: { onBlurTrack: (n: string, hasValue: boolean) => void }) {
  const [val, setVal] = useState('')
  const max = 200
  return (
    <div>
      <FieldLabel required>What is the #1 problem you want to solve?</FieldLabel>
      <textarea
        name="primary_problem"
        value={val}
        onChange={e => setVal(e.target.value.slice(0, max))}
        onBlur={() => onBlurTrack('primary_problem', val.trim().length > 0)}
        required
        rows={3}
        maxLength={max}
        placeholder="Voice consistency across 12 clients. Currently using ChatGPT + Notion + Buffer and the seams show."
        style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
      />
      <div style={{ fontSize: 11.5, color: 'var(--ink-4)', textAlign: 'right', marginTop: 4 }}>
        {val.length} / {max}
      </div>
    </div>
  )
}
