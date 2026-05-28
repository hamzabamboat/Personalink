# AI Support Email Auto-Reply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emails to `support@personalink.in` are auto-replied by Claude when confidence ≥ 0.85; everything else is forwarded to the founder's Gmail with an AI-drafted reply and user context.

**Architecture:** Cloudflare Email Worker parses inbound MIME and POSTs JSON to `/api/inbound`. The Vercel route looks up the sender in Supabase, calls Claude Sonnet 4.6 with a cached playbook + user context, then either sends the reply via Resend or escalates to the founder's Gmail. Every ticket is logged in a new `support_tickets` Supabase table.

**Tech Stack:** Cloudflare Email Workers, `postal-mime`, Anthropic SDK (prompt caching), Resend, Supabase (`users` + `user_profiles` + new `support_tickets` table), Next.js App Router API route.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260528_support_tickets.sql` | CREATE | New table for logging every inbound ticket |
| `docs/support-playbook.md` | CREATE | Claude's knowledge base — intents, handling instructions, always-escalate list |
| `lib/email.ts` | MODIFY | Add `sendSupportReply()` and `sendEscalationEmail()` |
| `app/api/inbound/route.ts` | CREATE | Core webhook: verify → lookup user → call Claude → send or escalate → log |
| `cloudflare-worker/email-handler.ts` | CREATE | CF Email Worker: parse MIME, POST to Vercel webhook |
| `cloudflare-worker/wrangler.toml` | CREATE | Cloudflare Worker config |
| `cloudflare-worker/package.json` | CREATE | `postal-mime` + `wrangler` deps for the Worker |

---

## Manual Setup — You Do These Steps

These cannot be done in code. Do them after Task 5 is complete (the Worker code is ready to deploy).

### Step A — Add personalink.in to Cloudflare

> **Note:** This changes your domain's nameservers. Cloudflare will import your existing DNS records automatically before you switch, so your Vercel deployment stays live. Budget 15–30 minutes; DNS propagation can take up to an hour.

1. Go to [cloudflare.com](https://cloudflare.com) → Log in or sign up (free plan is fine)
2. Click **Add a site** → enter `personalink.in` → choose **Free** plan
3. Cloudflare scans your current DNS. Review the imported records:
   - Confirm your Vercel `A`/`CNAME` records are present
   - Confirm your Resend `TXT`/`MX` (SPF, DKIM) records are present
   - If any are missing, add them before continuing
4. Change your domain registrar's nameservers to the two Cloudflare nameservers shown (e.g. `aria.ns.cloudflare.com`)
5. Wait for Cloudflare to show **"Active"** status (usually 5–30 min)

### Step B — Enable Email Routing

1. In Cloudflare dashboard → your site → **Email** → **Email Routing**
2. Click **Enable Email Routing** — Cloudflare adds the MX records automatically
3. Under **Routing rules** → **Catch-all** → set action to **Send to Worker** (you'll create the Worker in Step C)

### Step C — Deploy the Cloudflare Email Worker

Run these commands from the `cloudflare-worker/` directory:

```bash
cd cloudflare-worker
npm install
npx wrangler login          # opens browser, authorise once
npx wrangler secret put WEBHOOK_URL
# paste: https://personalink.in/api/inbound
npx wrangler secret put INBOUND_SECRET
# paste: the same random string you added to Vercel (Task 4, Step 3)
npx wrangler deploy
```

After deploy, go back to Cloudflare Email Routing → Catch-all → select the deployed Worker `personalink-email-inbound`.

### Step D — Add INBOUND_SECRET to Vercel

1. `vercel env add INBOUND_SECRET production` → paste the same random string
2. `vercel env add INBOUND_SECRET preview` → same string
3. Redeploy (or wait for next deploy) so the variable is live

### Step E — Verify support@personalink.in in Resend

Resend allows sending from any address on an already-verified domain. Since `personalink.in` is verified (you already send from `noreply@personalink.in`), `support@personalink.in` works without extra steps. Confirm by checking Resend dashboard → Domains → `personalink.in` shows **Verified**.

---

## Task 1: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260528_support_tickets.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260528_support_tickets.sql
CREATE TABLE IF NOT EXISTS support_tickets (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  sender_email   text        NOT NULL,
  subject        text        NOT NULL DEFAULT '',
  body_text      text        NOT NULL DEFAULT '',
  intent         text,
  confidence     float       CHECK (confidence >= 0 AND confidence <= 1),
  ai_reply       text,
  action         text        CHECK (action IN ('auto_sent', 'escalated')),
  user_plan      text,
  user_id        uuid        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at    timestamptz
);

CREATE INDEX support_tickets_sender_idx    ON support_tickets (sender_email);
CREATE INDEX support_tickets_created_idx   ON support_tickets (created_at DESC);
CREATE INDEX support_tickets_action_idx    ON support_tickets (action);
CREATE INDEX support_tickets_unresolved_idx ON support_tickets (action, resolved_at)
  WHERE resolved_at IS NULL;
```

- [ ] **Step 2: Apply migration**

Run in Supabase SQL editor or via CLI:
```bash
supabase db push
```
Or paste the SQL directly into Supabase → SQL editor → Run.

Expected: table `support_tickets` appears in Supabase Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260528_support_tickets.sql
git commit -m "feat: add support_tickets table migration"
```

---

## Task 2: Support Playbook

**Files:**
- Create: `docs/support-playbook.md`

- [ ] **Step 1: Write the playbook**

Create `docs/support-playbook.md` with this content:

```markdown
# PersonaLink Support Playbook

You are the AI support assistant for PersonaLink — a LinkedIn content automation tool for professionals in India. You handle inbound emails to support@personalink.in.

## Product overview
PersonaLink generates AI-written LinkedIn posts from a user's voice profile. Users approve posts via email or dashboard, which are then scheduled automatically.

Plans and post limits per month: Free=3, Starter=12, Standard=22, Pro=50.
Billing: INR via Razorpay, international via Dodo Payments.
Trial: 7 days free, no charge until trial ends.

## Response style
- Warm, concise, direct. Sign every reply "PersonaLink Support".
- Never guess at product details not in this playbook.
- Never share another user's data.
- When in doubt: escalate rather than invent.

---

## Intents you can auto-reply to

### cancel
User wants to cancel their subscription.
Reply: They can cancel at Dashboard → Settings → Plan → Cancel plan. Access continues until end of the current billing period. No partial refunds mid-cycle.

### plan_quota
User asking about plan limits, post count, or when quota resets.
Reply: Limits — Free: 3, Starter: 12, Standard: 22, Pro: 50 posts/month. Quota resets on the 1st of each month. Refer them to Dashboard → Settings → Plan for live usage. To increase: upgrade at Dashboard → Settings → Plan → Upgrade.

### upgrade_question
User asking how to upgrade or what plans cost.
Reply: Upgrade at Dashboard → Settings → Plan. INR pricing — Starter: ₹499/mo, Standard: ₹899/mo, Pro: ₹1,499/mo. International pricing shown at checkout. All paid plans include a 7-day free trial.

### linkedin_not_connecting
User's LinkedIn won't connect or disconnected.
Reply: Go to Dashboard → Settings → Connections → Reconnect LinkedIn. If that fails, sign out of LinkedIn in your browser, then reconnect. LinkedIn OAuth tokens expire every 60 days — reconnecting refreshes them.

### post_not_live
Post was approved but didn't publish, or is stuck.
Reply: Check the post status at Dashboard → Posts. Common causes: (1) approval email not yet clicked — approval is required before scheduling; (2) LinkedIn session expired — reconnect at Dashboard → Settings → Connections; (3) scheduled time was in the past — reschedule from the dashboard.

### trial_question
User asking when their trial ends, whether they'll be charged, how to cancel before charge.
Reply: Trial is 7 days from signup. The trial end date was in the welcome email. No charge if cancelled before the trial ends. Cancel at Dashboard → Settings → Plan → Cancel plan. After cancelling, access continues until the trial end date.

### billing_receipt
User wants an invoice or receipt.
Reply: Receipts are emailed automatically to the signup address at each billing cycle. For INR payments (Razorpay) or international (Dodo Payments), check your spam folder if not received. Billing history is also visible at Dashboard → Settings → Plan → Billing history.

### password_reset
User is locked out or forgot their password.
Reply: Use the "Forgot password?" link on the login page — a magic link will be sent to your email. Check spam if it doesn't arrive within 5 minutes.

---

## Always escalate — set confidence to 0.0

For any of the following, set confidence to 0 regardless of how clear the message is. Do not attempt to auto-reply.

- **partnerships** — co-marketing, integration requests, API access for third parties
- **sponsorships** — requests to sponsor content, events, newsletters, or social accounts  
- **agency** — white-labelling, reselling PersonaLink, managing multiple client accounts, agency pricing
- **feature_request** — any request for a new feature or product change (founder reads every one)
- **refund_post_trial** — refund requested after the trial period ended and a charge was made
- **email_change** — user wants to change their account email address
- **abuse** — threatening, abusive, or harassing language
- **off_topic** — unrelated to PersonaLink (spam, wrong address, etc.)
```

- [ ] **Step 2: Commit**

```bash
git add docs/support-playbook.md
git commit -m "feat: add support playbook for AI email handler"
```

---

## Task 3: Email Helper Functions

**Files:**
- Modify: `lib/email.ts` (append two new exports)

- [ ] **Step 1: Add `sendSupportReply` and `sendEscalationEmail` to lib/email.ts**

Append to the end of `lib/email.ts`:

```typescript
export async function sendSupportReply({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}) {
  const reSubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`
  return resend().emails.send({
    from: 'PersonaLink Support <support@personalink.in>',
    to,
    subject: reSubject,
    text: body,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.7;font-size:15px;">${body.split('\n').map(l => `<p style="margin:0 0 12px;">${l}</p>`).join('')}</div>`,
  })
}

export async function sendEscalationEmail({
  originalFrom,
  subject,
  originalBody,
  aiDraft,
  userContext,
  escalationReason,
  confidence,
}: {
  originalFrom: string
  subject: string
  originalBody: string
  aiDraft: string
  userContext: string
  escalationReason: string | null
  confidence: number
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'hamzabamboat@gmail.com'
  const confidencePct = Math.round(confidence * 100)

  return resend().emails.send({
    from: 'PersonaLink Support <support@personalink.in>',
    to: adminEmail,
    replyTo: originalFrom,
    subject: `[SUPPORT] ${subject}`,
    html: `
<div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;font-size:14px;line-height:1.6;">

  <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin-bottom:20px;color:#92400e;">
    <strong>AI confidence: ${confidencePct}%</strong>${escalationReason ? ` — ${escalationReason}` : ''}
    <br><span style="font-size:12px;">Hit Reply to respond directly to ${originalFrom}</span>
  </div>

  <div style="background:#f1f5f9;border-radius:8px;padding:14px 16px;margin-bottom:20px;font-family:monospace;font-size:13px;white-space:pre-wrap;">${userContext}</div>

  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Original email</p>
  <div style="border-left:3px solid #e2e8f0;padding:12px 16px;margin-bottom:20px;color:#374151;white-space:pre-wrap;">${originalBody}</div>

  ${aiDraft ? `
  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">AI draft (edit before sending)</p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;white-space:pre-wrap;color:#166534;">${aiDraft}</div>
  ` : ''}

</div>`,
    text: `AI confidence: ${confidencePct}%${escalationReason ? ` — ${escalationReason}` : ''}\nReply to this email to respond directly to ${originalFrom}.\n\n--- USER CONTEXT ---\n${userContext}\n\n--- ORIGINAL EMAIL ---\n${originalBody}${aiDraft ? `\n\n--- AI DRAFT (edit before sending) ---\n${aiDraft}` : ''}`,
  })
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors from `lib/email.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat: add sendSupportReply and sendEscalationEmail helpers"
```

---

## Task 4: Inbound API Route

**Files:**
- Create: `app/api/inbound/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/inbound/route.ts
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

  const profile = userData?.user_profiles as
    | { plan: string; posts_used_this_month: number; posts_limit: number }
    | null

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
    aiResult = JSON.parse(raw)
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
```

- [ ] **Step 2: Add INBOUND_SECRET to .env.local for local testing**

```bash
# .env.local — add this line
INBOUND_SECRET=test-secret-local-dev-only
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Test the route with curl**

Start the dev server in one terminal:
```bash
npm run dev
```

In a second terminal, send a test payload:
```bash
curl -X POST http://localhost:3000/api/inbound \
  -H "Content-Type: application/json" \
  -H "x-inbound-secret: test-secret-local-dev-only" \
  -d '{
    "from": "testuser@example.com",
    "to": "support@personalink.in",
    "subject": "How do I cancel?",
    "text": "Hi, I would like to cancel my subscription. How do I do that?",
    "messageId": "<test-001@example.com>"
  }'
```

Expected response: `{"ok":true}`

Check that:
- A row appears in `support_tickets` in Supabase (Supabase Table Editor → support_tickets)
- If confidence was ≥ 0.85: a reply arrived at `testuser@example.com` (use a real test email address)
- If < 0.85: escalation email arrived at `hamzabamboat@gmail.com`

- [ ] **Step 5: Test the 401 path**

```bash
curl -X POST http://localhost:3000/api/inbound \
  -H "Content-Type: application/json" \
  -H "x-inbound-secret: wrong-secret" \
  -d '{"from":"x@y.com","to":"support@personalink.in","subject":"test","text":"test","messageId":"1"}'
```

Expected: `{"error":"Unauthorized"}` with HTTP 401.

- [ ] **Step 6: Test the always-escalate path**

```bash
curl -X POST http://localhost:3000/api/inbound \
  -H "Content-Type: application/json" \
  -H "x-inbound-secret: test-secret-local-dev-only" \
  -d '{
    "from": "agency@bigfirm.com",
    "to": "support@personalink.in",
    "subject": "Partnership opportunity",
    "text": "Hi, we represent 50 LinkedIn creators and would like to discuss a white-label partnership.",
    "messageId": "<test-002@bigfirm.com>"
  }'
```

Expected: row in `support_tickets` with `action = 'escalated'` and `confidence = 0`, and an escalation email to `hamzabamboat@gmail.com`.

- [ ] **Step 7: Commit**

```bash
git add app/api/inbound/route.ts .env.local
git commit -m "feat: add /api/inbound route for AI email processing"
```

(Note: `.env.local` should already be in `.gitignore`. If `git add .env.local` stages it, remove it from staging: `git restore --staged .env.local`)

---

## Task 5: Cloudflare Email Worker

**Files:**
- Create: `cloudflare-worker/email-handler.ts`
- Create: `cloudflare-worker/wrangler.toml`
- Create: `cloudflare-worker/package.json`

- [ ] **Step 1: Create the worker directory and package.json**

```bash
mkdir -p cloudflare-worker
```

`cloudflare-worker/package.json`:
```json
{
  "name": "personalink-email-worker",
  "private": true,
  "scripts": {
    "deploy": "wrangler deploy",
    "dev": "wrangler dev"
  },
  "dependencies": {
    "postal-mime": "^3.0.7"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create wrangler.toml**

`cloudflare-worker/wrangler.toml`:
```toml
name = "personalink-email-inbound"
main = "email-handler.ts"
compatibility_date = "2024-09-23"

# WEBHOOK_URL and INBOUND_SECRET are set as secrets (not committed):
# wrangler secret put WEBHOOK_URL
# wrangler secret put INBOUND_SECRET
```

- [ ] **Step 3: Create the Worker**

`cloudflare-worker/email-handler.ts`:
```typescript
import PostalMime from 'postal-mime'

interface Env {
  WEBHOOK_URL: string
  INBOUND_SECRET: string
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default {
  async email(message: any, env: Env): Promise<void> {
    const rawBuffer = await new Response(message.raw).arrayBuffer()
    const parser = new PostalMime()
    const parsed = await parser.parse(rawBuffer)

    const bodyText = parsed.text || (parsed.html ? stripHtml(parsed.html) : '')

    await fetch(env.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-inbound-secret': env.INBOUND_SECRET,
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: parsed.subject ?? '(no subject)',
        text: bodyText.slice(0, 8000),
        messageId: parsed.messageId ?? '',
      }),
    })
  },
}
```

- [ ] **Step 4: Install Worker dependencies**

```bash
cd cloudflare-worker && npm install
```

Expected: `node_modules/` created with `postal-mime` and `wrangler`.

- [ ] **Step 5: Commit all Worker files**

```bash
cd ..
git add cloudflare-worker/
git commit -m "feat: add Cloudflare Email Worker for inbound parsing"
```

- [ ] **Step 6: Deploy the Worker (after completing Manual Steps A–B)**

```bash
cd cloudflare-worker
npx wrangler login                   # browser opens, authorise once
npx wrangler secret put WEBHOOK_URL  # enter: https://personalink.in/api/inbound
npx wrangler secret put INBOUND_SECRET  # enter: same value added to Vercel
npx wrangler deploy
```

Expected output: `Deployed personalink-email-inbound ... https://personalink-email-inbound.<your-subdomain>.workers.dev`

- [ ] **Step 7: Wire Worker to Email Routing**

In Cloudflare dashboard:
- Email → Email Routing → Routing Rules → Catch-all
- Action: **Send to Worker** → select `personalink-email-inbound`
- Save

---

## Task 6: End-to-End Smoke Test

Do this after all manual steps (A–E) and Task 5 Step 7 are complete.

- [ ] **Step 1: Send a real email to support@personalink.in**

From any email account (your own is fine):
```
To: support@personalink.in
Subject: How do I upgrade my plan?
Body: Hi, I'm on the free plan and want to upgrade to Starter. How do I do that?
```

Wait ~30 seconds.

- [ ] **Step 2: Verify auto-reply**

Check that the sending email account received a reply from `support@personalink.in` with clear upgrade instructions. Check Supabase → support_tickets for the row with `action = 'auto_sent'`.

- [ ] **Step 3: Send a feature request**

```
To: support@personalink.in  
Subject: Feature request: bulk post scheduling
Body: It would be great if I could schedule 10 posts at once instead of one by one.
```

Wait ~30 seconds.

- [ ] **Step 4: Verify escalation**

Check that `hamzabamboat@gmail.com` received a `[SUPPORT]` email with:
- Yellow warning banner showing confidence % and reason
- User context block (should say "Registered user: NO" for your test email)
- Original email quoted
- AI draft (even at 0% confidence Claude attempts a draft)

Hitting **Reply** in Gmail should go directly to the sender.

Check Supabase → support_tickets for the row with `action = 'escalated'`.

- [ ] **Step 5: Commit final state**

```bash
git add -A
git status  # confirm nothing sensitive (.env.local) is staged
git commit -m "feat: complete AI support email auto-reply system"
```
