import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getLibraryItems } from '@/lib/library'

export const runtime = 'nodejs'

// Browse the inspiration library — curated patterns + the user's own first-party
// items, each flagged with whether the user has saved it.
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = request.nextUrl.searchParams
  const items = await getLibraryItems(user.id, {
    format: sp.get('format'),
    hook_type: sp.get('hook'),
    niche: sp.get('niche'),
    savedOnly: sp.get('saved') === '1',
  })
  return NextResponse.json({ items })
}
