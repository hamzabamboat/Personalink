# Image Feature — GTM Plan & Landing Copy

**Date:** 2026-06-10
**Pairs with:** `2026-06-10-image-generation-carousels-design.md`
**Covers original task "b":** competitive landing copy weaponizing the image feature + Dynal's weaknesses.

> ⚠️ **Stats rule:** PersonaLink has no proprietary usage data yet. Every number used in marketing must be a **cited external source** or a **defensible product claim** — never a fabricated "in our data" figure. The "12 drafts / 5× reach" in mockups are *illustrative placeholders* and must be replaced with cited or generic-value framing before publishing.

---

## 1. Core message

**One-liner:** *"Every post, picture-perfect. Unlimited branded graphics + AI images — no watermark, no credits to run out."*

**Three proof pillars (each a direct Dynal wound, all verified in our code):**
1. **Unlimited branded graphics** — template cards cost us ~$0.003, so we give them away. Dynal meters everything in credits that "don't last the month."
2. **Your brand, never ours** — zero watermark. Dynal's #1 complaint: *"'Made with DynalAI' on all my images, can't disable it."*
3. **Failed renders are free** — we charge quota only on success. Dynal's other top complaint: *"failed image attempts still deduct credits."*

## 2. The unlock: the product is the marketing asset

Every graphic in the campaign is produced by the feature itself (see `/tmp/pl-templates/marketing/*.png`). Show, don't tell — same playbook as the existing free Voice Analyzer.

## 3. Landing page

### 3a. New "Visuals" section copy (drop-in)

**Eyebrow:** PICTURE-PERFECT POSTS
**H2:** Give every post a visual — without the credit anxiety.
**Sub:** Turn any post into a branded quote card, stat graphic, or swipeable carousel in one click. Unlimited branded graphics. AI images when you want them. Your brand on every pixel — never ours.

**Feature bullets:**
- **Unlimited branded graphics** — quote, stat, title & list cards, rendered crisp every time.
- **AI photo images** — photorealistic visuals in your brand style (25/mo Standard, 50/mo Pro).
- **Carousels that publish as PDFs** — the highest-engagement LinkedIn format, in your theme.
- **No watermark. Ever.** Your name on the card, not ours.
- **Failed render? Free.** You're only charged when you actually get an image.

**Primary CTA:** Try the free graphic generator → *(links to the no-login mini-tool, Phase 3)*
**Secondary CTA:** See plans

### 3b. Comparison block (use `mkt-7-comparison.png`)

| | Other AI tools | PersonaLink |
|---|---|---|
| Watermark | "Made with …" forced | **None — your brand** |
| Failed renders | Still cost credits | **Free** |
| Graphics | Metered credits | **Unlimited branded graphics** |
| Carousels | Burn credits fast | **Cheap, in your theme** |

### 3c. Flip the existing `/vs/*` pages (highest ROI, lowest effort)

`lib/competitor-data.ts` currently *concedes* the gap. On ship, update:
- `Carousel generator`: `pl: '⚠️ Beta'` → **`pl: '✅'`** (Taplio, Kleo, Supergrow rows)
- `Public viral-post inspiration library`: keep ⚠️ until the viral-library ships (separate spec)
- **Add 3 new winning rows** to `voiceRows`/a new `visualRows` block:
  - `{ label: 'Unlimited branded graphics', pl: '✅', competitor: '⚠️ Credit-metered', highlight: 'pl' }`
  - `{ label: 'No watermark on images', pl: '✅', competitor: '⚠️ Forced on lower tiers', highlight: 'pl' }`
  - `{ label: 'Failed renders are free', pl: '✅', competitor: '❌ Still charged', highlight: 'pl' }`

## 4. Articles (SEO)

> When writing each, invoke the `searchfit-seo:content-strategy` / `create-content` skill for real keyword targeting + schema. India angle where natural (ties to existing blog: `best-time-to-post-linkedin-india`, `best-taplio-alternatives`). Note site indexation is weak (separate fix).

| Article | Target intent | Funnel | Angle |
|---|---|---|---|
| LinkedIn carousel maker: turn any post into a swipeable PDF (2026) | "linkedin carousel maker" | Mid | How-to + product |
| Free LinkedIn quote-card generator (no watermark) | "linkedin quote card generator" | Lead-gen | Routes to free tool |
| Dynal.AI alternative for LinkedIn images — no credit limits | "dynal alternative" | Bottom | Ties to `/vs/` |
| Why every LinkedIn post needs a visual (and how to make one in 10s) | "linkedin post images" | Top | Education |
| Best LinkedIn graphic tools for creators in India, 2026 | listicle / India | Top | Comparison |

## 5. Marketing graphics manifest

Rendered set in `/tmp/pl-templates/marketing/` (regen via `render2.js`). Production = real brand palette + cited stats.
- `mkt-7-comparison.png` — **hero comparison** (landing 3b, ads, `/vs/` pages).
- `mkt-5-launch.png` — launch/announcement (social, email header).
- `mkt-1-quote`, `mkt-2-stat`, `mkt-3-tips`, `mkt-4-myth`, `mkt-6-carousel-cover` — **gallery wall** showing range (landing, "what you can make").
- **To add:** an animated GIF (prompt → card appears) for the hero/demo.

## 6. Proof / demo

- **Free no-login card generator** (Phase 3, `/api/tools/card-generator`) — type a line → get a branded card. Landing + demo + lead magnet in one. Mirrors the Voice Analyzer that already converts.
- **In-app empty state:** every post without an image shows a clear "Add a graphic to this post" nudge (satisfies R1).

## 7. Sequencing

- **Now (pre-ship):** lock messaging; produce hero graphics ✅ (done); draft articles (slow to rank — start early).
- **At feature ship (Phase 1):** landing "Visuals" section live; `/vs/` rows flip; comparison graphic live; articles publish; in-app nudges on.
- **Phase 2/3:** carousel showcase; free card-generator tool; gallery grows from real user output (with consent); amplify.
