import { createHash, randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const CODE_TTL_MS = 60 * 1000                 // 60s
export const ACCESS_TTL_MS = 60 * 60 * 1000          // 1h
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30d

export const SUPPORTED_SCOPES = ['posts:read', 'posts:write', 'posts:publish'] as const

/** Hex SHA-256 — used to store codes/tokens hashed at rest. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** Opaque, URL-safe random secret (auth codes, access/refresh tokens). */
export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/** PKCE S256 challenge = base64url(sha256_raw(verifier)). */
export function pkceChallengeFromVerifier(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false
  return pkceChallengeFromVerifier(verifier) === challenge
}

/** Keep only scopes we support, preserving request order. */
export function sanitizeScope(requested: string | null | undefined): string {
  const parts = (requested || '').split(/\s+/).filter(Boolean)
  const allowed = parts.filter((s) => (SUPPORTED_SCOPES as readonly string[]).includes(s))
  return (allowed.length ? allowed : ['posts:read', 'posts:write']).join(' ')
}

export interface OAuthClient {
  client_id: string
  client_secret: string | null
  client_name: string | null
  redirect_uris: string[]
  grant_types: string[]
  token_endpoint_auth_method: string
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const { data } = await supabaseAdmin
    .from('oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()
  return (data as OAuthClient) ?? null
}

/** Exact-match redirect_uri validation. */
export function redirectUriAllowed(client: OAuthClient, redirectUri: string): boolean {
  return client.redirect_uris.includes(redirectUri)
}
