import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getBrowse } from '@/lib/brand-stories'

export const runtime = 'nodejs'

/** Browse: live curated companies + the user's own uploads, each with only its available angles. */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const sector = new URL(request.url).searchParams.get('sector') || undefined
    const companies = await getBrowse(user.id, sector)
    return NextResponse.json({ companies })
  } catch (err) {
    console.error('[brand-stories] browse failed', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
