import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/comparison/ComparisonPage'
import { getCompetitor } from '@/lib/competitor-data'
import { getUsdInrRate } from '@/lib/fx'

export const revalidate = 604800

export const metadata: Metadata = {
  title: 'Kleo Alternative for Indian Creators | PersonaLink',
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
}

export default async function Page() {
  const c = getCompetitor('kleo', await getUsdInrRate())

  const FAQ_LD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faq.map((f: { q: string; a: string }) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://personalink.in/vs' }, { '@type': 'ListItem', position: 3, name: `${c.name} alternative`, item: `https://personalink.in/vs/${c.slug}` }] }) }} />
      <ComparisonPage competitor={c} />
    </>
  )
}
