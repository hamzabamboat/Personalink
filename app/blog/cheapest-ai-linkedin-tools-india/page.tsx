import type { Metadata } from 'next'
import Link from 'next/link'
import { WordMark } from '@/components/word-mark'

export const metadata: Metadata = {
  title: 'Cheapest AI LinkedIn Tools in India 2026 (Under ₹1,000)',
  description:
    'The cheapest AI LinkedIn tools for India in 2026, compared honestly in INR — real entry prices, GST invoices, Hinglish support, and which few actually cost under ₹1,000 a month.',
  keywords: [
    'ai linkedin tool india under 1000',
    'cheapest ai linkedin tool india',
    'cheap linkedin automation india',
    'affordable ai linkedin manager india',
    'linkedin ai tool inr pricing',
    'best ai linkedin tool india',
  ],
  alternates: { canonical: 'https://personalink.in/blog/cheapest-ai-linkedin-tools-india' },
  openGraph: {
    type: 'article',
    title: 'Cheapest AI LinkedIn Tools in India 2026 (Honest INR Comparison)',
    description:
      'Real INR prices for AI LinkedIn tools in India — GST, Hinglish, and which cost under ₹1,000 a month.',
    url: 'https://personalink.in/blog/cheapest-ai-linkedin-tools-india',
    publishedTime: '2026-06-08',
  },
}

const linkSx = {
  color: 'var(--pl-accent)',
  fontWeight: 500,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
} as const

const H2 = 'text-xl font-bold text-slate-900 mt-12 mb-4'
const H3 = 'text-base md:text-lg font-semibold text-slate-900 mt-8 mb-2'
const P = 'mb-5'
const UL = 'list-disc pl-6 mb-6 space-y-2 marker:text-slate-400'
const STRONG = 'font-semibold text-slate-900'

type Row = { tool: string; price: string; billing: string; gst: string; hinglish: string; voice: string; publish: string; free: string }
const TABLE: Row[] = [
  { tool: 'PersonaLink', price: '₹999 (free tier ₹0)', billing: 'INR', gst: '✓', hinglish: '✓', voice: '✓', publish: '✓', free: '✓' },
  { tool: 'Dux-Soup', price: '~₹1,259 ($14.99)', billing: 'USD', gst: '✕', hinglish: '✕', voice: 'n/a', publish: 'n/a', free: 'trial' },
  { tool: 'Shield', price: '~₹1,260 ($15)', billing: 'USD', gst: '✕', hinglish: '✕', voice: 'n/a', publish: '✕', free: 'trial' },
  { tool: 'Supergrow', price: '~₹1,596 ($19)', billing: 'USD', gst: '✕', hinglish: '✕', voice: '~', publish: '✕', free: 'trial' },
  { tool: 'Taplio', price: '~₹3,276 ($39)', billing: 'USD', gst: '✕', hinglish: '✕', voice: '~', publish: '✓', free: 'trial' },
  { tool: 'Kleo', price: '~₹8,316 ($99 once)', billing: 'USD', gst: '✕', hinglish: '✕', voice: '✕', publish: '✕', free: '✕' },
  { tool: 'Teal', price: 'Free tier', billing: 'USD', gst: '✕', hinglish: '✕', voice: 'n/a', publish: '✕', free: '✓' },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is the cheapest AI LinkedIn tool in India?',
    a: "PersonaLink has a free tier (3 posts a month) and a paid Starter plan at ₹999 a month — the only major India-built tool that starts under ₹1,000 and bills in rupees. Most others are billed in US dollars at roughly ₹1,250 to ₹3,300 a month.",
  },
  {
    q: 'Are there AI LinkedIn tools under ₹1,000 a month?',
    a: "Very few. PersonaLink Starter is ₹999. Some tools (Teal, and free tiers of others) are free but limited. Almost every paid competitor is dollar-billed above ₹1,250 a month once you convert and add card forex charges.",
  },
  {
    q: 'Is there a free AI LinkedIn tool?',
    a: 'Yes. PersonaLink has a free tier, and Teal offers free LinkedIn profile optimisation for job seekers. Free tiers are good for trying the workflow; they cap how many posts you can generate or publish.',
  },
  {
    q: 'Why are most LinkedIn AI tools more expensive in India?',
    a: 'Most are priced in US dollars. At about ₹84 to the dollar you pay the converted price, plus a card forex markup of roughly 3%, and you cannot claim GST input credit because there is no Indian tax invoice. A ₹999 INR plan with a GST invoice is genuinely cheaper than a $15 plan.',
  },
  {
    q: 'Do these tools give a GST invoice?',
    a: 'PersonaLink issues a GST-compliant invoice in rupees. Most US-billed tools (Taplio, Supergrow, Shield, Dux-Soup) do not, so a business cannot claim the input credit.',
  },
  {
    q: 'Which AI LinkedIn tool handles Hinglish?',
    a: 'PersonaLink is built to write Hinglish naturally rather than mangling it. US-built tools generate fully formal English; you end up editing every post to sound like an Indian audience.',
  },
  {
    q: 'Is Dux-Soup or Shield an AI writing tool?',
    a: 'No — they solve different jobs. Dux-Soup automates connection requests and cold outreach. Shield is an analytics dashboard for your posts. Neither writes content in your voice, so compare them to a writer like PersonaLink only on price, not on what they do.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'On PersonaLink, yes — monthly plans cancel any time. Lifetime deals like Kleo are one-time payments with no ongoing updates, which is a different trade-off.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'The Cheapest AI LinkedIn Tools in India in 2026 (Honest INR Comparison)',
      description:
        'Real INR prices for AI LinkedIn tools in India — GST, Hinglish, auto-publish, and which few cost under ₹1,000 a month.',
      image: 'https://personalink.in/og-image.png',
      datePublished: '2026-06-08',
      dateModified: '2026-06-08',
      inLanguage: 'en-IN',
      author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' },
      publisher: {
        '@type': 'Organization',
        name: 'PersonaLink',
        url: 'https://personalink.in',
        logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://personalink.in/blog/cheapest-ai-linkedin-tools-india' },
      articleSection: 'LinkedIn Tools',
      keywords: 'ai linkedin tool india under 1000, cheapest ai linkedin tool india, cheap linkedin automation india, linkedin ai tool inr',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ],
}

export default function Article() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--f-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav
        style={{
          background: 'color-mix(in srgb, var(--surface) 95%, transparent)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '0 clamp(16px,4vw,32px)',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link href="/">
            <WordMark icon wordmark iconSize={30} />
          </Link>
          <Link href="/blog" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}>
            ← Blog
          </Link>
        </div>
      </nav>

      <article className="max-w-[760px] mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="flex flex-wrap gap-2 mb-6">
          {['LinkedIn Tools', 'India', 'Pricing'].map(tag => (
            <span
              key={tag}
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: 10.5,
                letterSpacing: '.04em',
                padding: '3px 10px',
                borderRadius: 999,
                background: 'var(--pl-accent-soft)',
                color: 'var(--pl-accent)',
                border: '1px solid color-mix(in oklab, var(--pl-accent) 20%, transparent)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <h1
          style={{
            fontSize: 'clamp(26px,4vw,38px)',
            fontWeight: 500,
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            color: 'var(--ink)',
            margin: '0 0 12px',
          }}
        >
          The cheapest AI LinkedIn tools in India in 2026 (honest INR comparison)
        </h1>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', letterSpacing: '.04em', marginBottom: 40 }}>
          June 2026 · 9 min read · by the PersonaLink Team
        </p>

        <div className="max-w-none text-slate-600 leading-[1.8]">
          <p className="text-lg text-slate-700 font-medium mb-6">
            If you want to write and manage your LinkedIn in India for under ₹1,000 a month, the honest shortlist is
            short. PersonaLink&apos;s Starter plan is ₹999 (with a free tier below it), a couple of tools have free
            plans, and almost everything else is billed in US dollars at ₹1,250–₹3,300 a month with no GST invoice. Here
            is the full comparison — real prices, what each tool actually does, and where your money goes furthest.
          </p>
          <p className={P}>
            One thing to clear up first, because most &ldquo;best budget LinkedIn AI&rdquo; lists get it wrong: half the
            tools they name are not AI writers at all. Dux-Soup automates cold outreach. Shield is an analytics
            dashboard. Teal is a job-search profile tool. They are cheap because they do a different, narrower job — so
            compare them on price only if that is the job you actually want done.
          </p>

          <h2 className={H2}>The comparison, in rupees</h2>
          <p className={P}>
            Prices are entry-tier monthly, converted at about ₹84 to the dollar (so the rupee figure for US-billed tools
            moves with the exchange rate, and your card adds roughly 3% forex on top). Accurate at the time of writing —
            SaaS prices change, so check the source before you buy.
          </p>

          <div style={{ overflowX: 'auto', margin: '8px 0 28px', border: '1px solid var(--line)', borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 680 }}>
              <thead>
                <tr style={{ background: 'var(--pl-accent-soft)', color: 'var(--ink)', textAlign: 'left' }}>
                  {['Tool', 'Starts at /mo', 'Billing', 'GST invoice', 'Hinglish', 'Voice match', 'Auto-publish', 'Free tier'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE.map((r, i) => {
                  const isPL = r.tool === 'PersonaLink'
                  return (
                    <tr
                      key={r.tool}
                      style={{
                        background: isPL ? 'color-mix(in oklab, var(--pl-accent) 8%, transparent)' : i % 2 ? 'var(--surface-2)' : 'transparent',
                        fontWeight: isPL ? 600 : 400,
                      }}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--ink)', fontWeight: isPL ? 700 : 500, whiteSpace: 'nowrap' }}>{r.tool}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{r.price}</td>
                      <td style={{ padding: '10px 12px' }}>{r.billing}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.gst}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.hinglish}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.voice}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.publish}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.free}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-4)', marginTop: -12, marginBottom: 24 }}>
            ✓ = yes · ✕ = no · ~ = partial · n/a = different category (not a writing tool). Full PersonaLink tiers are on
            the{' '}
            <Link href="/pricing" style={linkSx}>
              pricing page
            </Link>
            .
          </p>

          <h2 className={H2}>What &ldquo;under ₹1,000&rdquo; actually buys you</h2>
          <p className={P}>
            The honest answer: not much, unless you pick carefully. Only two kinds of options come in under ₹1,000 a
            month — a genuine INR plan like PersonaLink Starter (₹999), and free tiers. Everything billed in dollars
            lands above ₹1,250 the moment you convert, and that is before your bank&apos;s forex markup and the GST you
            cannot reclaim. A ₹999 plan with a tax invoice is, in practice, cheaper than a $15 plan.
          </p>

          <h2 className={H2}>Tool by tool, honestly</h2>

          <h3 className={H3}>PersonaLink — ₹999, INR-native</h3>
          <p className={P}>
            Reads your last 30 posts, learns your voice, and drafts one post a day that you approve before it publishes.
            INR billing with a GST invoice, Hinglish handled properly, and a free tier to try it. It is the only option
            here that starts under ₹1,000 and is built for an Indian audience. Weak spot: it is a writing-and-scheduling
            tool, not a cold-outreach or analytics suite — if you want those, pair it with something below. See how it
            stacks up against{' '}
            <Link href="/vs/taplio" style={linkSx}>
              Taplio
            </Link>{' '}
            and{' '}
            <Link href="/vs/supergrow" style={linkSx}>
              Supergrow
            </Link>
            .
          </p>

          <h3 className={H3}>Supergrow — cheap and simple</h3>
          <p className={P}>
            From about $19 (₹1,596). A clean, low-cost writer. It misses voice depth, India localisation, and
            auto-publish, and it bills in dollars with no GST invoice. A reasonable pick if you want the cheapest
            US-built writer and do not care about Hinglish or tax invoices.
          </p>

          <h3 className={H3}>Taplio — the polished US option</h3>
          <p className={P}>
            From about $39 (₹3,276). The most feature-complete of the lot — strong scheduling, analytics, and a large
            template library. You pay roughly three times the PersonaLink entry price, in dollars, with no GST and no
            native Hinglish. Best if budget is no concern and you want the established US toolset.
          </p>

          <h3 className={H3}>Shield and Dux-Soup — different jobs</h3>
          <p className={P}>
            Shield (~$15) is analytics: it tells you how your posts performed, but it does not write them. Dux-Soup
            (~$14.99) automates connection requests and cold messages for lead generation — useful for sales, but it is
            not a content tool and carries more account-safety risk. Both are cheap because they are narrow. Pick them
            for what they do, not as a writer.
          </p>

          <h3 className={H3}>Teal and Kleo — edge cases</h3>
          <p className={P}>
            Teal has a free tier for LinkedIn profile and resume optimisation — good for job seekers, not for posting.
            Kleo is a one-time lifetime deal (~$99) with a static toolkit and no ongoing improvements; cheap over years,
            but you are buying yesterday&apos;s product. See the{' '}
            <Link href="/vs/kleo" style={linkSx}>
              PersonaLink vs Kleo
            </Link>{' '}
            breakdown if a lifetime deal tempts you.
          </p>

          <h2 className={H2}>The hidden cost of dollar-billed tools</h2>
          <p className={P}>
            A $15 sticker price is not ₹1,260 in practice. Three things inflate it for an Indian buyer:
          </p>
          <ul className={UL}>
            <li>
              <strong className={STRONG}>Forex markup.</strong> Most Indian cards add about 3% on international charges,
              and some add a flat cross-border fee on top.
            </li>
            <li>
              <strong className={STRONG}>No GST input credit.</strong> Without an Indian tax invoice, a registered
              business cannot claim the 18% back — so the real cost is higher again.
            </li>
            <li>
              <strong className={STRONG}>A moving target.</strong> When the rupee weakens, your &ldquo;fixed&rdquo;
              subscription quietly gets more expensive. An INR plan does not.
            </li>
          </ul>

          <h2 className={H2}>The honest verdict</h2>
          <p className={P}>
            If you want AI-written LinkedIn posts in your own voice, in India, for the least money: PersonaLink is the
            only one that starts under ₹1,000, bills in rupees, gives a GST invoice, and writes Hinglish — and there is a
            free tier to test that claim before you pay. If you specifically want analytics, use Shield. If you want cold
            outreach, use Dux-Soup. If budget genuinely does not matter and you want the most polished US feature set,
            Taplio earns it. Match the tool to the job, then compare price.
          </p>
          <p className={P}>
            New to LinkedIn growth in India? Start with our longer, no-hype guide:{' '}
            <Link href="/blog/how-to-grow-linkedin-india-2026" style={linkSx}>
              How to grow on LinkedIn in India in 2026
            </Link>
            .
          </p>

          <h2 className={H2}>Frequently asked questions</h2>
          {FAQS.map(({ q, a }) => (
            <div key={q} className="mb-6">
              <h3 className="text-base font-semibold text-slate-900 mt-6 mb-2">{q}</h3>
              <p className="mb-0">{a}</p>
            </div>
          ))}

          <div
            style={{
              marginTop: 48,
              padding: 24,
              background: 'var(--pl-accent-soft)',
              border: '1px solid color-mix(in oklab, var(--pl-accent) 25%, transparent)',
              borderRadius: 16,
            }}
          >
            <h3 style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: 8, letterSpacing: '-0.02em', fontSize: 18 }}>
              The under-₹1,000 plan, in your own voice
            </h3>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16 }}>
              PersonaLink Starter is ₹999/month — INR billing, GST invoice, Hinglish, one post a day you approve. There
              is a free tier to try it first.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
              <Link
                href="/pricing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--pl-accent)',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                See pricing →
              </Link>
              <Link href="/voice-analyzer" style={{ ...linkSx, fontSize: 13 }}>
                or try the free voice analyzer
              </Link>
            </div>
          </div>
        </div>
      </article>

      <footer style={{ background: 'var(--ink)', padding: '40px 24px', textAlign: 'center', marginTop: 32 }}>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'rgba(238,242,251,.45)', letterSpacing: '.04em' }}>
          © 2026 PersonaLink. Your LinkedIn, on autopilot.
        </p>
      </footer>
    </div>
  )
}
