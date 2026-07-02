import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { WordMark } from '@/components/word-mark'
import { getDbPostBySlug } from '@/lib/blog-db'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getDbPostBySlug(slug)
  if (!post) return { title: 'Post not found | PersonaLink' }
  const url = `https://personalink.in/blog/${post.slug}`
  return {
    title: `${post.title} | PersonaLink`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: 'article', locale: 'en_IN', url, siteName: 'PersonaLink',
      title: post.title, description: post.excerpt,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: post.title }],
    },
  }
}

const md = {
  h1: (p: any) => <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--ink)', margin: '32px 0 16px' }} {...p} />,
  h2: (p: any) => <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', margin: '36px 0 14px' }} {...p} />,
  h3: (p: any) => <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', margin: '28px 0 10px' }} {...p} />,
  p: (p: any) => <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)', margin: '0 0 18px' }} {...p} />,
  ul: (p: any) => <ul style={{ margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', lineHeight: 1.7 }} {...p} />,
  ol: (p: any) => <ol style={{ margin: '0 0 18px', paddingLeft: 22, color: 'var(--ink-2)', lineHeight: 1.7 }} {...p} />,
  li: (p: any) => <li style={{ marginBottom: 8, fontSize: 17 }} {...p} />,
  a: (p: any) => <a style={{ color: 'var(--pl-accent)', textDecoration: 'underline' }} {...p} />,
  strong: (p: any) => <strong style={{ color: 'var(--ink)', fontWeight: 600 }} {...p} />,
  blockquote: (p: any) => <blockquote style={{ borderLeft: '3px solid var(--pl-accent)', margin: '0 0 18px', padding: '4px 0 4px 16px', color: 'var(--ink-3)', fontStyle: 'italic' }} {...p} />,
  code: (p: any) => <code style={{ fontFamily: 'var(--f-mono)', fontSize: 14, background: 'var(--surface)', padding: '2px 6px', borderRadius: 6 }} {...p} />,
}

export default async function DbBlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getDbPostBySlug(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
      <nav style={{ background: 'color-mix(in srgb, var(--surface) 95%, transparent)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(16px,4vw,32px)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/"><WordMark icon wordmark iconSize={30} /></Link>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Link href="/#pricing" style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-3)', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/blog" style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-accent)', textDecoration: 'none' }}>Blog</Link>
          </div>
        </div>
      </nav>

      <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px,7vw,72px) clamp(16px,4vw,24px)' }}>
        <Link href="/blog" style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', textDecoration: 'none' }}>← all posts</Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '24px 0 14px' }}>
          {post.tags.map(tag => (
            <span key={tag} style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, letterSpacing: '.04em', padding: '3px 10px', borderRadius: 999, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: '1px solid color-mix(in oklab, var(--pl-accent) 20%, transparent)' }}>{tag}</span>
          ))}
        </div>
        <h1 style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--ink)', margin: '0 0 12px' }}>{post.title}</h1>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-4)', marginBottom: 36 }}>{post.read_time}</div>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{post.body_markdown}</ReactMarkdown>
      </article>
    </div>
  )
}
