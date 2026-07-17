import { NextResponse } from 'next/server'

const BASE = process.env.NEXT_PUBLIC_APP_URL!

export async function GET() {
  return NextResponse.json({
    resource: `${BASE}/api/mcp`,
    authorization_servers: [BASE],
    scopes_supported: ['posts:read', 'posts:write', 'posts:publish'],
    bearer_methods_supported: ['header'],
  })
}
