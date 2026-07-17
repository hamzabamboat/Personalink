'use client'
import { useState } from 'react'

const SCOPE_LABELS: Record<string, string> = {
  'posts:read': 'Read your drafts, calendar, and profile',
  'posts:write': 'Create and edit drafts, graphics, and brand context',
  'posts:publish': 'Publish posts to your LinkedIn',
}

export function ConsentForm({
  loggedIn, clientName, scope, returnTo, params,
}: {
  loggedIn: boolean
  clientName: string
  scope: string
  returnTo: string
  params: { client_id: string; redirect_uri: string; code_challenge: string; state: string; scope: string }
}) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  if (!loggedIn) {
    const sendLink = async (e: React.FormEvent) => {
      e.preventDefault()
      await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, returnTo }),
      })
      setSent(true)
    }
    return (
      <main style={{ maxWidth: 420, margin: '80px auto', padding: 24 }}>
        <h1>Connect {clientName} to PersonaLink</h1>
        <p>Sign in to continue. We’ll email you a secure link, then bring you back here.</p>
        {sent ? <p>Check your email for a sign-in link.</p> : (
          <form onSubmit={sendLink}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: 10 }} />
            <button type="submit" style={{ marginTop: 12, padding: '10px 16px' }}>Email me a sign-in link</button>
          </form>
        )}
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 420, margin: '80px auto', padding: 24 }}>
      <h1>{clientName} wants to access your PersonaLink account</h1>
      <ul>
        {scope.split(' ').map((s) => <li key={s}>{SCOPE_LABELS[s] || s}</li>)}
      </ul>
      <form method="POST" action="/api/oauth/authorize/decision">
        <input type="hidden" name="client_id" value={params.client_id} />
        <input type="hidden" name="redirect_uri" value={params.redirect_uri} />
        <input type="hidden" name="code_challenge" value={params.code_challenge} />
        <input type="hidden" name="state" value={params.state} />
        <input type="hidden" name="scope" value={params.scope} />
        <button type="submit" name="decision" value="deny" style={{ padding: '10px 16px' }}>Deny</button>
        <button type="submit" name="decision" value="approve" style={{ padding: '10px 16px', marginLeft: 12 }}>Approve</button>
      </form>
    </main>
  )
}
