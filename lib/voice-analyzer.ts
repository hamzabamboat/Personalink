import 'server-only'
import crypto from 'crypto'
import { supabaseAdmin } from './supabase-admin'

const HASH_SALT = process.env.VOICE_ANALYZER_HASH_SALT || 'pl-voice-analyzer-default-salt'
const DAILY_IP_LIMIT = 3

export function extractIp(headers: Headers): string {
  // Vercel sets x-forwarded-for; first entry is the original client IP
  const fwd = headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
  return ip
}

export function ipHash(ip: string): string {
  return crypto.createHash('sha256').update(`${ip}|${HASH_SALT}`).digest('hex').slice(0, 32)
}

/**
 * 3-analyses-per-IP-per-day rate limit, backed by voice_reports.created_at.
 * Returns { allowed } only — we don't expose the counter to callers.
 */
export async function checkDailyIpLimit(hash: string): Promise<{ allowed: boolean; resetIn?: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('voice_reports')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', hash)
    .gte('created_at', since)
  const used = count ?? 0
  return { allowed: used < DAILY_IP_LIMIT }
}

const LINKEDIN_URL_RE = /^https?:\/\/(www\.)?linkedin\.com\/(posts|feed\/update|pulse)\//i

export function looksLikeLinkedinPostUrl(s: string): boolean {
  return LINKEDIN_URL_RE.test(s.trim())
}

/**
 * Best-effort LinkedIn post text fetch. LinkedIn aggressively blocks bots —
 * this will almost always fail. On failure returns null and the caller falls
 * back to "paste the text instead."
 */
export async function tryFetchLinkedinPostText(url: string): Promise<string | null> {
  if (!looksLikeLinkedinPostUrl(url)) return null
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        // Look like a real browser. LinkedIn still typically blocks, but try.
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Hard cap so we never hang the request
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const html = await res.text()
    // LinkedIn embeds the post body in og:description for public posts.
    // This is brittle on purpose — if LinkedIn blocks or changes layout, we fall back.
    const ogMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']{40,})["']/i)
    if (ogMatch?.[1]) {
      return decodeHtmlEntities(ogMatch[1]).trim()
    }
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']{40,})["']/i)
    if (descMatch?.[1]) {
      return decodeHtmlEntities(descMatch[1]).trim()
    }
    return null
  } catch {
    return null
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

export const VOICE_ANALYZER_LIMITS = {
  MIN_SAMPLES: 3,
  MAX_SAMPLES: 3,
  MIN_SAMPLE_CHARS: 80,
  MAX_SAMPLE_CHARS: 1500,
  DAILY_IP_LIMIT,
}

// Hide the social-proof chip until we have enough reports to make the number
// feel impressive, not embarrassing. Tune as the funnel matures.
const SOCIAL_PROOF_MIN_THRESHOLD = 25

/**
 * Last-7-day count of voice_reports, used for the social-proof chip on the
 * /voice-analyzer landing. Returns null when the count is below the threshold
 * so the caller can hide the chip entirely.
 */
export async function getWeeklyVoiceReportCount(): Promise<number | null> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin
      .from('voice_reports')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since)
    const n = count ?? 0
    return n >= SOCIAL_PROOF_MIN_THRESHOLD ? n : null
  } catch (err) {
    console.error('[voice-analyzer.getWeeklyCount]', err)
    return null
  }
}

/**
 * Called from the LinkedIn callback right after a user is created. Looks up
 * any voice_reports rows that match either the LinkedIn email or the email
 * the user typed at the Voice Analyzer gate (passed via cookie), backfills
 * converted_user_id on them, and seeds user_profiles.voice_fingerprint with
 * the latest report's prose summary if the profile doesn't already have one.
 *
 * Safe to call for every signup — it no-ops cleanly when no matching report
 * exists. Errors are swallowed and logged so they never block signup.
 */
export async function attachVoiceAnalyzerFingerprint(opts: {
  userId: string
  linkedinEmail?: string | null
  cookieEmail?: string | null
}): Promise<{ matched: number; attachedFingerprint: boolean }> {
  const { userId, linkedinEmail, cookieEmail } = opts
  if (!userId) return { matched: 0, attachedFingerprint: false }

  const candidates = Array.from(
    new Set(
      [linkedinEmail, cookieEmail]
        .map(e => (e || '').trim().toLowerCase())
        .filter(e => e.length > 0 && e.includes('@')),
    ),
  )
  if (candidates.length === 0) return { matched: 0, attachedFingerprint: false }

  try {
    const { data: reports } = await supabaseAdmin
      .from('voice_reports')
      .select('id, fingerprint, created_at')
      .in('email', candidates)
      .is('converted_user_id', null)
      .order('created_at', { ascending: false })

    if (!reports || reports.length === 0) return { matched: 0, attachedFingerprint: false }

    const reportIds = reports.map(r => r.id)
    await supabaseAdmin
      .from('voice_reports')
      .update({ converted_user_id: userId })
      .in('id', reportIds)

    // If the user_profiles row has no fingerprint yet, seed it from the latest report.
    const latestSummary = (reports[0]?.fingerprint as { summary?: string } | null)?.summary?.trim() || ''
    let attached = false
    if (latestSummary) {
      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('voice_fingerprint')
        .eq('user_id', userId)
        .maybeSingle()
      const hasFingerprint = (existingProfile?.voice_fingerprint || '').trim().length > 0
      if (!hasFingerprint) {
        await supabaseAdmin
          .from('user_profiles')
          .upsert(
            { user_id: userId, voice_fingerprint: latestSummary, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
          )
        attached = true
      }
    }
    return { matched: reports.length, attachedFingerprint: attached }
  } catch (err) {
    console.error('[voice-analyzer.attach] failed:', err)
    return { matched: 0, attachedFingerprint: false }
  }
}
