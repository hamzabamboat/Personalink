# Value-First Onboarding Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a value-first, email-only onboarding funnel (public voice analyzer → magic-link email gate → auto-created free account with the analyzer fingerprint pre-loaded → first post in 60s → inline refinement + soft-upgrade banners), running alongside the untouched LinkedIn → `/onboarding` funnel.

**Architecture:** New custom magic-link auth subsystem that sets the existing `session_user_id` cookie. The analyzer result page gains an email-primary CTA. A `/welcome` page generates the first post. Inline refinement and upgrade banners live in the dashboard. Two Vercel crons send day-2/day-7 emails. All built on the existing Supabase + Next.js 15 App Router stack; reuses `voice_reports`, `voice_samples`, `user_profiles`, `usage_tracking`, and existing post generation.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Supabase (`supabaseAdmin` service client), Resend, PostHog (`posthog-node` server / `posthog-js` client), Vercel cron, framer-motion. Optional: vitest for unit tests (Task 1).

**Spec:** `docs/superpowers/specs/2026-05-29-value-first-onboarding-funnel-design.md`

---

## Key facts about the existing codebase (read before starting)

- `users.id` is **text** (LinkedIn-derived), not a uuid default. New email accounts must supply a generated id (`crypto.randomUUID()`).
- `users.email` is a nullable column and is the join key for "link-by-email".
- Sessions are a single httpOnly cookie `session_user_id` set in `app/api/auth/linkedin/callback/route.ts:316-322`. There is no Supabase Auth / NextAuth.
- Post-generation limits use `checkLimit(userId, plan, 'posts_generated')` / `incrementUsage` from `lib/usage-limits.ts` against the `usage_tracking` table. `checkLimit` returns `{ allowed, used, limit, remaining }`. Free tier = 3 (`TIER_LIMITS.free.perFeature.posts_generated`).
- The voice fingerprint summary is seeded from `voice_reports` via `attachVoiceAnalyzerFingerprint(...)` in `lib/voice-analyzer.ts:131`. It seeds `user_profiles.voice_fingerprint` only — NOT the `voice_samples` corpus.
- `voice_samples.source` is a typed union in `lib/voice.ts:16` (`'onboarding' | 'manual' | 'edit' | 'voice_note'`) with a `SOURCE_WEIGHT` map.
- The analyzer result page is `app/voice-analyzer/results/[token]/page.tsx`; its CTA/email gate is the client component `app/voice-analyzer/results/[token]/_components/results-card.tsx` (the email form is at lines 282-346, posting to `/api/voice-analyzer/claim`).
- The 5 onboarding MCQ questions are defined inline at `app/onboarding/page.tsx:22-28` (`MCQ_QUESTIONS`), with multi-select ids in `MULTI_SELECT_QUESTIONS` (`app/onboarding/page.tsx:31`).
- Cron pattern (auth header + `cron_locks` idempotency) is in `app/api/cron/pipeline-reminder/route.ts`; crons are registered in `vercel.json`.
- Email helpers live in `lib/email.ts` (Resend wrapper `resend()`, `FROM_EMAIL`, `APP_URL`, existing `sendWelcomeEmail`).

---

## File structure

**New files:**
- `supabase/migrations/20260529_value_first_funnel.sql` — schema changes.
- `lib/magic-link.ts` — token create/verify (hash, expiry, single-use).
- `lib/email-auth.ts` — find-or-create email user + seed voice corpus from reports.
- `lib/onboarding-questions.ts` — shared `MCQ_QUESTIONS` / `MULTI_SELECT_QUESTIONS` (extracted to DRY between onboarding and refinement).
- `app/api/auth/magic-link/request/route.ts` — POST: issue token + send email.
- `app/api/auth/magic-link/verify/route.ts` — GET: verify token, create/login user, set session, redirect.
- `app/welcome/page.tsx` — server wrapper (auth guard).
- `app/welcome/_components/first-post.tsx` — client first-post UI.
- `app/api/refinement/answer/route.ts` — POST: save one refinement answer.
- `app/api/refinement/state/route.ts` — GET: current refinement question + progress.
- `app/api/usage/posts/route.ts` — GET: `{ used, limit, plan }` for the banner.
- `components/refinement-card.tsx` — inline refinement client component.
- `components/upgrade-banner.tsx` — soft-upgrade banner client component.
- `app/api/cron/day2-nudge/route.ts` — cron.
- `app/api/cron/day7-stats/route.ts` — cron.
- `vitest.config.ts` + `lib/__tests__/magic-link.test.ts` (Task 1, optional).

**Modified files:**
- `lib/voice.ts` — add `'analyzer'` to `VoiceSampleSource` + `SOURCE_WEIGHT`.
- `lib/email.ts` — add `sendMagicLinkEmail`, `sendEmailSignupWelcomeEmail`, `sendDay2NudgeEmail`, `sendDay7StatsEmail`.
- `app/voice-analyzer/results/[token]/_components/results-card.tsx` — email-primary magic-link CTA.
- `app/onboarding/page.tsx` — import shared questions instead of inline arrays.
- `vercel.json` — register the two new crons.
- The dashboard page (locate in Task 12) — mount `<UpgradeBanner/>` and `<RefinementCard/>`.
- The subscription-activation webhook(s) (locate in Task 13) — fire `upgraded`.

---

## Task 1 (OPTIONAL): Minimal vitest setup for auth token logic

> Skip this task if you want to keep zero test tooling — later tasks fall back to `npm run build` + browser checks. Recommended because magic-link tokens are security-critical.

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (devDependencies + `test` script)

- [ ] **Step 1: Install vitest**

Run: `npm i -D vitest@^2`
Expected: vitest added to devDependencies.

- [ ] **Step 2: Add config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/__tests__/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Add test script**

In `package.json` `scripts`, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Smoke test**

Run: `npm test`
Expected: "No test files found" (exit 0) or passes — confirms vitest runs.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest for auth unit tests"
```

---

## Task 2: Database migration

**Files:**
- Create: `supabase/migrations/20260529_value_first_funnel.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260529_value_first_funnel.sql`:

```sql
-- Value-first onboarding funnel: magic-link auth + email-signup metadata.

-- 1. Magic-link tokens. We store only a sha256 hash of the raw token, never the
--    raw value. Single-use (used_at) + short expiry (expires_at).
create table if not exists magic_link_tokens (
  id uuid default gen_random_uuid() primary key,
  token_hash text not null unique,
  email text not null,
  voice_report_token uuid,                 -- links the analyzer fingerprint to claim
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists magic_link_tokens_hash_idx on magic_link_tokens(token_hash);
create index if not exists magic_link_tokens_email_recent_idx
  on magic_link_tokens(email, created_at desc);

-- 2. How the account was created. Existing rows default to 'linkedin'.
alter table users add column if not exists signup_source text not null default 'linkedin';

-- 3. Inline refinement progress (0..5) and the day-2 PostHog dedupe flag.
alter table user_profiles add column if not exists refinement_step int not null default 0;
alter table user_profiles add column if not exists day2_event_fired boolean not null default false;

-- 4. Throttle columns for the new cron emails (mirror last_pipeline_reminder_sent_at).
alter table user_profiles add column if not exists day2_nudge_sent_at timestamptz;
alter table user_profiles add column if not exists day7_stats_sent_at timestamptz;
```

- [ ] **Step 2: Apply the migration**

Apply via the project's normal Supabase path (Supabase SQL editor, or `supabase db push` if the CLI is linked). Confirm by querying:

Run (Supabase SQL editor): `select column_name from information_schema.columns where table_name='user_profiles' and column_name in ('refinement_step','day2_event_fired');`
Expected: 2 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260529_value_first_funnel.sql
git commit -m "feat: schema for value-first funnel (magic links, signup_source, refinement)"
```

---

## Task 3: Magic-link token module

**Files:**
- Create: `lib/magic-link.ts`
- Test: `lib/__tests__/magic-link.test.ts` (only if Task 1 done)

- [ ] **Step 1 (if Task 1 done): Write failing tests**

Create `lib/__tests__/magic-link.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { hashToken, generateToken } from '../magic-link'

describe('magic-link token primitives', () => {
  it('generates a 64-char hex token', () => {
    const t = generateToken()
    expect(t).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hashes deterministically and differs from the raw token', () => {
    const t = generateToken()
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken(t)).toBe(hashToken(t))
    expect(hashToken(t)).not.toBe(t)
  })
})
```

- [ ] **Step 2 (if Task 1 done): Run, expect fail**

Run: `npm test`
Expected: FAIL — `lib/magic-link` not found.

- [ ] **Step 3: Implement the module**

Create `lib/magic-link.ts`:

```ts
import 'server-only'
import crypto from 'crypto'
import { supabaseAdmin } from './supabase-admin'

const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes
const EMAIL_RATE_WINDOW_MS = 10 * 60 * 1000 // max 3 requests / email / 10 min
const EMAIL_RATE_MAX = 3

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** True when the email has requested too many links recently. */
export async function isEmailRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - EMAIL_RATE_WINDOW_MS).toISOString()
  const { count } = await supabaseAdmin
    .from('magic_link_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since)
  return (count ?? 0) >= EMAIL_RATE_MAX
}

/** Create a single-use token row, return the RAW token (emailed, never stored). */
export async function createMagicLinkToken(opts: {
  email: string
  voiceReportToken?: string | null
}): Promise<string> {
  const token = generateToken()
  await supabaseAdmin.from('magic_link_tokens').insert({
    token_hash: hashToken(token),
    email: opts.email,
    voice_report_token: opts.voiceReportToken ?? null,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  })
  return token
}

export type VerifiedToken = {
  email: string
  voiceReportToken: string | null
}

/**
 * Validate + consume a token. Returns the payload on success, or null when the
 * token is unknown, expired, or already used. Marks used_at atomically-enough
 * for our scale (single service client, low contention).
 */
export async function consumeMagicLinkToken(rawToken: string): Promise<VerifiedToken | null> {
  if (!/^[0-9a-f]{64}$/.test(rawToken)) return null
  const tokenHash = hashToken(rawToken)

  const { data: row } = await supabaseAdmin
    .from('magic_link_tokens')
    .select('id, email, voice_report_token, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!row) return null
  if (row.used_at) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null

  // Mark used; only succeeds if still unused (guards against double-spend races).
  const { data: updated } = await supabaseAdmin
    .from('magic_link_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle()
  if (!updated) return null

  return { email: row.email as string, voiceReportToken: (row.voice_report_token as string | null) ?? null }
}
```

- [ ] **Step 4 (if Task 1 done): Run tests, expect pass**

Run: `npm test`
Expected: PASS (2 tests).

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: build succeeds (or fails only on unrelated pre-existing issues — magic-link.ts must not introduce errors).

- [ ] **Step 6: Commit**

```bash
git add lib/magic-link.ts lib/__tests__/magic-link.test.ts
git commit -m "feat: magic-link token create/verify primitives"
```

---

## Task 4: Add `'analyzer'` voice-sample source

**Files:**
- Modify: `lib/voice.ts:16-23`

- [ ] **Step 1: Extend the union and weight map**

In `lib/voice.ts`, change:

```ts
export type VoiceSampleSource = 'onboarding' | 'manual' | 'edit' | 'voice_note'

const SOURCE_WEIGHT: Record<VoiceSampleSource, number> = {
  edit: 3,        // human corrected an AI draft toward their voice — highest signal
  onboarding: 2,
  manual: 2,
  voice_note: 1,  // their actual words, but spoken register
}
```

to:

```ts
export type VoiceSampleSource = 'onboarding' | 'manual' | 'edit' | 'voice_note' | 'analyzer'

const SOURCE_WEIGHT: Record<VoiceSampleSource, number> = {
  edit: 3,        // human corrected an AI draft toward their voice — highest signal
  onboarding: 2,
  manual: 2,
  analyzer: 2,    // the 3 posts pasted into the public voice analyzer — real writing
  voice_note: 1,  // their actual words, but spoken register
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/voice.ts
git commit -m "feat: add 'analyzer' voice-sample source"
```

---

## Task 5: Email-auth helper (find-or-create user + seed corpus)

**Files:**
- Create: `lib/email-auth.ts`

- [ ] **Step 1: Implement the helper**

Create `lib/email-auth.ts`:

```ts
import 'server-only'
import crypto from 'crypto'
import { supabaseAdmin } from './supabase-admin'
import { addVoiceSample } from './voice'
import { attachVoiceAnalyzerFingerprint } from './voice-analyzer'

export type EmailUserResult = { userId: string; isNew: boolean }

/**
 * Link-by-email: if a users row already has this email, return it. Otherwise
 * create a new free-tier email-signup user (id is a generated uuid string,
 * matching the text users.id column) with a minimal free user_profiles row and
 * onboarding marked complete (the new funnel skips the 7-step QA flow).
 */
export async function findOrCreateEmailUser(emailRaw: string): Promise<EmailUserResult> {
  const email = emailRaw.trim().toLowerCase()

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) return { userId: existing.id as string, isNew: false }

  const userId = crypto.randomUUID()
  await supabaseAdmin.from('users').insert({
    id: userId,
    email,
    signup_source: 'email_magic_link',
    subscription_status: 'inactive',
    updated_at: new Date().toISOString(),
  })

  // Minimal free profile so post generation (which requires a profile) works.
  await supabaseAdmin.from('user_profiles').upsert(
    {
      user_id: userId,
      plan: 'free',
      writing_style: 'conversational',
      tone: 'friendly',
      posts_used_this_month: 0,
      onboarding_completed_at: new Date().toISOString(),
      preferred_days: ['Monday', 'Wednesday', 'Friday'],
      preferred_post_hour: 9,
      timezone: 'Asia/Kolkata',
      refinement_step: 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  return { userId, isNew: true }
}

/**
 * Seed the new account's voice from the analyzer report identified by token:
 *  - fingerprint summary → user_profiles.voice_fingerprint (via existing helper)
 *  - the 3 pasted samples → voice_samples corpus (source 'analyzer')
 * Safe + non-fatal: errors are swallowed/logged.
 */
export async function seedVoiceFromReport(userId: string, voiceReportToken: string | null, email: string): Promise<void> {
  try {
    // Fingerprint summary + converted_user_id backfill (matches by email).
    await attachVoiceAnalyzerFingerprint({ userId, linkedinEmail: email, cookieEmail: email })

    if (!voiceReportToken) return
    const { data: report } = await supabaseAdmin
      .from('voice_reports')
      .select('samples')
      .eq('token', voiceReportToken)
      .maybeSingle()

    const samples = Array.isArray(report?.samples) ? (report!.samples as unknown[]) : []
    for (const s of samples) {
      if (typeof s === 'string') {
        await addVoiceSample(userId, s, 'analyzer')
      }
    }
  } catch (err) {
    console.error('[email-auth.seedVoiceFromReport]', err)
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/email-auth.ts
git commit -m "feat: email-auth helper (link-by-email + seed voice corpus)"
```

---

## Task 6: Email templates

**Files:**
- Modify: `lib/email.ts` (append new exported functions near the other senders)

- [ ] **Step 1: Add the four senders**

Append to `lib/email.ts` (use the existing `resend()`, `FROM_EMAIL`, `APP_URL`). Keep the simple inline-HTML style of the existing senders:

```ts
export async function sendMagicLinkEmail({ to, verifyUrl }: { to: string; verifyUrl: string }) {
  return resend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your PersonaLink sign-in link',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:20px;margin:0 0 12px">Your voice is ready.</h1>
        <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 20px">
          Click below to open your PersonaLink account — your voice fingerprint is already loaded.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:#0A66C2;color:#fff;font-weight:600;
          font-size:15px;padding:12px 20px;border-radius:10px;text-decoration:none">Open my account →</a>
        <p style="font-size:12px;color:#94a3b8;margin:24px 0 0">This link expires in 15 minutes and can be used once.</p>
      </div>`,
  })
}

export async function sendEmailSignupWelcomeEmail({ to }: { to: string }) {
  return resend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Welcome to PersonaLink — generate your first post',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:20px;margin:0 0 12px">You're in.</h1>
        <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 20px">
          Your voice fingerprint is saved. Generate your first post in your own voice — it takes about a minute.
        </p>
        <a href="${APP_URL}/welcome" style="display:inline-block;background:#0A66C2;color:#fff;font-weight:600;
          font-size:15px;padding:12px 20px;border-radius:10px;text-decoration:none">Generate my first post →</a>
      </div>`,
  })
}

export async function sendDay2NudgeEmail({ to, userName }: { to: string; userName: string }) {
  return resend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your voice is waiting — post #2 in a minute',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:20px;margin:0 0 12px">Hey ${userName},</h1>
        <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 20px">
          You generated a post in your voice. Keep the streak going — your next one is one click away.
        </p>
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#0A66C2;color:#fff;font-weight:600;
          font-size:15px;padding:12px 20px;border-radius:10px;text-decoration:none">Write another →</a>
      </div>`,
  })
}

export async function sendDay7StatsEmail({
  to, userName, postsGenerated,
}: { to: string; userName: string; postsGenerated: number }) {
  return resend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your first week on PersonaLink',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
        <h1 style="font-size:20px;margin:0 0 12px">One week in, ${userName}.</h1>
        <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 8px">
          You've generated <strong>${postsGenerated}</strong> post${postsGenerated === 1 ? '' : 's'} in your voice so far.
        </p>
        <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 20px">
          Upgrade to Starter for 12 posts/month, scheduling, and no watermark.
        </p>
        <a href="${APP_URL}/upgrade" style="display:inline-block;background:#0A66C2;color:#fff;font-weight:600;
          font-size:15px;padding:12px 20px;border-radius:10px;text-decoration:none">See plans →</a>
      </div>`,
  })
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat: magic-link, welcome, day-2 and day-7 email templates"
```

---

## Task 7: `POST /api/auth/magic-link/request`

**Files:**
- Create: `app/api/auth/magic-link/request/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/api/auth/magic-link/request/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createMagicLinkToken, isEmailRateLimited } from '@/lib/magic-link'
import { sendMagicLinkEmail } from '@/lib/email'
import { getPostHogClient } from '@/lib/posthog-server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function POST(request: NextRequest) {
  let body: { email?: string; voiceReportToken?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const voiceReportToken = (body.voiceReportToken || '').trim()
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email.' }, { status: 400 })
  }
  const reportToken = UUID_RE.test(voiceReportToken) ? voiceReportToken : null

  if (await isEmailRateLimited(email)) {
    return NextResponse.json({ ok: false, error: 'Too many requests. Try again in a few minutes.' }, { status: 429 })
  }

  const token = await createMagicLinkToken({ email, voiceReportToken: reportToken })
  const verifyUrl = `${APP_URL}/api/auth/magic-link/verify?token=${token}`

  try {
    await sendMagicLinkEmail({ to: email, verifyUrl })
  } catch (err) {
    console.error('[magic-link/request] send failed', err)
    return NextResponse.json({ ok: false, error: 'Could not send the email. Try again.' }, { status: 500 })
  }

  try {
    getPostHogClient().capture({
      distinctId: email,
      event: 'email_captured',
      properties: { source: 'voice_analyzer', has_report: !!reportToken },
    })
  } catch { /* posthog optional */ }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/magic-link/request/route.ts
git commit -m "feat: magic-link request endpoint (issue token + email)"
```

---

## Task 8: `GET /api/auth/magic-link/verify`

**Files:**
- Create: `app/api/auth/magic-link/verify/route.ts`

- [ ] **Step 1: Implement the route**

Create `app/api/auth/magic-link/verify/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { consumeMagicLinkToken } from '@/lib/magic-link'
import { findOrCreateEmailUser, seedVoiceFromReport } from '@/lib/email-auth'
import { sendEmailSignupWelcomeEmail } from '@/lib/email'
import { getPostHogClient } from '@/lib/posthog-server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token') || ''

  const verified = await consumeMagicLinkToken(token)
  if (!verified) {
    return NextResponse.redirect(`${APP_URL}/?error=magic_link_invalid`)
  }

  const { userId, isNew } = await findOrCreateEmailUser(verified.email)

  if (isNew) {
    await seedVoiceFromReport(userId, verified.voiceReportToken, verified.email)
    sendEmailSignupWelcomeEmail({ to: verified.email }).catch(console.error)
  }

  try {
    const ph = getPostHogClient()
    ph.identify({ distinctId: userId, properties: { email: verified.email } })
    ph.capture({
      distinctId: userId,
      event: isNew ? 'user_signed_up' : 'user_logged_in',
      properties: { provider: 'email_magic_link', is_new_user: isNew },
    })
  } catch { /* posthog optional */ }

  const response = NextResponse.redirect(`${APP_URL}/welcome`)
  response.cookies.set('session_user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual verification**

Start the dev server (preview tools). In the DB, manually insert a `voice_reports` row with a known token, samples, fingerprint, and an email. Hit `POST /api/auth/magic-link/request` with that email + token, copy the verify URL from the dev server logs / Resend dashboard (or query `magic_link_tokens` and reconstruct — note the raw token is NOT stored, so use the email's link), and open it.
Expected: redirected to `/welcome`; a `users` row exists with `signup_source='email_magic_link'`; `user_profiles.voice_fingerprint` populated; `voice_samples` rows with `source='analyzer'`; the `session_user_id` cookie is set.

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/magic-link/verify/route.ts
git commit -m "feat: magic-link verify endpoint (create/login user, seed voice, set session)"
```

---

## Task 9: Email-primary CTA on the analyzer result page

**Files:**
- Modify: `app/voice-analyzer/results/[token]/_components/results-card.tsx`

- [ ] **Step 1: Replace the email-gate form behavior**

In `results-card.tsx`, the existing email form (lines ~282-346) posts to `/api/voice-analyzer/claim` and bounces to LinkedIn. Change the primary path to call the magic-link request, and demote LinkedIn to a secondary link. Replace the `onEmailSubmit` handler body so it posts to the new endpoint:

```tsx
  const onEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailMsg('Enter a valid email.')
      setEmailState('error')
      return
    }
    setEmailState('saving')
    setEmailMsg(null)
    try {
      const res = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, voiceReportToken: token }),
      })
      const data = await res.json()
      if (!data?.ok) {
        setEmailState('error')
        setEmailMsg(data?.error || 'Something went wrong. Try again.')
        return
      }
      try { posthog.capture('email_captured', { token, provider: 'email_magic_link' }) } catch {}
      setEmailState('done')
      setEmailMsg('Check your inbox — we sent you a sign-in link.')
    } catch {
      setEmailState('error')
      setEmailMsg('Network hiccup. Try again.')
    }
  }
```

- [ ] **Step 2: Update the submit-button label and add the secondary LinkedIn option**

Change the submit button label states (line ~338) to:

```tsx
            {emailState === 'saving' ? 'Sending…' : emailState === 'done' ? 'Link sent ✓' : 'Continue with email'}
```

Immediately AFTER the `{emailMsg && (...)}` block (around line 345, before the closing `</motion.form>`), add the secondary LinkedIn CTA:

```tsx
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-4)' }}>
          Prefer to connect now?{' '}
          <a
            href="/api/auth/linkedin"
            onClick={() => {
              fetch('/api/voice-analyzer/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email: email.trim().toLowerCase() }),
              }).catch(() => {})
            }}
            style={{ color: 'var(--pl-accent)', fontWeight: 600, textDecoration: 'none' }}
          >
            Sign up with LinkedIn
          </a>
        </div>
```

(The `onClick` best-effort calls `/claim` first so the LinkedIn callback's `pl_va_email` handoff still works. `router` is no longer needed for the primary path but leave the import — it may be used elsewhere; if `npm run build` flags it as unused, remove the `useRouter` import and `const router = useRouter()` line.)

- [ ] **Step 3: Update the gate heading copy**

Change the heading (line ~294-296) and subtext (line ~297-300) to reflect email-first:

```tsx
        <h2 style={{ margin: 0, fontSize: 'clamp(20px,3.4vw,26px)', fontWeight: 500, letterSpacing: '-0.02em' }}>
          Save this fingerprint. Start posting in your voice — free.
        </h2>
        <p style={{ margin: '8px 0 18px', color: 'var(--ink-3)', fontSize: 15, lineHeight: 1.55 }}>
          Enter your email and we&apos;ll send a one-click sign-in link. Your fingerprint is pre-loaded — no setup,
          no password. 3 free posts a month.
        </p>
```

- [ ] **Step 4: Type-check + lint**

Run: `npm run build && npm run lint`
Expected: succeeds (fix any unused-import errors flagged on this file).

- [ ] **Step 5: Browser verification**

Open `/voice-analyzer/results/<known-token>` in the preview. Enter an email, submit.
Expected: button shows "Sending…" → "Link sent ✓" and the "Check your inbox" message appears; no redirect. The "Sign up with LinkedIn" link is visible below.

- [ ] **Step 6: Commit**

```bash
git add app/voice-analyzer/results/[token]/_components/results-card.tsx
git commit -m "feat: email-primary magic-link CTA on voice analyzer result"
```

---

## Task 10: `/welcome` first-post page

**Files:**
- Create: `app/welcome/page.tsx`
- Create: `app/welcome/_components/first-post.tsx`

- [ ] **Step 1: Server wrapper with auth guard**

Create `app/welcome/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { FirstPost } from './_components/first-post'

export const metadata = { title: 'Your first post — PersonaLink' }

export default async function WelcomePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/?error=not_signed_in')
  const hasLinkedIn = !!user.linkedin_access_token
  return <FirstPost hasLinkedIn={hasLinkedIn} />
}
```

- [ ] **Step 2: Client first-post UI**

Create `app/welcome/_components/first-post.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'

const CHIPS = ['A lesson from this week', 'A controversial take', 'A win to celebrate']

export function FirstPost({ hasLinkedIn }: { hasLinkedIn: boolean }) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [state, setState] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [post, setPost] = useState<{ id: string; content: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const generate = async () => {
    if (!topic.trim()) { setMsg('Tell us what to post about first.'); return }
    setState('generating'); setMsg(null)
    try {
      const res = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data?.posts?.length) {
        setState('error'); setMsg(data?.error || 'Generation failed. Try again.'); return
      }
      setPost(data.posts[0])
      setState('done')
      try { posthog.capture('first_post_generated', { topic: topic.trim() }) } catch {}
    } catch {
      setState('error'); setMsg('Network hiccup. Try again.')
    }
  }

  const publish = () => {
    if (!hasLinkedIn) {
      document.cookie = 'pl_post_auth_intent=publish_first_post; path=/; max-age=1800'
      window.location.href = '/api/auth/linkedin'
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(32px,6vw,72px) clamp(16px,4vw,24px)' }}>
        <h1 style={{ fontSize: 'clamp(24px,4.5vw,36px)', fontWeight: 500, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Your voice is ready.
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 'clamp(15px,2vw,18px)', margin: '0 0 24px' }}>
          Generate your first post. What do you want to post about?
        </p>

        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. how I landed my first enterprise client"
          rows={3}
          style={{
            width: '100%', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, color: 'var(--ink)', fontSize: 16, fontFamily: 'var(--f-sans)', resize: 'vertical',
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 20px' }}>
          {CHIPS.map(c => (
            <button key={c} onClick={() => setTopic(c)} style={{
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
              padding: '8px 14px', fontSize: 14, color: 'var(--ink-2,var(--ink))', cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>

        <button onClick={generate} disabled={state === 'generating'} style={{
          background: 'var(--pl-accent)', color: '#fff', fontWeight: 600, fontSize: 16, padding: '14px 22px',
          borderRadius: 12, border: 'none', cursor: state === 'generating' ? 'wait' : 'pointer', width: '100%',
        }}>
          {state === 'generating' ? 'Generating in your voice…' : 'Generate my first post'}
        </button>

        {msg && <div style={{ marginTop: 12, fontSize: 14, color: state === 'error' ? '#b91c1c' : 'var(--ink-3)' }}>{msg}</div>}

        {state === 'done' && post && (
          <div style={{ marginTop: 28, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(18px,3vw,28px)' }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              // your post, in your voice
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.6, color: 'var(--ink)' }}>{post.content}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <button onClick={publish} style={{
                background: 'var(--ink)', color: 'var(--bg)', fontWeight: 600, fontSize: 15, padding: '12px 18px',
                borderRadius: 10, border: 'none', cursor: 'pointer',
              }}>
                {hasLinkedIn ? 'Go to dashboard to publish' : 'Connect LinkedIn to publish'}
              </button>
              <button onClick={() => router.push('/dashboard')} style={{
                background: 'transparent', color: 'var(--ink-3)', fontWeight: 500, fontSize: 15, padding: '12px 18px',
                borderRadius: 10, border: '1px solid var(--line)', cursor: 'pointer',
              }}>Skip for now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check + lint**

Run: `npm run build && npm run lint`
Expected: succeeds.

- [ ] **Step 4: Browser verification**

With a magic-link session active (from Task 8), visit `/welcome`. Click a chip, generate.
Expected: a post renders in the card; PostHog `first_post_generated` fires (check network/PostHog). "Connect LinkedIn to publish" shown for the email-only account; "Skip for now" routes to `/dashboard`.

- [ ] **Step 5: Commit**

```bash
git add app/welcome/page.tsx app/welcome/_components/first-post.tsx
git commit -m "feat: /welcome first-post page for email-signup funnel"
```

---

## Task 11: Shared onboarding questions module

**Files:**
- Create: `lib/onboarding-questions.ts`
- Modify: `app/onboarding/page.tsx:22-31`

- [ ] **Step 1: Create the shared module**

Create `lib/onboarding-questions.ts`:

```ts
export type McqQuestion = { id: string; q: string; options: string[] }

export const MCQ_QUESTIONS: McqQuestion[] = [
  { id: 'voice_style', q: 'How would you describe your professional voice?', options: ['Formal', 'Conversational', 'Inspirational', 'Educational', 'Humorous'] },
  { id: 'main_goal', q: 'What is your main goal on LinkedIn?', options: ['Build personal brand', 'Generate leads', 'Find a job', 'Share knowledge', 'Grow network'] },
  { id: 'personal_stories', q: 'How comfortable are you sharing personal stories?', options: ['Very comfortable', 'Somewhat comfortable', 'Prefer professional only'] },
  { id: 'content_type', q: 'What content do you enjoy reading on LinkedIn?', options: ['Long stories', 'Quick tips', 'Data insights', 'Controversial takes', 'Behind the scenes'] },
  { id: 'known_as', q: 'How do you want to be known?', options: ['The Expert', 'The Leader', 'The Storyteller', 'The Innovator', 'The Connector'] },
]

export const MULTI_SELECT_QUESTIONS = ['voice_style', 'content_type']
```

- [ ] **Step 2: Import in the onboarding page**

In `app/onboarding/page.tsx`, delete the inline `MCQ_QUESTIONS` (lines 22-28) and `MULTI_SELECT_QUESTIONS` (line 31), and add to the imports near line 9:

```tsx
import { MCQ_QUESTIONS, MULTI_SELECT_QUESTIONS } from '@/lib/onboarding-questions'
```

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: succeeds (onboarding still references the same names).

- [ ] **Step 4: Commit**

```bash
git add lib/onboarding-questions.ts app/onboarding/page.tsx
git commit -m "refactor: extract MCQ questions to shared module"
```

---

## Task 12: Inline refinement (API + card)

**Files:**
- Create: `app/api/refinement/state/route.ts`
- Create: `app/api/refinement/answer/route.ts`
- Create: `components/refinement-card.tsx`
- Modify: the dashboard page (locate it — see Step 5)

- [ ] **Step 1: State endpoint**

Create `app/api/refinement/state/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MCQ_QUESTIONS } from '@/lib/onboarding-questions'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('refinement_step')
    .eq('user_id', user.id)
    .maybeSingle()

  const step = profile?.refinement_step ?? 0
  if (step >= MCQ_QUESTIONS.length) {
    return NextResponse.json({ done: true, step, total: MCQ_QUESTIONS.length })
  }
  return NextResponse.json({ done: false, step, total: MCQ_QUESTIONS.length, question: MCQ_QUESTIONS[step] })
}
```

- [ ] **Step 2: Answer endpoint**

Create `app/api/refinement/answer/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MCQ_QUESTIONS } from '@/lib/onboarding-questions'
import { refreshFingerprint } from '@/lib/voice'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const questionId: string | undefined = body?.questionId
  const answer: string | string[] | undefined = body?.answer
  const skipped: boolean = !!body?.skipped

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('refinement_step, mcq_answers')
    .eq('user_id', user.id)
    .maybeSingle()

  const step = profile?.refinement_step ?? 0
  const current = MCQ_QUESTIONS[step]
  // Guard against stale client state.
  if (current && questionId && questionId !== current.id) {
    return NextResponse.json({ ok: true, step }) // ignore; client will re-fetch
  }

  const mcq = { ...(profile?.mcq_answers ?? {}) } as Record<string, string | string[]>
  if (!skipped && answer != null && current) mcq[current.id] = answer

  const nextStep = step + 1
  await supabaseAdmin
    .from('user_profiles')
    .update({ refinement_step: nextStep, mcq_answers: mcq, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  // Refresh the fingerprint from the corpus after answering (non-fatal).
  if (!skipped) refreshFingerprint(user.id).catch(() => {})

  return NextResponse.json({ ok: true, step: nextStep })
}
```

- [ ] **Step 3: Refinement card component**

Create `components/refinement-card.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'

type Q = { id: string; q: string; options: string[] }
type State = { done: boolean; step: number; total: number; question?: Q }

export function RefinementCard() {
  const [state, setState] = useState<State | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const res = await fetch('/api/refinement/state')
      if (!res.ok) return
      setState(await res.json())
    } catch {}
  }

  useEffect(() => { load() }, [])

  if (!state || state.done || !state.question) return null
  const q = state.question

  const submit = async (skipped: boolean) => {
    setBusy(true)
    try {
      await fetch('/api/refinement/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, answer: selected, skipped }),
      })
      setSelected(null)
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, margin: '0 0 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 6 }}>Refinement {state.step + 1} of {state.total}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{q.q}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {q.options.map(o => (
          <button key={o} onClick={() => setSelected(o)} style={{
            background: selected === o ? 'var(--pl-accent)' : 'var(--bg)',
            color: selected === o ? '#fff' : 'var(--ink-2,var(--ink))',
            border: '1px solid var(--line)', borderRadius: 999, padding: '8px 14px', fontSize: 14, cursor: 'pointer',
          }}>{o}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => submit(false)} disabled={busy || !selected} style={{
          background: 'var(--ink)', color: 'var(--bg)', fontWeight: 600, fontSize: 14, padding: '9px 16px',
          borderRadius: 9, border: 'none', cursor: busy || !selected ? 'not-allowed' : 'pointer', opacity: !selected ? 0.5 : 1,
        }}>Save</button>
        <button onClick={() => submit(true)} disabled={busy} style={{
          background: 'transparent', color: 'var(--ink-4)', fontSize: 14, padding: '9px 12px', border: 'none', cursor: 'pointer',
        }}>Skip for now</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Locate the dashboard page**

Run: `ls app/dashboard` and open the main page component file.
Expected: find `app/dashboard/page.tsx` (or the client component it renders). Note whether it's a server or client component.

- [ ] **Step 5: Mount the card**

Add the import and render `<RefinementCard />` near the top of the dashboard's main content (above the generate UI). If the dashboard root is a server component, `RefinementCard` (a client component) can still be rendered directly. Example edit at the top of the returned JSX:

```tsx
import { RefinementCard } from '@/components/refinement-card'
// ...inside the main content container, before the post-generation UI:
<RefinementCard />
```

- [ ] **Step 6: Type-check + lint**

Run: `npm run build && npm run lint`
Expected: succeeds.

- [ ] **Step 7: Browser verification**

As a magic-link user, open `/dashboard`.
Expected: "Refinement 1 of 5" card with the voice-style question. Selecting an option + Save advances to "Refinement 2 of 5". Skip also advances. After 5, the card disappears. Reloading after answering 2 shows "Refinement 3 of 5" (progress persisted).

- [ ] **Step 8: Commit**

```bash
git add app/api/refinement components/refinement-card.tsx app/dashboard
git commit -m "feat: inline post-value refinement questions"
```

---

## Task 13: Soft-upgrade banner

**Files:**
- Create: `app/api/usage/posts/route.ts`
- Create: `components/upgrade-banner.tsx`
- Modify: the dashboard page (same file as Task 12)

- [ ] **Step 1: Usage endpoint**

Create `app/api/usage/posts/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit } from '@/lib/usage-limits'
import type { TierID } from '@/lib/pricing-config'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = (profile?.plan || 'free') as TierID
  const { used, limit } = await checkLimit(user.id, plan, 'posts_generated')
  return NextResponse.json({ used, limit, plan })
}
```

- [ ] **Step 2: Banner component**

Create `components/upgrade-banner.tsx`:

```tsx
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
```

- [ ] **Step 3: Mount in the dashboard**

In the dashboard page, add near the top of the main content (above `<RefinementCard />`):

```tsx
import { UpgradeBanner } from '@/components/upgrade-banner'
// ...
<UpgradeBanner />
```

- [ ] **Step 4: Confirm the `/upgrade` route exists**

Run: `ls app/upgrade` (the day-7 email and banner link there).
Expected: exists. If it does not, change the `href` in both the banner and `sendDay7StatsEmail` to the correct pricing/upgrade route (e.g. `/#pricing`).

- [ ] **Step 5: Type-check + lint**

Run: `npm run build && npm run lint`
Expected: succeeds.

- [ ] **Step 6: Browser verification**

As a free magic-link user, generate posts until 2 of 3 are used.
Expected: no banner at 0-1 used; "1 free post left…" banner after the 2nd; "used all 3 free posts…" banner + generation blocked (existing 429) at the 3rd.

- [ ] **Step 7: Commit**

```bash
git add app/api/usage/posts/route.ts components/upgrade-banner.tsx app/dashboard
git commit -m "feat: soft-upgrade banner for free tier (3/month)"
```

---

## Task 14: Funnel PostHog events (`returned_day_2`, `upgraded`)

`email_captured` (Task 7/9), `first_post_generated` (Task 10), `voice_analyzer_started`/`voice_analyzer_completed` (pre-existing) are already covered. This task adds the remaining two.

**Files:**
- Modify: `app/welcome/page.tsx` (or dashboard server load) — `returned_day_2`
- Modify: subscription-activation webhook(s) — `upgraded`

- [ ] **Step 1: `returned_day_2` on authenticated load**

In `app/welcome/page.tsx`, after fetching `user`, add a server-side day-2 check (fires once, deduped via `user_profiles.day2_event_fired`). Insert before the `return`:

```tsx
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPostHogClient } from '@/lib/posthog-server'
// ...
  const created = user.created_at ? new Date(user.created_at).getTime() : 0
  const ageH = created ? (Date.now() - created) / 36e5 : 0
  if (ageH >= 24 && ageH <= 48) {
    const { data: p } = await supabaseAdmin
      .from('user_profiles').select('day2_event_fired').eq('user_id', user.id).maybeSingle()
    if (p && !p.day2_event_fired) {
      try { getPostHogClient().capture({ distinctId: user.id, event: 'returned_day_2' }) } catch {}
      await supabaseAdmin.from('user_profiles').update({ day2_event_fired: true }).eq('user_id', user.id)
    }
  }
```

> Note: this fires when a day-2 user lands on `/welcome` (the day-2 email links here). If the dashboard is the more common day-2 entry point, replicate the same block in the dashboard's server component instead/as well.

- [ ] **Step 2: Locate the subscription-activation point**

Run: `grep -rn "subscription_status: 'active'\|status: 'active'\|sub_status" app/api/dodo app/api/razorpay app/api/webhooks 2>/dev/null`
Expected: find where a paid subscription is marked active (Dodo and/or Razorpay webhook handler).

- [ ] **Step 3: Fire `upgraded`**

At each activation point found, after the DB write that activates the subscription, add (using the user id available in that handler):

```ts
import { getPostHogClient } from '@/lib/posthog-server'
// ...after marking the subscription active:
try {
  getPostHogClient().capture({ distinctId: userId, event: 'upgraded', properties: { plan } })
} catch { /* posthog optional */ }
```

(Use the handler's existing `userId`/`plan` variable names.)

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/welcome/page.tsx app/api
git commit -m "feat: returned_day_2 and upgraded PostHog funnel events"
```

---

## Task 15: Day-2 and day-7 cron emails

**Files:**
- Create: `app/api/cron/day2-nudge/route.ts`
- Create: `app/api/cron/day7-stats/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Day-2 nudge cron**

Create `app/api/cron/day2-nudge/route.ts` (follows the `pipeline-reminder` auth + `cron_locks` pattern):

```ts
// Vercel cron — daily. Nudges email-signup users ~24-48h old who haven't returned.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendDay2NudgeEmail } from '@/lib/email'
import crypto from 'crypto'

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'day2-nudge', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  const since48 = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('signup_source', 'email_magic_link')
    .not('email', 'is', null)
    .gte('created_at', since48)
    .lte('created_at', since24)

  const results = await Promise.allSettled((users ?? []).map(async (u) => {
    if (!u.email) return { id: u.id, skipped: 'no_email' }
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('day2_nudge_sent_at').eq('user_id', u.id).maybeSingle()
    if (profile?.day2_nudge_sent_at) return { id: u.id, skipped: 'already_sent' }

    await sendDay2NudgeEmail({ to: u.email, userName: 'there' })
    await supabaseAdmin.from('user_profiles')
      .update({ day2_nudge_sent_at: new Date().toISOString() }).eq('user_id', u.id)
    return { id: u.id, sent: true }
  }))

  await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as { sent?: boolean }).sent).length
  return NextResponse.json({ sent, total: users?.length ?? 0 })
}

export { handler as GET, handler as POST }
```

- [ ] **Step 2: Day-7 stats cron**

Create `app/api/cron/day7-stats/route.ts`:

```ts
// Vercel cron — daily. Sends a 1-week stats email to email-signup users ~7-8 days old.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendDay7StatsEmail } from '@/lib/email'
import { checkLimit } from '@/lib/usage-limits'
import crypto from 'crypto'

async function handler(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'day7-stats', run_date: today, lock_id: lockId })
  if (lockError) return NextResponse.json({ skipped: true, reason: 'already_ran_today' })

  const since8 = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('signup_source', 'email_magic_link')
    .not('email', 'is', null)
    .gte('created_at', since8)
    .lte('created_at', since7)

  const results = await Promise.allSettled((users ?? []).map(async (u) => {
    if (!u.email) return { id: u.id, skipped: 'no_email' }
    const { data: profile } = await supabaseAdmin
      .from('user_profiles').select('day7_stats_sent_at, plan').eq('user_id', u.id).maybeSingle()
    if (profile?.day7_stats_sent_at) return { id: u.id, skipped: 'already_sent' }

    const { used } = await checkLimit(u.id, (profile?.plan || 'free'), 'posts_generated')
    await sendDay7StatsEmail({ to: u.email, userName: 'there', postsGenerated: used })
    await supabaseAdmin.from('user_profiles')
      .update({ day7_stats_sent_at: new Date().toISOString() }).eq('user_id', u.id)
    return { id: u.id, sent: true }
  }))

  await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as { sent?: boolean }).sent).length
  return NextResponse.json({ sent, total: users?.length ?? 0 })
}

export { handler as GET, handler as POST }
```

- [ ] **Step 3: Register the crons**

In `vercel.json`, add two entries to the `crons` array (daily):

```json
{
  "crons": [
    { "path": "/api/cron/send-approvals", "schedule": "0 3 * * *" },
    { "path": "/api/cron/pipeline-reminder", "schedule": "0 10 * * 4" },
    { "path": "/api/cron/expire-plans", "schedule": "0 2 * * *" },
    { "path": "/api/cron/day2-nudge", "schedule": "0 9 * * *" },
    { "path": "/api/cron/day7-stats", "schedule": "0 9 * * *" }
  ]
}
```

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Manual verification**

Run locally with the cron secret:
`curl -s -H "authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/day2-nudge`
Expected: JSON `{ sent, total }` (likely `0/0` with no matching users) and HTTP 200. A wrong/absent header returns 401.

- [ ] **Step 6: Commit**

```bash
git add app/api/cron/day2-nudge/route.ts app/api/cron/day7-stats/route.ts vercel.json
git commit -m "feat: day-2 nudge and day-7 stats cron emails"
```

---

## Task 16: End-to-end funnel verification

**Files:** none (verification only)

- [ ] **Step 1: Full new-funnel walkthrough (mobile viewport)**

Using the preview tools at a mobile viewport (e.g. 390×844):
1. `/voice-analyzer` → paste 3 samples → analyze → result page.
2. Enter email → "Continue with email" → see "Check your inbox".
3. Open the magic link (from Resend / dev logs) → lands on `/welcome` with a session.
4. Generate first post via a chip → post renders.
5. "Skip for now" → `/dashboard` → refinement card + (after 2 posts) upgrade banner.

Expected: each step works; PostHog shows `voice_analyzer_started → voice_analyzer_completed → email_captured → first_post_generated` for the funnel.

- [ ] **Step 2: Old funnel regression check**

From the landing page, click "Connect LinkedIn profile" → OAuth → `/onboarding`.
Expected: the original 7-step onboarding still loads and saves exactly as before (uses the now-shared `MCQ_QUESTIONS`). Completing it lands on `/dashboard`.

- [ ] **Step 3: Link-by-email check**

With an existing LinkedIn account whose email is `X`, run the magic-link flow with email `X`.
Expected: no duplicate user is created; the magic link logs into the existing account (verify `users` count unchanged for that email).

- [ ] **Step 4: Final build + lint**

Run: `npm run build && npm run lint`
Expected: both succeed.

- [ ] **Step 5: Commit any verification fixes**

```bash
git add -A
git commit -m "fix: address issues found in funnel end-to-end verification"
```

---

## Self-review notes (spec coverage)

- Step 1 public analyzer — pre-existing, reused (Task 9 modifies its gate).
- Step 2 email gate + magic link + auto free account + skip QAs — Tasks 2,3,5,6,7,8,9.
- Step 3 first post in 60s (input + 3 chips + generate + result) — Task 10.
- Step 4 inline refinement (one at a time, max 5, skip, progress, reuse MCQ) — Tasks 11,12.
- Step 5 soft upgrade (remapped to 3/month: #2 "1 left", #3 limit; view/edit allowed) — Task 13.
- Magic-link auth (custom, link-by-email) — Tasks 3,5,7,8.
- PostHog funnel (all 6 events) — Tasks 7,9,10,14.
- Emails (magic link, welcome, day-2, day-7; post-limit reuses existing 429 + quota email) — Tasks 6,15.
- Old funnel preserved — Task 16 Step 2 regression check; no changes to `/onboarding` flow beyond a non-behavioral import refactor (Task 11).
```
