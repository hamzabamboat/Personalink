import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { User, Agency } from './supabase'
import { supabaseAdmin } from './supabase-admin'
import { sha256 } from './oauth'

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('session_user_id')?.value
  if (!userId) return null

  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}

/**
 * Resolve a PersonaLink user from an OAuth Bearer access token.
 * Returns the user with `oauthScope` attached, or null if the token is
 * unknown, expired, or revoked.
 */
export async function getUserFromToken(rawToken: string): Promise<(User & { oauthScope?: string }) | null> {
  if (!rawToken) return null

  const { data: tokenRow } = await supabaseAdmin
    .from('oauth_tokens')
    .select('user_id, scope, access_expires_at, revoked_at')
    .eq('access_token', sha256(rawToken))
    .maybeSingle()

  if (!tokenRow) return null
  if (tokenRow.revoked_at) return null
  if (new Date(tokenRow.access_expires_at as string) < new Date()) return null

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', tokenRow.user_id)
    .maybeSingle()

  if (!user) return null
  return { ...(user as User), oauthScope: tokenRow.scope as string }
}

export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const user = await getUserFromToken(authHeader.slice('Bearer '.length).trim())
    if (user) return user
  }

  const userId = request.cookies.get('session_user_id')?.value
  if (!userId) return null

  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return data
}

export function hasActiveSubscription(user: User): boolean {
  return (
    user.subscription_status === 'active' ||
    user.subscription_status === 'trialing' ||
    user.subscription_status === 'access_code'
  )
}

export function canGeneratePost(user: User): boolean {
  if (hasActiveSubscription(user)) return true
  return user.trial_posts_used < 3
}

export async function getAgency(): Promise<Agency | null> {
  const cookieStore = await cookies()
  const agencyId = cookieStore.get('session_agency_id')?.value
  if (!agencyId) return null

  const { data } = await supabaseAdmin
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .single()

  return data
}

export async function getAgencyFromRequest(request: NextRequest): Promise<Agency | null> {
  const agencyId = request.cookies.get('session_agency_id')?.value
  if (!agencyId) return null

  const { data } = await supabaseAdmin
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .single()

  return data
}
