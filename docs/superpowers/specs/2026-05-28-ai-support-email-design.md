# AI Support Email Auto-Reply — Design Spec
_2026-05-28_

## Overview

Inbound emails to `support@personalink.in` are processed by an AI pipeline that auto-replies to common support questions and escalates everything else to the founder via Gmail. No admin UI is built — escalations land in the founder's Gmail with an AI-drafted reply ready to edit and send.

---

## Requirements

- **Inbox**: `support@personalink.in` (new address, not currently active)
- **Trust model**: auto-send when Claude confidence ≥ 0.85; escalate below
- **Knowledge sources**: maintained playbook file + live Supabase user lookup by sender email
- **Review surface**: unresolved tickets forwarded to `hamzabamboat@gmail.com` with AI draft + user context; Reply-To is original sender so Gmail reply goes directly to user
- **Always escalate (confidence forced to 0)**: partnerships, sponsorships, agency inquiries, feature requests, abuse/threatening content

---

## Architecture

```
User emails support@personalink.in
        │
        ▼
Cloudflare Email Worker
  postal-mime parses MIME
  POST → /api/inbound  [x-inbound-secret header]
        │
        ▼
Vercel function (/api/inbound/route.ts)
  1. Verify x-inbound-secret
  2. Supabase lookup: sender email → plan, posts_used, trial_status, member_since
  3. Load docs/support-playbook.md (prompt-cached via Anthropic SDK)
  4. Claude Sonnet 4.6 call:
       system = playbook + JSON response instructions
       user   = email body + sender context
       → { intent, confidence, reply_draft, escalation_reason? }
  5a. confidence ≥ 0.85 → Resend sends reply
        from: support@personalink.in
        to: original sender
  5b. confidence < 0.85 → Resend forwards to hamzabamboat@gmail.com
        subject: [SUPPORT] {original subject}
        reply-to: original sender
        body: user context + original email + AI draft
  6. INSERT → supabase: support_tickets
```

---

## Components

### Cloudflare Email Worker
- File: `cloudflare-worker/email-handler.ts` (committed to repo, deployed manually to CF)
- Uses `postal-mime` to parse raw MIME stream
- POSTs JSON `{ from, to, subject, text, messageId }` to Vercel webhook
- Secured via `INBOUND_SECRET` env var in CF Worker settings

### `/api/inbound/route.ts`
- Verifies `x-inbound-secret` → 401 if mismatch
- Calls `supabase-admin` to look up user by email (nullable — sender may not be a user)
- Reads playbook from disk and passes as Claude system prompt with `cache_control: ephemeral`
- Returns 200 immediately after queuing (no streaming needed — CF Worker doesn't wait)
- Full processing is synchronous within the function (support volume is low)

### `docs/support-playbook.md`
Covers 10 intents Claude can auto-handle:
- Cancellation, refund requests, plan/quota questions
- LinkedIn not connecting, post not going live
- Trial questions, password/account access
- Billing receipts (Dodo for international, Razorpay for INR)

Always-escalate intents (confidence forced to 0 in prompt):
- Partnerships / sponsorships / agency inquiries
- Feature requests
- Abuse or threatening content

### `lib/email.ts` — new `sendEscalationEmail()` function
Sends the formatted forward to the founder. Includes:
- User context block (plan, usage, member since, user ID)
- Original email (quoted)
- AI's drafted reply (ready to copy-paste or edit)
- Reply-To: original sender

### Supabase migration — `support_tickets` table

| column | type | notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| created_at | timestamptz | default now() |
| sender_email | text | |
| sender_name | text | |
| subject | text | |
| body_text | text | |
| intent | text | classified by Claude |
| confidence | float | 0–1 |
| ai_reply | text | Claude's draft |
| action | text | `auto_sent` or `escalated` |
| user_plan | text | snapshot at time of ticket |
| user_id | uuid nullable | FK to auth.users if found |
| resolved_at | timestamptz | nullable |

---

## Environment Variables

| var | where | notes |
|-----|-------|-------|
| `INBOUND_SECRET` | Vercel + CF Worker | random 32-char string, shared |
| `ANTHROPIC_API_KEY` | Vercel | already exists |
| `RESEND_API_KEY` | Vercel | already exists |
| `ADMIN_EMAIL` | Vercel | already set to hamzabamboat@gmail.com |

---

## Manual Setup Steps (founder does these)

1. Add `personalink.in` to Cloudflare (free plan) — or enable Email Routing if already on CF
2. In Cloudflare DNS: add MX records pointing to Cloudflare's email servers
3. In Cloudflare Email Routing: create catch-all rule → send to Email Worker
4. Deploy the Email Worker from `cloudflare-worker/` with `INBOUND_SECRET` + `WEBHOOK_URL` env vars
5. Add `INBOUND_SECRET` to Vercel env vars (Preview + Production)
6. Run Supabase migration

---

## Confidence Threshold

- **≥ 0.85** → auto-send
- **< 0.85** → escalate

This is a constant in the route handler, easy to tune. Start at 0.85, lower if too many escalations, raise if bad auto-replies slip through.

---

## Out of Scope

- Admin UI (not needed — Gmail covers the escalation review flow)
- Threading / conversation history (each email treated independently for now)
- QStash buffering (add later if AI timeouts become an issue)
- Reply detection (Hamza's replies go directly to user from Gmail; no webhook needed)
