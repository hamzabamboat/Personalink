// Runs on the 1st of every month via Vercel cron
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { recordLinkedInScore } from '@/lib/scoring'
import { generateImageBriefPrompts } from '@/lib/anthropic'
import { sendImageBriefEmail } from '@/lib/email'
import { UserProfile } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  // 1. Reset monthly post counter for all profiles
  const { error: resetError } = await supabaseAdmin
    .from('user_profiles')
    .update({ posts_used_this_month: 0 })
    .neq('user_id', '00000000-0000-0000-0000-000000000000')

  if (resetError) {
    console.error('Monthly reset error:', resetError)
    return NextResponse.json({ error: resetError.message }, { status: 500 })
  }

  // 2. Get all users for scoring + image briefs
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email, linkedin_name')
    .not('email', 'is', null)
    .limit(500)

  if (!users) return NextResponse.json({ success: true, usersReset: 0 })

  const results = await Promise.allSettled(
    users.map(async u => {
      // Record LinkedIn score
      await recordLinkedInScore(u.id).catch(() => {})

      // Image briefs for Standard and Pro only
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle()

      if (!profile || !['standard', 'pro'].includes(profile.plan || '')) return

      try {
        const prompts = await generateImageBriefPrompts(profile as UserProfile)
        if (prompts.length > 0) {
          await supabaseAdmin.from('image_briefs').insert({
            user_id: u.id,
            prompts,
            month,
          })

          if (u.email) {
            await sendImageBriefEmail({
              to: u.email,
              userName: u.linkedin_name || 'there',
              prompts,
              month,
            })
          }
        }
      } catch (err) {
        console.error(`Image brief error for ${u.id}:`, err)
      }
    })
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length

  return NextResponse.json({
    success: true,
    usersReset: users.length,
    imageBriefsSent: succeeded,
    month,
  })
}
