import { cookies } from 'next/headers'
import { getClient, redirectUriAllowed, sanitizeScope } from '@/lib/oauth'
import { ConsentForm } from './ConsentForm'

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const { client_id, redirect_uri, code_challenge, code_challenge_method, state, scope, response_type } = sp

  if (response_type !== 'code' || !client_id || !redirect_uri || !code_challenge || code_challenge_method !== 'S256') {
    return <main style={{ padding: 40 }}><h1>Invalid authorization request</h1></main>
  }

  const client = await getClient(client_id)
  if (!client || !redirectUriAllowed(client, redirect_uri)) {
    return <main style={{ padding: 40 }}><h1>Unknown client or redirect URI</h1></main>
  }

  const scopeStr = sanitizeScope(scope)
  const userId = (await cookies()).get('session_user_id')?.value

  // Preserve the full authorize URL so login can return here.
  const qs = new URLSearchParams(sp as Record<string, string>).toString()
  const returnTo = `/oauth/authorize?${qs}`

  return (
    <ConsentForm
      loggedIn={!!userId}
      clientName={client.client_name || 'An application'}
      scope={scopeStr}
      returnTo={returnTo}
      params={{ client_id, redirect_uri, code_challenge, state: state || '', scope: scopeStr }}
    />
  )
}
