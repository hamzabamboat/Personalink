import { NextRequest, NextResponse } from 'next/server'
import { getAgencyFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TIER_LIMITS } from '@/lib/pricing-config'
import crypto from 'crypto'

// GET — list all clients for the logged-in agency
export async function GET(request: NextRequest) {
  const agency = await getAgencyFromRequest(request)
  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch clients first — no joins so nothing can silently filter rows out
  const { data: clients, error } = await supabaseAdmin
    .from('agency_clients')
    .select('id, client_name, is_active, created_at, user_id')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[agency/clients GET]', error)
    return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 })
  }

  if (!clients || clients.length === 0) {
    return NextResponse.json({ clients: [], seatLimit: agency.seat_limit })
  }

  const userIds = clients.map(c => c.user_id).filter(Boolean)

  // Fetch related data separately so missing rows never hide a client
  const [{ data: users }, { data: profiles }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, linkedin_name, linkedin_picture, linkedin_id, subscription_status')
      .in('id', userIds),
    supabaseAdmin
      .from('user_profiles')
      .select('user_id, posts_used_this_month, posts_limit, plan, onboarding_completed_at')
      .in('user_id', userIds),
  ])

  // Merge into the shape the dashboard expects
  const enriched = clients.map(c => ({
    ...c,
    users: users?.find(u => u.id === c.user_id) ?? null,
    user_profiles: profiles?.find(p => p.user_id === c.user_id) ?? null,
  }))

  return NextResponse.json({ clients: enriched, seatLimit: agency.seat_limit })
}

// POST — create a new client account for this agency
export async function POST(request: NextRequest) {
  const agency = await getAgencyFromRequest(request)
  if (!agency) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!agency.is_active) return NextResponse.json({ error: 'Account deactivated' }, { status: 403 })

  // Check seat limit
  const { count } = await supabaseAdmin
    .from('agency_clients')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('is_active', true)

  if ((count ?? 0) >= agency.seat_limit) {
    return NextResponse.json(
      { error: `Seat limit reached (${agency.seat_limit}). Email support@personalink.in to increase your limit.` },
      { status: 403 }
    )
  }

  const { clientName, email } = await request.json()
  if (!clientName?.trim()) {
    return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
  }

  // Create a placeholder users row for this client
  const placeholderId = crypto.randomUUID()
  const placeholderLinkedinId = `agency_client_${placeholderId}`
  const { data: newUser, error: userErr } = await supabaseAdmin
    .from('users')
    .insert({
      linkedin_id: placeholderLinkedinId,
      linkedin_name: clientName.trim(),
      email: `${placeholderId}@agency.personalink.internal`,
      subscription_status: 'active',
    })
    .select('id')
    .single()

  if (userErr) {
    console.error('[agency/clients POST] user create', userErr.message, userErr.code, userErr.details)
    return NextResponse.json({ error: 'Failed to create client', detail: userErr.message }, { status: 500 })
  }

  // Create a linkedin_accounts entry (required since the per-account billing migration)
  await supabaseAdmin.from('linkedin_accounts').upsert(
    {
      user_id: newUser.id,
      account_type: 'personal',
      linkedin_id: placeholderLinkedinId,
      name: clientName.trim(),
      subscription_status: 'active',
      plan: 'pro',
      posts_limit: TIER_LIMITS.pro.postsPerMonth ?? 50,
      posts_used_this_month: 0,
    },
    { onConflict: 'user_id,linkedin_id', ignoreDuplicates: true }
  )

  // Create a user_profile so the dashboard works
  await supabaseAdmin.from('user_profiles').insert({
    user_id: newUser.id,
    name: clientName.trim(),
    posts_limit: TIER_LIMITS.pro.postsPerMonth ?? 50,
    voice_fingerprint_limit: TIER_LIMITS.pro.voiceFingerprints,
    posts_used_this_month: 0,
    plan: 'pro',
    onboarding_completed_at: new Date().toISOString(),
    timezone: 'Asia/Kolkata',
    preferred_post_hour: 9,
  })

  // Create an active subscription row
  await supabaseAdmin.from('subscriptions').insert({
    user_id: newUser.id,
    status: 'active',
    plan_id: 'agency_managed',
  })

  // Link to agency
  const { data: clientRow, error: linkErr } = await supabaseAdmin
    .from('agency_clients')
    .insert({
      agency_id: agency.id,
      user_id: newUser.id,
      client_name: clientName.trim(),
      email: email?.trim() || null,
    })
    .select()
    .single()

  if (linkErr) {
    console.error('[agency/clients POST] link create', linkErr)
    return NextResponse.json({ error: 'Failed to link client' }, { status: 500 })
  }

  return NextResponse.json({ client: clientRow, userId: newUser.id }, { status: 201 })
}
