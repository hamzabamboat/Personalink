import type { Metadata } from 'next'
import { WordMark } from '@/components/word-mark'

export const metadata: Metadata = {
  title: 'Agency Portal — PersonaLink',
}

export default function AgencyDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 50, boxShadow: 'var(--sh-1)' }}>
        <WordMark icon wordmark iconSize={28} />
        <span style={{ color: 'var(--line-2)', fontSize: 14 }}>·</span>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, letterSpacing: '.05em', color: 'var(--ink-4)', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 999, padding: '2px 10px', textTransform: 'uppercase' }}>Agency Portal</span>
      </header>
      <main>{children}</main>
    </div>
  )
}
