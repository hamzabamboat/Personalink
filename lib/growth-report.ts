import { supabaseAdmin } from '@/lib/supabase-admin'

/** The growth delta window the report narrates, in days (= one baseline window). */
export const REPORT_WINDOW_DAYS = 28

/**
 * Fractional change of a current value vs a prior value.
 * - prior absent/zero → null (no baseline to compare against)
 * - current null but prior present → -1 (lost everything, -100%)
 */
export function pctChange(current: number | null, prior: number | null): number | null {
  if (prior == null || prior === 0) return null
  const c = current ?? 0
  return (c - prior) / prior
}

/** Format a fraction (0.4) as a signed percentage string ("+40%"); "—" for null. */
export function signedPct(frac: number | null): string {
  if (frac == null) return '—'
  const pct = Math.round(frac * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

/** Format a signed integer with thousands separators ("+1,200"); "—" for null. */
export function signedInt(n: number | null): string {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : '-'
  return `${sign}${Math.abs(n).toLocaleString('en-US')}`
}

// Suppress unused-import lint warning; DB wrappers below will use supabaseAdmin.
void (supabaseAdmin as unknown)
