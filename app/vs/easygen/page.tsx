import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/comparison/ComparisonPage'
import { getCompetitor } from '@/lib/competitor-data'
import { getUsdInrRate } from '@/lib/fx'

export const revalidate = 604800

export const metadata: Metadata = {
  title: 'EasyGen Alternative for Indian Creators | PersonaLink',
  description:
    'EasyGen is a $59.99/mo single-plan LinkedIn AI writer, USD-only with no free tier. PersonaLink writes posts in your voice too — from ₹999/mo, billed in INR with GST invoices, plus Hinglish and voice notes. See the comparison.',
  keywords: [
    'easygen alternative india',
    'easygen alternative',
    'easygen competitor',
    'easygen vs personalink',
    'cheaper easygen alternative',
    'easygen pricing',
    'ai linkedin writer india',
    'gst invoice linkedin tool',
    'hinglish linkedin posts',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/vs/easygen',
    siteName: 'PersonaLink',
    title: 'EasyGen Alternative for Indian Creators | PersonaLink',
    description:
      'Same LinkedIn AI writing, a fraction of the price: PersonaLink from ₹999/mo, INR billing, GST invoices, Hinglish and voice notes vs EasyGen’s $59.99 single plan.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink vs EasyGen' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EasyGen Alternative India — PersonaLink',
    description: 'From ₹999/mo vs EasyGen’s $59.99. INR, GST, Hinglish, voice notes.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://personalink.in/vs/easygen' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'PersonaLink — EasyGen Alternative for Indian Creators',
  description:
    'AI LinkedIn writing in your voice from ₹999/month, billed in INR with GST invoices, plus Hinglish and voice notes — an India-first alternative to EasyGen.',
  brand: { '@type': 'Brand', name: 'PersonaLink' },
  url: 'https://personalink.in/vs/easygen',
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
  const c = getCompetitor('easygen', await getUsdInrRate())

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
