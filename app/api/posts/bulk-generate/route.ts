import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { generateLinkedInPosts } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (profile?.plan !== 'pro') return NextResponse.json({ error: 'Bulk generate is a Pro feature.' }, { status: 403 })

  const pillars = profile.content_pillars || profile.topics || ['Professional Insights', 'Leadership', 'Innovation']
  const postsPerPillar = Math.ceil(30 / pillars.length)
  const inserted: unknown[] = []

  let dayOffset = 0
  for (const pillar of pillars) {
    try {
      const posts = await generateLinkedInPosts({ profile, topic: `Write about ${pillar}` })
      for (const content of posts.slice(0, postsPerPillar)) {
        const scheduledAt = new Date()
        scheduledAt.setDate(scheduledAt.getDate() + dayOffset)
        scheduledAt.setHours(profile.preferred_post_hour || 9, 0, 0, 0)

        const { data } = await supabaseAdmin.from('posts').insert({
          user_id: user.id,
          content,
          status: 'scheduled',
          source: 'ai_generated',
          content_pillar: pillar,
          scheduled_at: scheduledAt.toISOString(),
          generation_prompt: `Bulk: ${pillar}`,
        }).select().single()

        if (data) inserted.push(data)
        dayOffset++
        if (dayOffset >= 30) break
      }
    } catch {}
    if (dayOffset >= 30) break
  }

  return NextResponse.json({ count: inserted.length })
}
