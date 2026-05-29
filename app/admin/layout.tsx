import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Admin — PersonaLink',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header style={{ background: 'var(--ink)', color: '#eef2fb', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ width: 28, height: 28, background: 'var(--pl-accent)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 100 100">
            <g transform="translate(50 50) rotate(10)" fill="#ffffff">
              <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" />
              <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(60)" />
              <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(120)" />
              <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(180)" />
              <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(240)" />
              <path d="M 0 -42 C 4 -28 4 -12 0 0 C -4 -12 -4 -28 0 -42 Z" transform="rotate(300)" />
            </g>
          </svg>
        </div>
        <span style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em' }}>PersonaLink Admin</span>
        <nav style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          {[
            { href: '/admin', label: 'Dashboard' },
            { href: '/admin/codes', label: 'Access Codes' },
            { href: '/admin/agencies', label: 'Agencies' },
            { href: '/admin/affiliates', label: 'Affiliates' },
            { href: '/admin/compliance', label: 'Compliance' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              color: 'rgba(238,242,251,.65)', textDecoration: 'none',
              transition: 'color .15s, background .15s',
              fontFamily: 'var(--f-sans)',
            }}
              className="hover:text-white hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
