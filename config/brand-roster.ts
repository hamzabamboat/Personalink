/**
 * Seed roster for the Brand Stories library.
 *
 * The weekly cron (/api/cron/brand-stories) researches every company here —
 * plus a handful of AI-discovered trending brands — and auto-publishes the
 * ones that clear citation enforcement. Edit this list to curate the roster;
 * there is no per-company approval step, so this file IS the editorial control
 * point. Slugs must be stable (they key idempotent upserts).
 *
 * Lean toward brands PersonaLink's India-first audience actually writes about:
 * Indian consumer/fintech/SaaS names plus globally-known case studies.
 */

export type RosterEntry = {
  slug: string
  name: string
  sector: string
}

export const BRAND_ROSTER: RosterEntry[] = [
  { slug: 'zomato', name: 'Zomato', sector: 'food-delivery' },
  { slug: 'zerodha', name: 'Zerodha', sector: 'fintech' },
  { slug: 'cred', name: 'CRED', sector: 'fintech' },
  { slug: 'nykaa', name: 'Nykaa', sector: 'e-commerce' },
  { slug: 'boat', name: 'boAt', sector: 'consumer-electronics' },
  { slug: 'razorpay', name: 'Razorpay', sector: 'fintech' },
  { slug: 'zepto', name: 'Zepto', sector: 'quick-commerce' },
  { slug: 'notion', name: 'Notion', sector: 'saas' },
  { slug: 'figma', name: 'Figma', sector: 'saas' },
  { slug: 'stripe', name: 'Stripe', sector: 'fintech' },
  { slug: 'canva', name: 'Canva', sector: 'saas' },
  { slug: 'duolingo', name: 'Duolingo', sector: 'edtech' },
  { slug: 'airbnb', name: 'Airbnb', sector: 'marketplace' },
  { slug: 'spotify', name: 'Spotify', sector: 'consumer-media' },
  { slug: 'netflix', name: 'Netflix', sector: 'consumer-media' },
]
