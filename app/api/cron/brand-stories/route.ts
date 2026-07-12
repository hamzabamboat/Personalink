import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { BRAND_ROSTER, type RosterEntry } from '@/config/brand-roster'
import { researchCompany, discoverTrendingBrands } from '@/lib/brand-research'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Weekly curation: research the seed roster + a few AI-discovered brands, and
 * auto-publish the ones that clear citation enforcement. No human approval.
 * Re-fetch refreshes facts and retires companies that fall below the bar.
 */
async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockErr } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'brand-stories', run_date: today, lock_id: lockId })
  if (lockErr) return NextResponse.json({ skipped: true, reason: 'already_ran_today', date: today })

  const summary = { researched: 0, published: 0, retired: 0, failed: 0 }
  try {
    const rosterSlugs = BRAND_ROSTER.map(r => r.slug)
    let discovered: RosterEntry[] = []
    try {
      discovered = await discoverTrendingBrands(rosterSlugs)
    } catch { /* discovery is best-effort */ }

    const entries: Array<RosterEntry & { via: 'roster' | 'weekly-discovery' }> = [
      ...BRAND_ROSTER.map(r => ({ ...r, via: 'roster' as const })),
      ...discovered.map(r => ({ ...r, via: 'weekly-discovery' as const })),
    ]

    for (const entry of entries) {
      summary.researched++
      let result
      try {
        result = await researchCompany(entry)
      } catch (err) {
        console.error(`[brand-stories cron] research failed for ${entry.slug}`, err)
        summary.failed++
        continue
      }

      const now = new Date().toISOString()

      // Under the citation bar → retire an existing live company; skip new ones.
      if (!result) {
        const { data: existing } = await supabaseAdmin.from('brand_companies').select('id').eq('slug', entry.slug).maybeSingle()
        if (existing) {
          await supabaseAdmin.from('brand_companies').update({ status: 'retired', refreshed_at: now }).eq('id', existing.id)
          summary.retired++
        }
        continue
      }

      // Upsert the company by slug (idempotent), publishing it live.
      const { data: company, error: upsertErr } = await supabaseAdmin
        .from('brand_companies')
        .upsert({
          slug: entry.slug,
          name: entry.name,
          sector: entry.sector,
          summary: result.summary,
          facts: result.facts,
          source: 'curated',
          status: 'live',
          discovered_via: entry.via,
          refreshed_at: now,
        }, { onConflict: 'slug' })
        .select('id')
        .single()
      if (upsertErr || !company) { summary.failed++; continue }

      // Insert only genuinely-new seed angles (dedupe by fingerprint per company).
      const { data: existingAngles } = await supabaseAdmin
        .from('brand_angles')
        .select('fingerprint')
        .eq('company_id', company.id)
      const known = new Set((existingAngles ?? []).map(a => a.fingerprint as string))
      const fresh = result.angles.filter(a => !known.has(a.fingerprint))
      if (fresh.length) {
        await supabaseAdmin.from('brand_angles').insert(
          fresh.map(a => ({ company_id: company.id, title: a.title, summary: a.summary, source: 'curated', fingerprint: a.fingerprint }))
        )
      }
      summary.published++
    }

    await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)
    return NextResponse.json({ ok: true, ...summary })
  } catch (err) {
    console.error('[brand-stories cron] failed', err)
    return NextResponse.json({ error: String(err), ...summary }, { status: 500 })
  }
}

export { handler as GET, handler as POST }
