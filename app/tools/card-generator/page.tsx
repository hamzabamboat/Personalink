import type { Metadata } from 'next'
import { CardTool } from './card-tool'

export const metadata: Metadata = {
  title: 'Free LinkedIn Card Maker — 100+ Fonts, No Watermark | PersonaLink',
  description: 'Turn any line into a branded LinkedIn quote, stat, myth, title or list card — 100+ fonts, 8 colour palettes, free, no signup, no watermark. Download a PNG and post in seconds.',
  alternates: { canonical: '/tools/card-generator' },
  openGraph: {
    title: 'Free LinkedIn Card Maker — 100+ Fonts, No Watermark',
    description: 'Quote, stat, myth, title and list cards for LinkedIn — 100+ fonts, 8 palettes, free, no signup, no watermark.',
    url: '/tools/card-generator',
    type: 'website',
  },
}

type Example = { type: string; palette: string; font?: string; kicker?: string; headline: string; body?: string; lines?: string; name: string }
const EXAMPLES: Example[] = [
  { type: 'quote', palette: 'electric', font: 'playfair-display', headline: 'Consistency beats genius.', name: 'Aarav Sharma' },
  { type: 'stat', palette: 'carbon', font: 'anton', kicker: 'GROWTH', headline: '3.2x', body: 'more reach posting daily for 90 days', name: 'Aarav Sharma' },
  { type: 'myth', palette: 'violet', headline: 'More hashtags = more reach', body: 'Two or three beat ten.', name: 'Aarav Sharma' },
  { type: 'list', palette: 'flame', font: 'dm-serif-display', headline: '3 hooks that work', lines: 'Open with tension|Make it about them|End with a question', name: 'Aarav Sharma' },
]
function exampleSrc(e: Example): string {
  const p = new URLSearchParams({ type: e.type, palette: e.palette, ar: '1080x1080', headline: e.headline, name: e.name })
  if (e.font) p.set('font', e.font)
  if (e.kicker) p.set('kicker', e.kicker)
  if (e.body) p.set('body', e.body)
  if (e.lines) p.set('lines', e.lines)
  return `/api/og/card?${p.toString()}`
}

const FAQ = [
  { q: 'Is the LinkedIn card maker really free?', a: 'Yes — it’s free, needs no signup, and adds no watermark. Build a card, download the PNG, and post it. No credit card, no limits on the free tool.' },
  { q: 'How many fonts can I use?', a: 'Over 100 curated fonts across Bold & modern, Display, Editorial serif, Elegant, Technical/mono and Handwritten styles — each previewed so you choose by look.' },
  { q: 'What card types and sizes does it make?', a: 'Quote, Stat, Title, List and Myth-vs-Reality cards at a square 1080×1080. Inside the app you also get portrait sizes, swipeable carousels (PDF) and LinkedIn profile banners.' },
  { q: 'Do I need any design skills?', a: 'No. Pick a template, a palette and a font — the layout, type sizing and colour harmony are handled for you, so it can’t come out looking off.' },
  { q: 'Can I use my own brand colours, logo and font?', a: 'The free tool uses curated palettes. Inside PersonaLink, a brand kit applies your exact colour, logo and font to every graphic, carousel and banner automatically.' },
]

export default function CardGeneratorPage() {
  const appLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Free LinkedIn Card Maker',
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    url: 'https://personalink.in/tools/card-generator',
    description: 'Free LinkedIn card maker — quote, stat, myth, title and list cards with 100+ fonts and 8 palettes, no signup, no watermark.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in' },
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="text-center mb-10">
        <div className="text-[12px] font-bold tracking-wider text-[#2B4DFF] uppercase mb-2">Free tool · no signup</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Free LinkedIn card maker</h1>
        <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
          Turn any line into a crisp, professional LinkedIn graphic — quote, stat, myth, title or list. <strong>100+ fonts</strong>, 8 colour palettes, and <strong>no watermark</strong>. Edit on the left, download on the right.
        </p>
      </div>

      <CardTool />

      <section className="mt-16">
        <h2 className="text-center text-xl font-bold text-slate-900 mb-1">One post, any look</h2>
        <p className="text-center text-[13px] text-slate-500 mb-6">Same idea, different template · palette · font.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {EXAMPLES.map((e, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={exampleSrc(e)} alt={`Example LinkedIn ${e.type} card`} loading="lazy" className="w-full rounded-xl border border-slate-100 shadow-sm bg-slate-50" />
          ))}
        </div>
      </section>

      <section className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Questions</h2>
        <div className="flex flex-col divide-y divide-slate-100 border-t border-b border-slate-100">
          {FAQ.map((f, i) => (
            <div key={i} className="py-4">
              <div className="font-semibold text-slate-800 text-[15px]">{f.q}</div>
              <p className="text-[14px] text-slate-500 mt-1 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-[12px] text-slate-400 mt-12">
        Built by <a href="/" className="underline hover:text-slate-600">PersonaLink</a> — the LinkedIn growth tool for founders. The free tool uses curated palettes; inside the app, cards use <em>your</em> brand colour, logo and font.
      </p>
    </main>
  )
}
