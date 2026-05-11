import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { recordLinkedInScore } from '@/lib/scoring'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await recordLinkedInScore(user.id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[scoring]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
