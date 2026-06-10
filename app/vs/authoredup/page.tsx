import type { Metadata } from 'next'
import { ComparisonPage } from '@/components/comparison/ComparisonPage'
import { getCompetitor } from '@/lib/competitor-data'
import { getUsdInrRate } from '@/lib/fx'

export const revalidate = 604800

export const metadata: Metadata = {
  title: 'AuthoredUp Alternative for Indian Creators | PersonaLink',
  description:
    'AuthoredUp formats and analyzes your LinkedIn posts — but you write every one, in USD. PersonaLink writes posts in your voice, auto-publishes, does Hinglish, and bills in INR with GST invoices. See the full comparison.',
  keywords: [
    'authoredup alternative india',
    'authoredup alternative',
    'authoredup competitor',
    'authoredup vs personalink',
    'authoredup pricing',
    'ai linkedin writer india',
    'gst invoice linkedin tool',
    'hinglish linkedin posts',
    'linkedin ghostwriter ai india',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in/vs/authoredup',
    siteName: 'PersonaLink',
    title: 'AuthoredUp Alternative for Indian Creators | PersonaLink',
    description:
      'AuthoredUp formats your posts; PersonaLink writes them — in your voice, in INR, with GST invoices, plus auto-publish and Hinglish.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink vs AuthoredUp' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AuthoredUp Alternative India — PersonaLink',
    description: 'It formats; we write — in your voice. INR, GST, Hinglish, auto-publish.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://personalink.in/vs/authoredup' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'PersonaLink — AuthoredUp Alternative for Indian Creators',
  description:
    'AI writing in your voice, voice notes, repurpose engine, Hinglish, and INR billing with GST invoices — an India-first alternative to AuthoredUp for founders, consultants, and agencies.',
  brand: { '@type': 'Brand', name: 'PersonaLink' },
  url: 'https://personalink.in/vs/authoredup',
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
  const c = getCompetitor('authoredup', await getUsdInrRate())

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
