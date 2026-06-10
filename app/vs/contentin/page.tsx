import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/comparison/ComparisonPage'
import { getCompetitor } from '@/lib/competitor-data'
import { getUsdInrRate } from '@/lib/fx'

export const revalidate = 604800

export const metadata: Metadata = {
  title: 'ContentIn Alternative for Indian Creators | PersonaLink',
  description:
    'ContentIn is a capable LinkedIn ghostwriter, but USD-only with AI writing from its $31 plan. PersonaLink writes posts in your voice from ₹999/mo — INR billing, GST invoices, Hinglish, and voice notes. See the comparison.',
  keywords: [
    'contentin alternative india',
    'contentin alternative',
    'contentin competitor',
    'contentin vs personalink',
    'contentin pricing',
    'ai linkedin ghostwriter india',
    'gst invoice linkedin tool',
    'hinglish linkedin posts',
    'linkedin ai tool inr',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/vs/contentin',
    siteName: 'PersonaLink',
    title: 'ContentIn Alternative for Indian Creators | PersonaLink',
    description:
      'A LinkedIn ghostwriter built for India: INR billing, GST invoices, Hinglish and voice notes — vs ContentIn’s USD-only plans with AI writing from $31.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink vs ContentIn' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ContentIn Alternative India — PersonaLink',
    description: 'Voice-matched LinkedIn posts in INR, with GST, Hinglish and voice notes.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://personalink.in/vs/contentin' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'PersonaLink — ContentIn Alternative for Indian Creators',
  description:
    'AI LinkedIn ghostwriting in your voice from ₹999/month, billed in INR with GST invoices, plus Hinglish and voice notes — an India-first alternative to ContentIn.',
  brand: { '@type': 'Brand', name: 'PersonaLink' },
  url: 'https://personalink.in/vs/contentin',
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
  const c = getCompetitor('contentin', await getUsdInrRate())

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
