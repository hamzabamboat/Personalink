import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { toggleSwipeSave } from '@/lib/library'

export const runtime = 'nodejs'

// Toggle a swipe-file save for a library item.
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await request.json().catch(() => ({} as { itemId?: string }))
  if (!itemId) return NextResponse.json({ error: 'Missing itemId' }, { status: 400 })

  const saved = await toggleSwipeSave(user.id, itemId)
  return NextResponse.json({ saved })
}
