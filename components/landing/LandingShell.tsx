import Link from 'next/link'
import { WordMark } from '@/components/word-mark'

// Shared chrome for SEO landing pages (server component — full SSR, no client JS).
// Gives every landing page a consistent nav + a footer rich with internal links
// to the money pages and the "For India" white-space cluster.

const NAV: ReadonlyArray<readonly [string, string]> = [
  ['/pricing', 'Pricing'],
  ['/ai-linkedin-automation-tool', 'Product'],
  ['/blog', 'Blog'],
  ['/faq', 'FAQ'],
]

const FOOTER: ReadonlyArray<{ heading: string; links: ReadonlyArray<readonly [string, string]> }> = [
  { heading: 'Product', links: [['/ai-linkedin-automation-tool', 'AI automation tool'], ['/features', 'All features'], ['/ai-linkedin-ghostwriter', 'AI ghostwriter'], ['/pricing', 'Pricing'], ['/voice-analyzer', 'Free voice analyzer'], ['/tools/card-generator', 'Free card maker']] },
  { heading: 'For India', links: [['/ai-linkedin-post-generator-india', 'Post generator India'], ['/cheap-linkedin-ai-tool-india', 'Under ₹1,000'], ['/hinglish-linkedin-post-generator', 'Hinglish generator'], ['/tools/linkedin-cost-calculator', 'Cost calculator'], ['/faq', 'GST, UPI & Hinglish']] },
  { heading: 'Compare', links: [['/vs', 'All comparisons'], ['/vs/taplio', 'vs Taplio'], ['/vs/supergrow', 'vs Supergrow'], ['/vs/magicpost', 'vs MagicPost'], ['/vs/kleo', 'vs Kleo']] },
  { heading: 'More', links: [['/about', 'About'], ['/blog', 'Blog'], ['/library', 'Inspiration library'], ['/for-agencies', 'For agencies'], ['/privacy', 'Privacy'], ['/terms', 'Terms']] },
]

export function LandingShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--f-sans)', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid var(--line)', background: 'color-mix(in srgb, var(--surface) 92%, transparent)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" aria-label="PersonaLink home"><WordMark icon wordmark iconSize={28} /></Link>
          <nav style={{ display: 'flex', gap: 'clamp(8px,2vw,22px)', alignItems: 'center' }}>
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="hidden sm:inline" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}>{label}</Link>
            ))}
            <Link href="/voice-analyzer" style={{ fontSize: 14, fontWeight: 600, color: 'var(--bg)', background: 'var(--ink)', padding: '8px 16px', borderRadius: 'var(--r-sm)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Analyze my voice — free</Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer style={{ background: '#050813', borderTop: '1px solid rgba(255,255,255,.06)', padding: 'clamp(40px,6vw,64px) clamp(16px,4vw,32px) 28px', marginTop: 'clamp(48px,8vw,96px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 32 }}>
          {FOOTER.map(col => (
            <div key={col.heading}>
              <h4 style={{ fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,.4)', marginBottom: 14, textTransform: 'uppercase' }}>{col.heading}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {col.links.map(([href, label]) => (
                  <Link key={label} href={href} style={{ fontSize: 13.5, color: 'rgba(255,255,255,.42)', textDecoration: 'none' }}>{label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 1100, margin: '24px auto 0', borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 20, fontSize: 12.5, color: 'rgba(255,255,255,.28)' }}>
          © 2026 PersonaLink — the AI LinkedIn tool built for India. Pay in INR, get GST invoices, post in Hinglish.
        </div>
      </footer>
    </div>
  )
}
