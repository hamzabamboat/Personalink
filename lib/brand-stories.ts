import { supabaseAdmin } from './supabase-admin'
import { anthropic } from './anthropic'
import { fingerprintAngle, angleCollides } from './brand-fingerprint'
import type { BrandCompany, BrandAngle, BrandFact } from './supabase'

/** How long a claimed angle stays locked before it frees up again. */
export const COOLDOWN_DAYS = 35

const MODEL = 'claude-sonnet-4-5'

/* ────────────────────────────── locks ────────────────────────────── */

/**
 * Fingerprints of every angle for `companyId` that is currently locked
 * (un-released and still on cooldown). Used both to hide locked seed angles
 * from browse and to dedup a freshly-generated AI angle.
 */
export async function getActiveLockedAngleIds(companyId: string): Promise<Set<string>> {
  const nowIso = new Date().toISOString()
  const { data: angles } = await supabaseAdmin
    .from('brand_angles')
    .select('id')
    .eq('company_id', companyId)
  const ids = (angles ?? []).map(a => a.id as string)
  if (ids.length === 0) return new Set()

  const { data: locks } = await supabaseAdmin
    .from('angle_locks')
    .select('angle_id')
    .in('angle_id', ids)
    .is('released_at', null)
    .gt('cooldown_until', nowIso)
  return new Set((locks ?? []).map(l => l.angle_id as string))
}

/**
 * Release any stale (expired, still un-released) lock on an angle so the
 * partial-unique index frees up before a fresh claim. Cheap no-op when none.
 */
async function releaseExpiredLocks(angleId: string): Promise<void> {
  const nowIso = new Date().toISOString()
  await supabaseAdmin
    .from('angle_locks')
    .update({ released_at: nowIso })
    .eq('angle_id', angleId)
    .is('released_at', null)
    .lte('cooldown_until', nowIso)
}

/**
 * Atomically claim an angle for a user. Inserts an active lock; the partial
 * unique index (one un-released lock per angle) makes concurrent grabs safe —
 * the loser gets `null`. Returns the lock id, or null if already taken.
 */
export async function claimAngle(userId: string, angleId: string): Promise<string | null> {
  await releaseExpiredLocks(angleId)
  const cooldownUntil = new Date(Date.now() + COOLDOWN_DAYS * 86_400_000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('angle_locks')
    .insert({ angle_id: angleId, user_id: userId, cooldown_until: cooldownUntil })
    .select('id')
    .single()
  if (error) return null // unique-violation → someone holds it
  return data.id as string
}

/** Link the created draft to its lock (enables release-on-draft-delete). */
export async function attachPostToLock(lockId: string, postId: string): Promise<void> {
  await supabaseAdmin.from('angle_locks').update({ post_id: postId }).eq('id', lockId)
}

/** Release a lock the caller owns — by lock id or by the draft it created. */
export async function releaseLock(opts: { lockId?: string; postId?: string; userId: string }): Promise<void> {
  const nowIso = new Date().toISOString()
  let q = supabaseAdmin.from('angle_locks').update({ released_at: nowIso }).eq('user_id', opts.userId).is('released_at', null)
  if (opts.lockId) q = q.eq('id', opts.lockId)
  else if (opts.postId) q = q.eq('post_id', opts.postId)
  else return
  await q
}

/* ─────────────────────────────── browse ─────────────────────────────── */

/**
 * The browse surface: every `live` curated company plus the user's own private
 * uploads, each carrying only its currently-available angles (locked ones are
 * omitted entirely, not greyed out).
 */
export async function getBrowse(userId: string, sector?: string): Promise<BrandCompany[]> {
  let q = supabaseAdmin
    .from('brand_companies')
    .select('*')
    .or(`and(status.eq.live,source.eq.curated),owner_id.eq.${userId}`)
    .order('refreshed_at', { ascending: false })
    .limit(200)
  if (sector) q = q.eq('sector', sector)
  const { data: companies } = await q
  if (!companies?.length) return []

  const result: BrandCompany[] = []
  for (const company of companies as BrandCompany[]) {
    const { data: angles } = await supabaseAdmin
      .from('brand_angles')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: true })
    const locked = await getActiveLockedAngleIds(company.id)
    const available = (angles ?? []).filter(a => !locked.has(a.id)) as BrandAngle[]
    result.push({ ...company, available_angles: available })
  }
  return result
}

/* ──────────────────────── fresh AI angle generation ──────────────────────── */

type AngleCandidate = { title: string; summary: string }

async function draftAngleCandidate(company: BrandCompany, avoid: string[]): Promise<AngleCandidate | null> {
  const factLines = (company.facts ?? []).map((f: BrandFact) => `- ${f.claim} (${f.source_url})`).join('\n')
  const avoidLine = avoid.length ? `\nAvoid these already-taken angles (pick something genuinely different):\n${avoid.map(a => `- ${a}`).join('\n')}` : ''

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You write LinkedIn post angles about real companies. Given ${company.name} (${company.sector ?? 'general'}) and these CITED facts, propose ONE sharp, specific takeaway a professional could build a post around. Ground it ONLY in the facts below — never invent statistics.

Facts:
${factLines || '(no facts on file)'}
${avoidLine}

Return ONLY a JSON object (no prose, no code fences): {"title":"<6-10 word angle label>","summary":"<2-3 sentences of talking points grounded in the facts>"}`,
    }],
  })
  const text = message.content.find(b => b.type === 'text')?.type === 'text'
    ? (message.content.find(b => b.type === 'text') as { text: string }).text
    : ''
  try {
    const parsed = JSON.parse(text.trim()) as AngleCandidate
    if (parsed?.title && parsed?.summary) return parsed
  } catch { /* fall through */ }
  return null
}

/**
 * Generate a fresh, unique angle for a company and lock it to the user.
 * Retries a few times against the currently-locked fingerprints. Returns the
 * new angle + lock id, or null if the company is well-covered right now.
 */
export async function createFreshAngle(
  userId: string,
  company: BrandCompany,
): Promise<{ angle: BrandAngle; lockId: string } | null> {
  // Fingerprints of angles currently locked for this company (dedup targets).
  const lockedIds = await getActiveLockedAngleIds(company.id)
  const { data: allAngles } = await supabaseAdmin
    .from('brand_angles')
    .select('id, title, fingerprint')
    .eq('company_id', company.id)
  const lockedFingerprints = (allAngles ?? [])
    .filter(a => lockedIds.has(a.id as string))
    .map(a => a.fingerprint as string)
  const avoidTitles = (allAngles ?? []).map(a => a.title as string)

  for (let attempt = 0; attempt < 4; attempt++) {
    const candidate = await draftAngleCandidate(company, avoidTitles)
    if (!candidate) continue
    const fingerprint = fingerprintAngle(candidate.title, candidate.summary)
    if (angleCollides(fingerprint, lockedFingerprints)) continue // clashes with a live lock — retry

    const { data: angle, error } = await supabaseAdmin
      .from('brand_angles')
      .insert({
        company_id: company.id,
        title: candidate.title,
        summary: candidate.summary,
        source: 'ai',
        fingerprint,
        created_by: userId,
      })
      .select('*')
      .single()
    if (error || !angle) continue

    const lockId = await claimAngle(userId, angle.id as string)
    if (!lockId) {
      // Extremely unlikely (row is brand new) — clean up the orphan angle.
      await supabaseAdmin.from('brand_angles').delete().eq('id', angle.id)
      continue
    }
    return { angle: angle as BrandAngle, lockId }
  }
  return null
}

/* ─────────────────────── generation context helper ─────────────────────── */

/** Build the `additionalContext` handed to the post generator for an angle. */
export function buildAngleContext(company: BrandCompany, angle: BrandAngle): string {
  const facts = (company.facts ?? []).map((f: BrandFact) => `- ${f.claim} (source: ${f.source_url})`).join('\n')
  return `Write a LinkedIn post built around this real-company case study.

Company: ${company.name}${company.sector ? ` (${company.sector})` : ''}
Angle: ${angle.title}
Talking points: ${angle.summary ?? ''}

Cited facts you may reference (do NOT invent numbers beyond these):
${facts || '(none on file)'}

Keep it the writer's own reflection on the company — a takeaway, not a press release. Attribute any statistic to its source in spirit (no fabricated "in our data" figures).`
}
