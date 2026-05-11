import { NextResponse } from 'next/server'

// NextAuth is no longer used. Google auth is handled via /api/auth/google
export function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export function POST() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
