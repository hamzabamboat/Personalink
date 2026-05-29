'use client'

import { useEffect, useState } from 'react'

type Q = { id: string; q: string; options: string[] }
type State = { done: boolean; step: number; total: number; question?: Q }

export function RefinementCard() {
  const [state, setState] = useState<State | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const res = await fetch('/api/refinement/state')
      if (!res.ok) return
      setState(await res.json())
    } catch {}
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  if (!state || state.done || !state.question) return null
  const q = state.question

  const submit = async (skipped: boolean) => {
    setBusy(true)
    try {
      await fetch('/api/refinement/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, answer: selected, skipped }),
      })
      setSelected(null)
      await load()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 18, margin: '0 0 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 6 }}>Refinement {state.step + 1} of {state.total}</div>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{q.q}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {q.options.map(o => (
          <button key={o} onClick={() => setSelected(o)} style={{
            background: selected === o ? 'var(--pl-accent)' : 'var(--bg)',
            color: selected === o ? '#fff' : 'var(--ink-2,var(--ink))',
            border: '1px solid var(--line)', borderRadius: 999, padding: '8px 14px', fontSize: 14, cursor: 'pointer',
          }}>{o}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => submit(false)} disabled={busy || !selected} style={{
          background: 'var(--ink)', color: 'var(--bg)', fontWeight: 600, fontSize: 14, padding: '9px 16px',
          borderRadius: 9, border: 'none', cursor: busy || !selected ? 'not-allowed' : 'pointer', opacity: !selected ? 0.5 : 1,
        }}>Save</button>
        <button onClick={() => submit(true)} disabled={busy} style={{
          background: 'transparent', color: 'var(--ink-4)', fontSize: 14, padding: '9px 12px', border: 'none', cursor: 'pointer',
        }}>Skip for now</button>
      </div>
    </div>
  )
}
