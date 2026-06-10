import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/comparison/ComparisonPage'
import { getCompetitor } from '@/lib/competitor-data'
import { getUsdInrRate } from '@/lib/fx'

export const revalidate = 604800

export const metadata: Metadata = {
  title: 'MagicPost Alternative for India — INR, GST, Hinglish | PersonaLink',
  description:
    'MagicPost runs on a .in domain but bills in USD ($21–$39/mo) with no GST, UPI or Hinglish, and its AI writing starts on the $39 plan. PersonaLink writes posts in your voice from ₹999/mo — INR billing, GST invoices, Hinglish and voice notes. See the comparison.',
  keywords: [
    'magicpost alternative india',
    'magicpost alternative',
    'magicpost competitor',
    'magicpost vs personalink',
    'magicpost pricing india',
    'magicpost inr',
    'ai linkedin tool india',
    'gst invoice linkedin tool',
    'hinglish linkedin posts',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/vs/magicpost',
    siteName: 'PersonaLink',
    title: 'MagicPost Alternative for India — INR, GST, Hinglish | PersonaLink',
    description:
      'A .in tool that still bills in USD. PersonaLink is the India-native pick: from ₹999/mo, INR billing, GST invoices, Hinglish and voice notes vs MagicPost’s $21–$39 USD plans.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink vs MagicPost' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MagicPost Alternative India — PersonaLink',
    description: 'From ₹999/mo vs MagicPost’s $21–$39. INR, GST, Hinglish, voice notes.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://personalink.in/vs/magicpost' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'PersonaLink — MagicPost Alternative for Indian Creators',
  description:
    'AI LinkedIn writing in your voice from ₹999/month, billed in INR with GST invoices, plus Hinglish and voice notes — an India-native alternative to MagicPost.',
  brand: { '@type': 'Brand', name: 'PersonaLink' },
  url: 'https://personalink.in/vs/magicpost',
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
  const c = getCompetitor('magicpost', await getUsdInrRate())

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
