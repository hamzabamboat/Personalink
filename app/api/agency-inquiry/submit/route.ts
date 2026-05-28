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

type ValidOk = {
  ok: true
  data: {
    agency_name: string
    owner_name: string
    owner_role: string
    email: string
    phone?: string
    website?: string
    linkedin_url?: string
    client_count: string
    current_tools: string[]
    primary_problem: string
    preferred_currency: string
    timeline: string
    source: string
  }
}
type ValidFail = { ok: false; msg: string }

function validate(body: Body): ValidOk | ValidFail {
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
  if (URL_RE.test(primary_problem)) return { ok: false, msg: 'Links are not allowed in the problem field.' }

  let current_tools: string[] = []
  if (Array.isArray(body.current_tools)) {
    current_tools = body.current_tools.map(s).filter(Boolean)
  } else if (typeof body.current_tools === 'string' && body.current_tools.length) {
    current_tools = [s(body.current_tools)]
  }
  current_tools = current_tools.filter(
    t => (TOOL_OPTIONS as readonly string[]).includes(t) || t.length < 60
  )

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

  if (body._hp_url && body._hp_url.trim().length > 0) {
    return wantsForm
      ? NextResponse.redirect(new URL('/agency-inquiry/thank-you', req.url), { status: 303 })
      : NextResponse.json({ ok: true })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const { allowed } = await checkIpRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    )
  }

  const v = validate(body)
  if (!v.ok) return NextResponse.json({ error: v.msg }, { status: 400 })
  const d = v.data
  const ua = req.headers.get('user-agent') ?? null

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
      current_tools: d.current_tools.length ? d.current_tools : null,
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
        tools_count: d.current_tools.length,
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
