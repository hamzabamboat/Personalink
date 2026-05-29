# Value-First Onboarding Funnel — Design

**Date:** 2026-05-29
**Status:** Approved (design); pending implementation plan

## Problem

The current onboarding makes users complete a full 7-step QA flow (basic info,
personality quiz, writing sample, content pillars, control prefs, image brief,
plan selection) *before* they see any value. This is too long and front-loads
friction.

We want a **value-first funnel**: let people experience their voice-matched
output first, capture only an email, auto-create a free account with the voice
fingerprint already loaded, and defer all QA-style questions to *optional,
inline refinement* during normal usage.

## Constraints & Key Decisions

These were settled during brainstorming:

1. **The new funnel is purely additive.** The existing LinkedIn → `/onboarding`
   (7 steps) → `/dashboard` funnel stays completely untouched. Whatever happens
   after "Connect LinkedIn" on the landing page today must keep working exactly
   as-is.
2. **First-post value = "Generate, then connect to publish."** An email-only
   account has no LinkedIn OAuth token, so it cannot auto-publish. The user
   generates a post and sees it in their voice; the **Publish** button triggers
   LinkedIn OAuth connect *at that moment*, upgrading the email account in place.
3. **Auth = custom magic link.** The app uses a fully custom session system
   (`session_user_id` httpOnly cookie, manual `users` table — no Supabase Auth,
   no NextAuth). We build a custom magic-link subsystem that sets the same
   cookie. There is **no password auth to replace**; current auth is LinkedIn
   OAuth only.
4. **Account linking = link-by-email.** When an email-only user later connects
   LinkedIn, if the LinkedIn email matches the existing email account, merge into
   the same `users` row (add LinkedIn token to the existing account). One account
   per person.
5. **Free tier stays 3 posts/month** (not 5). The soft-upgrade triggers are
   remapped accordingly: banner at post #2 ("1 free post left"), limit reached at
   post #3. Banner copy uses **real tier numbers** (Starter = 12/month), not the
   illustrative "50" from the original brief.
6. **Refinement questions reuse the existing 5 `MCQ_QUESTIONS`** from the old
   onboarding (voice style, main goal, storytelling comfort, content type, brand
   positioning), repurposed as inline, skippable prompts.
7. **Email gate = magic link primary, LinkedIn secondary.** On the analyzer
   result page, "Continue with email" is the primary CTA (new funnel); "Sign up
   with LinkedIn" remains as a secondary option (old funnel). Both pre-load the
   fingerprint.
8. **Day-2 / day-7 emails use Vercel cron jobs.**

## Architecture Overview

The new funnel reuses existing infrastructure: `voice_reports` (public analyzer
output), `voice_samples` (per-user voice corpus), `user_profiles`, the post
generation endpoint, and the pricing config. New surfaces are listed below.

### New funnel flow

```
Landing → /voice-analyzer → results/[token]
   → [Continue with email]  → POST /api/auth/magic-link/request   (email_captured)
   → user clicks email link → GET /api/auth/magic-link/verify
        → find-or-create free account (link-by-email)
        → seed fingerprint from voice_reports → set session_user_id cookie
   → /welcome  (first post; first_post_generated)
        → [Publish] → triggers LinkedIn OAuth connect in-place
   → /dashboard  (inline refinement + soft-upgrade banners)
   → day-2 nudge / day-7 stats emails → upgrade (upgraded)
```

### Old funnel (preserved, unchanged)

```
Landing → [Connect LinkedIn] → /api/auth/linkedin → OAuth
   → /onboarding (7 steps) → /dashboard
```

## Components

### 1. Magic-link auth subsystem

**New table `magic_link_tokens`:**
- `id` (uuid, pk)
- `token_hash` (text) — store a hash of the token, never the raw token
- `email` (text)
- `voice_report_token` (uuid, nullable) — links the analyzer fingerprint to claim
- `expires_at` (timestamptz) — 15 minutes from creation
- `used_at` (timestamptz, nullable) — enforces single-use
- `created_at` (timestamptz, default now())

Rate-limited per email and per IP (mirror the analyzer's existing rate-limit
approach).

**`POST /api/auth/magic-link/request`:**
- Validates email format.
- Rate-limit check.
- Generates a random token, stores its hash + email + `voice_report_token`.
- Sends the magic-link email via Resend (link → `/api/auth/magic-link/verify?token=…`).
- Fires PostHog `email_captured`.

**`GET /api/auth/magic-link/verify?token=…`:**
- Looks up by token hash; rejects if missing, expired, or already used.
- Marks `used_at = now()`.
- **Link-by-email:** if a `users` row already has this email → log into it.
  Otherwise create a new **free-tier** user with:
  - `onboarding_completed_at = now()` (skips all QAs)
  - `signup_source = 'email_magic_link'`
- **Pre-load fingerprint:** copy `voice_reports.fingerprint` →
  `user_profiles.voice_fingerprint`; seed `voice_reports.samples` into
  `voice_samples` with `source = 'analyzer'`; set
  `voice_reports.converted_user_id`.
- Set `session_user_id` cookie → redirect to `/welcome`.

### 2. Email gate (analyzer result page)

Modify `app/voice-analyzer/results/[token]`:
- **Primary CTA:** "Continue with email" — inline email field → calls
  magic-link request → shows a "Check your inbox" confirmation state.
- **Secondary CTA:** "Sign up with LinkedIn" — existing OAuth path, unchanged.
- Both paths pre-load the fingerprint for the resulting account.

### 3. `/welcome` first-post page

- Post-verify landing page.
- Headline: "Your voice is ready. Generate your first post."
- Single text input: "What do you want to post about?"
- 3 suggestion chips: "A lesson from this week", "A controversial take",
  "A win to celebrate".
- Generate button → calls existing `/api/posts/generate` (fingerprint already
  loaded).
- Shows the result rendered in the user's voice.
- Fires PostHog `first_post_generated`.
- **Publish** button → if no LinkedIn token, kicks off LinkedIn OAuth connect
  (post-auth intent returns the user to publish); if connected, publishes.
- "Skip for now" link → `/dashboard`.
- Mobile-optimized layout.

### 4. Inline refinement UI

- Reuses the 5 existing `MCQ_QUESTIONS`.
- Progress tracked via new column `user_profiles.refinement_step` (int, default 0).
- After the first post, the dashboard surfaces **one** question at a time as a
  dismissible card: "Refinement N of 5", with a **Skip** button.
- Each answer is stored in `user_profiles.mcq_answers` and feeds
  `refreshFingerprint`.
- Never a forced full-screen flow; always inline and skippable.

### 5. Soft-upgrade banners (free = 3 posts/month)

- After **post #2 generated**: subtle banner — "1 free post left this month —
  upgrade to Starter for 12/month →".
- At **post #3 / limit (HTTP 429 from `/api/posts/generate`)**: "You've used your
  3 free posts this month." Viewing/editing existing posts stays allowed;
  generation is gated with an upgrade CTA.
- Copy uses real tier numbers from `lib/pricing-config.ts`.

### 6. PostHog funnel events

| Event | Status | Fired when |
|-------|--------|-----------|
| `voice_analyzer_started` | exists | analyzer form started |
| `voice_analyzer_completed` | exists | analysis result shown |
| `email_captured` | **new** | magic-link request submitted |
| `first_post_generated` | **new** | `/welcome` generate succeeds |
| `returned_day_2` | **new** | first authed pageview 24–48h after signup |
| `upgraded` | **new** | paid subscription activated |

### 7. Email templates (Resend)

- **Magic-link email** — the gate itself (verify link).
- **Welcome email** — post-verify, email-signup variant ("Your voice is ready").
- **Day-2 nudge** — Vercel cron, targets `signup_source='email_magic_link'`
  users ~24–48h old who haven't generated more posts.
- **Day-7 stats** — Vercel cron, personalized stats.
- **Post-limit reached** — reuse/extend existing `sendQuotaReachedEmail`.

Day-2 and day-7 jobs run as **Vercel cron** endpoints that query users by
`signup_source` and signup age.

## Data Model Changes

- **New** `magic_link_tokens` table (see above).
- `users`: add `signup_source` (`'linkedin' | 'email_magic_link'`); confirm an
  `email` column + index exists for link-by-email (verify during planning — the
  LinkedIn callback already captures email scope).
- `user_profiles`: add `refinement_step int default 0`.
- `voice_reports`: `converted_user_id` already exists — set it on conversion.

## Testing

- **Unit:** token generation/expiry/single-use; link-by-email merge logic;
  fingerprint seeding from `voice_reports` into `voice_samples` / `user_profiles`.
- **Integration:** full magic-link request → verify → account-created flow,
  including the link-by-email path.
- **Manual:** browser walkthrough of the entire new funnel at a mobile viewport
  (analyzer → email gate → magic link → `/welcome` → first post → dashboard
  banners + refinement). Confirm the old LinkedIn funnel still works unchanged.

## Out of Scope

- Changing the old onboarding flow or its 7 steps.
- Changing free-tier limits for existing users (stays 3/month).
- Password auth (does not exist; not introduced).
