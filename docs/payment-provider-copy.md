# Payment Provider Product Copy

> **Dodo updates are scripted.** Run `npx tsx --env-file=.env.local scripts/update-dodo-descriptions.ts` to push the descriptions below to all 18 Dodo products via their API. Dodo allows partial product updates.
>
> **Razorpay updates must be manual.** Razorpay's API does not expose plan items for mutation after creation — neither `items.edit` nor `PATCH /v1/items/{id}` accepts the plan-internal item IDs. Use the [Razorpay Dashboard](https://dashboard.razorpay.com) to update plan names/descriptions, or create new plans and migrate subscribers.

All prices are derived from [`lib/pricing-config.ts`](../lib/pricing-config.ts); if you change a number there, update this file and re-run the Dodo script.

---

## Dodo Payments — Monthly (9 products)

### Starter Monthly — USD ($12)
**env var:** `DODO_PRODUCT_STARTER_USD`
**Description:** 12 LinkedIn posts/month in your voice. Scheduling. No watermark.
**Features:**
- 12 posts per month
- 1 voice fingerprint
- Post scheduling
- No watermark
- AI generation in your voice
- Story bank · 10 entries · 5 conversions
- Trend refreshes · 5/month
- Image uploads · 10/month

### Starter Monthly — EUR (€11)
**env var:** `DODO_PRODUCT_STARTER_EUR`
**Description:** 12 LinkedIn posts/month in your voice. Scheduling. No watermark.
**Features:** (same as USD)

### Starter Monthly — GBP (£10)
**env var:** `DODO_PRODUCT_STARTER_GBP`
**Description:** 12 LinkedIn posts/month in your voice. Scheduling. No watermark.
**Features:** (same as USD)

### Standard Monthly — USD ($30)
**env var:** `DODO_PRODUCT_STANDARD_USD`
**Description:** 22 posts/month, 3 voice fingerprints, carousel generator, WhatsApp delivery, Hinglish posts.
**Features:**
- 22 posts per month
- 3 voice fingerprints
- Carousel generator
- WhatsApp delivery
- Hinglish + code-mixed posts
- Voice notes → post · 8/month
- AI image generations · 3/month
- Story bank · 30 entries · 10 conversions
- Image uploads · 30/month
- Profile analyses · 4/month
- Everything in Starter

### Standard Monthly — EUR (€28)
**env var:** `DODO_PRODUCT_STANDARD_EUR`
**Description / Features:** (same as USD)

### Standard Monthly — GBP (£25)
**env var:** `DODO_PRODUCT_STANDARD_GBP`
**Description / Features:** (same as USD)

### Pro Monthly — USD ($60)
**env var:** `DODO_PRODUCT_PRO_USD`
**Description:** 50 posts/month, unlimited voice fingerprints, priority queue, Zapier + API access, repurpose engine.
**Features:**
- 50 posts per month
- Unlimited voice fingerprints
- Priority fingerprint queue
- Zapier + API access
- Repurpose engine · 10 runs/month
- Voice notes · 20/month · 60 min
- AI image generations · 10/month
- Story bank · 60 entries · 20 conversions
- Image uploads · 80/month
- Bulk generation · 4 runs/month
- Everything in Standard

### Pro Monthly — EUR (€55)
**env var:** `DODO_PRODUCT_PRO_EUR`
**Description / Features:** (same as USD)

### Pro Monthly — GBP (£50)
**env var:** `DODO_PRODUCT_PRO_GBP`
**Description / Features:** (same as USD)

---

## Dodo Payments — Annual (9 products, 25% off)

### Starter Annual — USD ($108/yr · $9/mo equivalent)
**env var:** `DODO_PRODUCT_STARTER_USD_ANNUAL`
**Description:** Save 25% — pay yearly. 12 LinkedIn posts/month in your voice. Scheduling. No watermark.
**Features:** Same as Starter Monthly USD, plus:
- 25% annual discount
- One charge per year

### Starter Annual — EUR (€99/yr)
**env var:** `DODO_PRODUCT_STARTER_EUR_ANNUAL`

### Starter Annual — GBP (£90/yr)
**env var:** `DODO_PRODUCT_STARTER_GBP_ANNUAL`

### Standard Annual — USD ($270/yr · $22.50/mo equivalent)
**env var:** `DODO_PRODUCT_STANDARD_USD_ANNUAL`
**Description:** Save 25% — pay yearly. 22 posts/month, 3 voice fingerprints, carousel, WhatsApp delivery.
**Features:** Same as Standard Monthly USD, plus:
- 25% annual discount
- One charge per year

### Standard Annual — EUR (€252/yr)
**env var:** `DODO_PRODUCT_STANDARD_EUR_ANNUAL`

### Standard Annual — GBP (£225/yr)
**env var:** `DODO_PRODUCT_STANDARD_GBP_ANNUAL`

### Pro Annual — USD ($540/yr · $45/mo equivalent)
**env var:** `DODO_PRODUCT_PRO_USD_ANNUAL`
**Description:** Save 25% — pay yearly. 50 posts/month, unlimited voice fingerprints, priority queue, Zapier + API.
**Features:** Same as Pro Monthly USD, plus:
- 25% annual discount
- One charge per year

### Pro Annual — EUR (€495/yr)
**env var:** `DODO_PRODUCT_PRO_EUR_ANNUAL`

### Pro Annual — GBP (£450/yr)
**env var:** `DODO_PRODUCT_PRO_GBP_ANNUAL`

---

## Razorpay — INR (6 products)

### Starter Monthly INR (₹999)
**env var:** `RAZORPAY_PLAN_ID_PERSONALINK_STARTER_PLAN` (or `RAZORPAY_PLAN_ID_STARTER`)
**Description:** 12 LinkedIn posts per month in your voice. Scheduling. No watermark. INR billing + GST invoice.
**Features:**
- 12 posts per month
- 1 voice fingerprint
- Post scheduling
- No watermark
- INR billing + GST invoice
- AI generation in your voice
- Story bank · 10 entries · 5 conversions
- Image uploads · 10/month
- 7-day free trial

### Standard Monthly INR (₹2,499)
**env var:** `RAZORPAY_PLAN_ID_PERSONALINK_STANDARD_PLAN` (or `RAZORPAY_PLAN_ID_STANDARD`)
**Description:** 22 posts/month, 3 voice fingerprints, carousel, Hinglish + WhatsApp delivery. INR billing + GST invoice.
**Features:**
- 22 posts per month
- 3 voice fingerprints
- Carousel generator
- Hinglish + code-mixed posts
- WhatsApp delivery
- Voice notes → post · 8/month
- AI image generations · 3/month
- Story bank · 30 entries · 10 conversions
- Image uploads · 30/month
- INR billing + GST invoice
- 7-day free trial

### Pro Monthly INR (₹4,999)
**env var:** `RAZORPAY_PLAN_ID_PERSONALINK_PRO_PLAN` (or `RAZORPAY_PLAN_ID_PRO`)
**Description:** 50 posts/month, unlimited voice fingerprints, priority queue, Zapier + API, repurpose engine.
**Features:**
- 50 posts per month
- Unlimited voice fingerprints
- Priority fingerprint queue
- Zapier + API access
- Repurpose engine · 10 runs/month
- Voice notes · 20/month · 60 min
- AI image generations · 10/month
- Bulk generation · 4 runs/month
- INR billing + GST invoice
- 7-day free trial

### Starter Annual INR (₹8,991/yr — save 25%)
**env var:** `RAZORPAY_PLAN_ID_STARTER_ANNUAL`
**Description:** Save 25% — pay yearly. Everything in Starter Monthly. INR billing + GST invoice.

### Standard Annual INR (₹22,491/yr — save 25%)
**env var:** `RAZORPAY_PLAN_ID_STANDARD_ANNUAL`
**Description:** Save 25% — pay yearly. Everything in Standard Monthly. INR billing + GST invoice.

### Pro Annual INR (₹44,991/yr — save 25%)
**env var:** `RAZORPAY_PLAN_ID_PRO_ANNUAL`
**Description:** Save 25% — pay yearly. Everything in Pro Monthly. INR billing + GST invoice.

---

## Verification checklist

After updating each provider:

- [ ] Dodo dashboard: confirm all 18 product IDs match Vercel env vars (12 in `DODO_PRODUCT_*` and 6 are annual variants).
- [ ] Razorpay dashboard: confirm all 6 INR plan IDs match Vercel env vars.
- [ ] One end-to-end test per processor: start a trial as a new user, see correct quota in the dashboard, cancel before charge.
- [ ] Pricing page at `/pricing` renders correctly with all 4 currencies (INR/USD/EUR/GBP) and both billing periods.
