/**
 * Admin-only CSV export of every free-tier user. Reads from the
 * `free_users` Postgres view (see migration 20260527d_free_users_view.sql),
 * which already filters to plan='free' with a non-empty email and joins
 * the relevant profile columns.
 *
 * Auth: requires admin_session cookie OR x-admin-secret header matching
 * ADMIN_SECRET. Drop the CSV straight into Mailchimp / Loops / Klaviyo /
 * any mailing tool — the `email` column is the contact key.
 *
 * Query:
 *   GET /api/admin/free-users-export                  → CSV download
 *   GET /api/admin/free-users-export?limit=100        → first 100 rows
 *   GET /api/admin/free-users-export?days_since_signup=7  → only ≥7 days old
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  return cookie === process.env.ADMIN_SECRET || header === process.env.ADMIN_SECRET
}

function esc(v: unknown): string {
  const s = v == null ? '' : String(v)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

const COLUMNS: Array<{ key: string; header: string }> = [
  { key: 'email',                   header: 'Email' },
  { key: 'name',                    header: 'Name' },
  { key: 'linkedin_name',           header: 'LinkedIn Name' },
  { key: 'linkedin_headline',       header: 'LinkedIn Headline' },
  { key: 'linkedin_url',            header: 'LinkedIn URL' },
  { key: 'role',                    header: 'Role' },
  { key: 'industry',                header: 'Industry' },
  { key: 'company',                 header: 'Company' },
  { key: 'timezone',                header: 'Timezone' },
  { key: 'posts_used_this_month',   header: 'Posts Used This Month' },
  { key: 'onboarding_completed_at', header: 'Onboarding Completed' },
  { key: 'signed_up_at',            header: 'Signed Up' },
  { key: 'last_active',             header: 'Last Active' },
  { key: 'days_since_signup',       header: 'Days Since Signup' },
  { key: 'days_since_active',       header: 'Days Since Active' },
  { key: 'user_id',                 header: 'User ID' },
]

export async function GET(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limitRaw = searchParams.get('limit')
  const limit = limitRaw ? Math.max(1, Math.min(50000, parseInt(limitRaw, 10) || 0)) : null
  const minDaysSinceSignup = searchParams.get('days_since_signup')
    ? Math.max(0, parseInt(searchParams.get('days_since_signup')!, 10) || 0)
    : null

  let query = supabaseAdmin
    .from('free_users')
    .select(COLUMNS.map(c => c.key).join(','))
    .order('signed_up_at', { ascending: false })

  if (minDaysSinceSignup != null) query = query.gte('days_since_signup', minDaysSinceSignup)
  if (limit != null) query = query.limit(limit)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data as unknown as Array<Record<string, unknown>>) ?? []
  const csv = [
    COLUMNS.map(c => c.header).join(','),
    ...rows.map(r => COLUMNS.map(c => esc(r[c.key])).join(',')),
  ].join('\n')

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="personalink-free-users-${date}.csv"`,
      'X-Row-Count': String(rows.length),
      'Cache-Control': 'no-store',
    },
  })
}
