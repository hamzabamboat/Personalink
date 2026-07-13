import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { generateLinkedInPosts } from '@/lib/anthropic'
import { getVoiceExemplars } from '@/lib/voice'
import { cleanThroughAIGate } from '@/lib/ai-detector'
import { analyzeContent } from '@/lib/compliance'
import { calculateSimilarityScore } from '@/lib/similarity'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit, checkDailyRateLimit, incrementDailyRateLimit } from '@/lib/rate-limiter'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { resolveLocale } from '@/lib/resolve-locale'
import { isLanguageModesEnabled } from '@/lib/flags'
import type { TierID } from '@/lib/pricing-config'
import type { BrandCompany, BrandAngle } from '@/lib/supabase'
import { claimAngle, createFreshAngle, attachPostToLock, releaseLock, buildAngleContext } from '@/lib/brand-stories'

export const maxDuration = 60
export const runtime = 'nodejs'

/**
 * Claim an angle (seed by id, or a freshly-generated AI one) and turn it into a
 * single unscheduled draft. Locking happens FIRST so a failed generation never
 * orphans a lock — on any generation error we release it (rollback).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { companyId, angleId, generateFresh } = await request.json()
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

    // Guardrails (shared cost limits across the app).
    const cb = await checkCircuitBreaker()
    if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Try again shortly.' }, { status: 503 })
    const rl = await checkRateLimit(user.id, 'claude_calls')
    if (!rl.allowed) {
      return NextResponse.json({ error: `You've hit the hourly generation limit (${rl.limit}). Try again later.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } })
    }

    const { data: profile } = await supabaseAdmin.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
    if (!profile) return NextResponse.json({ error: 'no_profile' }, { status: 400 })
    const plan = (profile.plan || 'free') as TierID

    const postsCheck = await checkLimit(user.id, plan, 'posts_generated')
    if (!postsCheck.allowed) {
      await logViolation(user.id, 'posts_generated', plan)
      return NextResponse.json({ error: `You've used all ${postsCheck.limit} post generations this month.`, feature: 'posts_generated', plan }, { status: 429 })
    }

    // Load the company (must be a live curated company or one the user owns).
    const { data: company } = await supabaseAdmin
      .from('brand_companies')
      .select('*')
      .eq('id', companyId)
      .or(`and(status.eq.live,source.eq.curated),owner_id.eq.${user.id}`)
      .maybeSingle()
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    const typedCompany = company as BrandCompany

    // Resolve + lock the angle.
    let angle: BrandAngle
    let lockId: string
    if (generateFresh) {
      // Cap fresh-angle generation at 3/day across all companies.
      const daily = await checkDailyRateLimit(user.id, 'fresh_angle')
      if (!daily.allowed) {
        return NextResponse.json(
          { error: `You've generated ${daily.limit} fresh angles today. This resets tomorrow — or claim one of the ready-made angles instead.` },
          { status: 429, headers: { 'Retry-After': String(daily.retryAfterSeconds) } },
        )
      }
      const fresh = await createFreshAngle(user.id, typedCompany)
      if (!fresh) return NextResponse.json({ error: 'This company is well-covered right now — try another or check back later.' }, { status: 409 })
      angle = fresh.angle
      lockId = fresh.lockId
    } else {
      if (!angleId) return NextResponse.json({ error: 'angleId or generateFresh required' }, { status: 400 })
      const { data: seedAngle } = await supabaseAdmin.from('brand_angles').select('*').eq('id', angleId).eq('company_id', companyId).maybeSingle()
      if (!seedAngle) return NextResponse.json({ error: 'Angle not found' }, { status: 404 })
      const id = await claimAngle(user.id, angleId)
      if (!id) return NextResponse.json({ error: 'That angle was just taken — pick another.' }, { status: 409 })
      angle = seedAngle as BrandAngle
      lockId = id
    }

    // Generate the draft. Roll the lock back on any failure.
    try {
      let voiceExemplars = await getVoiceExemplars(user.id)
      if (voiceExemplars.length === 0 && profile.writing_sample) voiceExemplars = [profile.writing_sample as string]
      const languageModesOn = await isLanguageModesEnabled(user.id)
      const locale = resolveLocale({ flagEnabled: languageModesOn, override: undefined, stored: profile.voice_locale })

      const posts = await generateLinkedInPosts({
        profile,
        topic: angle.title,
        additionalContext: buildAngleContext(typedCompany, angle),
        voiceExemplars,
        locale,
        count: 1,
      })
      const gate = await cleanThroughAIGate(posts[0] ?? '', { profile, voiceExemplars, locale })
      if (!gate.content || gate.content.trim().length < 50) throw new Error('generation too short')

      const { data: recentRows } = await supabaseAdmin.from('posts').select('content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
      const recentContents = (recentRows ?? []).map(p => p.content).filter(Boolean) as string[]
      const scores = analyzeContent(gate.content)

      const row: Record<string, unknown> = {
        user_id: user.id,
        content: gate.content,
        status: 'draft',
        scheduled_at: null,
        source: 'ai_generated',
        generation_prompt: `Brand story: ${typedCompany.name} — ${angle.title}`,
        spam_score: scores.spam_score,
        humanity_score: scores.humanity_score,
        similarity_score: calculateSimilarityScore(gate.content, recentContents),
        ai_detection_score: gate.finalScore,
      }
      let result = await supabaseAdmin.from('posts').insert(row).select().single()
      if (result.error) result = await supabaseAdmin.from('posts').insert({ user_id: user.id, content: gate.content, status: 'draft', scheduled_at: null }).select().single()
      if (result.error || !result.data) throw new Error(result.error?.message || 'insert failed')

      await attachPostToLock(lockId, result.data.id)
      if (generateFresh) await incrementDailyRateLimit(user.id, 'fresh_angle')
      await Promise.all([
        incrementUsage(user.id, 'posts_generated'),
        incrementRateLimit(user.id, 'claude_calls'),
        trackAndCheckSpend('claude_sonnet', user.id),
        supabaseAdmin.from('user_profiles').update({ posts_used_this_month: (profile.posts_used_this_month || 0) + 1 }).eq('user_id', user.id),
      ])

      return NextResponse.json({ post: result.data, angle, company: { id: typedCompany.id, name: typedCompany.name, logo_url: typedCompany.logo_url } })
    } catch (genErr) {
      await releaseLock({ lockId, userId: user.id }) // rollback so the angle frees immediately
      console.error('[brand-stories/compose] generation failed, lock released', genErr)
      return NextResponse.json({ error: 'Generation failed. Please try again.' }, { status: 500 })
    }
  } catch (err) {
    console.error('[brand-stories/compose]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
