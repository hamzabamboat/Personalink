import type { Metadata } from 'next'

// Pricing is a client component and cannot export its own metadata, so this
// server-component layout supplies it. Without this, /pricing inherited the
// root layout's homepage title + canonical (which deindexed it).
export const metadata: Metadata = {
  title: 'PersonaLink Pricing — Plans from ₹999/mo, INR & GST',
  description:
    'PersonaLink pricing in INR: Free, Starter ₹999/mo, Standard ₹2,499, Pro ₹4,999. GST invoices, UPI/Razorpay, 7-day free trial. The AI LinkedIn tool built for India.',
  keywords: [
    'LinkedIn AI tool pricing',
    'AI LinkedIn automation tool under 1000 INR',
    'cheapest AI LinkedIn tool India',
    'LinkedIn AI tool INR pricing',
    'GST invoice LinkedIn tool',
  ],
  alternates: { canonical: 'https://personalink.in/pricing' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/pricing',
    siteName: 'PersonaLink',
    title: 'PersonaLink Pricing — Plans from ₹999/mo (INR, GST invoices)',
    description:
      'Free, Starter ₹999, Standard ₹2,499, Pro ₹4,999 per month. INR billing, GST invoices, UPI/Razorpay. The AI LinkedIn tool built for India.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink pricing — plans from ₹999/mo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PersonaLink Pricing — from ₹999/mo, INR & GST',
    description: 'Free, Starter ₹999, Standard ₹2,499, Pro ₹4,999/mo. INR billing, GST invoices, UPI.',
    images: ['/og-image.png'],
  },
}

const PRICING_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'PersonaLink — AI LinkedIn Tool',
  description:
    'AI LinkedIn manager that writes posts in your voice, auto-publishes on schedule, and shows what resonates. INR billing with GST invoices.',
  brand: { '@type': 'Brand', name: 'PersonaLink' },
  url: 'https://personalink.in/pricing',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '999',
    highPrice: '4999',
    priceCurrency: 'INR',
    offerCount: 3,
    availability: 'https://schema.org/InStock',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PRICING_JSON_LD) }} />
      {children}
    </>
  )
}
