export async function publishToLinkedIn({
  accessToken,
  linkedinId,
  content,
  imageUrls,
}: {
  accessToken: string
  linkedinId: string
  content: string
  imageUrls?: string[]
}): Promise<string> {
  const owner = `urn:li:person:${linkedinId}`

  let assetUrns: string[] = []

  if (imageUrls?.length) {
    try {
      assetUrns = await Promise.all(
        imageUrls.map(url => uploadImageToLinkedIn(url, accessToken, owner))
      )
    } catch (err) {
      console.error('[linkedin-api] image upload failed, posting text-only:', err)
      assetUrns = []
    }
  }

  const mediaCategory = assetUrns.length > 0 ? (assetUrns.length === 1 ? 'IMAGE' : 'IMAGE') : 'NONE'

  const body: Record<string, unknown> = {
    author: owner,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: mediaCategory,
        ...(assetUrns.length === 1 && {
          media: [{ status: 'READY', description: { text: 'Post image' }, media: assetUrns[0], title: { text: 'Image' } }],
        }),
        ...(assetUrns.length > 1 && {
          media: assetUrns.map(urn => ({ status: 'READY', description: { text: 'Post image' }, media: urn, title: { text: 'Image' } })),
        }),
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  }

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`LinkedIn API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.id as string
}

async function uploadImageToLinkedIn(imageUrl: string, accessToken: string, owner: string): Promise<string> {
  // Step 1: Register upload
  const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    }),
  })

  if (!registerRes.ok) throw new Error(`LinkedIn register upload failed: ${registerRes.status}`)
  const { value } = await registerRes.json()
  const uploadUrl = value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl
  const asset = value.asset as string

  // Step 2: Fetch image and upload binary
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imageUrl}`)
  const imgBuffer = await imgRes.arrayBuffer()

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: imgBuffer,
  })
  if (!uploadRes.ok) throw new Error(`LinkedIn image PUT failed: ${uploadRes.status}`)

  return asset
}

export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  return new Date(expiresAt) <= new Date(Date.now() + 5 * 60 * 1000)
}
