'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'

const CHIPS = ['A lesson from this week', 'A controversial take', 'A win to celebrate']

export function FirstPost({ hasLinkedIn }: { hasLinkedIn: boolean }) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [state, setState] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [post, setPost] = useState<{ id: string; content: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const generate = async () => {
    if (!topic.trim()) { setMsg('Tell us what to post about first.'); return }
    setState('generating'); setMsg(null)
    try {
      const res = await fetch('/api/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data?.posts?.length) {
        setState('error'); setMsg(data?.error || 'Generation failed. Try again.'); return
      }
      setPost(data.posts[0])
      setState('done')
      try { posthog.capture('first_post_generated', { topic: topic.trim() }) } catch {}
    } catch {
      setState('error'); setMsg('Network hiccup. Try again.')
    }
  }

  const publish = () => {
    if (!hasLinkedIn) {
      document.cookie = 'pl_post_auth_intent=publish_first_post; path=/; max-age=1800'
      window.location.href = '/api/auth/linkedin'
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(32px,6vw,72px) clamp(16px,4vw,24px)' }}>
        <h1 style={{ fontSize: 'clamp(24px,4.5vw,36px)', fontWeight: 500, letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          Your voice is ready.
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 'clamp(15px,2vw,18px)', margin: '0 0 24px' }}>
          Generate your first post. What do you want to post about?
        </p>

        <textarea
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. how I landed my first enterprise client"
          rows={3}
          style={{
            width: '100%', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, color: 'var(--ink)', fontSize: 16, fontFamily: 'var(--f-sans)', resize: 'vertical',
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0 20px' }}>
          {CHIPS.map(c => (
            <button key={c} onClick={() => setTopic(c)} style={{
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 999,
              padding: '8px 14px', fontSize: 14, color: 'var(--ink-2,var(--ink))', cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>

        <button onClick={generate} disabled={state === 'generating'} style={{
          background: 'var(--pl-accent)', color: '#fff', fontWeight: 600, fontSize: 16, padding: '14px 22px',
          borderRadius: 12, border: 'none', cursor: state === 'generating' ? 'wait' : 'pointer', width: '100%',
        }}>
          {state === 'generating' ? 'Generating in your voice…' : 'Generate my first post'}
        </button>

        {msg && <div style={{ marginTop: 12, fontSize: 14, color: state === 'error' ? '#b91c1c' : 'var(--ink-3)' }}>{msg}</div>}

        {state === 'done' && post && (
          <div style={{ marginTop: 28, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 'clamp(18px,3vw,28px)' }}>
            {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
            <div style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
              // your post, in your voice
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.6, color: 'var(--ink)' }}>{post.content}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              <button onClick={publish} style={{
                background: 'var(--ink)', color: 'var(--bg)', fontWeight: 600, fontSize: 15, padding: '12px 18px',
                borderRadius: 10, border: 'none', cursor: 'pointer',
              }}>
                {hasLinkedIn ? 'Go to dashboard to publish' : 'Connect LinkedIn to publish'}
              </button>
              <button onClick={() => router.push('/dashboard')} style={{
                background: 'transparent', color: 'var(--ink-3)', fontWeight: 500, fontSize: 15, padding: '12px 18px',
                borderRadius: 10, border: '1px solid var(--line)', cursor: 'pointer',
              }}>Skip for now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
