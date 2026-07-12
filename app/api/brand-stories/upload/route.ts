import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import type { BrandFact } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * Upload a private company. Only the uploader ever sees it: it never enters the
 * curated pipeline and never joins the global angle-lock space — its dedup is
 * only the existing same-user similarity check at generation time.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, sector, facts, summary, logo_url } = await request.json()
    if (!name || typeof name !== 'string') return NextResponse.json({ error: 'name required' }, { status: 400 })

    // Facts are user-asserted here (no external source to cite) — store as-is.
    const now = new Date().toISOString()
    const factRows: BrandFact[] = Array.isArray(facts)
      ? facts.filter((f: unknown) => typeof f === 'string' && (f as string).trim())
          .map((claim: string) => ({ claim: claim.trim(), source_url: '', fetched_at: now }))
      : []

    const { data, error } = await supabaseAdmin
      .from('brand_companies')
      .insert({
        name: name.trim(),
        sector: sector?.trim() || null,
        summary: summary?.trim() || null,
        facts: factRows,
        source: 'user',
        owner_id: user.id,
        logo_url: logo_url?.trim() || null,
        status: 'live',
        discovered_via: 'user',
      })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ company: data })
  } catch (err) {
    console.error('[brand-stories/upload]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
