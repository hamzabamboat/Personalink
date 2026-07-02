import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { BLOG_POSTS } from '@/lib/blog-posts'
import { getPublishedDbPosts } from '@/lib/blog-db'
import { generateBlogPost } from '@/lib/seo-blog'
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
    .insert({ job_name: 'seo-blog', run_date: today, lock_id: lockId })
  if (lockError) {
    return NextResponse.json({ skipped: true, reason: 'already_ran_today', date: today })
  }

  try {
    const dbPosts = await getPublishedDbPosts()
    const existingSlugs = [...BLOG_POSTS.map(p => p.slug), ...dbPosts.map(p => p.slug)]

    const post = await generateBlogPost(existingSlugs)
    if (existingSlugs.includes(post.slug)) {
      throw new Error(`generated slug already exists: ${post.slug}`)
    }

    const { error: insErr } = await supabaseAdmin.from('blog_posts').insert({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body_markdown: post.body_markdown,
      tags: post.tags,
      read_time: post.readTime,
    })
    if (insErr) throw new Error(`insert failed: ${insErr.message}`)

    await supabaseAdmin.from('cron_locks').update({ completed_at: new Date().toISOString() }).eq('lock_id', lockId)

    return NextResponse.json({
      ok: true,
      slug: post.slug,
      title: post.title,
      url: `https://personalink.in/blog/${post.slug}`,
    })
  } catch (err) {
    console.error('seo-blog cron failed', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export { handler as GET, handler as POST }
