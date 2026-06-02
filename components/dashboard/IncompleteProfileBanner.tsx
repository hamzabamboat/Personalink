import Link from 'next/link'
import { CircleAlert } from 'lucide-react'
import type { CompletenessGroup } from '@/lib/profile-completeness'

interface IncompleteProfileBannerProps {
  missing: CompletenessGroup[]
  className?: string
}

export function IncompleteProfileBanner({ missing, className }: IncompleteProfileBannerProps) {
  if (missing.length === 0) return null

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        padding: '11px 16px',
        borderRadius: 10,
        marginBottom: 16,
        background: 'color-mix(in srgb, var(--pl-accent) 7%, var(--surface))',
        border: '1px solid color-mix(in srgb, var(--pl-accent) 25%, var(--line))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <CircleAlert
          size={15}
          strokeWidth={1.75}
          style={{ color: 'var(--pl-accent)', flexShrink: 0 }}
        />
        <span style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>
          Your posts get sharper once you finish your profile — add your content pillars, voice quiz, and preferences.
        </span>
      </div>
      <Link
        href="/dashboard/finish-profile"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--pl-accent)',
          whiteSpace: 'nowrap',
          textDecoration: 'none',
          fontFamily: 'var(--f-sans)',
          flexShrink: 0,
        }}
      >
        Finish profile →
      </Link>
    </div>
  )
}
