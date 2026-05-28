# Agency Inquiry Funnel — Design

**Date:** 2026-05-28
**Author:** Hamza (with Claude)
**Status:** Approved, ready for implementation plan

## Goal

A no-public-pricing inbound funnel for LinkedIn-content agencies. Visitor lands on `/for-agencies`, learns the proposition, submits a 13-field inquiry form, and lands on a thank-you page with an optional Cal.com self-book. Every inquiry is durably stored, the founder is notified, the prospect gets an instant brand-voice reply.

## Non-goals

- Self-serve agency checkout (intentional — pricing is custom).
- Notion sync (skipped this iteration — can add later).
- Slack webhook (skipped this iteration — can add later).
- Captcha (skipped — honeypot + IP rate limit deemed sufficient for v1).
- Public-facing agency dashboard or onboarding flow (this is purely top-of-funnel).

## Constraints

- Mobile-first. Most LinkedIn opens are on mobile.
- Form must work without JS as fallback (`<form action method="POST">` to the same endpoint).
- Brand voice: faceless brand, Quiet Expert archetype, plain English, no emojis in copy, Indian-English register. Source of truth: `docs/brand-voice.md`.
- Page load <2.5s LCP on 4G. No new heavy client libs.
- Form completion target: 60%+ of starters.
- All copy passes `docs/brand-voice.md` rules.
- Use existing CSS variables (`--ink`, `--surface`, `--pl-accent`, `--f-display`, `--f-mono`, etc.), no new design tokens.

## Identity / brand notes

- Founder name in copy: **Hamza**.
- Founder email in copy: **hello@personalink.in** (also the Resend `reply_to`).
- Brand casing: **PersonaLink** (matches existing wordmark + landing copy).
- The faceless-brand rule from `docs/brand-voice.md` relaxes for B2B sales contexts where a named human on the other end is expected. Agency-funnel emails sign as "— Hamza, PersonaLink". Landing page itself stays faceless (no founder photo, no "Hi I'm Hamza" video).

## Architecture

```
Visitor → /for-agencies (RSC, no client JS for landing chrome)
       ↓ submits InquiryForm (client component)
/api/agency-inquiry/submit (Node runtime, POST)
       ├─ honeypot drop (silent 200)
       ├─ IP rate limit (checkIpRateLimit, 10/min)
       ├─ validate (all required fields, formats)
       ├─ insert into agency_inquiries (supabaseAdmin)
       ├─ Promise.all:
       │     sendAgencyInquiryAdminAlert → hello@personalink.in
       │     sendAgencyInquiryAutoReply  → submitter email
       └─ fire-and-forget PostHog server event
       ↓
       JSON response (fetch path) OR 303 redirect (no-JS path)
       ↓
/agency-inquiry/thank-you?name=<first>&agency=<name>
       └─ Cal.com embed (lazy, only if NEXT_PUBLIC_CAL_COM_URL set)
```

**No new dependencies.** All required libs already in `package.json`. `@calcom/embed-react` is the one new install but it is gated: if the env var is unset, the embed never loads.

**Existing infra reused:**
- `checkIpRateLimit(ip)` from `lib/rate-limiter.ts`
- `supabaseAdmin` from `lib/supabase-admin.ts`
- `Resend` client + `FROM_EMAIL` constant from `lib/email.ts`
- `posthog-server.ts` capture helper
- Brand CSS variables from existing landing styles

## Database

New migration: `supabase/migrations/20260528c_agency_inquiries.sql`

```sql
CREATE TABLE agency_inquiries (
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

CREATE INDEX idx_agency_inquiries_status ON agency_inquiries(status);
CREATE INDEX idx_agency_inquiries_submitted ON agency_inquiries(submitted_at DESC);

ALTER TABLE agency_inquiries ENABLE ROW LEVEL SECURITY;
-- No public policies. Only the service role (supabaseAdmin) can read/write.
```

Two columns added beyond the original spec (`ip`, `user_agent`) — useful for abuse triage and analytics, never displayed to the user.

The migration is committed but **not pushed**. User applies via their normal workflow.

## Landing page structure

Nine sections, ordered top to bottom. All rendered server-side (no client JS for the static chrome).

| § | Section | Purpose | Key element |
|---|---|---|---|
| 1 | Hero | Hook + dual CTA | H1, subhead, "Request a demo" primary CTA (anchor to #inquiry), "Watch 90-sec demo" secondary (Loom embed placeholder) |
| 2 | The agency math | Pain → solution | 3 columns: "Voice consistency / Bulk scheduling / Client-facing reports" |
| 3 | Feature showcase | What you get | 5 cards: per-client voice fingerprints, white-label dashboard, bulk operations, cross-client analytics, single billing INR/intl with GST |
| 4 | Comparison table | Outflank Taplio | Rows: per-client voice, white-label, INR/GST, bulk ops, support, pricing. Cols: PersonaLink Agency / Taplio team plan / Hiring writers |
| 5 | How custom pricing works | Pre-empt the question | 3 tier-bullet (3–5 / 6–15 / 16+) + range disclosure (₹15K–₹50K/month most agencies) |
| 6 | Social proof | Trust (placeholder) | `{/* TODO */}` comment, 3 empty logo slots, 2 case-study slots ready to fill |
| 7 | FAQ | Defuse objections | 10 Qs (see Copy section below) |
| 8 | Inquiry form | Conversion | InquiryForm component (13 fields) |
| 9 | Final CTA + email | Last chance | Repeat anchor link to #inquiry + mailto |

### JSON-LD schema

Two `<script type="application/ld+json">` blocks injected in `metadata.other`:
- `SoftwareApplication` (name, applicationCategory, description, brand)
- `Service` (provider, serviceType: "LinkedIn content management for agencies", areaServed: "IN" + "Worldwide")

## Form UX

**13 fields, grouped into 5 visual blocks separated by spacing (not boxes):**

1. **About you**
   - Agency name (text, required)
   - Your name (text, required)
   - Your role at the agency (select: Founder / Operations / Client Lead / Other, required)

2. **How to reach you**
   - Work email (email, required)
   - Phone (tel with country-code dropdown defaulting to +91, optional)
   - Agency website (url, optional)
   - LinkedIn profile (url, optional)

3. **Your setup**
   - How many LinkedIn accounts do you manage? (radio chips: 1-2 / 3-5 / 6-15 / 16+, required)
   - Current tools you use (multi-select chips: Taplio / Hootsuite / Buffer / Manual / Other; "Other" reveals a text input, required to pick at least one)

4. **Your situation**
   - What's the #1 problem you're solving? (textarea, max 200 chars with live counter, required)
   - Preferred currency for billing (radio chips: INR / USD / EUR / GBP, required)
   - When do you want to start? (radio chips: This week / This month / Next quarter / Just exploring, required)

5. **Last thing**
   - How did you hear about us? (select: LinkedIn / Google / Referral / Press / Other, required)
   - Submit button: "Send inquiry — reply within 24 hours"

### Friction-reduction choices

- Chip-style radios for client_count / currency / timeline → 1-tap on mobile vs 2-tap dropdown.
- Multi-select uses chip toggles, not checkboxes — visually lighter, easier on mobile thumb.
- Phone field is optional; +91 is pre-selected.
- 200-char limit on primary_problem keeps the form completable in <90 seconds.

### No-JS fallback

```html
<form action="/api/agency-inquiry/submit" method="POST">
```

The API route inspects `Content-Type`:
- `application/json` → fetch path, returns `{ok: true}` JSON.
- `application/x-www-form-urlencoded` → returns `303 Redirect` to `/agency-inquiry/thank-you?name=...&agency=...`.

### Spam protection

- Honeypot field named `_hp_url` (renamed from the existing `website` to avoid collision with the real website field). Hidden via inline style + `aria-hidden`.
- IP rate limit: 10 requests/min (existing `checkIpRateLimit`).
- Extra signal: silently drop submissions where `primary_problem` contains a URL (`http://`, `https://`, or `www.`). Spam fingerprint.

## Emails (Resend)

Both new exports added to `lib/email.ts`:

### `sendAgencyInquiryAdminAlert`

- **To:** `hello@personalink.in`
- **Subject:** `Agency inquiry — {agency_name} ({client_count} clients)`
- **Body:** Plain HTML, all 13 fields in a clean `<table>`, IP + UA in footer, link to Supabase row (`https://supabase.com/dashboard/project/<ref>/editor/<table_id>?filter=id=<id>`), reminder "Reply within 24h".

### `sendAgencyInquiryAutoReply`

- **From:** `PersonaLink <noreply@personalink.in>`
- **Reply-To:** `hello@personalink.in`
- **To:** submitter
- **Subject:** `Got your inquiry — {agency_name}`
- **Body (HTML, brand voice):**

> Hi {first_name},
>
> Thanks for the note about {agency_name}. I'll review your details and reply within 24 hours with a Loom demo tailored to your setup ({client_count} clients).
>
> If you want to skip the wait, you can pick a slot here: {cal_url}
> (Cal link only rendered if `NEXT_PUBLIC_CAL_COM_URL` is set.)
>
> — Hamza, PersonaLink

No emojis. No exclamation. No "we're excited". Direct, polite, precise.

## Thank-you page

`/agency-inquiry/thank-you/page.tsx` — server component, reads `name` and `agency` from search params (defaults to empty strings if missing).

Contents:
1. Animated check (Framer Motion, single SVG path)
2. H2: "Got it, {first_name or 'thanks'}." (no exclamation)
3. P: "I'll reply within 24 hours with a Loom demo tailored to {agency or 'your setup'}."
4. If `NEXT_PUBLIC_CAL_COM_URL` set: `<CalEmbed />` — lazy-loaded `@calcom/embed-react` inline embed, with PostHog `agency_calendar_clicked` event on click.
5. Otherwise: mailto link to `hello@personalink.in`.
6. Sign-off: "— Hamza, PersonaLink"

Metadata: `robots: { index: false, follow: false }`.

## PostHog events

| Event | Side | Trigger | Properties |
|---|---|---|---|
| `agency_landing_viewed` | client | Mount of landing tracker | `utm_*`, `referrer` |
| `agency_form_started` | client | First focus inside form | — |
| `agency_form_field_completed` | client | First blur of each field with non-empty value | `field_name` |
| `agency_form_submitted` | client | After POST success | `client_count`, `timeline`, `source` |
| `agency_inquiry_received` | server | After DB insert success | `client_count`, `currency`, `timeline`, `source`, `tools_count` |
| `agency_thank_you_viewed` | client | Mount of thank-you tracker | — |
| `agency_calendar_clicked` | client | Cal embed click | — |

Client events fire via existing `posthog-js` pattern. Server event uses `posthog-server.ts`.

## Sitemap & SEO

- `app/sitemap.ts` already includes `/for-agencies` ✓ (no change).
- Thank-you page is not added to sitemap.
- `app/robots.ts` adds `Disallow: /agency-inquiry/thank-you` (or use Next.js `MetadataRoute.Robots` if not present).
- Thank-you page also sets `metadata.robots: { index: false, follow: false }`.
- Open Graph image: reuse `/og-image.png` for now, with a `TODO` comment marking the need for an agency-specific OG image.

## File deliverables

```
supabase/migrations/20260528c_agency_inquiries.sql        (new, not pushed)
app/for-agencies/page.tsx                                  (rewrite)
app/for-agencies/_components/
  ├─ ComparisonTable.tsx                                   (new)
  ├─ FAQ.tsx                                                (new)
  ├─ PricingTiers.tsx                                       (new)
  └─ LandingPostHogTracker.tsx                              (new, client)
app/agency-inquiry/thank-you/page.tsx                     (new)
app/agency-inquiry/thank-you/_components/
  ├─ CalEmbed.tsx                                           (new, client, env-gated)
  └─ ThankYouTracker.tsx                                    (new, client)
app/api/agency-inquiry/submit/route.ts                    (new)
components/agency/InquiryForm.tsx                          (new)
lib/email.ts                                               (add 2 exports)
app/robots.ts                                              (new or edit existing)
```

### Deletions (same commit cycle)

- `app/api/agency-lead/route.ts`
- `components/agency/AgencyLeadForm.tsx`

Both are uncommitted, so deletion is trivially safe.

## Verification plan

After implementation, run the preview workflow:

1. Start dev server.
2. Open `/for-agencies` — confirm hero, 9 sections, no console errors, JSON-LD blocks present (preview_eval `document.querySelectorAll('script[type="application/ld+json"]').length`).
3. Submit form with valid data — confirm `303` to thank-you, confirm row in `agency_inquiries`, confirm 2 emails sent (Resend logs).
4. Submit form via fetch (JS path) — confirm JSON response, confirm `router.push` to thank-you with query params.
5. Submit with honeypot field filled — confirm silent 200, no DB row.
6. Submit 11 times from same IP in <1 min — confirm 429 after 10.
7. Submit with `primary_problem` containing `https://spam.com` — confirm silent drop.
8. Open thank-you with no env var — confirm Cal embed hidden, mailto rendered.
9. preview_resize to 375×667 (iPhone SE) — confirm form, comparison table, FAQ are all usable.
10. preview_eval `window.location` after disabling JS — confirm form still submits (no-JS fallback).

## Copy decisions locked

**H1:** "The LinkedIn tool built for agencies. Not retrofitted for them."

**Subhead:** "Run 5, 15, or 50 client accounts. White-label everything. INR or international billing. GST invoices on day one."

**Primary CTA:** "Request a demo" (scrolls to #inquiry)

**Secondary CTA:** "Watch 90-sec demo" (Loom placeholder, opens in new tab)

**FAQ (10 questions):**

1. "Why no public pricing?" → "Every agency setup is different. We size the deal to your client count, white-label needs, and support level. You will not pay for things you do not use."
2. "Can clients tell we're using PersonaLink?" → "No. Full white-label. Your brand on the dashboard, your brand on invoices."
3. "Do you accept international agencies?" → "Yes. We invoice in USD, EUR, or GBP and accept international cards."
4. "GST invoices?" → "Yes. GST line items where applicable, ITC-claimable."
5. "Minimum commitment?" → "Quarterly billing. You can cancel any time before the next quarter."
6. "How fast can we onboard?" → "First three clients live in 48 hours. We handle the imports."
7. "Can you migrate us from Taplio?" → "Yes. We map your existing client accounts in one session and rebuild voice profiles from their post history. Most migrations take 2–3 days."
8. "What if a client leaves us?" → "Full data export, no lock-in. Their posts, drafts, and history are yours."
9. "Do you train our team?" → "Yes. Included for Tier 2 and above. One live session plus a recorded walkthrough."
10. "What's the typical agency MRR?" → "Most agencies pay between ₹15K and ₹50K per month, depending on client count and white-label requirements."

**Pricing tier copy:**

> We don't sell a tier. We sell a deal.
> - Tier 1 — 3 to 5 clients
> - Tier 2 — 6 to 15 clients
> - Tier 3 — 16+ clients
>
> Final pricing depends on your white-label requirements, support level, and onboarding needs. Most agencies pay between ₹15K and ₹50K per month.

**Comparison table cells** — written when implementing, following brand voice (verbs not adjectives, no emoji ticks, use plain text "Yes / No / Limited" + a one-line clarifier where needed).

## Open questions (deferred, not blockers)

- Loom 90-sec demo video — placeholder href until you record one.
- Social proof — 2-3 case studies and logos to be filled as you close agencies.
- OG image — agency-specific OG image to be designed.
- `NEXT_PUBLIC_CAL_COM_URL` — to be set in Vercel when you sign up for Cal.com.
