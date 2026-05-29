/**
 * One-off backfill: rewrites every post for a given user through
 * the new anti-AI-detection gate (lib/ai-detector.ts).
 *
 * Run:
 *   npx tsx scripts/rewrite-user-posts.ts hamzabamboat@gmail.com
 *
 * Defaults to hamzabamboat@gmail.com if no argument is passed.
 */
// IMPORTANT: load env BEFORE any module that reads process.env at import-time.
// lib/anthropic.ts builds the SDK with process.env.ANTHROPIC_API_KEY on load,
// so we must dotenv-load .env.local first, then dynamically import the gate.
import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'
// override:true because the shell may have an empty ANTHROPIC_API_KEY set
// (Claude desktop sets one), which would otherwise win over .env.local.
dotenvConfig({ path: path.resolve(process.cwd(), '.env.local'), override: true })

import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const EMAIL = process.argv[2] || 'hamzabamboat@gmail.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws as unknown as never } },
)

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY — check .env.local')
    process.exit(1)
  }

  // Dynamic import AFTER dotenv has populated process.env
  const { cleanThroughAIGate, detectAIStructures } = await import('../lib/ai-detector')

  console.log(`\n═══════════════════════════════════════════════════════════════`)
  console.log(`  Rewriting posts for ${EMAIL}`)
  console.log(`═══════════════════════════════════════════════════════════════\n`)

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, email, linkedin_name')
    .eq('email', EMAIL)
    .maybeSingle()
  if (userErr) throw userErr
  if (!user) { console.log(`No user found for ${EMAIL}`); process.exit(1) }

  console.log(`User:    ${user.linkedin_name || '(no name)'}  (${user.id})`)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile) { console.log(`No profile — bailing.`); process.exit(1) }

  // Voice exemplars (inlined to avoid the server-only import in lib/voice.ts)
  let voiceExemplars: string[] = []
  try {
    const { data: voiceRows } = await supabase
      .from('voice_samples')
      .select('text, char_count')
      .eq('user_id', user.id)
      .gte('char_count', 120)
      .order('weight', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12)
    const seen = new Set<string>()
    for (const row of voiceRows || []) {
      const text = (row.text || '').trim()
      if (!text) continue
      const key = text.slice(0, 60).toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      voiceExemplars.push(text.slice(0, 1200))
      if (voiceExemplars.length >= 4) break
    }
  } catch { /* non-fatal */ }
  if (voiceExemplars.length === 0 && profile.writing_sample) {
    voiceExemplars = [profile.writing_sample as string]
  }
  console.log(`Voice exemplars: ${voiceExemplars.length}`)

  const { data: posts, error: postsErr } = await supabase
    .from('posts')
    .select('id, content, status, created_at, scheduled_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (postsErr) throw postsErr
  if (!posts || posts.length === 0) { console.log(`No posts found.`); process.exit(0) }

  console.log(`Posts:   ${posts.length}\n`)

  let rewritten = 0
  let alreadyClean = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    const label = `[${(i + 1).toString().padStart(String(posts.length).length, ' ')}/${posts.length}]`
    const status = `[${post.status}]`.padEnd(20)

    if (!post.content || post.content.trim().length < 80) {
      console.log(`${label} ${status} skip (too short)`)
      skipped++
      continue
    }

    const before = detectAIStructures(post.content)
    if (before.score < 20) {
      await supabase
        .from('posts')
        .update({
          ai_detection_score: before.score,
          ai_detection_patterns: before.patterns,
          ai_rewrite_attempts: 0,
        })
        .eq('id', post.id)
      console.log(`${label} ${status} clean (score ${before.score})`)
      alreadyClean++
      continue
    }

    try {
      const gate = await cleanThroughAIGate(post.content, {
        profile: profile as Parameters<typeof cleanThroughAIGate>[1]['profile'],
        voiceExemplars,
      })
      const changed = gate.content.trim() !== post.content.trim()
      const update: Record<string, unknown> = {
        ai_detection_score: gate.finalScore,
        ai_detection_patterns: gate.patternsAtSave,
        ai_rewrite_attempts: gate.rewriteAttempts,
      }
      if (changed) update.content = gate.content

      const { error: updErr } = await supabase
        .from('posts')
        .update(update)
        .eq('id', post.id)
      if (updErr) throw updErr

      const arrow = changed ? '→' : '·'
      console.log(`${label} ${status} ${before.score} ${arrow} ${gate.finalScore}  attempts=${gate.rewriteAttempts}  ${changed ? 'rewritten' : 'unchanged'}`)
      rewritten += changed ? 1 : 0
      if (!changed) alreadyClean++
    } catch (e) {
      console.log(`${label} ${status} FAILED: ${(e as Error).message}`)
      failed++
    }

    await sleep(500)
  }

  console.log(`\n═══════════════════════════════════════════════════════════════`)
  console.log(`  Done.`)
  console.log(`  Rewritten:    ${rewritten}`)
  console.log(`  Already clean: ${alreadyClean}`)
  console.log(`  Skipped:       ${skipped}`)
  console.log(`  Failed:        ${failed}`)
  console.log(`═══════════════════════════════════════════════════════════════\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
