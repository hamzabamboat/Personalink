import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/comparison/ComparisonPage'
import { COMPETITORS } from '@/lib/competitor-data'

const c = COMPETITORS.taplio

export const metadata: Metadata = {
  title: 'Taplio Alternative for Indian Creators | Save 70% with PersonaLink',
  description:
    'Same Taplio features. Billed in INR. GST invoices. Hinglish posts. Save up to ₹50,000/year. Switch in 5 minutes — we handle the migration.',
  keywords: [
    'taplio alternative india',
    'taplio alternative',
    'taplio competitor',
    'taplio vs personalink',
    'best linkedin tool india',
    'linkedin scheduler india',
    'taplio pricing india',
    'gst invoice linkedin tool',
    'hinglish linkedin posts',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/vs/taplio',
    siteName: 'PersonaLink',
    title: 'Taplio Alternative for Indian Creators | Save 70% with PersonaLink',
    description:
      'Same features. Pay in INR. Get GST invoices. Hinglish supported. Save up to ₹50,000/year vs Taplio.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink vs Taplio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taplio Alternative India — PersonaLink',
    description: 'Save up to 70% switching from Taplio. INR billing, GST invoices, Hinglish posts.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://personalink.in/vs/taplio' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'PersonaLink — Taplio Alternative for Indian Creators',
  description:
    'INR-native, GST-compliant, Hinglish-aware alternative to Taplio for Indian founders, consultants, and agencies.',
  brand: { '@type': 'Brand', name: 'PersonaLink' },
  url: 'https://personalink.in/vs/taplio',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '999',
    highPrice: '4999',
    priceCurrency: 'INR',
    offerCount: 3,
    availability: 'https://schema.org/InStock',
  },
}

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: c.faq.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://personalink.in/vs' }, { '@type': 'ListItem', position: 3, name: `${c.name} alternative`, item: `https://personalink.in/vs/${c.slug}` }] }) }} />
      <ComparisonPage competitor={c} />
    </>
  )
}
