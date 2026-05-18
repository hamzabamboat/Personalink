import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/linkedin/managed-pages
// Returns all LinkedIn Company Pages the user is an admin of.
// Used in the dashboard to let users select which pages to connect + pay for.
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('linkedin_access_token')
    .eq('id', user.id)
    .single()

  if (!userData?.linkedin_access_token) {
    return NextResponse.json({ error: 'No LinkedIn token' }, { status: 400 })
  }

  // Fetch org pages where user is ADMINISTRATOR
  const aclRes = await fetch(
    'https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organizationalTarget))',
    { headers: { Authorization: `Bearer ${userData.linkedin_access_token}` } }
  )

  if (!aclRes.ok) {
    const err = await aclRes.text()
    console.error('[managed-pages] LinkedIn ACL fetch failed:', err)
    return NextResponse.json({ error: 'Failed to fetch org pages from LinkedIn' }, { status: 502 })
  }

  const aclData = await aclRes.json()
  const orgUrns: string[] = (aclData.elements ?? []).map(
    (el: { organizationalTarget: string }) => el.organizationalTarget
  )

  if (orgUrns.length === 0) {
    return NextResponse.json({ pages: [] })
  }

  // Batch-fetch org details (name + logo) for all pages
  const orgIds = orgUrns.map(urn => urn.split(':').pop() as string)
  const detailParams = orgIds.map(id => `ids=urn:li:organization:${id}`).join('&')

  const detailRes = await fetch(
    `https://api.linkedin.com/v2/organizations?${detailParams}&projection=(results*(id,name,logoV2(original~:playableStreams(identifiers))))`,
    { headers: { Authorization: `Bearer ${userData.linkedin_access_token}` } }
  )

  let pages: Array<{ linkedin_id: string; name: string; picture_url: string | null }> = []

  if (detailRes.ok) {
    const detailData = await detailRes.json()
    const results = detailData.results ?? {}
    pages = orgIds.map(id => {
      const org = results[`urn:li:organization:${id}`]
      const logoUrl =
        org?.logoV2?.['original~']?.elements?.[0]?.identifiers?.[0]?.identifier ?? null
      return {
        linkedin_id: id,
        name: org?.name?.localized?.en_US ?? org?.name?.localized?.[Object.keys(org?.name?.localized ?? {})[0]] ?? `Page ${id}`,
        picture_url: logoUrl,
      }
    })
  } else {
    // Fallback: return pages without names/logos
    pages = orgIds.map(id => ({ linkedin_id: id, name: `Page ${id}`, picture_url: null }))
  }

  // Annotate each page with whether it's already connected in our DB
  const { data: connectedAccounts } = await supabaseAdmin
    .from('linkedin_accounts')
    .select('linkedin_id, subscription_status')
    .eq('user_id', user.id)
    .eq('account_type', 'company')

  const connectedMap = Object.fromEntries(
    (connectedAccounts ?? []).map(a => [a.linkedin_id, a.subscription_status])
  )

  const pagesWithStatus = pages.map(p => ({
    ...p,
    connected: p.linkedin_id in connectedMap,
    subscription_status: connectedMap[p.linkedin_id] ?? null,
  }))

  return NextResponse.json({ pages: pagesWithStatus })
}
