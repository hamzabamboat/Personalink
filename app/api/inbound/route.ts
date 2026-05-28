import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendSupportReply, sendEscalationEmail } from '@/lib/email'
import { readFileSync } from 'fs'
import { join } from 'path'

const CONFIDENCE_THRESHOLD = 0.85
const anthropic = new Anthropic()

let _playbook: string | null = null
function getPlaybook(): string {
  if (!_playbook) {
    _playbook = readFileSync(join(process.cwd(), 'docs', 'support-playbook.md'), 'utf-8')
  }
  return _playbook
}

type AiResult = {
  intent: string
  confidence: number
  reply_draft: string
  escalation_reason: string | null
}

type InboundPayload = {
  from: string
  to: string
  subject: string
  text: string
  messageId: string
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-inbound-secret') !== process.env.INBOUND_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { from, subject, text } = (await req.json()) as InboundPayload

  // Look up sender — join users + user_profiles
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('id, linkedin_name, created_at, user_profiles(plan, posts_used_this_month, posts_limit)')
    .eq('email', from)
    .maybeSingle()

  const profiles = userData?.user_profiles as unknown as
    Array<{ plan: string; posts_used_this_month: number; posts_limit: number }> | undefined
  const profile = profiles?.[0] ?? null

  const userContext = userData
    ? `Registered user: YES
Name: ${userData.linkedin_name ?? '(not set)'}
Plan: ${profile?.plan ?? 'unknown'}
Posts this month: ${profile?.posts_used_this_month ?? '?'} / ${profile?.posts_limit ?? '?'}
Member since: ${new Date(userData.created_at).toLocaleDateString('en-IN')}`
    : `Registered user: NO (${from} has no account)`

  // Call Claude with cached playbook
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: getPlaybook(),
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: 'Respond ONLY with valid JSON: { "intent": string, "confidence": number, "reply_draft": string, "escalation_reason": string | null }. confidence is 0.0–1.0. reply_draft is a complete friendly reply ready to send. For always-escalate categories set confidence to 0.',
      },
    ],
    messages: [
      {
        role: 'user',
        content: `${userContext}\n\nSubject: ${subject}\n\n${text.slice(0, 6000)}`,
      },
    ],
  })

  let aiResult: AiResult
  try {
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    // Claude sometimes wraps JSON in markdown fences despite instructions — strip them
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    aiResult = JSON.parse(cleaned)
  } catch {
    aiResult = {
      intent: 'parse_error',
      confidence: 0,
      reply_draft: '',
      escalation_reason: 'Claude returned unparseable response',
    }
  }

  const { intent, confidence, reply_draft, escalation_reason } = aiResult
  const action: 'auto_sent' | 'escalated' = confidence >= CONFIDENCE_THRESHOLD ? 'auto_sent' : 'escalated'

  if (action === 'auto_sent') {
    await sendSupportReply({ to: from, subject, body: reply_draft })
  } else {
    await sendEscalationEmail({
      originalFrom: from,
      subject,
      originalBody: text.slice(0, 4000),
      aiDraft: reply_draft,
      userContext,
      escalationReason: escalation_reason,
      confidence,
    })
  }

  await supabaseAdmin.from('support_tickets').insert({
    sender_email: from,
    subject,
    body_text: text.slice(0, 10000),
    intent,
    confidence,
    ai_reply: reply_draft,
    action,
    user_plan: profile?.plan ?? null,
    user_id: userData?.id ?? null,
  })

  return NextResponse.json({ ok: true })
}
