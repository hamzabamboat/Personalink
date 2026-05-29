import Link from 'next/link'
import { WordMark } from '@/components/word-mark'

export const metadata = {
  title: 'Application received · PersonaLink',
  robots: { index: false },
}

export default function AffiliateThankYouPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="px-4 sm:px-6 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
        <div className="max-w-[1200px] mx-auto h-16 flex items-center justify-between">
          <Link href="/"><WordMark icon wordmark iconSize={28} /></Link>
          <Link href="/" className="text-[13px]" style={{ color: 'var(--ink-3)' }}>← Back to home</Link>
        </div>
      </header>

      <main className="max-w-[600px] mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6"
          style={{ background: 'var(--pl-accent)', color: '#fff' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight mb-3" style={{ color: 'var(--ink)' }}>
          Application received
        </h1>
        <p className="text-[15px] md:text-[16px] mb-7" style={{ color: 'var(--ink-3)' }}>
          We review every application personally — usually within one working day. You’ll get an email at the
          address you provided once a decision lands.
        </p>
        <p className="text-[13.5px] mb-7" style={{ color: 'var(--ink-4)' }}>
          Want to share your channels with us in the meantime? Reply to the confirmation email or write to
          {' '}
          <a href="mailto:partners@personalink.in" style={{ color: 'var(--pl-accent)' }}>partners@personalink.in</a>.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl text-[14px] font-bold"
          style={{ background: 'var(--ink)', color: 'var(--bg)' }}
        >
          Back to home
        </Link>
      </main>
    </div>
  )
}
