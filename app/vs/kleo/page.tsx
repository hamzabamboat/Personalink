import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/comparison/ComparisonPage'
import { COMPETITORS } from '@/lib/competitor-data'

const c = COMPETITORS.kleo

export const metadata: Metadata = {
  title: 'Kleo Alternative for Indian Creators | INR Billing & Ongoing Voice Tuning with PersonaLink',
  description:
    'Kleo is a static lifetime tool. PersonaLink is a learning system — voice retunes weekly, India trends refresh, auto-publishes on schedule. INR billing, GST invoices, Hinglish supported.',
  keywords: [
    'kleo alternative india',
    'kleo alternative',
    'kleo competitor',
    'kleo vs personalink',
    'lifetime linkedin tool',
    'kleo pricing',
    'gst invoice linkedin tool',
    'hinglish linkedin posts',
    'linkedin auto publish india',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/vs/kleo',
    siteName: 'PersonaLink',
    title: 'Kleo Alternative for Indian Creators | PersonaLink',
    description:
      'Lifetime $99 is tempting. But Kleo stops improving the day you buy. PersonaLink keeps learning. Pay in INR, get GST invoices, post in Hinglish.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink vs Kleo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kleo Alternative India — PersonaLink',
    description: 'Static lifetime tool vs ongoing voice tuning. INR billing, GST invoices, Hinglish posts.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://personalink.in/vs/kleo' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'PersonaLink — Kleo Alternative for Indian Creators',
  description:
    'INR-native, GST-compliant, ongoing-improvement alternative to Kleo for Indian founders, consultants, and agencies.',
  brand: { '@type': 'Brand', name: 'PersonaLink' },
  url: 'https://personalink.in/vs/kleo',
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
