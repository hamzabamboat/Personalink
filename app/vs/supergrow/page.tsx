import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/comparison/ComparisonPage'
import { COMPETITORS } from '@/lib/competitor-data'

const c = COMPETITORS.supergrow

export const metadata: Metadata = {
  title: 'Supergrow Alternative for Indian Creators | Deeper Voice + INR Billing | PersonaLink',
  description:
    'Supergrow gets you a scheduler. PersonaLink gets you a voice that compounds. Same price tier, twice the depth — voice notes, story bank, repurpose engine, agency mode. INR billed, GST invoiced.',
  keywords: [
    'supergrow alternative india',
    'supergrow alternative',
    'supergrow competitor',
    'supergrow vs personalink',
    'best linkedin scheduler india',
    'supergrow pricing',
    'gst invoice linkedin tool',
    'hinglish linkedin posts',
    'linkedin ghostwriter ai india',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/vs/supergrow',
    siteName: 'PersonaLink',
    title: 'Supergrow Alternative for Indian Creators | PersonaLink',
    description:
      'Roughly the same price. Twice the depth. Voice notes, story bank, repurpose engine, Hinglish — plus INR billing and GST invoices.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink vs Supergrow' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Supergrow Alternative India — PersonaLink',
    description: 'Twice the depth at the same price. INR, GST, Hinglish, agency mode.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://personalink.in/vs/supergrow' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'PersonaLink — Supergrow Alternative for Indian Creators',
  description:
    'Deeper voice fingerprint, story bank, repurpose engine, Hinglish, and agency mode at similar price to Supergrow — for Indian founders, consultants, and agencies.',
  brand: { '@type': 'Brand', name: 'PersonaLink' },
  url: 'https://personalink.in/vs/supergrow',
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '999',
    highPrice: '4999',
    priceCurrency: 'INR',
    offerCount: 3,
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '47' },
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
      <ComparisonPage competitor={c} />
    </>
  )
}
