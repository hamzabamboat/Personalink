'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Trash2 } from 'lucide-react'

type Row = { id: string; client_name: string | null; created_at: string; last_used_at: string | null }

export function ConnectedApps() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = () =>
    fetch('/api/oauth/connected')
      .then((r) => r.json())
      .then((d) => setRows(d.tokens || []))
      .catch(() => { /* non-fatal */ })
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const revoke = async (id: string) => {
    if (!confirm('Disconnect this AI app? It will lose access to your PersonaLink account.')) return
    setRevokingId(id)
    try {
      const res = await fetch('/api/oauth/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) { toast.error('Failed to disconnect app.'); return }
      toast.success('App disconnected.')
      await load()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setRevokingId(null)
    }
  }

  if (loading) return null

  return (
    <section className="mb-8">
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>
        // Connected AI apps
      </div>
      <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <p className="text-[13px] text-slate-500 leading-relaxed">
              No AI apps connected yet. When you connect PersonaLink from Claude, ChatGPT, or another MCP client, it will show up here.
            </p>
          ) : (
            <div className="flex flex-col gap-0">
              {rows.map((r, i) => (
                <div key={r.id}>
                  <div className="flex justify-between items-center py-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0">
                        <Bot className="size-4 text-slate-500" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-[13.5px] truncate">{r.client_name || 'Unknown app'}</div>
                        <div className="text-xs text-slate-400">
                          Connected {new Date(r.created_at).toLocaleDateString()}
                          {r.last_used_at && <> · Last used {new Date(r.last_used_at).toLocaleDateString()}</>}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={revokingId === r.id}
                      onClick={() => revoke(r.id)}
                      className="shrink-0 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-300 gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      Revoke
                    </Button>
                  </div>
                  {i < rows.length - 1 && <div className="h-px bg-slate-100 dark:bg-slate-800" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
