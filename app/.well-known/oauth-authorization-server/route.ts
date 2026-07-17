import { NextResponse } from 'next/server'
import { SUPPORTED_SCOPES } from '@/lib/oauth'

const BASE = process.env.NEXT_PUBLIC_APP_URL!

export async function GET() {
  return NextResponse.json({
    issuer: BASE,
    authorization_endpoint: `${BASE}/oauth/authorize`,
    token_endpoint: `${BASE}/api/oauth/token`,
    registration_endpoint: `${BASE}/api/oauth/register`,
    revocation_endpoint: `${BASE}/api/oauth/revoke`,
    scopes_supported: [...SUPPORTED_SCOPES],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  })
}
