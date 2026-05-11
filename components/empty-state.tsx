import { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ConcentricRings } from '@/components/concentric-rings'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  subtitle: string
  ctaLabel?: string
  ctaHref?: string
  onCta?: () => void
}

export function EmptyState({ icon: Icon, title, subtitle, ctaLabel, ctaHref, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="relative mx-auto mb-4" style={{ width: 120, height: 120 }}>
        <ConcentricRings size={120} opacity={0.08} className="absolute inset-0" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
            <Icon className="w-7 h-7 text-blue-300 dark:text-blue-400" strokeWidth={1.5} />
          </div>
        </div>
      </div>
      <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-base mb-1">{title}</h3>
      <p className="text-slate-400 dark:text-slate-500 text-sm max-w-xs leading-relaxed mb-5">{subtitle}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref}>
          <Button size="sm" className="gap-1.5">{ctaLabel}</Button>
        </Link>
      )}
      {ctaLabel && onCta && (
        <Button size="sm" className="gap-1.5" onClick={onCta}>{ctaLabel}</Button>
      )}
    </div>
  )
}
