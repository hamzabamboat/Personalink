# PersonaLink — Competitive SEO Strategy (refreshed 2026-06-11)

> Generated from a searchfit competitor-analysis + content-gap audit (run locally — searchfit can't run in the cloud routine). Re-run monthly by the local **"SEO strategy refresh"** task.
> The ordered **blog** queue lives in `blog-backlog.md` (the weekly routine consumes it). **This file** holds the competitor intel, the **manual (non-blog) build queue**, and **on-page fixes** — none of which the weekly routine builds.

## Headline finding
Every competitor — **including the two India-domiciled ones (MagicPost, GhostPost)** — still bills in **USD with no GST/UPI/Hinglish**. PersonaLink's **India + price + Hinglish + GST/AEO** wedge is wide open across all of them.

## New competitors to watch (were not previously tracked)
- **MagicPost (magicpost.in)** — most dangerous under-watched rival. `.in` domain, LinkedIn-verified app, a **15-tool free-tools cluster**, a programmatic **`/comparison/` engine**, and an India-flavored blog (founder ideas, AuthoredUp review, EasyGen alternatives). **But still USD-priced (~$21–$69), no GST/UPI/Hinglish.** → **Build `/vs/magicpost` first (manual queue, P0).**
- **GhostPost (ghostpost.in)** — emerging India "AI LinkedIn ghostwriter for founders." Small footprint, no transparent INR pricing. Monitor; pre-empt via the `linkedin-ghostwriter-cost-india` post.

## Competitor cluster map — what each owns (don't fight head-on) / their India gap
| Competitor | Owns in search | India weakness = our wedge |
|---|---|---|
| **Taplio** | Brand authority; inspiration library; lead-gen; the "alternative-to" magnet | Cookie-auth ban risk; USD-only, no INR/GST/Hinglish; AI gated to pricey tiers |
| **Supergrow** | Largest free-tools programmatic cluster + comparison blog | Tools all English-only; no India/GST/Hinglish; entry plan = 0 AI credits |
| **ContentIn** | Programmatic `/alternatives/` engine + "best AI generator" listicles | USD-only; AI gated to higher tier; no India anywhere |
| **MagicPost (.in)** | The India content threat: verified app, 15 free tools, `/comparison/` engine, India blog | Still USD-priced, no GST/UPI/Hinglish despite `.in` |
| **AuthoredUp** | "Free/best LinkedIn tools" listicle authority; 300+ hooks; formatting/analytics | No AI writer; no India localization; extension-dependent |
| **EasyGen** | Creator-brand hooks/opening-lines | Single ~$59.99 USD plan, no free tier, no India fit |
| **Kleo** | "Inspiration/research" + lifetime-deal positioning | Doesn't write posts; static lifetime model; no India fit |
| **GhostPost (.in)** *(watch)* | Emerging India founder-ghostwriter | Tiny; no transparent INR pricing yet |

**Plant the flag where all are absent:** Hinglish + INR + GST/UPI, and the **AEO conversational** GST/INR/UPI questions.

## Manual build queue — NOT blog posts (need bespoke landing/tool/vs templates; the weekly routine will NOT build these)
- **P0 — `/vs/magicpost`** — add a `magicpost` slug to `lib/competitor-data.ts`, then create `app/vs/magicpost` (mirror the existing `/vs/*` pattern). Closes the one competitor with no page.
- **P0 — `/ai-linkedin-post-generator-india` (landing)** — primary target keyword "AI LinkedIn post generator India" has **no dedicated page** — biggest landing gap. Mirror `/ai-linkedin-automation-tool`.
- **P1 — `/linkedin-ai-tool-india` (hub)** — consolidate Cluster B into one authority hub that links every India/price/Hinglish/comparison asset.
- **P1 — `/tools/hinglish-linkedin-post-generator` (free tool)** — turn the Hinglish landing into an interactive, linkable asset (like `/tools/linkedin-cost-calculator`). Zero-competition moat term.
- **P1 — AEO answer page** for "LinkedIn AI tool with GST invoice / bills in INR / accepts UPI" — dedicated structured Q&A or a `/faq` expansion (keyword-universe Cluster I).
- **P2 — `/tools/linkedin-hook-generator` (free tool)** — Hinglish/India hook styles ONLY (the generic English formatter/hook SERP is saturated — don't ship a clone).
- **P2 — `/glossary` (+ child term pages)** — definitional/AEO entity pages (voice fingerprint, anti-AI humanizer, Hinglish, GST invoice, dwell time…). Cheap, strong internal-linking + AI-citation value.

## On-page wins on EXISTING pages (fastest ranking lift — do alongside new content)
1. **Expand `/blog/how-to-humanize-ai-linkedin-posts`** (~79 lines — thinnest page, on a money topic). Add before/after rewrites, a Hinglish humanization example, and 4–6 internal links.
2. **Raise internal links** on under-linked posts (e.g. `/blog/is-ai-linkedin-automation-allowed` has ~2) to ~6–8 contextual links into the relevant pillar hub + a commercial page. Pure upside, no new content.
3. **`lib/blog-posts.ts` is the sitemap source of truth** — every new post MUST be added there on publish or it's invisible to crawlers.
4. **Deepen `/blog/best-taplio-alternatives`** (~123 lines) and add the Taplio **AI-credit-gating** nuance (entry tier = ~0 AI credits; real AI cost is the higher tier). Refresh prices via the live fx rate (`inrFromUsd`).
5. **Cross-link the `/vs/*` pages** to each other + the listicle (generate a "Compare other tools" block from `getAllCompetitors()` in `competitor-data.ts`) so the comparison cluster forms a tight internal mesh.
6. **Tighten title/H1 exact-match:** `/ai-linkedin-automation-tool` H1 must carry "content automation, not outreach" (the disambiguation guardrail vs the outreach-bot SERP); `/cheap-linkedin-ai-tool-india` title/H1 must contain both "under ₹1,000" and "GST".

## Topic-cluster pillars (authority flow — hub links down, supporting links up + across to a commercial page)
- **Pillar A — AI LinkedIn tool for India (commercial spine):** hub `/linkedin-ai-tool-india` (new) ← landing `/ai-linkedin-automation-tool`; supporting: `/cheap-linkedin-ai-tool-india`, `/ai-linkedin-post-generator-india` (new), `/hinglish-linkedin-post-generator`, blog `gst-invoice-linkedin-tool-india`, `linkedin-ai-tool-under-1000-inr`, `cheapest-ai-linkedin-tools-india`.
- **Pillar B — Comparison / alternatives:** hub `/vs`; supporting: all `/vs/*`, `best-taplio-alternatives`, `taplio-vs-supergrow-vs-personalink`, `best-authoredup-alternatives`, `easygen-vs-contentin-vs-personalink`.
- **Pillar C — Grow on LinkedIn in India (info engine):** hub `/blog/how-to-grow-linkedin-india-2026`; supporting: `best-time-to-post-linkedin-india`, `why-your-linkedin-posts-get-zero-engagement`, `how-to-grow-on-linkedin-without-posting-daily`, `linkedin-content-ideas-india`, `linkedin-algorithm-2026`, `linkedin-hooks-that-work`.
- **Pillar D — Voice / humanizer / features:** hub `/features`; supporting: all `/features/*`, `/ai-linkedin-ghostwriter`, `/voice-analyzer`, `how-to-humanize-ai-linkedin-posts`, `is-ai-linkedin-automation-allowed`, `repurpose-blog-into-linkedin-posts`.
- **Persona overlay:** `/for-agencies`, `linkedin-for-indian-founders`, `linkedin-for-consultants-coaches-india`.
- **AEO overlay:** `/faq`, `/glossary`.

## Sources
Competitor pricing/positioning verified June 2026 via: Supergrow, ContentIn, Kleo, MagicPost (Taplio-alternatives + pricing pages), Capterra India, CheckThat.ai, SocialRails, Postiv, Postbeam, ConnectSafely, AuthoredUp, FeedBoss, G2, taplio.com/pricing, ghostpost.in, typefully.com. Treat volume/difficulty as directional analyst reads from live SERP observation, not tool-pulled numbers.
