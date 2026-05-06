import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { repurposePost } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check Pro plan
  const { data: profile } = await supabaseAdmin.from('user_profiles').select('plan').eq('user_id', user.id).maybeSingle()
  if (profile?.plan !== 'pro') return NextResponse.json({ error: 'Repurpose engine is a Pro feature. Please upgrade.' }, { status: 403 })

  const { postId } = await request.json()
  if (!postId) return NextResponse.json({ error: 'Post ID required' }, { status: 400 })

  const { data: post } = await supabaseAdmin.from('posts').select('content').eq('id', postId).eq('user_id', user.id).single()
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const { data: fullProfile } = await supabaseAdmin.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  const angles = await repurposePost(post.content, fullProfile || profile)

  return NextResponse.json({ angles })
}
