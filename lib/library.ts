import { supabaseAdmin } from './supabase-admin'
import { extractLibraryPattern } from './anthropic'
import type { LibraryItem } from './supabase'

export interface LibraryFilters {
  format?: string | null
  hook_type?: string | null
  niche?: string | null
  savedOnly?: boolean
}

export async function getSavedItemIds(userId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from('swipe_saves').select('library_item_id').eq('user_id', userId)
  return new Set((data ?? []).map(r => r.library_item_id as string))
}

/** Curated public items + the user's own first-party items, with a `saved` flag. */
export async function getLibraryItems(userId: string, filters: LibraryFilters = {}): Promise<LibraryItem[]> {
  let q = supabaseAdmin
    .from('library_items')
    .select('*')
    .or(`and(is_public.eq.true,source.eq.curated),contributed_by.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(200)
  if (filters.format) q = q.eq('format', filters.format)
  if (filters.hook_type) q = q.eq('hook_type', filters.hook_type)
  if (filters.niche) q = q.eq('niche', filters.niche)

  const [{ data: items }, savedIds] = await Promise.all([q, getSavedItemIds(userId)])
  let list = (items ?? []).map(it => ({ ...it, saved: savedIds.has(it.id) })) as LibraryItem[]
  if (filters.savedOnly) list = list.filter(it => it.saved)
  return list
}

/** Toggle a swipe-file save. Returns the new saved state. */
export async function toggleSwipeSave(userId: string, itemId: string): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from('swipe_saves').select('id').eq('user_id', userId).eq('library_item_id', itemId).maybeSingle()
  if (existing) {
    await supabaseAdmin.from('swipe_saves').delete().eq('id', existing.id)
    return false
  }
  await supabaseAdmin.from('swipe_saves').insert({ user_id: userId, library_item_id: itemId })
  return true
}

/**
 * First-party ingestion: turn a user's top-performing published posts into
 * anonymized pattern breakdowns. Stores the transformative pattern + a template,
 * never the verbatim post. Idempotent per post (slug `fp-<postId>`).
 */
export async function ingestForUser(
  userId: string,
  opts: { minImpressions?: number; minReactions?: number; max?: number } = {},
): Promise<number> {
  const minImpr = opts.minImpressions ?? 400
  const minReact = opts.minReactions ?? 15
  const max = opts.max ?? 10

  const { data: posts } = await supabaseAdmin
    .from('posts')
    .select('id, content')
    .eq('user_id', userId)
    .eq('status', 'published')
    .limit(100)
  if (!posts?.length) return 0

  const ids = posts.map(p => p.id)
  const { data: analytics } = await supabaseAdmin
    .from('post_analytics')
    .select('post_id, impressions, reactions')
    .in('post_id', ids)

  // Best snapshot per post.
  const best = new Map<string, { impressions: number; reactions: number }>()
  for (const a of analytics ?? []) {
    const cur = best.get(a.post_id) || { impressions: 0, reactions: 0 }
    best.set(a.post_id, {
      impressions: Math.max(cur.impressions, a.impressions || 0),
      reactions: Math.max(cur.reactions, a.reactions || 0),
    })
  }

  const { data: existing } = await supabaseAdmin
    .from('library_items').select('slug').eq('contributed_by', userId).eq('source', 'first_party')
  const have = new Set((existing ?? []).map(r => r.slug as string))

  const eligible = posts
    .filter(p => { const m = best.get(p.id); return m && (m.impressions >= minImpr || m.reactions >= minReact) })
    .filter(p => !have.has(`fp-${p.id}`))
    .slice(0, max)

  let inserted = 0
  for (const p of eligible) {
    if (!p.content || p.content.length < 80) continue
    const pattern = await extractLibraryPattern(p.content)
    if (!pattern) continue
    const m = best.get(p.id)!
    const tier = m.impressions >= minImpr * 3 ? 'top' : 'high'
    const { error } = await supabaseAdmin.from('library_items').insert({
      source: 'first_party',
      slug: `fp-${p.id}`,
      title: 'Your top post',
      niche: pattern.niche,
      format: pattern.format,
      hook_type: pattern.hook_type,
      pattern_summary: pattern.pattern_summary,
      template_text: pattern.template_text,
      engagement_tier: tier,
      contributed_by: userId,
      attributed: false,
      is_public: false,
    })
    if (!error) inserted++
  }
  return inserted
}
