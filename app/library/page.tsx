import type { Metadata } from 'next'
import Link from 'next/link'
import { LandingShell } from '@/components/landing/LandingShell'
import { getPublicLibraryItems } from '@/lib/library'

const URL = 'https://personalink.in/library'

// Curated patterns change rarely — cache + revalidate hourly so it stays indexable + fast.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'LinkedIn Post Inspiration Library — Proven Patterns & Templates',
  description:
    'A free library of proven LinkedIn post patterns — the hook, why it works, and a reusable fill-in template. Contrarian takes, vulnerable stories, data hooks and more.',
  keywords: ['LinkedIn post templates', 'LinkedIn inspiration', 'LinkedIn hooks', 'viral LinkedIn post patterns', 'LinkedIn content ideas', 'LinkedIn swipe file'],
  alternates: { canonical: URL },
  openGraph: { type: 'website', locale: 'en_IN', url: URL, siteName: 'PersonaLink', title: 'LinkedIn Post Inspiration Library — Proven Patterns & Templates', description: 'Proven LinkedIn post patterns: the hook, why it works, and a reusable template. Remix any one in your voice.', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LinkedIn inspiration library' }] },
  twitter: { card: 'summary_large_image', title: 'LinkedIn Post Inspiration Library', description: 'Proven post patterns + reusable templates. Remix any one in your voice.', images: ['/og-image.png'] },
}

const aw = { maxWidth: 1080, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' } as const
const H1s = { fontSize: 'clamp(30px,5vw,48px)', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px' } as const
const sub = { fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)', margin: '0 0 8px', maxWidth: 680 } as const
const card = { display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--line)', borderRadius: 16, padding: '20px 22px', background: 'var(--surface)' } as const
const chip = { fontFamily: 'var(--f-mono)', fontSize: 11, padding: '2px 9px', borderRadius: 999, border: '1px solid var(--line)', color: 'var(--ink-4)' } as const
const accentChip = { ...chip, color: 'var(--pl-accent)', borderColor: 'var(--pl-accent)', background: 'var(--pl-accent-soft)' } as const
const tmpl = { fontFamily: 'var(--f-mono)', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-3)', whiteSpace: 'pre-wrap', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 14, margin: 0 } as const
const link = { color: 'var(--pl-accent)', fontWeight: 600, fontSize: 14, textDecoration: 'none' } as const

export default async function LibraryPage() {
  const items = await getPublicLibraryItems()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: 'LinkedIn Post Inspiration Library',
        description: 'Proven LinkedIn post patterns with reusable templates.',
        url: URL,
        inLanguage: 'en-IN',
        isPartOf: { '@type': 'WebSite', name: 'PersonaLink', url: 'https://personalink.in' },
      },
      {
        '@type': 'ItemList',
        itemListElement: items.map((it, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: { '@type': 'CreativeWork', name: it.title || 'LinkedIn post pattern', abstract: it.pattern_summary || undefined, genre: it.hook_type || undefined, inLanguage: 'en-IN' },
        })),
      },
      { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://personalink.in' }, { '@type': 'ListItem', position: 2, name: 'Inspiration Library', item: URL } ] },
    ],
  }

  return (
    <LandingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main style={aw}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 12 }}>// Inspiration library</div>
        <h1 style={H1s}>LinkedIn post patterns that actually work</h1>
        <p style={sub}>A free, growing library of the structures behind posts that perform — the hook, <em>why</em> it works, and a reusable fill-in template. Use the pattern, never the words.</p>
        <p style={{ ...sub, color: 'var(--ink-4)', fontSize: 15, marginBottom: 36 }}>
          Want one drafted for you? <Link href="/" style={link}>Remix any pattern in your own voice →</Link> (free to start)
        </p>

        {items.length === 0 ? (
          <div style={{ border: '1px dashed var(--line)', borderRadius: 16, padding: 48, textAlign: 'center', color: 'var(--ink-4)' }}>The library is being curated — check back shortly.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
            {items.map((it) => (
              <article key={it.id} style={card}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {it.hook_type && <span style={accentChip}>{it.hook_type}</span>}
                  {it.format && <span style={chip}>{it.format}</span>}
                  {it.niche && it.niche !== 'general' && <span style={chip}>{it.niche}</span>}
                </div>
                {it.title && <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>{it.title}</h2>}
                {it.pattern_summary && <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-4)', margin: 0 }}>{it.pattern_summary}</p>}
                {it.template_text && <pre style={tmpl}>{it.template_text}</pre>}
                <Link href="/" style={{ ...link, marginTop: 'auto' }}>Remix this in my voice →</Link>
              </article>
            ))}
          </div>
        )}

        <div style={{ marginTop: 48, padding: 'clamp(28px,5vw,44px)', borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--line)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Stop staring at a blank page</h2>
          <p style={{ fontSize: 16, color: 'var(--ink-3)', margin: '0 auto 22px', maxWidth: 520, lineHeight: 1.6 }}>PersonaLink learns your voice, then writes posts on these proven patterns that sound like you — not like AI. Free to start.</p>
          <Link href="/" style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '14px 26px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Start free →</Link>
        </div>
      </main>
    </LandingShell>
  )
}
