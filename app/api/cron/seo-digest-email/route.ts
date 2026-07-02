import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAdminAlert } from '@/lib/email'
import type { DbBlogPost } from '@/lib/blog-db'
import { generateOffPageDigest, buildBlogBrief, buildDigestEmail } from '@/lib/seo-digest'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 300

async function handler(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lockId = crypto.randomUUID()
  const { error: lockError } = await supabaseAdmin
    .from('cron_locks')
    .insert({ job_name: 'seo-digest-email', run_date: today, lock_id: lockId })
  if (lockError) {
    return NextResponse.json({ skipped: true, reason: 'already_ran_today', date: today })
  }

  try {
    const offPage = await generateOffPageDigest()

    // Latest published post created today (the seo-blog cron ran 15 min earlier).
    const { data } = await supabaseAdmin
      .from('blog_posts')
      .select('slug,title,excerpt,body_markdown,tags,read_time,created_at')
      .eq('published', true)
      .gte('created_at', `${today}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const brief = buildBlogBrief((data as DbBlogPost) ?? null)
    const { subject, body } = buildDigestEmail({ date: today, offPage, brief })
    await sendAdminAlert({ subject, body })

    await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)

    return NextResponse.json({ ok: true, postFound: !!data })
  } catch (err) {
    console.error('seo-digest-email cron failed', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export { handler as GET, handler as POST }
