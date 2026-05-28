# Agency Inquiry Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a no-public-pricing inbound funnel for LinkedIn-content agencies — landing page at `/for-agencies` with 9 sections, 13-field inquiry form, durable storage, brand-voice auto-reply, founder alert, and Cal.com-embedded thank-you page.

**Architecture:** Next.js App Router RSC for the landing page, a single client component for the form, a Node-runtime POST endpoint that validates → rate-limits → inserts into Supabase → fires 2 emails via Resend in parallel → emits a PostHog server event. Thank-you page is a server component with an env-gated Cal.com iframe.

**Tech Stack:** Next.js 15 (App Router), Supabase (Postgres + RLS), Resend, PostHog (`posthog-js` client + `posthog-node` server), Framer Motion, existing CSS-variable design system. No new npm dependencies.

**Source spec:** `docs/superpowers/specs/2026-05-28-agency-inquiry-funnel-design.md`

**Brand voice rules:** `docs/brand-voice.md` — faceless brand, plain English, no emojis in copy, Indian-English register, no padding, no "unlock/supercharge/10x".

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260528c_agency_inquiries.sql` | CREATE | `agency_inquiries` table + indexes + RLS |
| `lib/email.ts` | MODIFY | Add `sendAgencyInquiryAdminAlert` + `sendAgencyInquiryAutoReply` |
| `app/api/agency-inquiry/submit/route.ts` | CREATE | POST endpoint: honeypot, rate limit, validate, insert, send emails, posthog event |
| `components/agency/InquiryForm.tsx` | CREATE | 13-field form, 5 visual blocks, no-JS fallback, PostHog client events |
| `app/agency-inquiry/thank-you/page.tsx` | CREATE | Server component thank-you page with metadata.robots: noindex |
| `app/agency-inquiry/thank-you/_components/CalEmbed.tsx` | CREATE | Client component, env-gated iframe embed |
| `app/agency-inquiry/thank-you/_components/ThankYouTracker.tsx` | CREATE | Fires `agency_thank_you_viewed` event on mount |
| `app/for-agencies/page.tsx` | REWRITE | Full 9-section landing |
| `app/for-agencies/_components/ComparisonTable.tsx` | CREATE | PersonaLink Agency vs Taplio vs hiring |
| `app/for-agencies/_components/FAQ.tsx` | CREATE | 10 questions, accordion (`<details>`) |
| `app/for-agencies/_components/PricingTiers.tsx` | CREATE | 3-tier display + range disclosure |
| `app/for-agencies/_components/LandingPostHogTracker.tsx` | CREATE | Fires `agency_landing_viewed` event on mount |
| `public/robots.txt` | MODIFY | Add `Disallow: /agency-inquiry/thank-you` |
| `app/api/agency-lead/route.ts` | DELETE | Replaced by /api/agency-inquiry/submit |
| `components/agency/AgencyLeadForm.tsx` | DELETE | Replaced by InquiryForm |

---

## Pre-flight

Before starting:

- [ ] Verify dev server is not running. If running, stop it (we'll start fresh in the verification task).
- [ ] Confirm the existing untracked agency files exist (sanity check):
  ```bash
  ls app/for-agencies/page.tsx app/api/agency-lead/route.ts components/agency/AgencyLeadForm.tsx
  ```
  Expected: all 3 files listed, no errors.
- [ ] Confirm git status — note we have other uncommitted work; we will be careful to only stage agency-related files in commits.

---

## Task 1: Create migration file

**Files:**
- Create: `supabase/migrations/20260528c_agency_inquiries.sql`

- [ ] **Step 1.1: Create the migration file**

```sql
-- supabase/migrations/20260528c_agency_inquiries.sql
-- Agency inquiries from the /for-agencies funnel.

CREATE TABLE IF NOT EXISTS agency_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_role TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  client_count TEXT NOT NULL,
  current_tools TEXT[],
  primary_problem TEXT,
  preferred_currency TEXT,
  timeline TEXT,
  source TEXT,
  ip TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new','contacted','demo_scheduled','demo_done','proposal_sent','closed_won','closed_lost'
  )),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_agency_inquiries_status ON agency_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_agency_inquiries_submitted ON agency_inquiries(submitted_at DESC);

ALTER TABLE agency_inquiries ENABLE ROW LEVEL SECURITY;
-- No public policies. Only service role can read/write.
```

- [ ] **Step 1.2: Verify the migration file exists**

```bash
ls -la supabase/migrations/20260528c_agency_inquiries.sql
```
Expected: file listed, ~1KB.

- [ ] **Step 1.3: Do NOT push the migration yet**

Per the spec decision, we leave application to the user. The user runs `npx supabase db push` (or applies via dashboard) when they are ready.

---

## Task 2: Add email helpers to lib/email.ts

**Files:**
- Modify: `lib/email.ts` (append two new exports near the bottom, after `sendAdminAlert`)

- [ ] **Step 2.1: Find the insertion point**

The file ends with `sendDowngradeConfirmationEmail`. Append new exports after the last `}` closing that function. Read [lib/email.ts](lib/email.ts) to find the last line.

- [ ] **Step 2.2: Append `sendAgencyInquiryAdminAlert`**

Append to `lib/email.ts`:

```typescript
/* ─────────────────────────────────────────────
 * Agency inquiry funnel — /for-agencies
 * ───────────────────────────────────────────── */

export type AgencyInquiryRecord = {
  id: string
  agency_name: string
  owner_name: string
  owner_role: string | null
  email: string
  phone: string | null
  website: string | null
  linkedin_url: string | null
  client_count: string
  current_tools: string[] | null
  primary_problem: string | null
  preferred_currency: string | null
  timeline: string | null
  source: string | null
  ip: string | null
  user_agent: string | null
  submitted_at: string
}

export async function sendAgencyInquiryAdminAlert(record: AgencyInquiryRecord) {
  const adminEmail =
    process.env.AGENCY_INQUIRY_ADMIN_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'hello@personalink.in'

  const row = (label: string, value: string | null | undefined) =>
    value
      ? `<tr><td style="padding:6px 14px 6px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 0;color:#0f172a;font-size:14px;">${escapeHtml(value)}</td></tr>`
      : ''

  const tools = record.current_tools?.length ? record.current_tools.join(', ') : null

  return resend().emails.send({
    from: FROM_EMAIL,
    to: adminEmail,
    replyTo: record.email,
    subject: `Agency inquiry — ${record.agency_name} (${record.client_count} clients)`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e2e8f0;">
    <h1 style="margin:0 0 4px;font-size:18px;color:#0f172a;font-weight:600;">Agency inquiry</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:13px;">Reply within 24h.</p>
    <table style="width:100%;border-collapse:collapse;">
      ${row('Agency', record.agency_name)}
      ${row('Contact', record.owner_name)}
      ${row('Role', record.owner_role)}
      ${row('Email', record.email)}
      ${row('Phone', record.phone)}
      ${row('Website', record.website)}
      ${row('LinkedIn', record.linkedin_url)}
      ${row('Clients', record.client_count)}
      ${row('Currently using', tools)}
      ${row('#1 problem', record.primary_problem)}
      ${row('Preferred currency', record.preferred_currency)}
      ${row('Timeline', record.timeline)}
      ${row('Source', record.source)}
    </table>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
    <p style="margin:0;color:#94a3b8;font-size:11px;font-family:monospace;">
      id ${record.id} · ${new Date(record.submitted_at).toISOString()}<br/>
      ip ${record.ip ?? '-'} · ua ${escapeHtml((record.user_agent ?? '').slice(0, 80))}
    </p>
  </div>
</body>
</html>`,
    text: [
      `Agency inquiry — ${record.agency_name} (${record.client_count} clients)`,
      '',
      `Agency: ${record.agency_name}`,
      `Contact: ${record.owner_name} (${record.owner_role ?? '-'})`,
      `Email: ${record.email}`,
      `Phone: ${record.phone ?? '-'}`,
      `Website: ${record.website ?? '-'}`,
      `LinkedIn: ${record.linkedin_url ?? '-'}`,
      `Clients: ${record.client_count}`,
      `Currently using: ${tools ?? '-'}`,
      `#1 problem: ${record.primary_problem ?? '-'}`,
      `Preferred currency: ${record.preferred_currency ?? '-'}`,
      `Timeline: ${record.timeline ?? '-'}`,
      `Source: ${record.source ?? '-'}`,
      '',
      `id: ${record.id}`,
      `submitted_at: ${record.submitted_at}`,
      `ip: ${record.ip ?? '-'}`,
    ].join('\n'),
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

- [ ] **Step 2.3: Append `sendAgencyInquiryAutoReply`**

Append immediately after the previous block:

```typescript
export async function sendAgencyInquiryAutoReply(params: {
  to: string
  firstName: string
  agencyName: string
  clientCount: string
}) {
  const { to, firstName, agencyName, clientCount } = params
  const calUrl = process.env.NEXT_PUBLIC_CAL_COM_URL

  const calLine = calUrl
    ? `If you want to skip the wait, you can pick a slot here: <a href="${escapeHtml(calUrl)}" style="color:#0f766e;">${escapeHtml(calUrl)}</a>`
    : ''

  const calLineText = calUrl ? `If you want to skip the wait, you can pick a slot here: ${calUrl}\n\n` : ''

  return resend().emails.send({
    from: FROM_EMAIL,
    to,
    replyTo: 'hello@personalink.in',
    subject: `Got your inquiry — ${agencyName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:32px 16px;background:#fafaf7;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;line-height:1.6;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e7e5df;">
    <p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 16px;font-size:15px;">
      Thanks for the note about ${escapeHtml(agencyName)}. I will review your details and reply within 24 hours with a Loom demo tailored to your setup (${escapeHtml(clientCount)} clients).
    </p>
    ${calLine ? `<p style="margin:0 0 16px;font-size:15px;">${calLine}</p>` : ''}
    <p style="margin:24px 0 0;font-size:15px;color:#475569;">— Hamza, PersonaLink</p>
  </div>
  <p style="max-width:520px;margin:16px auto 0;font-size:11px;color:#94a3b8;text-align:center;">
    You received this because you submitted an inquiry at personalink.in/for-agencies.
  </p>
</body>
</html>`,
    text: [
      `Hi ${firstName},`,
      '',
      `Thanks for the note about ${agencyName}. I will review your details and reply within 24 hours with a Loom demo tailored to your setup (${clientCount} clients).`,
      '',
      calLineText,
      '— Hamza, PersonaLink',
    ].join('\n'),
  })
}
```

- [ ] **Step 2.4: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors related to `lib/email.ts`. (Pre-existing errors elsewhere are out of scope — note them but don't fix.)

---

## Task 3: Build the submit API route

**Files:**
- Create: `app/api/agency-inquiry/submit/route.ts`

- [ ] **Step 3.1: Create the route file**

```typescript
// app/api/agency-inquiry/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkIpRateLimit } from '@/lib/rate-limiter'
import {
  sendAgencyInquiryAdminAlert,
  sendAgencyInquiryAutoReply,
  type AgencyInquiryRecord,
} from '@/lib/email'
import { getPostHogClient } from '@/lib/posthog-server'

export const runtime = 'nodejs'

const CLIENT_COUNTS = ['1-2', '3-5', '6-15', '16+'] as const
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const
const TIMELINES = ['This week', 'This month', 'Next quarter', 'Just exploring'] as const
const SOURCES = ['LinkedIn', 'Google', 'Referral', 'Press', 'Other'] as const
const ROLES = ['Founder', 'Operations', 'Client Lead', 'Other'] as const
const TOOL_OPTIONS = ['Taplio', 'Hootsuite', 'Buffer', 'Manual', 'Other'] as const

type Body = {
  agency_name?: string
  owner_name?: string
  owner_role?: string
  email?: string
  phone?: string
  website?: string
  linkedin_url?: string
  client_count?: string
  current_tools?: string[] | string
  primary_problem?: string
  preferred_currency?: string
  timeline?: string
  source?: string
  _hp_url?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /(https?:\/\/|www\.)/i

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  if (!value) return null
  return (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function s(input: unknown): string {
  return typeof input === 'string' ? input.trim() : ''
}

function validate(body: Body): { ok: true; data: Required<Pick<Body, 'agency_name' | 'owner_name' | 'email' | 'client_count'>> & Body } | { ok: false; msg: string } {
  const agency_name = s(body.agency_name)
  const owner_name = s(body.owner_name)
  const email = s(body.email).toLowerCase()
  const client_count = s(body.client_count)
  const primary_problem = s(body.primary_problem)
  const preferred_currency = s(body.preferred_currency)
  const timeline = s(body.timeline)
  const source = s(body.source)
  const owner_role = s(body.owner_role)

  if (agency_name.length < 2) return { ok: false, msg: 'Please share your agency name.' }
  if (owner_name.length < 2) return { ok: false, msg: 'Please share your name.' }
  if (!EMAIL_RE.test(email)) return { ok: false, msg: 'Please share a valid email.' }
  if (!pick(client_count, CLIENT_COUNTS)) return { ok: false, msg: 'Pick a client count.' }
  if (!pick(preferred_currency, CURRENCIES)) return { ok: false, msg: 'Pick a billing currency.' }
  if (!pick(timeline, TIMELINES)) return { ok: false, msg: 'Pick a timeline.' }
  if (!pick(source, SOURCES)) return { ok: false, msg: 'Tell us how you heard about us.' }
  if (!pick(owner_role, ROLES)) return { ok: false, msg: 'Pick your role.' }
  if (primary_problem.length < 4) return { ok: false, msg: 'Tell us the one problem you want to solve.' }
  if (primary_problem.length > 200) return { ok: false, msg: 'Keep the problem under 200 characters.' }
  // Anti-spam: drop submissions whose problem field contains URLs.
  if (URL_RE.test(primary_problem)) return { ok: false, msg: 'Links are not allowed in the problem field.' }

  // current_tools may arrive as string[] (JSON) or repeated form fields handled by FormData getAll.
  let current_tools: string[] = []
  if (Array.isArray(body.current_tools)) {
    current_tools = body.current_tools.map(s).filter(Boolean)
  } else if (typeof body.current_tools === 'string' && body.current_tools.length) {
    current_tools = [s(body.current_tools)]
  }
  current_tools = current_tools.filter(t => (TOOL_OPTIONS as readonly string[]).includes(t) || t.length < 60)

  return {
    ok: true,
    data: {
      agency_name,
      owner_name,
      owner_role,
      email,
      phone: s(body.phone) || undefined,
      website: s(body.website) || undefined,
      linkedin_url: s(body.linkedin_url) || undefined,
      client_count,
      current_tools,
      primary_problem,
      preferred_currency,
      timeline,
      source,
    },
  }
}

function isFormPost(req: NextRequest): boolean {
  const ct = req.headers.get('content-type') ?? ''
  return ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')
}

export async function POST(req: NextRequest) {
  const wantsForm = isFormPost(req)

  let body: Body
  try {
    if (wantsForm) {
      const form = await req.formData()
      body = {
        agency_name: form.get('agency_name')?.toString(),
        owner_name: form.get('owner_name')?.toString(),
        owner_role: form.get('owner_role')?.toString(),
        email: form.get('email')?.toString(),
        phone: form.get('phone')?.toString(),
        website: form.get('website')?.toString(),
        linkedin_url: form.get('linkedin_url')?.toString(),
        client_count: form.get('client_count')?.toString(),
        current_tools: form.getAll('current_tools').map(v => v.toString()),
        primary_problem: form.get('primary_problem')?.toString(),
        preferred_currency: form.get('preferred_currency')?.toString(),
        timeline: form.get('timeline')?.toString(),
        source: form.get('source')?.toString(),
        _hp_url: form.get('_hp_url')?.toString(),
      }
    } else {
      body = (await req.json()) as Body
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Honeypot — silently accept and drop.
  if (body._hp_url && body._hp_url.trim().length > 0) {
    return wantsForm
      ? NextResponse.redirect(new URL('/agency-inquiry/thank-you', req.url), { status: 303 })
      : NextResponse.json({ ok: true })
  }

  // Rate limit per IP.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const { allowed } = await checkIpRateLimit(ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again in a minute.' }, { status: 429 })
  }

  // Validate.
  const v = validate(body)
  if (!v.ok) return NextResponse.json({ error: v.msg }, { status: 400 })
  const d = v.data
  const ua = req.headers.get('user-agent') ?? null

  // Insert.
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('agency_inquiries')
    .insert({
      agency_name: d.agency_name,
      owner_name: d.owner_name,
      owner_role: d.owner_role,
      email: d.email,
      phone: d.phone ?? null,
      website: d.website ?? null,
      linkedin_url: d.linkedin_url ?? null,
      client_count: d.client_count,
      current_tools: d.current_tools ?? null,
      primary_problem: d.primary_problem ?? null,
      preferred_currency: d.preferred_currency ?? null,
      timeline: d.timeline ?? null,
      source: d.source ?? null,
      ip,
      user_agent: ua,
    })
    .select('*')
    .single()

  if (insertError || !inserted) {
    console.error('[agency-inquiry] insert failed', insertError)
    return NextResponse.json(
      { error: 'Could not save your inquiry. Please email hello@personalink.in directly.' },
      { status: 500 }
    )
  }

  const record = inserted as AgencyInquiryRecord
  const firstName = d.owner_name.split(' ')[0] || d.owner_name

  // Fire emails in parallel — best effort. Even if email fails, the row is saved.
  const emailResults = await Promise.allSettled([
    sendAgencyInquiryAdminAlert(record),
    sendAgencyInquiryAutoReply({
      to: d.email,
      firstName,
      agencyName: d.agency_name,
      clientCount: d.client_count,
    }),
  ])
  emailResults.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[agency-inquiry] email ${i === 0 ? 'admin' : 'auto-reply'} failed`, r.reason)
    }
  })

  // Fire-and-forget PostHog server event.
  try {
    const ph = getPostHogClient()
    ph.capture({
      distinctId: `agency:${record.id}`,
      event: 'agency_inquiry_received',
      properties: {
        client_count: d.client_count,
        currency: d.preferred_currency,
        timeline: d.timeline,
        source: d.source,
        tools_count: d.current_tools?.length ?? 0,
      },
    })
  } catch (e) {
    console.error('[agency-inquiry] posthog capture failed', e)
  }

  if (wantsForm) {
    const url = new URL('/agency-inquiry/thank-you', req.url)
    url.searchParams.set('name', firstName)
    url.searchParams.set('agency', d.agency_name)
    return NextResponse.redirect(url, { status: 303 })
  }

  return NextResponse.json({
    ok: true,
    redirect: `/agency-inquiry/thank-you?name=${encodeURIComponent(firstName)}&agency=${encodeURIComponent(d.agency_name)}`,
  })
}
```

- [ ] **Step 3.2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "agency-inquiry" || echo "no agency-inquiry errors"
```
Expected: `no agency-inquiry errors`.

---

## Task 4: Build the InquiryForm component

**Files:**
- Create: `components/agency/InquiryForm.tsx`

This is the largest component. We build it in passes: scaffold + state, then each of the 5 blocks, then submit handler.

- [ ] **Step 4.1: Create the file with imports, types, and constants**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
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
    posthog?: {
      capture: (event: string, props?: Record<string, unknown>) => void
    }
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

  // Multi-select tools state (controlled).
  const [tools, setTools] = useState<string[]>([])
  const [otherTool, setOtherTool] = useState('')

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
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state === 'submitting') return
    setState('submitting')
    setErrMsg(null)

    const form = e.currentTarget
    const fd = new FormData(form)

    const payload: Record<string, unknown> = {
      agency_name: fd.get('agency_name'),
      owner_name: fd.get('owner_name'),
      owner_role: fd.get('owner_role'),
      email: fd.get('email'),
      phone: [fd.get('phone_cc'), fd.get('phone')].filter(Boolean).join(' '),
      website: fd.get('website'),
      linkedin_url: fd.get('linkedin_url'),
      client_count: fd.get('client_count'),
      current_tools: tools.includes('Other') && otherTool ? [...tools.filter(t => t !== 'Other'), otherTool] : tools,
      primary_problem: fd.get('primary_problem'),
      preferred_currency: fd.get('preferred_currency'),
      timeline: fd.get('timeline'),
      source: fd.get('source'),
      _hp_url: fd.get('_hp_url'),
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

  // [STEP 4.2 inserts the return JSX here]
  return null
}
```

- [ ] **Step 4.2: Add the return JSX with form scaffold and Block 1 (About you)**

Replace `return null` with:

```tsx
  return (
    <form
      onSubmit={handleSubmit}
      onFocusCapture={onAnyFocus}
      action="/api/agency-inquiry/submit"
      method="POST"
      style={formStyle}
      noValidate
    >
      {/* Honeypot — invisible to humans, catches naïve bots. */}
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
      <SelectField
        name="owner_role"
        label="Your role at the agency"
        options={ROLES}
        required
        onBlurTrack={onFieldBlur}
      />

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
        required
        onBlurTrack={onFieldBlur}
      />
      <div>
        <FieldLabel required>Current tools you use</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TOOL_OPTIONS.map(tool => (
            <button
              key={tool}
              type="button"
              onClick={() => {
                toggleTool(tool)
                onFieldBlur('current_tools', true)
              }}
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
          <input key={t} type="hidden" name="current_tools" value={t === 'Other' && otherTool ? otherTool : t} />
        ))}
      </div>

      {/* Block 4 — Your situation */}
      <BlockHeading>Your situation</BlockHeading>
      <ProblemField onBlurTrack={onFieldBlur} />
      <ChipGroup
        name="preferred_currency"
        label="Preferred billing currency"
        options={CURRENCIES}
        required
        onBlurTrack={onFieldBlur}
      />
      <ChipGroup
        name="timeline"
        label="When do you want to start?"
        options={TIMELINES}
        required
        onBlurTrack={onFieldBlur}
      />

      {/* Block 5 — Last thing */}
      <BlockHeading>Last thing</BlockHeading>
      <SelectField
        name="source"
        label="How did you hear about us?"
        options={SOURCES}
        required
        onBlurTrack={onFieldBlur}
      />

      {errMsg && (
        <div role="alert" style={errorStyle}>
          {errMsg}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <button type="submit" disabled={state === 'submitting'} style={submitBtnStyle(state === 'submitting')}>
          {state === 'submitting' ? 'Sending…' : 'Send inquiry — reply within 24 hours'}
        </button>
        <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>No drip emails. No newsletter. One human reply.</span>
      </div>
    </form>
  )
}
```

- [ ] **Step 4.3: Add styles + subcomponents at the bottom of the file**

Append after the closing `}` of `InquiryForm`:

```tsx
/* ─────────────────────────────────────────────
 * Styles
 * ───────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
 * Subcomponents
 * ───────────────────────────────────────────── */

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
  required,
  onBlurTrack,
}: {
  name: string
  label: string
  options: readonly string[]
  required?: boolean
  onBlurTrack: (n: string, hasValue: boolean) => void
}) {
  const [value, setValue] = useState<string>('')
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              setValue(opt)
              onBlurTrack(name, true)
            }}
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
```

- [ ] **Step 4.4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "InquiryForm|agency" || echo "no errors"
```
Expected: `no errors`.

---

## Task 5: Landing-page PostHog tracker

**Files:**
- Create: `app/for-agencies/_components/LandingPostHogTracker.tsx`

- [ ] **Step 5.1: Create the file**

```tsx
'use client'

import { useEffect } from 'react'

export function LandingPostHogTracker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.posthog?.capture) return
    const params = new URLSearchParams(window.location.search)
    const utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
    const props: Record<string, string> = { referrer: document.referrer }
    utm.forEach(k => {
      const v = params.get(k)
      if (v) props[k] = v
    })
    window.posthog.capture('agency_landing_viewed', props)
  }, [])
  return null
}

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  }
}
```

---

## Task 6: Thank-you page + Cal embed + tracker

**Files:**
- Create: `app/agency-inquiry/thank-you/page.tsx`
- Create: `app/agency-inquiry/thank-you/_components/CalEmbed.tsx`
- Create: `app/agency-inquiry/thank-you/_components/ThankYouTracker.tsx`

- [ ] **Step 6.1: Create ThankYouTracker**

```tsx
// app/agency-inquiry/thank-you/_components/ThankYouTracker.tsx
'use client'

import { useEffect } from 'react'

export function ThankYouTracker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.posthog?.capture) return
    window.posthog.capture('agency_thank_you_viewed')
  }, [])
  return null
}

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  }
}
```

- [ ] **Step 6.2: Create CalEmbed**

```tsx
// app/agency-inquiry/thank-you/_components/CalEmbed.tsx
'use client'

export function CalEmbed({ url }: { url: string }) {
  // Cal.com supports query-string embeds via iframe — no SDK install needed.
  const src = url.includes('?') ? `${url}&embed=true&theme=light` : `${url}?embed=true&theme=light`
  return (
    <div
      style={{
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        border: '1px solid var(--line)',
        background: 'var(--surface)',
        marginTop: 24,
      }}
      onClick={() => {
        if (typeof window !== 'undefined' && window.posthog?.capture) {
          window.posthog.capture('agency_calendar_clicked')
        }
      }}
    >
      <iframe
        title="Book a slot"
        src={src}
        style={{ width: '100%', height: 720, border: 0, display: 'block' }}
        loading="lazy"
      />
    </div>
  )
}

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  }
}
```

- [ ] **Step 6.3: Create the thank-you page**

```tsx
// app/agency-inquiry/thank-you/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { WordMark } from '@/components/word-mark'
import { CalEmbed } from './_components/CalEmbed'
import { ThankYouTracker } from './_components/ThankYouTracker'

export const metadata: Metadata = {
  title: 'Got your inquiry — PersonaLink',
  robots: { index: false, follow: false },
}

export default async function AgencyInquiryThankYou({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; agency?: string }>
}) {
  const { name, agency } = await searchParams
  const firstName = (name ?? '').trim().slice(0, 40)
  const agencyName = (agency ?? '').trim().slice(0, 80)
  const calUrl = process.env.NEXT_PUBLIC_CAL_COM_URL

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <ThankYouTracker />

      <nav
        style={{
          borderBottom: '1px solid var(--line)',
          padding: '0 var(--pad)',
          height: 64,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Link href="/" aria-label="PersonaLink home">
          <WordMark icon wordmark iconSize={30} />
        </Link>
      </nav>

      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Animated check */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--pl-accent)',
              color: 'var(--bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ width: 32, height: 32 }}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
              color: 'var(--ink)',
              margin: '0 0 14px',
            }}
          >
            Got it{firstName ? `, ${firstName}` : ''}.
          </h1>

          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: 'var(--ink-3)',
              lineHeight: 1.6,
              margin: '0 0 8px',
              maxWidth: 520,
            }}
          >
            I will reply within 24 hours with a Loom demo tailored to {agencyName ? agencyName : 'your setup'}.
          </p>
          <p
            style={{
              fontSize: 14,
              color: 'var(--ink-4)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            If anything comes up in the meantime, write to{' '}
            <a href="mailto:hello@personalink.in" style={{ color: 'var(--pl-accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
              hello@personalink.in
            </a>
            .
          </p>

          {calUrl ? (
            <>
              <h2
                style={{
                  fontSize: 16,
                  fontFamily: 'var(--f-mono)',
                  fontWeight: 500,
                  color: 'var(--ink-3)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  margin: '40px 0 8px',
                }}
              >
                Or pick a slot now
              </h2>
              <CalEmbed url={calUrl} />
            </>
          ) : null}

          <p style={{ marginTop: 40, fontSize: 14, color: 'var(--ink-3)' }}>— Hamza, PersonaLink</p>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 6.4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "thank-you|CalEmbed" || echo "no errors"
```
Expected: `no errors`.

---

## Task 7: Landing-page sub-components

**Files:**
- Create: `app/for-agencies/_components/ComparisonTable.tsx`
- Create: `app/for-agencies/_components/FAQ.tsx`
- Create: `app/for-agencies/_components/PricingTiers.tsx`

- [ ] **Step 7.1: Create ComparisonTable**

```tsx
// app/for-agencies/_components/ComparisonTable.tsx

type Row = { feature: string; personalink: string; taplio: string; hiring: string }

const ROWS: Row[] = [
  {
    feature: 'Per-client voice isolation',
    personalink: 'Yes — 6-dim fingerprint per client',
    taplio: 'No — shared workspace voice',
    hiring: 'Yes — but variable by writer',
  },
  {
    feature: 'White-label dashboard + invoices',
    personalink: 'Yes — your brand, your colours',
    taplio: 'No',
    hiring: 'N/A',
  },
  {
    feature: 'INR billing with GST',
    personalink: 'Yes — INR invoices, GST line items',
    taplio: 'USD only',
    hiring: 'Yes',
  },
  {
    feature: 'Bulk operations across clients',
    personalink: 'Yes — one queue, every client',
    taplio: 'Limited — switch accounts',
    hiring: 'No — one writer per client',
  },
  {
    feature: 'Support',
    personalink: 'Direct line to founder, <24h reply',
    taplio: 'Email support, days',
    hiring: 'You manage the people',
  },
  {
    feature: 'Pricing for 8 clients',
    personalink: 'Custom (typical: ₹15K–₹30K/month)',
    taplio: '~$249/month + per-seat',
    hiring: '₹1L+/month per writer',
  },
]

export function ComparisonTable() {
  return (
    <div style={{ overflowX: 'auto', marginTop: 28 }}>
      <table
        style={{
          width: '100%',
          minWidth: 640,
          borderCollapse: 'collapse',
          fontSize: 14,
          color: 'var(--ink-2)',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            <th style={thStyle}></th>
            <th style={{ ...thStyle, color: 'var(--ink)', fontWeight: 600 }}>PersonaLink Agency</th>
            <th style={thStyle}>Taplio team plan</th>
            <th style={thStyle}>Hiring writers</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(r => (
            <tr key={r.feature} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--ink)' }}>{r.feature}</td>
              <td style={{ ...tdStyle, background: 'color-mix(in srgb, var(--pl-accent) 6%, transparent)' }}>{r.personalink}</td>
              <td style={tdStyle}>{r.taplio}</td>
              <td style={tdStyle}>{r.hiring}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 12 }}>
        Pricing comparisons reflect public list prices as of 2026. Hiring cost is a mid-market full-time writer in India.
      </p>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 12,
  fontFamily: 'var(--f-mono)',
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--ink-4)',
}

const tdStyle: React.CSSProperties = {
  padding: '14px',
  fontSize: 13.5,
  color: 'var(--ink-2)',
  verticalAlign: 'top',
  lineHeight: 1.5,
}
```

- [ ] **Step 7.2: Create FAQ**

```tsx
// app/for-agencies/_components/FAQ.tsx

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Why no public pricing?',
    a: 'Every agency setup is different. We size the deal to your client count, white-label needs, and support level. You will not pay for things you do not use.',
  },
  {
    q: 'Can clients tell we are using PersonaLink?',
    a: 'No. Full white-label. Your brand on the dashboard, your brand on invoices.',
  },
  {
    q: 'Do you accept international agencies?',
    a: 'Yes. We invoice in USD, EUR, or GBP and accept international cards.',
  },
  {
    q: 'GST invoices?',
    a: 'Yes. GST line items where applicable, ITC-claimable.',
  },
  {
    q: 'Minimum commitment?',
    a: 'Quarterly billing. You can cancel any time before the next quarter.',
  },
  {
    q: 'How fast can we onboard?',
    a: 'First three clients live in 48 hours. We handle the imports.',
  },
  {
    q: 'Can you migrate us from Taplio?',
    a: 'Yes. We map your existing client accounts in one session and rebuild voice profiles from their post history. Most migrations take 2–3 days.',
  },
  {
    q: 'What if a client leaves us?',
    a: 'Full data export, no lock-in. Their posts, drafts, and history are yours.',
  },
  {
    q: 'Do you train our team?',
    a: 'Yes. Included for Tier 2 and above. One live session plus a recorded walkthrough.',
  },
  {
    q: 'What is the typical agency MRR?',
    a: 'Most agencies pay between ₹15K and ₹50K per month, depending on client count and white-label requirements.',
  },
]

export function FAQ() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {FAQS.map((f, i) => (
        <details
          key={i}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            padding: '14px 18px',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ink)',
              listStyle: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            {f.q}
            <span style={{ color: 'var(--ink-4)', fontSize: 18, lineHeight: 1 }} aria-hidden>+</span>
          </summary>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, margin: '10px 0 0' }}>
            {f.a}
          </p>
        </details>
      ))}
    </div>
  )
}
```

- [ ] **Step 7.3: Create PricingTiers**

```tsx
// app/for-agencies/_components/PricingTiers.tsx

const TIERS = [
  { label: 'Tier 1', range: '3 to 5 clients', note: 'Solo studios and growing teams' },
  { label: 'Tier 2', range: '6 to 15 clients', note: 'Mid-size agencies with named seats' },
  { label: 'Tier 3', range: '16+ clients', note: 'White-label, dedicated support, custom SLAs' },
]

export function PricingTiers() {
  return (
    <div>
      <p
        style={{
          fontSize: 'clamp(18px, 2.4vw, 22px)',
          fontWeight: 500,
          color: 'var(--ink)',
          margin: '0 0 24px',
          maxWidth: 560,
          lineHeight: 1.5,
        }}
      >
        We don&apos;t sell a tier. We sell a deal.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {TIERS.map(t => (
          <div
            key={t.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-lg)',
              padding: '22px 20px',
            }}
          >
            <div
              style={{
                fontSize: 11.5,
                fontFamily: 'var(--f-mono)',
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 6,
              }}
            >
              {t.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
              {t.range}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>{t.note}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
        Final pricing depends on your white-label requirements, support level, and onboarding needs.
        Most agencies pay between ₹15K and ₹50K per month.
      </p>
    </div>
  )
}
```

- [ ] **Step 7.4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "for-agencies/_components" || echo "no errors"
```
Expected: `no errors`.

---

## Task 8: Rewrite /for-agencies page

**Files:**
- Rewrite: `app/for-agencies/page.tsx`

- [ ] **Step 8.1: Replace the file entirely**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { WordMark } from '@/components/word-mark'
import { InquiryForm } from '@/components/agency/InquiryForm'
import { ComparisonTable } from './_components/ComparisonTable'
import { FAQ } from './_components/FAQ'
import { PricingTiers } from './_components/PricingTiers'
import { LandingPostHogTracker } from './_components/LandingPostHogTracker'

export const metadata: Metadata = {
  title: 'LinkedIn Tool for Agencies | White-Label, Bulk, INR Billing — PersonaLink',
  description:
    'Run LinkedIn content for 5, 15, or 50 client accounts. Per-client voice fingerprints, white-label dashboard, INR or international billing, GST invoices. Request a custom quote.',
  keywords: [
    'linkedin tool for agencies india',
    'white label linkedin ghostwriting tool',
    'linkedin agency software',
    'taplio agency alternative',
    'multi-client linkedin scheduler',
    'gst linkedin tool',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/for-agencies',
    siteName: 'PersonaLink',
    title: 'PersonaLink for Agencies',
    description:
      'Per-client voice fingerprints. Approvals. White-label invoices. INR billing with GST. Built for agencies that run LinkedIn for 5+ clients.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink for Agencies' }],
  },
  alternates: { canonical: 'https://personalink.in/for-agencies' },
}

const SERIF: React.CSSProperties = {
  fontFamily: 'var(--f-display)',
  fontStyle: 'italic',
  fontWeight: 400,
  color: 'var(--serif-ink)',
}

const FEATURES = [
  {
    title: 'Per-client voice fingerprints',
    body: 'Every client gets a dedicated 6-dimension voice profile. Switch between accounts in one tap. No cross-contamination, no shared workspace voice.',
  },
  {
    title: 'White-label dashboard',
    body: 'Your brand, your colours, your logo. Clients see your tool. We are invisible. Custom subdomain on request.',
  },
  {
    title: 'Bulk operations',
    body: 'One queue across every client account. Schedule, edit, and analyse without juggling browser tabs.',
  },
  {
    title: 'Cross-client analytics',
    body: 'Monthly white-label PDF reports per client. Engagement, post performance, follower delta. Send them as-is.',
  },
  {
    title: 'INR billing with GST',
    body: 'One invoice for your whole agency. INR with GST line items where applicable, or USD/EUR/GBP for international clients.',
  },
]

const AGENCY_MATH = [
  {
    pain: 'Voice slips between clients',
    fix: 'Per-client 6-dim fingerprints stay isolated. Switching clients does not bleed tone.',
  },
  {
    pain: 'Five tools, none speak to each other',
    fix: 'Drafts, schedule, analytics, voice — one dashboard. One bill.',
  },
  {
    pain: 'Clients ask for white-label reports you do not have time to build',
    fix: 'Monthly PDFs auto-generated per client, your logo on top.',
  },
]

export default function ForAgenciesPage() {
  const jsonLdSoftware = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PersonaLink Agency',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'LinkedIn content platform for agencies. Per-client voice fingerprints, white-label dashboard, GST-compliant INR billing.',
    offers: { '@type': 'Offer', priceCurrency: 'INR', price: 'Custom' },
  }
  const jsonLdService = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'LinkedIn content management for agencies',
    provider: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in' },
    areaServed: ['IN', 'Worldwide'],
    serviceType: 'White-label LinkedIn ghostwriting platform',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <LandingPostHogTracker />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdService) }} />

      {/* ─── Nav ─── */}
      <nav
        style={{
          background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={navInner}>
          <Link href="/" aria-label="PersonaLink home">
            <WordMark icon wordmark iconSize={30} />
          </Link>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <Link href="/#pricing" className="hidden md:inline" style={navLink}>Pricing</Link>
            <Link href="/voice-analyzer" className="hidden md:inline" style={navLink}>Voice analyser</Link>
            <a href="#inquiry" style={navCta}>Request quote</a>
          </div>
        </div>
      </nav>

      {/* ─── 1. Hero ─── */}
      <section style={{ padding: 'clamp(56px, 9vw, 110px) var(--pad) clamp(40px, 6vw, 64px)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <div style={badgeStyle}>// for agencies &amp; studios</div>
          <h1
            style={{
              fontSize: 'clamp(34px, 6.5vw, 68px)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1.04,
              margin: '0 0 18px',
              maxWidth: 900,
              color: 'var(--ink)',
            }}
          >
            The LinkedIn tool built for agencies. <span style={SERIF}>Not retrofitted for them.</span>
          </h1>
          <p
            style={{
              fontSize: 'clamp(16px, 2.4vw, 20px)',
              color: 'var(--ink-3)',
              lineHeight: 1.55,
              maxWidth: 720,
              margin: '0 0 28px',
            }}
          >
            Run 5, 15, or 50 client accounts. White-label everything. INR or international billing. GST invoices on day one.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="#inquiry" style={ctaPrimary}>Request a demo</a>
            <a href="#" style={ctaSecondary} aria-disabled>
              Watch 90-sec demo {/* TODO: replace with Loom URL */}
            </a>
          </div>
        </div>
      </section>

      {/* ─── 2. Agency math ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <h2 style={h2Style}>
            Stop juggling tools. <span style={SERIF}>Stop missing posts.</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginTop: 32 }}>
            {AGENCY_MATH.map((m, i) => (
              <div key={i}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>{m.pain}</p>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55, margin: 0 }}>{m.fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. Features ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <h2 style={h2Style}>What you get.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 32 }}>
            {FEATURES.map((f, i) => (
              <div key={i} style={featureCard}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: 'var(--ink)' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Comparison table ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <h2 style={h2Style}>How we stack up.</h2>
          <ComparisonTable />
        </div>
      </section>

      {/* ─── 5. Custom pricing ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <h2 style={h2Style}>
            How custom pricing <span style={SERIF}>works.</span>
          </h2>
          <div style={{ marginTop: 32 }}>
            <PricingTiers />
          </div>
        </div>
      </section>

      {/* ─── 6. Social proof placeholder ─── */}
      <section style={{ padding: 'clamp(40px, 6vw, 72px) var(--pad)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <p
            style={{
              fontSize: 13,
              fontFamily: 'var(--f-mono)',
              color: 'var(--ink-4)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            // case studies coming soon
          </p>
          {/* TODO: agency case studies + logos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  height: 80,
                  background: 'var(--surface)',
                  border: '1px dashed var(--line)',
                  borderRadius: 'var(--r-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink-4)',
                  fontSize: 12,
                }}
              >
                logo {i + 1}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. FAQ ─── */}
      <section style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <h2 style={h2Style}>Questions agencies ask.</h2>
          <div style={{ marginTop: 28 }}>
            <FAQ />
          </div>
        </div>
      </section>

      {/* ─── 8. Inquiry form ─── */}
      <section
        id="inquiry"
        style={{ padding: 'clamp(56px, 8vw, 96px) var(--pad)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={badgeStyle}>// request a quote</div>
          <h2 style={{ ...h2Style, margin: '14px 0 12px' }}>Tell us about your agency.</h2>
          <p style={{ fontSize: 'clamp(14px, 1.8vw, 16px)', color: 'var(--ink-3)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
            Thirteen short fields. One human reply within 24 hours. Pricing tailored to your client count, white-label
            needs, and support level.
          </p>
          <InquiryForm />
        </div>
      </section>

      {/* ─── 9. Final CTA ─── */}
      <section style={{ padding: 'clamp(48px, 6vw, 80px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', color: 'var(--ink-2)', margin: '0 0 18px', fontWeight: 500 }}>
            Ready when you are.
          </p>
          <a href="#inquiry" style={ctaPrimary}>Request a demo</a>
          <p style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-4)' }}>
            Question first?{' '}
            <a href="mailto:hello@personalink.in" style={{ color: 'var(--pl-accent)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
              hello@personalink.in
            </a>
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)', padding: 'clamp(28px, 4vw, 40px) var(--pad)', fontSize: 13, color: 'var(--ink-4)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>© {new Date().getFullYear()} PersonaLink · Built in India</div>
          <div style={{ display: 'flex', gap: 18 }}>
            <Link href="/" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Home</Link>
            <Link href="/#pricing" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/voice-analyzer" style={{ color: 'var(--ink-3)', textDecoration: 'none' }}>Voice analyser</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ─── Inline shared styles ─── */

const navInner: React.CSSProperties = {
  maxWidth: 'var(--max)',
  margin: '0 auto',
  padding: '0 var(--pad)',
  height: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}
const navLink: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }
const navCta: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--bg)',
  background: 'var(--ink)',
  padding: '9px 18px',
  borderRadius: 'var(--r-sm)',
  textDecoration: 'none',
}
const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 18,
  fontFamily: 'var(--f-mono)',
  fontSize: 11.5,
  fontWeight: 500,
  letterSpacing: '0.04em',
  color: 'var(--ink-3)',
  padding: '6px 12px',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-xs)',
  background: 'var(--surface)',
}
const ctaPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '14px 28px',
  background: 'var(--ink)',
  color: 'var(--bg)',
  borderRadius: 'var(--r-md)',
  fontWeight: 600,
  fontSize: 15,
  textDecoration: 'none',
}
const ctaSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '14px 28px',
  background: 'var(--surface)',
  color: 'var(--ink-2)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)',
  fontWeight: 500,
  fontSize: 15,
  textDecoration: 'none',
}
const h2Style: React.CSSProperties = {
  fontSize: 'clamp(26px, 4vw, 44px)',
  fontWeight: 700,
  letterSpacing: '-0.035em',
  lineHeight: 1.1,
  color: 'var(--ink)',
  margin: '0 0 6px',
  maxWidth: 720,
}
const featureCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-lg)',
  padding: '24px 22px',
  boxShadow: 'var(--sh-1)',
}
```

- [ ] **Step 8.2: Typecheck the full app**

```bash
npx tsc --noEmit 2>&1 | grep -E "for-agencies|agency-inquiry|InquiryForm|email\.ts" || echo "no errors in changed files"
```
Expected: `no errors in changed files`.

---

## Task 9: Update robots.txt

**Files:**
- Modify: `public/robots.txt`

- [ ] **Step 9.1: Read the current file**

Already shown in pre-flight: includes `Disallow: /dashboard/`, `/admin/`, `/api/` and the sitemap.

- [ ] **Step 9.2: Add the thank-you disallow**

Add this line after the existing `Disallow: /api/` line in `public/robots.txt`:

```
Disallow: /agency-inquiry/thank-you
```

Expected file after edit:

```
User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /admin/
Disallow: /api/
Disallow: /agency-inquiry/thank-you
Sitemap: https://personalink.in/sitemap.xml
```

---

## Task 10: Delete the old code

**Files:**
- Delete: `app/api/agency-lead/route.ts`
- Delete: `components/agency/AgencyLeadForm.tsx`

- [ ] **Step 10.1: Confirm nothing references the old files**

```bash
grep -rn "agency-lead\|AgencyLeadForm" app components lib 2>/dev/null | grep -v node_modules
```
Expected: no matches. (If there are matches, do not delete — investigate first.)

- [ ] **Step 10.2: Delete the files**

```bash
rm app/api/agency-lead/route.ts components/agency/AgencyLeadForm.tsx
rmdir app/api/agency-lead 2>/dev/null || true
```

- [ ] **Step 10.3: Verify directories are clean**

```bash
ls app/api/agency-lead 2>&1 || echo "agency-lead removed"
ls components/agency
```
Expected: `agency-lead removed` and `components/agency` shows only `InquiryForm.tsx`.

---

## Task 11: Verify build

**Files:** None. Validation only.

- [ ] **Step 11.1: Run full typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors. (If there are pre-existing errors unrelated to our changes, note them but do not fix.)

- [ ] **Step 11.2: Run lint**

```bash
npx eslint app/for-agencies app/agency-inquiry app/api/agency-inquiry components/agency lib/email.ts 2>&1 | tail -30
```
Expected: no errors (warnings about `console.log` are OK).

- [ ] **Step 11.3: Run production build**

```bash
npm run build 2>&1 | tail -40
```
Expected: build succeeds, `/for-agencies` and `/agency-inquiry/thank-you` appear in route list.

---

## Task 12: Manual verification with preview tools

**Files:** None. Verification only.

- [ ] **Step 12.1: Start dev server**

Use `preview_start`. Wait for ready.

- [ ] **Step 12.2: Navigate to /for-agencies**

```
preview_eval: window.location.href = '/for-agencies'
```
Then `preview_snapshot` — confirm hero H1 visible, all 9 section headings present, no console errors via `preview_console_logs`.

- [ ] **Step 12.3: Confirm JSON-LD blocks rendered**

```
preview_eval: document.querySelectorAll('script[type="application/ld+json"]').length
```
Expected: `2`.

- [ ] **Step 12.4: Test form submission (happy path)**

Use `preview_fill` to populate each visible field. For chip groups (client_count, currency, timeline), tools, use `preview_click`. Then `preview_click` the submit button. Confirm:
- Network shows `POST /api/agency-inquiry/submit` with `200` JSON response.
- Router navigates to `/agency-inquiry/thank-you?name=...&agency=...`.
- Thank-you page renders the first name in the H1.

- [ ] **Step 12.5: Verify the row in Supabase**

```bash
# In a separate terminal — uses your service role key from .env
node -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('agency_inquiries').select('*').order('submitted_at', { ascending: false }).limit(1).then(r => console.log(JSON.stringify(r.data, null, 2)));
"
```
Expected: the row you just submitted, all fields populated.

Note: if the user has not yet applied the migration, this step will fail with `relation "agency_inquiries" does not exist`. Apply the migration first.

- [ ] **Step 12.6: Test honeypot drop**

```
preview_eval: fetch('/api/agency-inquiry/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _hp_url: 'http://spam.example', agency_name: 'X', owner_name: 'Y', email: 'a@b.c', client_count: '3-5', owner_role: 'Founder', preferred_currency: 'INR', timeline: 'This week', source: 'Google', primary_problem: 'test' }) }).then(r => r.json())
```
Expected: `{ok: true}` AND no new row in `agency_inquiries`.

- [ ] **Step 12.7: Test the URL-spam drop**

Submit with `primary_problem: 'Hire us! https://spam.com'` — expect `400` with `Links are not allowed in the problem field.`

- [ ] **Step 12.8: Mobile breakpoint**

```
preview_resize: 375, 667
preview_snapshot
preview_screenshot
```
Confirm: form is usable, chips wrap correctly, no horizontal scrolling, comparison table scrolls horizontally inside its container.

- [ ] **Step 12.9: Verify thank-you noindex**

```
preview_eval: document.querySelector('meta[name="robots"]').getAttribute('content')
```
Expected: contains `noindex`.

- [ ] **Step 12.10: Verify thank-you Cal embed is hidden when env var unset**

If `NEXT_PUBLIC_CAL_COM_URL` is not in `.env.local`, the iframe should not render. Check `document.querySelector('iframe')` returns `null`.

- [ ] **Step 12.11: Verify PostHog events fired**

Open the PostHog Activity tab (if running locally, the events go to PostHog Cloud assuming `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is set). Confirm events: `agency_landing_viewed`, `agency_form_started`, `agency_form_field_completed`, `agency_form_submitted`, `agency_thank_you_viewed`, and server event `agency_inquiry_received`.

- [ ] **Step 12.12: Stop the dev server**

`preview_stop`.

---

## Task 13: Commit

**Files:** Only the agency-funnel files. Be careful not to stage the user's other uncommitted work.

- [ ] **Step 13.1: Stage only our files**

```bash
git add \
  supabase/migrations/20260528c_agency_inquiries.sql \
  lib/email.ts \
  app/api/agency-inquiry/submit/route.ts \
  components/agency/InquiryForm.tsx \
  app/agency-inquiry/thank-you/page.tsx \
  app/agency-inquiry/thank-you/_components/CalEmbed.tsx \
  app/agency-inquiry/thank-you/_components/ThankYouTracker.tsx \
  app/for-agencies/page.tsx \
  app/for-agencies/_components/ComparisonTable.tsx \
  app/for-agencies/_components/FAQ.tsx \
  app/for-agencies/_components/PricingTiers.tsx \
  app/for-agencies/_components/LandingPostHogTracker.tsx \
  public/robots.txt \
  docs/superpowers/specs/2026-05-28-agency-inquiry-funnel-design.md \
  docs/superpowers/plans/2026-05-28-agency-inquiry-funnel.md

git add -u app/api/agency-lead components/agency/AgencyLeadForm.tsx
```

- [ ] **Step 13.2: Verify staged state**

```bash
git status --short | head -40
```
Expected: ~15 files staged (`A` or `M` or `D`), nothing else from the working tree.

- [ ] **Step 13.3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat: agency inquiry funnel at /for-agencies

Adds a 9-section landing page with a 13-field inquiry form that writes
to a new agency_inquiries table, sends an admin alert and brand-voice
auto-reply via Resend, and lands on a thank-you page with an optional
Cal.com embed.

- Migration: agency_inquiries (with status enum, IP/UA columns, RLS on)
- Route: /api/agency-inquiry/submit (Node runtime, no-JS fallback)
- Form: InquiryForm with chip-style radios, multi-select tools, 200-char
  problem field, honeypot, PostHog field-completion events
- Emails: sendAgencyInquiryAdminAlert + sendAgencyInquiryAutoReply
- Thank-you: /agency-inquiry/thank-you with env-gated Cal.com iframe
- SEO: JSON-LD for SoftwareApplication + Service, noindex thank-you
- Replaces /api/agency-lead and AgencyLeadForm (both uncommitted)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 13.4: Verify the commit**

```bash
git log -1 --stat
```
Expected: 1 commit, ~15 files changed, ~1500 insertions, ~150 deletions.

---

## Task 14: Generate outreach copy deliverables

**Files:** None. Deliverables shared in chat with the user.

- [ ] **Step 14.1: Write the LinkedIn post for warm leads**

Brand-voice rules: faceless, plain English, no emojis, no padding, no "supercharge/unlock/10x". Indian-English register. Two short paragraphs max.

- [ ] **Step 14.2: Write the cold outreach email**

Subject line under 70 chars. Body under 150 words. No "I hope this finds you well." No "circle back." One ask, one link, sign-off.

- [ ] **Step 14.3: Write the LinkedIn DM template**

Under 60 words. Personalisable. One link to `/for-agencies`. No "Hey!" — start with "Hi {first_name},".

- [ ] **Step 14.4: Hand all three deliverables to the user in the chat**

---

## Self-review

This plan was checked against the spec at write time. Specific verifications:

- **Spec coverage** — every file in the spec's `File deliverables` list has a corresponding Task. All 9 landing sections accounted for in Task 8. All 13 form fields present in Task 4. Both emails covered in Task 2. Cal embed (env-gated) covered in Task 6. PostHog events: client events in Tasks 4, 5, 6; server event in Task 3. SEO (JSON-LD, noindex, robots.txt) covered in Tasks 8 + 6 + 9.

- **No placeholders** — three legitimate TODOs in the page itself (Loom URL, case studies, OG image) are marked with explicit `{/* TODO */}` comments and surfaced in the design's "Open questions" section as deferred. Every step in the plan has complete code.

- **Type consistency** — `AgencyInquiryRecord` type is defined in Task 2 and imported in Task 3. `getPostHogClient()` exists at `lib/posthog-server.ts:5`. `checkIpRateLimit` exists at `lib/rate-limiter.ts:88`. `supabaseAdmin` exists at `lib/supabase-admin.ts`. Form field names match between Task 4 (form) and Task 3 (validator).

- **Pre-conditions** — the user must apply the migration (`npx supabase db push` or via dashboard) before Task 12.5 will pass.

- **Deletions safe** — Task 10 includes a grep check before deletion to ensure no remaining references.

End of plan.
