// Single source of truth for the live USD→INR exchange rate.
// `getUsdInrRate()` is fetched at most once a week via Next's data cache
// (no cron, no DB). Call it ONLY server-side; client components read /api/fx-rate.

export const FX_FALLBACK_USD_INR = 94
const FX_API_URL = 'https://open.er-api.com/v6/latest/USD'
const FX_MIN = 60
const FX_MAX = 120
const WEEK_SECONDS = 60 * 60 * 24 * 7

/** Extract + validate the USD→INR rate from the open.er-api.com payload. Null if absent/garbage. */
export function parseUsdInrRate(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const rates = (payload as { rates?: Record<string, unknown> }).rates
  const inr = rates?.INR
  if (typeof inr !== 'number' || !Number.isFinite(inr)) return null
  if (inr < FX_MIN || inr > FX_MAX) return null
  return inr
}

/** Round a USD amount to whole INR at the given rate. */
export function inrFromUsd(usd: number, rate: number): number {
  return Math.round(usd * rate)
}

/** Live USD→INR rate. Cached ~weekly by Next; falls back to FX_FALLBACK_USD_INR on any failure. */
export async function getUsdInrRate(): Promise<number> {
  try {
    const res = await fetch(FX_API_URL, { next: { revalidate: WEEK_SECONDS } })
    if (!res.ok) return FX_FALLBACK_USD_INR
    const json: unknown = await res.json()
    return parseUsdInrRate(json) ?? FX_FALLBACK_USD_INR
  } catch {
    return FX_FALLBACK_USD_INR
  }
}
