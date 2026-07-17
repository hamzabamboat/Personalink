# Connector for ChatGPT & Claude — UI + go-to-market plan

Status: connector is build-ready (sub-project 2 merged to PR #32). Not yet deployed. This plan
covers how to turn it from a working endpoint into a top-selling, discoverable feature.

All copy in this doc follows `docs/brand-voice.md` (Quiet Expert; verbs not adjectives; no
"unlock/supercharge/10x"). Swap nothing in without re-reading that file.

---

## 1. What we are selling (and what to call it)

Do not ship the word "MCP" to users. It means nothing to a founder.

**Feature name:** *Connect to ChatGPT & Claude* (settings label), *PersonaLink in your AI* (marketing).

**One-line value (landing/hero):**
> Use PersonaLink from ChatGPT and Claude. Ask for a post, approve it, schedule it — without leaving the chat.

**Support/description line:**
> Connect PersonaLink to ChatGPT or Claude. Draft, edit, schedule, and publish LinkedIn posts by
> chatting. It uses your voice, your story bank, and your plan's limits.

**Why this sells (the wedge):**
- The reader already lives in ChatGPT or Claude all day. This meets them there instead of asking for another tab.
- It is sticky. Once PersonaLink is wired into someone's daily AI tool, switching to a competitor means re-wiring their workflow.
- It is a clean differentiator. As of launch, the incumbents on our comparison pages (Taplio, Supergrow,
  AuthoredUp, Kleo, etc.) do not offer native AI-chat control. State this only while it stays true; do not invent usage stats.

---

## 2. The core UI problem

`app/dashboard/settings/ConnectedApps.tsx` today is a **passive management list** — it renders apps
only *after* they connect, with an empty state that says "No AI apps connected yet." There is:
- no way to start a connection,
- no setup instructions,
- no mention of the feature anywhere a user would discover it.

It is a "manage" surface pretending to be a feature. The whole plan below is about adding the
**activation** and **discovery** surfaces that turn it into something people find, connect, and pay for.

---

## 3. In-product UI surfaces to build

### 3.1 Settings — "Connect to ChatGPT & Claude" (the activation surface) — PRIORITY 1

Rebuild the top of the Connected-apps section from a list into an activation card. Structure:

1. **Header:** title + the one-line value prop above.
2. **The connection URL**, read-only, with a copy button:
   `https://personalink.in/api/mcp`
   Caption: "Paste this into your AI tool's connector settings. It will ask you to sign in and approve access."
3. **Two client tabs** — *Claude* and *ChatGPT* — each a numbered 3–4 step click-path:
   - **Claude:** Settings → Connectors → Add custom connector → paste the URL → approve.
   - **ChatGPT:** Settings → Connectors (Developer Mode) → Add → paste the URL → approve.
   Keep steps literal and short. Add one screenshot per client once the flow is live.
4. **What it can do** — plain-English scope list, matching the consent screen:
   - Read your posts, drafts, calendar, voice, and story bank.
   - Draft, edit, and schedule posts.
   - Publish — only after you confirm each post in the chat.
5. **The existing connected-apps list** (manage + revoke) moves directly below, unchanged in behaviour.

Design register: same card/rounded-2xl/mono-eyebrow system already in `ConnectedApps.tsx`. No new visual language.

### 3.2 Dashboard home — discovery nudge — PRIORITY 2

A single dismissible card on the dashboard home, shown once:
> **New — run PersonaLink from ChatGPT and Claude.** Draft and schedule posts by chatting. Set it up in Settings.

Dismiss state stored per-user so it does not nag. This is the main discovery driver for existing users.

### 3.3 Onboarding — optional final step — PRIORITY 2

Add an optional last onboarding step: "Connect your AI assistant (optional)" with a Skip. New users
see the feature at their moment of highest intent. Never block onboarding on it.

### 3.4 Consent screen polish — PRIORITY 1 (ships with 3.1)

The OAuth consent screen (`/oauth/authorize`, Task 7) is the trust moment. Confirm it: names the
requesting app, lists scopes in the same plain English as 3.1(4), is unmistakably PersonaLink-branded.
A confusing consent screen kills the connect rate.

### 3.5 Post-connect confirmation — PRIORITY 3

After a successful connect, the settings row shows a "✓ Connected" state and one suggested first
prompt: *Try asking your AI: "Draft a LinkedIn post about [topic]."* Turns a silent success into a first action.

---

## 4. Packaging & pricing (a decision for you)

The connector is a **channel**, not a metered feature — every action it takes already runs through the
existing plan limits (generation credits, post counts, rate limits). So do not build a second meter.

**Recommended model:**
- **Connecting is free on every plan**, including Free.
- Read tools (whoami, list_posts, view_calendar, get_profile, usage) work on Free.
- Generation, scheduling, and publishing consume the user's existing plan credits, and hit the existing
  paywall *inside the chat* when Free runs out.

Why: this makes the connector a **conversion driver**, not a gate. A Free user wires PersonaLink into
ChatGPT, asks for a post, hits "You've used your posts this month — upgrade" right there in the chat.
The upgrade prompt arrives at peak intent.

**Alternative** (if you want it as a pure upsell lever): gate the connector behind Standard/Pro. Simpler
story on the pricing page, but you lose the in-chat conversion moment. My recommendation is the first model.

**Decision needed from you:** which of the two. This changes the scope check on the tools (Free-tier
allowance) and the pricing-page copy.

Real tiers per current pricing: Free / Starter / Standard / Pro. (Note: `brand-voice.md` still quotes a
stale ₹1,499 — ignore it; use the live pricing page numbers.)

---

## 5. Marketing & SEO surfaces

1. **Landing section** on the homepage: "Works inside ChatGPT and Claude", with a short 3-line
   chat→post demo (static or looping). Place it high — this is a headline capability, not a footnote.
2. **Two dedicated pages** — `/chatgpt` and `/claude` — targeting net-new keywords we do not rank for
   today ("post to LinkedIn from ChatGPT", "LinkedIn ChatGPT connector", "Claude LinkedIn"). Our site is
   barely indexed; this is fresh keyword surface, not cannibalisation.
3. **Comparison pages:** add a "Works in ChatGPT / Claude" row to the `vs/*` tables. It is a row every
   competitor currently loses.
4. **Blog (howto, SEO):** "How to write and schedule LinkedIn posts from ChatGPT." Ship via the DB-backed
   blog + weekly SEO cron.
5. **Launch:** changelog entry, one LinkedIn post in brand voice, optional Product Hunt. No emoji, no "excited to announce".

Sample landing copy (brand voice):
> **Works inside ChatGPT and Claude.**
> Connect PersonaLink once. Then ask your AI to draft a post, and it writes in your voice. Approve it in
> the chat. It schedules and posts. Nothing to publish blind — you confirm every post before it goes live.

---

## 6. Build sequence

- **Phase 1 (ships with the connector):** 3.1 activation surface, 3.4 consent polish. Without these the
  feature is invisible even to people looking for it.
- **Phase 2:** 3.2 dashboard nudge, 3.3 onboarding step, Free-tier scope decision from §4.
- **Phase 3:** §5.1 landing section, §5.2 `/chatgpt` + `/claude` pages, §5.3 comparison row.
- **Phase 4:** §5.4 blog + §5.5 launch content.

---

## 7. What to measure

- **Connect rate:** % of active users who connect at least one AI app.
- **Actions per connected user / week** — is it used, or connected and forgotten.
- **Free→paid conversion from in-chat paywall hits** — the core monetization signal for the recommended model.
- **Retention delta:** 30-day retention of connected vs non-connected users (expected: higher; connector = stickiness).

---

## 8. Pre-launch blockers (from readiness review, not code)

1. Deploy to prod (`vercel --prod`) with `NEXT_PUBLIC_APP_URL=https://personalink.in`.
2. Apply `supabase/migrations/20260716_oauth.sql` to prod via `psql` (never `db push`).
3. Manually verify one full connect from ChatGPT and one from Claude before any marketing goes out.
