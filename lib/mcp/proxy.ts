import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'

const BASE = process.env.NEXT_PUBLIC_APP_URL!

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

/**
 * Server-side call to our own API, forwarding the user's OAuth Bearer token so
 * every existing guard (plan limits, rate limits, bearerScopeFor) applies.
 */
export async function apiFetch(
  token: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method || 'GET',
    headers: {
      authorization: `Bearer ${token}`,
      ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON response (e.g. 204) */
  }
  return { ok: res.ok, status: res.status, body }
}

export function textResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
  }
}

export function errorResult(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}

/** Turn a failed apiFetch into a readable tool error (routes return { error }). */
export function proxyError(status: number, body: unknown): ToolResult {
  const msg =
    body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `Request failed (${status})`
  return errorResult(msg)
}

/**
 * Friendly scope pre-check. bearerScopeFor on the proxied route remains the
 * enforcement backstop; this just gives the model a clear message.
 */
export function requireScope(authInfo: AuthInfo | undefined, scope: string): ToolResult | null {
  const scopes = authInfo?.scopes || []
  if (scopes.includes(scope)) return null
  return errorResult(
    `This action needs the "${scope}" permission, which wasn't granted when connecting PersonaLink. Reconnect and approve it to use this tool.`,
  )
}

/** The Bearer token for proxying, from the verified request. */
export function tokenOf(authInfo: AuthInfo | undefined): string {
  return authInfo?.token || ''
}
