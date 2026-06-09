import { NextResponse } from 'next/server'
import { getUsdInrRate } from '@/lib/fx'

// Weekly-revalidated public rate for client components (pricing page, calculators).
export const revalidate = 604800

export async function GET() {
  const usdInr = await getUsdInrRate()
  return NextResponse.json({ usdInr })
}
