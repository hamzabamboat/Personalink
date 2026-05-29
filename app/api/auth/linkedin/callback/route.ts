import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendWelcomeEmail } from '@/lib/email'
import { runProfileAnalysis } from '@/lib/profile-analyzer'
import { attachVoiceAnalyzerFingerprint } from '@/lib/voice-analyzer'

import { getPostHogClient } from '@/lib/posthog-server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // LinkedIn sends error before we can read the state cookie — clear it anyway
  const clearState = (res: NextResponse) => {
    res.cookies.delete('linkedin_oauth_state')
    return res
  }

  if (error) {
    console.error('[linkedin/callback] LinkedIn error:', error, errorDescription)
    // access_denied = user cancelled OR missing OIDC/Share products in LinkedIn app
    const reason = error === 'access_denied' ? 'scope_denied' : 'linkedin_denied'
    return clearState(NextResponse.redirect(`${APP_URL}/?error=${reason}`))
  }

  // Verify state to prevent CSRF
  const storedState = request.cookies.get('linkedin_oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    console.error('[linkedin/callback] state mismatch — stored:', storedState, 'got:', state)
    return clearState(NextResponse.redirect(`${APP_URL}/?error=state_mismatch`))
  }

  if (!code) {
    return clearState(NextResponse.redirect(`${APP_URL}/?error=no_code`))
  }

  try {
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'https://www.personalink.in/api/auth/linkedin/callback',
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text()
      console.error('[linkedin/callback] token exchange failed:', tokenResponse.status, body)
      throw new Error(`Token exchange HTTP ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      console.error('[linkedin/callback] no access_token in response:', tokenData)
      throw new Error('No access token returned')
    }

    const accessToken = tokenData.access_token
    // LinkedIn tokens expire in 60 days; fall back to that if expires_in is missing
    const expiresInMs = (tokenData.expires_in ?? 5184000) * 1000
    const expiresAt = new Date(Date.now() + expiresInMs)

    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!profileResponse.ok) {
      throw new Error(`Profile fetch failed: ${profileResponse.status}`)
    }

    const profile = await profileResponse.json()
    // LinkedIn OIDC may include headline in non-standard fields — capture if present
    const linkedinHeadline: string | undefined = profile.headline ?? profile.job_title ?? undefined

    // Agency client LinkedIn setup: link credentials to existing client user record
    const agencyClientUserId = request.cookies.get('agency_oauth_client_user_id')?.value
    if (agencyClientUserId) {
      await supabaseAdmin
        .from('users')
        .update({
          linkedin_id: profile.sub,
          linkedin_name: profile.name,
          email: profile.email ?? undefined,
          linkedin_picture: profile.picture ?? undefined,
          ...(linkedinHeadline ? { linkedin_headline: linkedinHeadline } : {}),
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', agencyClientUserId)

      await supabaseAdmin
        .from('user_profiles')
        .update({ name: profile.name })
        .eq('user_id', agencyClientUserId)

      const response = NextResponse.redirect(`${APP_URL}/agency/dashboard?linked=1`)
      response.cookies.delete('agency_oauth_client_user_id')
      response.cookies.delete('linkedin_oauth_state')
      return response
    }

    // Look up existing user by linkedin_id first, then fall back to email
    // (handles the case where user previously signed up via Google with the same email)
    let existingUser = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('linkedin_id', profile.sub)
      .maybeSingle()
      .then(r => r.data)

    if (!existingUser && profile.email) {
      existingUser = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', profile.email)
        .maybeSingle()
        .then(r => r.data)
    }

    const isNew = !existingUser

    let user: Record<string, unknown> | null = null
    let dbError: unknown = null

    if (existingUser) {
      // Update existing user's LinkedIn credentials
      const result = await supabaseAdmin
        .from('users')
        .update({
          linkedin_id: profile.sub,
          linkedin_name: profile.name,
          linkedin_picture: profile.picture,
          ...(linkedinHeadline ? { linkedin_headline: linkedinHeadline } : {}),
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id)
        .select()
        .single()
      user = result.data
      dbError = result.error
    } else {
      // Insert new user
      const result = await supabaseAdmin
        .from('users')
        .insert({
          linkedin_id: profile.sub,
          linkedin_name: profile.name,
          email: profile.email,
          linkedin_picture: profile.picture,
          ...(linkedinHeadline ? { linkedin_headline: linkedinHeadline } : {}),
          linkedin_access_token: accessToken,
          linkedin_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
      user = result.data
      dbError = result.error
    }

    if (dbError) throw dbError
    if (!user) throw new Error('linkedin callback: user record missing after insert/update')

    // Voice Analyzer handoff: if this user came in via the public voice analyzer
    // funnel, the email they typed at the gate is in the pl_va_email cookie.
    // Attach any matching voice_reports to this user and seed their fingerprint.
    const vaCookieEmail = request.cookies.get('pl_va_email')?.value
      ? decodeURIComponent(request.cookies.get('pl_va_email')!.value)
      : null
    const vaAttach = await attachVoiceAnalyzerFingerprint({
      userId: user.id as string,
      linkedinEmail: (user.email as string | null | undefined) ?? null,
      cookieEmail: vaCookieEmail,
    })

    if (isNew && user.email) {
      sendWelcomeEmail({ to: user.email, userName: user.linkedin_name || 'there' }).catch(
        console.error
      )
    }

    // ── Affiliate referral attribution (new users only) ───────────────────
    // If a pl_ref cookie is present and points to an approved affiliate, write
    // an affiliate_referrals row. Self-referrals (same user_id) are ignored.
    // Failures here must never block the signup.
    const plRefCookie = request.cookies.get('pl_ref')?.value
    if (isNew && plRefCookie) {
      try {
        const { data: affiliate } = await supabaseAdmin
          .from('affiliates')
          .select('id, user_id, status')
          .eq('ref_code', plRefCookie)
          .maybeSingle()

        if (affiliate && affiliate.status === 'approved' && affiliate.user_id !== user.id) {
          await supabaseAdmin
            .from('affiliate_referrals')
            .insert({
              affiliate_id: affiliate.id,
              user_id: user.id,
              attribution_source: 'cookie',
              status: 'signed_up',
            })

          try {
            getPostHogClient().capture({
              distinctId: user.id as string,
              event: 'affiliate_referral_attributed',
              properties: { affiliate_id: affiliate.id, ref_code: plRefCookie },
            })
          } catch { /* posthog optional */ }
        }
      } catch (err) {
        console.error('[linkedin/callback] affiliate attribution failed', err)
        // Swallow — never block signup.
      }
    }

    // Run profile analysis in background (don't await — shouldn't block redirect)
    runProfileAnalysis(user.id).catch(console.error)

    await supabaseAdmin
      .from('linkedin_accounts')
      .upsert(
        {
          user_id: user.id,
          account_type: 'personal',
          linkedin_id: profile.sub,
          name: profile.name,
          picture_url: profile.picture ?? null,
          subscription_status: 'inactive',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,linkedin_id',
          ignoreDuplicates: true, // preserve existing subscription_status on re-login
        }
      )

    // Check existing subscription to set the sub_status cookie
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status, trial_ends_at')
      .eq('user_id', user.id)
      .maybeSingle()

    // Check if user has completed onboarding
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('onboarding_completed_at, role')
      .eq('user_id', user.id)
      .maybeSingle()

    // Post-auth intent (e.g. affiliate apply flow) — only overrides for users
    // who have completed onboarding. New / partially-onboarded users still
    // route through /onboarding first.
    const postAuthIntent = request.cookies.get('pl_post_auth_intent')?.value
    const hasOnboarded = !isNew && existingProfile?.onboarding_completed_at
    const redirectTo = hasOnboarded && postAuthIntent === 'affiliate_apply'
      ? `${APP_URL}/affiliate/apply`
      : isNew || !existingProfile?.onboarding_completed_at
        ? `${APP_URL}/onboarding`
        : `${APP_URL}/dashboard`

    const country = request.headers.get('x-vercel-ip-country') ?? null
    const posthog = getPostHogClient()
    posthog.identify({
      distinctId: user.id,
      properties: {
        email: user.email,
        name: user.linkedin_name,
        linkedin_id: user.linkedin_id,
        $set: {
          profession: existingProfile?.role ?? null,
          country,
          signup_date: isNew ? new Date().toISOString() : (user as Record<string, unknown>).created_at ?? null,
        },
      },
    })
    posthog.capture({
      distinctId: user.id,
      event: isNew ? 'user_signed_up' : 'user_logged_in',
      properties: {
        provider: 'linkedin',
        is_new_user: isNew,
        voice_analyzer_attached: vaAttach.matched > 0,
        voice_analyzer_reports_matched: vaAttach.matched,
        voice_analyzer_fingerprint_seeded: vaAttach.attachedFingerprint,
      },
    })
    if (vaAttach.matched > 0) {
      posthog.capture({
        distinctId: user.id,
        event: 'voice_analyzer_signup_attached',
        properties: {
          reports_matched: vaAttach.matched,
          fingerprint_seeded: vaAttach.attachedFingerprint,
          is_new_user: isNew,
        },
      })
    }

    const response = NextResponse.redirect(redirectTo)
    response.cookies.set('session_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }
    if (sub?.status === 'active') {
      response.cookies.set('sub_status', 'active', { ...cookieOpts, maxAge: 60 * 60 })
    } else if (
      (sub?.status === 'trial' || sub?.status === 'trialing') &&
      sub.trial_ends_at &&
      new Date(sub.trial_ends_at) > new Date()
    ) {
      response.cookies.set('sub_status', 'trial', { ...cookieOpts, maxAge: 60 * 60 * 24 * 8 })
      // Store the actual expiry so middleware can validate the trial without a
      // DB round-trip, preventing stale-cache redirect loops on expired trials
      response.cookies.set('trial_ends_at', sub.trial_ends_at, { ...cookieOpts, maxAge: 60 * 60 * 24 * 8 })
    }
    response.cookies.delete('linkedin_oauth_state')
    response.cookies.delete('pl_va_email')
    response.cookies.delete('pl_post_auth_intent')
    // Clear the ref cookie only if we attributed (or if no attribution was
    // possible). Either way, the first signup consumed it.
    if (isNew) response.cookies.delete('pl_ref')
    return response
  } catch (err) {
    console.error('[linkedin/callback] unhandled error:', err)
    const res = NextResponse.redirect(`${APP_URL}/?error=oauth_failed`)
    res.cookies.delete('linkedin_oauth_state')
    res.cookies.delete('agency_oauth_client_user_id')
    res.cookies.delete('pl_va_email')
    return res
  }
}
