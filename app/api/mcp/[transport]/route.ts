import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { getUserFromToken } from '@/lib/auth'
import { textResult, tokenOf } from '@/lib/mcp/proxy'
import { registerPostsTools } from '@/lib/mcp/tools/posts'
import { registerGenerateTools } from '@/lib/mcp/tools/generate'
import { registerPublishTools } from '@/lib/mcp/tools/publish'
import { registerGraphicsTools } from '@/lib/mcp/tools/graphics'
import { registerContextTools } from '@/lib/mcp/tools/context'
import { registerDiscoveryTools } from '@/lib/mcp/tools/discovery'

// Some tools proxy slow synchronous routes: bulk-generate loops over content
// pillars for minutes and /api/profile/beautify sets maxDuration=120. Cap at
// the platform max so those calls return rather than timing out mid-flight.
export const maxDuration = 300

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'whoami',
      'Show which PersonaLink account is connected and the granted permissions.',
      {},
      { readOnlyHint: true },
      async (_args, extra) => {
        const authInfo = extra.authInfo as AuthInfo | undefined
        const user = await getUserFromToken(tokenOf(authInfo))
        if (!user) return textResult('Not connected.')
        return textResult({
          email: user.email,
          name: user.name ?? null,
          scopes: authInfo?.scopes || [],
        })
      },
    )

    registerPostsTools(server)
    registerGenerateTools(server)
    registerPublishTools(server)
    registerGraphicsTools(server)
    registerContextTools(server)
    registerDiscoveryTools(server)
  },
  {},
  {
    basePath: '/api/mcp',
    maxDuration: 300,
    verboseLogs: false,
  },
)

// Verify OAuth Bearer tokens issued by our authorization server (sub-project 1).
const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined
  const user = await getUserFromToken(bearerToken)
  if (!user) return undefined
  return {
    token: bearerToken,
    clientId: 'personalink-mcp',
    scopes: (user.oauthScope || '').split(' ').filter(Boolean),
    extra: { userId: user.id },
  }
}

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
})

export { authHandler as GET, authHandler as POST, authHandler as DELETE }
