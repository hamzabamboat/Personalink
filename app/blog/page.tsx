import type { Metadata } from 'next'
import Link from 'next/link'
import { WordMark } from '@/components/word-mark'
import { BLOG_POSTS as ARTICLES } from '@/lib/blog-posts'

export const metadata: Metadata = {
  title: 'Blog — LinkedIn Growth Tips | PersonaLink',
  description: 'Actionable LinkedIn growth strategies, AI content tips, and personal branding insights for Indian founders, consultants, and professionals.',
}

export default function BlogPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
      <nav style={{ background: 'color-mix(in srgb, var(--surface) 95%, transparent)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/">
            <WordMark icon wordmark iconSize={30} />
          </Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/#pricing" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/blog" style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-accent)', textDecoration: 'none' }}>Blog</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(48px,8vw,80px) clamp(16px,4vw,24px)' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '.06em', color: 'var(--ink-4)', textTransform: 'uppercase', marginBottom: 16 }}>// blog</div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1.05, color: 'var(--ink)', margin: '0 0 16px' }}>
            LinkedIn growth insights for Indian professionals
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-3)', lineHeight: 1.6, margin: 0 }}>
            Actionable tips on LinkedIn automation, AI content, and personal branding — written for founders, consultants, and professionals in India.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {ARTICLES.map(article => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              style={{
                background: 'var(--surface)',
                borderRadius: 16,
                border: '1px solid var(--line)',
                padding: 'clamp(20px,4vw,32px)',
                display: 'block',
                textDecoration: 'none',
                transition: 'border-color .2s, box-shadow .2s',
              }}
              className="group"
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {article.tags.map(tag => (
                  <span key={tag} style={{
                    fontFamily: 'var(--f-mono)', fontSize: 10.5, letterSpacing: '.04em',
                    padding: '3px 10px', borderRadius: 999,
                    background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)',
                    border: '1px solid color-mix(in oklab, var(--pl-accent) 20%, transparent)',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
              <h2 style={{ fontSize: 'clamp(17px,2vw,22px)', fontWeight: 500, letterSpacing: '-0.025em', color: 'var(--ink)', margin: '0 0 10px', lineHeight: 1.25 }}>
                {article.title}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6, margin: '0 0 14px' }}>
                {article.excerpt}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)' }}>
                <span>{article.date}</span>
                <span>·</span>
                <span>{article.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <footer style={{ background: 'var(--ink)', padding: '40px 24px', textAlign: 'center', marginTop: 80 }}>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'rgba(238,242,251,.45)', letterSpacing: '.04em' }}>
          © 2026 PersonaLink. Your LinkedIn, on autopilot.
        </p>
      </footer>
    </div>
  )
}
