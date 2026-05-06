export async function publishToLinkedIn({
  accessToken,
  linkedinId,
  content,
}: {
  accessToken: string
  linkedinId: string
  content: string
}): Promise<string> {
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${linkedinId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`LinkedIn API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.id as string
}

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  return new Date(expiresAt) <= new Date(Date.now() + 5 * 60 * 1000)
}

