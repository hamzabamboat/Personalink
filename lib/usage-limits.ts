import { supabaseAdmin } from './supabase-admin'

// Env var fallback for local dev (no DB round-trip needed)
const UNLIMITED_USER_IDS = new Set(
  (process.env.UNLIMITED_USER_IDS ?? '').split(',').map(s => s.trim()).filter(Boolean)
)

// In-memory cache: userId → { bypassed, expiresAt }
const bypassCache = new Map<string, { bypassed: boolean; expiresAt: number }>()

export async function isUserBypassed(userId: string): Promise<boolean> {
  if (UNLIMITED_USER_IDS.has(userId)) return true

  const cached = bypassCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.bypassed

  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('bypass_limits')
    .eq('user_id', userId)
    .maybeSingle()

  const bypassed = data?.bypass_limits ?? false
  bypassCache.set(userId, { bypassed, expiresAt: Date.now() + 60_000 })
  return bypassed
}

export const PLAN_LIMITS = {
  starter: {
    posts_generated: 12,
    profile_analyses: 2,
    voice_transcriptions: 0,
    voice_minutes: 0,
    image_uploads: 10,
    trend_refreshes: 5,
    story_entries: 10,
    story_conversions: 5,
    batch_runs: 1,
    repurpose_runs: 0,
  },
  standard: {
    posts_generated: 20,
    profile_analyses: 4,
    voice_transcriptions: 8,
    voice_minutes: 16,
    image_uploads: 30,
    trend_refreshes: 15,
    story_entries: 30,
    story_conversions: 10,
    batch_runs: 2,
    repurpose_runs: 0,
  },
  pro: {
    posts_generated: 30,
    profile_analyses: 8,
    voice_transcriptions: 20,
    voice_minutes: 60,
    image_uploads: 80,
    trend_refreshes: 30,
    story_entries: 60,
    story_conversions: 20,
    batch_runs: 4,
    repurpose_runs: 10,
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS
export type FeatureKey = keyof typeof PLAN_LIMITS.starter

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  posts_generated: 'Post Generations',
  profile_analyses: 'Profile Analyses',
  voice_transcriptions: 'Voice Transcriptions',
  voice_minutes: 'Voice Minutes',
  image_uploads: 'Image Uploads',
  trend_refreshes: 'Trend Refreshes',
  story_entries: 'Story Bank Entries',
  story_conversions: 'Story Conversions',
  batch_runs: 'Batch Generation Runs',
  repurpose_runs: 'Repurpose Runs',
}

export function getResetAt(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

function getPlanLimits(plan: string) {
  const p = plan as PlanType
  return PLAN_LIMITS[p] ?? PLAN_LIMITS.starter
}

export async function checkLimit(
  userId: string,
  plan: string,
  feature: FeatureKey,
): Promise<{ allowed: boolean; used: number; limit: number; remaining: number }> {
  if (await isUserBypassed(userId)) return { allowed: true, used: 0, limit: 9999, remaining: 9999 }

  const limits = getPlanLimits(plan)
  const limit = limits[feature] as number
  const resetAt = getResetAt()

  const { data } = await supabaseAdmin
    .from('usage_tracking')
    .select('used_count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('reset_at', resetAt)
    .maybeSingle()

  const used = data?.used_count ?? 0
  return { allowed: used < limit, used, limit, remaining: Math.max(0, limit - used) }
}

export async function incrementUsage(
  userId: string,
  feature: FeatureKey,
  amount = 1,
): Promise<void> {
  const resetAt = getResetAt()

  const { data: existing } = await supabaseAdmin
    .from('usage_tracking')
    .select('id, used_count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('reset_at', resetAt)
    .maybeSingle()

  if (existing) {
    await supabaseAdmin
      .from('usage_tracking')
      .update({ used_count: existing.used_count + amount, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('usage_tracking')
      .insert({ user_id: userId, feature, used_count: amount, reset_at: resetAt })
  }
}

export async function logViolation(
  userId: string,
  feature: FeatureKey,
  plan: string,
): Promise<void> {
  await supabaseAdmin.from('limit_violations').insert({ user_id: userId, feature, plan })

  // Alert admin after 5+ violations in a day
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const { count } = await supabaseAdmin
    .from('limit_violations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('attempted_at', todayStart.toISOString())

  if ((count ?? 0) >= 5) {
    const { data: u } = await supabaseAdmin
      .from('users')
      .select('email, linkedin_name')
      .eq('id', userId)
      .single()
    if (u?.email) {
      try {
        const { sendAdminAlert } = await import('./email')
        await sendAdminAlert({
          subject: `[PersonaLink Alert] Abuse detected: ${u.linkedin_name || userId}`,
          body: `User ${u.linkedin_name || userId} (${u.email}) has ${count} limit violations today.\nFeature: ${feature} | Plan: ${plan}`,
        })
      } catch { /* non-fatal */ }
    }
  }
}

export async function getUsageSummary(userId: string, plan: string) {
  const limits = getPlanLimits(plan)
  const resetAt = getResetAt()

  const { data: rows } = await supabaseAdmin
    .from('usage_tracking')
    .select('feature, used_count')
    .eq('user_id', userId)
    .eq('reset_at', resetAt)

  const usageMap: Record<string, number> = {}
  for (const row of rows ?? []) usageMap[row.feature] = row.used_count

  return Object.entries(limits).reduce((acc, [feature, limit]) => {
    const used = usageMap[feature] ?? 0
    const lim = limit as number
    acc[feature as FeatureKey] = {
      used,
      limit: lim,
      remaining: Math.max(0, lim - used),
      percentage: lim === 0 ? 100 : Math.min(100, Math.round((used / lim) * 100)),
    }
    return acc
  }, {} as Record<FeatureKey, { used: number; limit: number; remaining: number; percentage: number }>)
}
