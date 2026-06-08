import type { Metadata } from 'next'
import Link from 'next/link'
import { WordMark } from '@/components/word-mark'

export const metadata: Metadata = {
  title: 'Why Your LinkedIn Posts Get Zero Engagement (And How to Fix It) | PersonaLink',
  description: 'Most LinkedIn posts fail because of 3 fixable mistakes. Here are the patterns that kill reach on Indian LinkedIn — and how a LinkedIn profile manager can fix each one.',
  keywords: ['LinkedIn profile manager', 'LinkedIn engagement', 'LinkedIn posts India', 'improve LinkedIn reach', 'LinkedIn content strategy'],
  alternates: { canonical: 'https://personalink.in/blog/why-your-linkedin-posts-get-zero-engagement' },
  openGraph: {
    type: 'article',
    locale: 'en_IN',
    siteName: 'PersonaLink',
    title: 'Why Your LinkedIn Posts Get Zero Engagement (And How to Fix It)',
    description: 'The 3 fixable mistakes that kill your LinkedIn reach — and how to fix them.',
    url: 'https://personalink.in/blog/why-your-linkedin-posts-get-zero-engagement',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Why your LinkedIn posts get zero engagement' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Why Your LinkedIn Posts Get Zero Engagement (And How to Fix It)',
    description: 'The 3 fixable mistakes that kill your LinkedIn reach — and how to fix them.',
    images: ['/og-image.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      headline: 'Why Your LinkedIn Posts Get Zero Engagement (And How to Fix It)',
      description: 'The three fixable mistakes that kill LinkedIn reach on Indian LinkedIn — and how to fix each one.',
      image: 'https://personalink.in/og-image.png',
      datePublished: '2026-03-01',
      dateModified: '2026-03-01',
      inLanguage: 'en-IN',
      author: { '@type': 'Organization', name: 'PersonaLink Team', url: 'https://personalink.in' },
      publisher: { '@type': 'Organization', name: 'PersonaLink', url: 'https://personalink.in', logo: { '@type': 'ImageObject', url: 'https://personalink.in/logo.png' } },
      mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://personalink.in/blog/why-your-linkedin-posts-get-zero-engagement' },
      articleSection: 'LinkedIn Growth',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://personalink.in/blog' },
        { '@type': 'ListItem', position: 3, name: 'Why Your LinkedIn Posts Get Zero Engagement', item: 'https://personalink.in/blog/why-your-linkedin-posts-get-zero-engagement' },
      ],
    },
  ],
}

export default function Article3() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--f-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav style={{ background: 'color-mix(in srgb, var(--surface) 95%, transparent)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/">
            <WordMark icon wordmark iconSize={30} />
          </Link>
          <Link href="/blog" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}>← Blog</Link>
        </div>
      </nav>

      <article className="max-w-[720px] mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="flex flex-wrap gap-2 mb-6">
          {['LinkedIn Profile Manager', 'Content Strategy'].map(tag => (
            <span key={tag} style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, letterSpacing: '.04em', padding: '3px 10px', borderRadius: 999, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: '1px solid color-mix(in oklab, var(--pl-accent) 20%, transparent)' }}>{tag}</span>
          ))}
        </div>

        <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--ink)', margin: '0 0 12px' }}>
          Why your LinkedIn posts get zero engagement (and how to fix it)
        </h1>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', letterSpacing: '.04em', marginBottom: 40 }}>March 2026 · 6 min read</p>

        <div className="prose prose-slate max-w-none text-slate-600 leading-[1.8]">
          <p className="text-lg text-slate-700 font-medium mb-6">
            Across LinkedIn feeds from Indian founders, consultants, and professionals, the same patterns recur: most posts that get zero engagement make the same three mistakes. The good news: all three are completely fixable.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-10 mb-4">Mistake #1: The hook doesn't stop the scroll</h2>
          <p>
            LinkedIn users scroll at 2-3 seconds per post. If your first line doesn't make them pause and think "wait, I want to read more of this," they won't. The most common mistake we see from Indian professionals is starting posts with context-setting: "I've been working in the fintech space for 8 years and have noticed..."
          </p>
          <p className="mt-4">
            Effective hooks are counterintuitive, specific, or emotionally resonant. Compare: "I've been thinking about leadership lately" vs "My worst hire cost me ₹40 lakhs. Here's the mistake I made." The second one demands to be read.
          </p>
          <p className="mt-4">
            The formula that works: open with a specific number, a counter-intuitive statement, or a story that starts in the middle of action. Never open with "I" as the first word — it signals the post is about you rather than valuable for the reader.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-10 mb-4">Mistake #2: No clear value exchange</h2>
          <p>
            Every successful LinkedIn post answers the reader's implicit question: "What's in this for me?" Posts that talk about the writer's journey without extracting a lesson, framework, or actionable insight get ignored.
          </p>
          <p className="mt-4">
            The best-performing posts from our analysis had one of three structures: (1) a numbered list of lessons from an experience, (2) a before/after story with clear takeaways, or (3) a counter-narrative that challenges conventional wisdom in a specific industry.
          </p>
          <p className="mt-4">
            Notice how each structure forces you to be useful. You can't write a "5 things I learned from raising my Series A" post without giving the reader 5 transferable insights. This is what drives sharing — people share content that makes them look smart or helpful to their network.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-10 mb-4">Mistake #3: Posted at the wrong time</h2>
          <p>
            LinkedIn's algorithm gives every post a 60-minute window to prove its worth. In that window, if your post gets above-average engagement (relative to your typical performance), it gets shown to a much larger audience. If it doesn't, it dies quietly.
          </p>
          <p className="mt-4">
            This means timing is critical. For Indian professionals, the highest-engagement windows are:
          </p>
          <ul className="mt-3 space-y-1">
            <li className="flex gap-2"><span className="text-blue-600 shrink-0">→</span> Tuesday, Wednesday, Thursday: 7:30am-9:30am IST</li>
            <li className="flex gap-2"><span className="text-blue-600 shrink-0">→</span> Monday: 8am-10am IST (fresh week energy)</li>
            <li className="flex gap-2"><span className="text-blue-600 shrink-0">→</span> Friday: 12pm-2pm IST (end-of-week reflection posts)</li>
          </ul>
          <p className="mt-4">
            Avoid Saturday and Sunday entirely unless you're targeting a global audience. The Indian LinkedIn audience is overwhelmingly weekday-active.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-10 mb-4">The role of a LinkedIn profile manager</h2>
          <p>
            Fixing these three issues manually requires significant time and expertise: writing stronger hooks, structuring posts for value, and remembering to schedule at optimal times. This is exactly what a good LinkedIn profile manager handles automatically.
          </p>
          <p className="mt-4">
            Tools like PersonaLink analyse what types of hooks work for your specific audience, structure posts around your content pillars, and auto-schedule at your optimal engagement windows. The result: posts that consistently perform because the mechanics are right, even before you factor in the quality of the content itself.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-10 mb-4">The consistency compound effect</h2>
          <p>
            One underappreciated aspect of LinkedIn growth: the algorithm rewards consistency. A profile that posts three times a week for six months will dramatically outperform one that posts twenty times in January and then nothing until June.
          </p>
          <p className="mt-4">
            This is why automation matters even if you're a great writer. Human consistency is hard. Automated consistency, with human oversight of the content quality, is achievable — and it's what builds the kind of LinkedIn presence that generates inbound opportunities month after month.
          </p>

          <div style={{ marginTop: 48, padding: 24, background: 'var(--pl-accent-soft)', border: '1px solid color-mix(in oklab, var(--pl-accent) 25%, transparent)', borderRadius: 16 }}>
            <h3 style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: 8, letterSpacing: '-0.02em' }}>Fix all three mistakes automatically</h3>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 16 }}>PersonaLink writes posts with strong hooks, clear value, and schedules them at your optimal times — all in your exact voice.</p>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--pl-accent)', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Start 7-day free trial →
            </Link>
          </div>
        </div>
      </article>

      <footer style={{ background: 'var(--ink)', padding: '40px 24px', textAlign: 'center', marginTop: 32 }}>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'rgba(238,242,251,.45)', letterSpacing: '.04em' }}>© 2026 PersonaLink. Your LinkedIn, on autopilot.</p>
      </footer>
    </div>
  )
}
