'use client'

import { WordMark } from '@/components/word-mark'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="mb-8">
        <WordMark icon wordmark iconSize={48} />
      </div>
      <h1 className="text-2xl font-semibold mb-2" style={{ letterSpacing: '-0.03em', color: 'var(--ink)' }}>
        You&apos;re offline
      </h1>
      <p className="mb-6 max-w-sm" style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>
        No internet connection. Some features may be unavailable but you can still view your cached posts and profile.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-80"
        style={{ background: 'var(--pl-accent)', color: '#fff', fontSize: 14 }}
      >
        Try again
      </button>
    </div>
  )
}
