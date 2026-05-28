'use client'

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void }
  }
}

export function CalEmbed({ url }: { url: string }) {
  const src = url.includes('?') ? `${url}&embed=true&theme=light` : `${url}?embed=true&theme=light`
  return (
    <div
      style={{
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        border: '1px solid var(--line)',
        background: 'var(--surface)',
        marginTop: 24,
      }}
      onClick={() => {
        if (typeof window !== 'undefined' && window.posthog?.capture) {
          window.posthog.capture('agency_calendar_clicked')
        }
      }}
    >
      <iframe
        title="Book a slot"
        src={src}
        style={{ width: '100%', height: 720, border: 0, display: 'block' }}
        loading="lazy"
      />
    </div>
  )
}
