import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'
import { getUsdInrRate, inrFromUsd } from '@/lib/fx'
import { inr } from '@/lib/competitor-data'

export const revalidate = 604800

const URL = 'https://personalink.in/blog/taplio-vs-supergrow-vs-personalink'

export const metadata: Metadata = {
  title: 'Taplio vs Supergrow vs PersonaLink: India Cut (2026)',
  description:
    'Taplio vs Supergrow compared — price, voice accuracy, auto-publish — plus the India-native third option with INR billing, GST invoices and Hinglish support.',
  keywords: [
    'Taplio vs Supergrow',
    'Taplio vs Supergrow India',
    'Taplio alternative India',
    'Supergrow alternative India',
    'LinkedIn AI tool India',
  ],
  alternates: { canonical: URL },
  openGraph: {
    type: 'article',
    locale: 'en_IN',
    url: URL,
    siteName: 'PersonaLink',
    title: 'Taplio vs Supergrow vs PersonaLink: the India cut (2026)',
    description:
      'The global Taplio vs Supergrow head-to-head, reframed for India: INR costs, GST, Hinglish and who wins on each dimension.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Taplio vs Supergrow vs PersonaLink India 2026' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taplio vs Supergrow vs PersonaLink (India 2026)',
    description: 'INR costs, GST, Hinglish — the three-way LinkedIn tool comparison India creators actually need.',
    images: ['/og-image.png'],
  },
}

const FAQS = [
  {
    q: 'Taplio vs Supergrow — which is better?',
    a: 'It depends on budget and depth. Supergrow is cheaper ($19 Solo vs Taplio\'s $39 Standard) and has a faster onboarding. Taplio has a more mature feature set — deeper analytics, a Chrome extension, and a larger inspiration library. Neither bills in INR, issues a GST invoice, or writes Hinglish.',
  },
  {
    q: 'Is Supergrow really cheaper than Taplio?',
    a: 'Supergrow\'s Solo plan starts at $19/month — roughly half Taplio\'s entry price. Both bill in USD, so Indian buyers also pay a foreign-currency surcharge (typically 2–4% on Indian cards) with no GST credit. PersonaLink\'s Starter plan at ₹999/month is billed in INR so that surcharge doesn\'t apply, and every invoice carries a GSTIN.',
  },
  {
    q: 'Do Taplio or Supergrow support INR billing or GST invoices?',
    a: 'No. Both bill in USD via international payment processors and cannot issue an India GST invoice. That means Indian businesses cannot claim the 18% GST input tax credit, effectively making the real cost higher than the sticker price suggests.',
  },
  {
    q: 'Do Taplio or Supergrow write Hinglish posts?',
    a: 'Neither tool has native code-mixed Hinglish support. Both are built for English-speaking markets and tend to either translate Hinglish terms into formal English or produce awkward transliterated output.',
  },
  {
    q: 'What is the best LinkedIn AI tool for India?',
    a: 'For India-based creators, PersonaLink is built specifically for the market — INR billing from ₹999/month, GST invoices, UPI/Razorpay payments, native Hinglish, India-aware trending topics, and a 6-dimension voice fingerprint so posts sound like you rather than generic AI.',
  },
  {
    q: 'Can I migrate from Taplio or Supergrow to PersonaLink?',
    a: 'Yes. Export your scheduled queue as a CSV from Taplio (Settings → Export) or Supergrow (Settings → Data export), then email it to migrate@personalink.in. We\'ll reimport your scheduled posts within 24 hours. You also paste 3 of your best posts at onboarding to build your voice fingerprint.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Taplio vs Supergrow vs PersonaLink: the India cut (2026)',
      description:
        'The global Taplio vs Supergrow head-to-head, reframed for India: INR costs, GST, Hinglish and who wins on each dimension.',
      image: 'https://personalink.in/og-image.png',
      datePublished: '2026-06-15',
      dateModified: '2026-06-15',
      inLanguage: 'en-IN',
      author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' },
      publisher: {
        '@type': 'Organization',
        name: 'PersonaLink',
        url: 'https://personalink.in',
        logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': URL },
      articleSection: 'LinkedIn Tools',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Taplio vs Supergrow vs PersonaLink',
          item: URL,
        },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
}

const aw = { maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(28px,5vw,44px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.12, margin: '0 0 18px' } as const
const H2 = { fontSize: 'clamp(20px,3vw,28px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '40px 0 14px' } as const
const P = { fontSize: 17, lineHeight: 1.75, color: 'var(--ink-2)', margin: '0 0 18px' } as const
const link = { color: 'var(--pl-accent)' } as const

const tdBase: React.CSSProperties = {
  padding: '11px 14px',
  fontSize: 14.5,
  lineHeight: 1.55,
  color: 'var(--ink-2)',
  borderBottom: '1px solid var(--line)',
  verticalAlign: 'top',
}
const thBase: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--ink)',
  background: 'var(--surface)',
  borderBottom: '2px solid var(--line)',
  textAlign: 'left',
}

export default async function Page() {
  const rate = await getUsdInrRate()

  const taplioStd = inrFromUsd(39, rate)
  const taplioMid = inrFromUsd(65, rate)
  const supergrowSolo = inrFromUsd(19, rate)
  const supergrowPro = inrFromUsd(39, rate)

  const ROWS: [string, string, string, string][] = [
    ['Entry-level price', `${inr(taplioStd)}/mo ($39)`, `${inr(supergrowSolo)}/mo ($19)`, '₹999/mo'],
    ['Mid-tier price', `${inr(taplioMid)}/mo ($65)`, `${inr(supergrowPro)}/mo ($39)`, '₹2,499/mo'],
    ['INR billing', '❌ USD only', '❌ USD only', '✅ Native'],
    ['GST invoice', '❌', '❌', '✅ GSTIN on every invoice'],
    ['UPI / Razorpay', '❌', '❌', '✅'],
    ['Hinglish posts', '❌ English only', '❌ English only', '✅ Native code-mixed'],
    ['6-dimension voice fingerprint', '⚠️ Style match', '⚠️ Style match', '✅ Rhythm · vocab · hook · warmth · openings · punctuation'],
    ['Voice notes → post', '❌', '❌', '✅'],
    ['Auto-publish via LinkedIn OAuth', '✅', '✅', '✅'],
    ['Repurpose engine', '⚠️ Manual remix', '⚠️ Basic', '✅'],
    ['Story bank', '❌', '❌', '✅'],
    ['India-aware trends & hooks', '❌ Global only', '❌ Global only', '✅'],
    ['Free plan', '❌', '❌', '✅ 3 posts/month, no card'],
    ['Free trial', '7-day, card required', '7-day, card up front', '7-day, no card required'],
  ]

  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>
          LinkedIn Tools · 8 min read
        </div>
        <h1 style={H1s}>Taplio vs Supergrow vs PersonaLink: the India cut (2026)</h1>
        <p style={P}>
          Search "Taplio vs Supergrow" and you'll find plenty of head-to-heads — but they all assume you're paying in
          dollars, posting in English, and don't care about a GST invoice. If you're an Indian creator, founder or
          consultant, none of those comparisons give you the full picture. This one does.
        </p>
        <p style={P}>
          Both Taplio and Supergrow are capable LinkedIn tools. The question for India-based buyers isn't just which has
          more features — it's what the <em>real</em> cost looks like in INR, whether your CA can actually book it as a
          business expense, and whether the AI can write the way you actually sound.
        </p>

        <h2 style={H2}>Taplio vs Supergrow: what each tool is</h2>
        <p style={P}>
          <strong>Taplio</strong> is the market-leader benchmark for LinkedIn content tools — a polished all-in-one with AI
          writing, a Chrome extension that surfaces inspiration inline, analytics, a large hook library, and carousels.
          Its Standard plan starts at{' '}
          <strong>${'$'}39/month</strong> (~{inr(taplioStd)} at today's rate), rising to $65/month for the Pro tier.
          See the full{' '}
          <Link href="/vs/taplio" style={link}>PersonaLink vs Taplio comparison</Link> for a feature-by-feature breakdown.
        </p>
        <p style={P}>
          <strong>Supergrow</strong> pitches itself as the affordable alternative: $19/month for the Solo plan, $39 for Pro.
          It covers scheduling, AI drafts, and a decent repurpose workflow — less depth than Taplio but at roughly half the
          entry price. See our{' '}
          <Link href="/vs/supergrow" style={link}>PersonaLink vs Supergrow comparison</Link> for more detail.
        </p>
        <p style={P}>
          On paper the choice looks simple: Taplio if you want the feature richness, Supergrow if price is the priority.
          But for India, there's a third question neither tool answers.
        </p>

        <h2 style={H2}>Where both fall short for India</h2>
        <p style={P}>
          Neither Taplio nor Supergrow bills in Indian rupees. Both use international payment processors (Stripe), which
          means Indian credit and debit cards typically incur a foreign-currency markup — usually 2–4% — on top of the
          listed price. Neither can issue a GST-compliant invoice, so Indian businesses cannot claim the 18% GST input tax
          credit against those subscriptions.
        </p>
        <p style={P}>
          On the content side, both are English-only tools. Neither handles code-mixed Hinglish naturally: give them a
          sentence like <em>"yeh wala approach thoda alag hai"</em> and the output tends to come back either fully
          anglicised or awkwardly transliterated. India-specific trending topics, IST-aware scheduling nudges and
          vernacular hooks are absent from both.
        </p>

        <h2 style={H2}>The three-way comparison at a glance</h2>
        <p style={{ ...P, marginBottom: 4 }}>
          Prices converted at the current USD→INR rate (refreshed weekly). Taplio and Supergrow prices are public list
          prices before forex and before accounting for the absence of GST credit.
        </p>
        <div style={{ overflowX: 'auto', margin: '8px 0 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thBase}>Feature</th>
                <th style={thBase}>Taplio</th>
                <th style={thBase}>Supergrow</th>
                <th style={{ ...thBase, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' }}>PersonaLink</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, taplio, supergrow, pl]) => (
                <tr key={label}>
                  <td style={{ ...tdBase, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{label}</td>
                  <td style={tdBase}>{taplio}</td>
                  <td style={tdBase}>{supergrow}</td>
                  <td style={{ ...tdBase, background: 'var(--pl-accent-soft)' }}>{pl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={H2}>PersonaLink: the India-native third option</h2>
        <p style={P}>
          <Link href="/ai-linkedin-automation-tool" style={link}>PersonaLink</Link> is built specifically for the Indian
          market. Billing is in INR from ₹999/month via UPI and Razorpay. Every invoice carries a GSTIN so your CA can
          book it as a business expense and claim the 18% input tax credit — something neither Taplio nor Supergrow
          can offer. For a full comparison of the cheapest options,{' '}
          see <Link href="/cheap-linkedin-ai-tool-india" style={link}>cheap LinkedIn AI tools in India</Link>.
        </p>
        <p style={P}>
          On the writing side, PersonaLink builds a <strong>6-dimension voice fingerprint</strong> from your past posts —
          rhythm, vocabulary, hook style, emotional warmth, opening patterns, and punctuation tics — and constrains every
          draft to that fingerprint. The result is a post that reads like you wrote it, not like generic AI output. It also
          writes natively in Hinglish for creators whose voice is code-mixed, which Taplio and Supergrow cannot do.
        </p>
        <p style={P}>
          Other additions that neither competitor offers: voice notes → post (record a 2-minute voice note, get a polished
          draft back), a story bank for reusable lived experiences, an anti-AI humaniser to strip AI tells, and
          India-aware trending topics so your hooks land for an Indian professional audience.
        </p>

        <h2 style={H2}>Who should pick what</h2>
        <ul style={{ margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', fontSize: 17, lineHeight: 1.85 }}>
          <li>
            <strong>Choose Taplio</strong> if you post for a global English audience, already use its Chrome extension
            daily, and the USD pricing is not a concern for your business.
          </li>
          <li>
            <strong>Choose Supergrow</strong> if you want the cheapest global option and a simple two-screen onboarding
            — but understand you're still paying in dollars with no GST credit.
          </li>
          <li>
            <strong>Choose PersonaLink</strong> if your audience is in India, you need a GST invoice, you want to pay in
            INR via UPI, or you write in Hinglish. It's also the pick if voice accuracy matters — the 6-dimension
            fingerprint goes deeper than either competitor's style matching.
          </li>
        </ul>
        <p style={P}>
          If you're still deciding, see the{' '}
          <Link href="/blog/best-taplio-alternatives" style={link}>full Taplio alternatives roundup</Link>{' '}
          for the wider field including lifetime tools and free options.
        </p>

        <h2 style={H2}>FAQ</h2>
        {FAQS.map((f) => (
          <details key={f.q} style={{ borderBottom: '1px solid var(--line)' }}>
            <summary
              style={{ padding: '15px 0', cursor: 'pointer', fontWeight: 600, fontSize: 16, color: 'var(--ink)', listStyle: 'none' }}
            >
              {f.q}
            </summary>
            <div style={{ paddingBottom: 15, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-4)' }}>{f.a}</div>
          </details>
        ))}

        <div style={{ marginTop: 28 }}>
          <Link
            href="/pricing"
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              padding: '13px 22px',
              borderRadius: 'var(--r-md)',
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            See PersonaLink pricing — from ₹999/month
          </Link>
        </div>
      </article>
    </LandingShell>
  )
}
