'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Sparkles, Wand2, Plus, Building2, ExternalLink, HelpCircle, Lock, PenLine, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { BrandCompany, BrandAngle } from '@/lib/supabase'

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-[12px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${active ? 'border-brand bg-brand-light/40 text-brand' : 'border-slate-200 text-slate-600 hover:border-brand/40'}`}>
      {children}
    </button>
  )
}

export default function BrandStoriesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<BrandCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [sector, setSector] = useState<string>('all')
  const [busy, setBusy] = useState<string | null>(null) // company.id currently composing
  const [showUpload, setShowUpload] = useState(false)
  const [showHow, setShowHow] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch('/api/brand-stories').then(r => r.json())
      setCompanies(d.companies || [])
    } catch { setCompanies([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const sectors = ['all', ...Array.from(new Set(companies.map(c => c.sector).filter(Boolean) as string[]))]
  const visible = sector === 'all' ? companies : companies.filter(c => c.sector === sector)

  async function compose(company: BrandCompany, body: { angleId?: string; generateFresh?: boolean }) {
    setBusy(company.id)
    try {
      const res = await fetch('/api/brand-stories/compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id, ...body }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || 'Could not create the draft.'); return }
      toast.success(`Draft ready — ${company.name}: ${d.angle?.title ?? 'your angle'}`)
      router.push('/dashboard/posts')
    } catch {
      toast.error('Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brand stories</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Pick a real company and turn a cited takeaway into a post in your voice. Each angle is
            yours for a while once you claim it — so no two people post the same thing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button data-tour="brand-stories-how" variant="ghost" onClick={() => setShowHow(true)}>
            <HelpCircle className="w-4 h-4 mr-1.5" /> See how this works
          </Button>
          <Button variant="outline" onClick={() => setShowUpload(s => !s)}>
            <Plus className="w-4 h-4 mr-1.5" /> Your company
          </Button>
        </div>
      </div>

      <HowItWorks open={showHow} onOpenChange={setShowHow} />

      {showUpload && <UploadForm onDone={() => { setShowUpload(false); load() }} />}

      <div className="flex flex-wrap gap-2 my-5">
        {sectors.map(s => <Chip key={s} active={sector === s} onClick={() => setSector(s)}>{s === 'all' ? 'All' : s}</Chip>)}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-500 py-16 text-center">No companies yet. The weekly research job publishes new ones every Monday.</p>
      ) : (
        <div className="space-y-4">
          {visible.map(company => (
            <CompanyCard key={company.id} company={company} busy={busy === company.id} onCompose={compose} />
          ))}
        </div>
      )}
    </div>
  )
}

function CompanyCard({ company, busy, onCompose }: {
  company: BrandCompany
  busy: boolean
  onCompose: (c: BrandCompany, b: { angleId?: string; generateFresh?: boolean }) => void
}) {
  const angles = company.available_angles ?? []
  return (
    <div className="rounded-xl border border-slate-200 p-5 bg-white">
      <div className="flex items-center gap-3 mb-2">
        {company.logo_url
          ? <img src={company.logo_url} alt="" className="w-8 h-8 rounded object-contain" />
          : <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-slate-400" /></div>}
        <div>
          <h2 className="font-semibold text-slate-900 leading-tight">{company.name}</h2>
          {company.sector && <span className="text-[11px] text-slate-400">{company.sector}</span>}
        </div>
        {company.source === 'user' && <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">Private</span>}
      </div>

      {company.summary && <p className="text-sm text-slate-600 mb-3">{company.summary}</p>}

      {!!(company.facts?.length) && (
        <ul className="text-xs text-slate-500 space-y-1 mb-4">
          {company.facts.slice(0, 3).map((f, i) => (
            <li key={i} className="flex gap-1.5">
              <span>•</span>
              <span>{f.claim}{f.source_url && <a href={f.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center ml-1 text-brand"><ExternalLink className="w-3 h-3" /></a>}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {angles.map((angle: BrandAngle) => (
          <button key={angle.id} disabled={busy}
            onClick={() => onCompose(company, { angleId: angle.id })}
            className="text-[13px] text-left px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-brand/50 hover:bg-brand-light/30 transition-all disabled:opacity-50">
            {angle.title}
          </button>
        ))}
        <button disabled={busy}
          onClick={() => onCompose(company, { generateFresh: true })}
          className="text-[13px] px-3 py-1.5 rounded-lg border border-dashed border-brand/40 text-brand hover:bg-brand-light/30 transition-all disabled:opacity-50 inline-flex items-center gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          Generate a fresh angle
        </button>
      </div>
    </div>
  )
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [factsText, setFactsText] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name.trim()) { toast.error('Company name is required.'); return }
    setSaving(true)
    try {
      const facts = factsText.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await fetch('/api/brand-stories/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sector, facts }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Could not save.'); return }
      toast.success('Company added — it\'s private to you.')
      onDone()
    } catch { toast.error('Something went wrong.') }
    finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-5 bg-slate-50 mt-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Sparkles className="w-4 h-4 text-brand" /> Add your own company</div>
      <p className="text-xs text-slate-500">Private to you — never shared, never locked against anyone else.</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Company name"
        className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200" />
      <input value={sector} onChange={e => setSector(e.target.value)} placeholder="Sector (optional, e.g. fintech)"
        className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200" />
      <textarea value={factsText} onChange={e => setFactsText(e.target.value)} rows={4}
        placeholder="Facts about the company — one per line. These ground the post."
        className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 resize-y" />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save company'}</Button>
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  )
}

function HowItWorks({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const steps = [
    { icon: Building2, title: 'Pick a real brand', body: 'Browse curated companies — each with a factual, source-cited case study. Or add your own private company.' },
    { icon: Sparkles, title: 'Choose an angle', body: 'Claim a ready-made takeaway, or generate a fresh one (up to 3 a day). We write the full post in your voice, grounded in the cited facts.' },
    { icon: Lock, title: 'It\'s yours for a while', body: 'Once you claim an angle it locks to you and disappears for everyone else, so no two people post the same thing. It frees up again after about a month.' },
    { icon: ImageIcon, title: 'Add an image or branded graphic', body: 'Pair the post with a branded card in your colours and logo, or upload the brand\'s own logo or a photo — your call, right from the composer.' },
    { icon: PenLine, title: 'Review and schedule', body: 'The draft lands in Posts to edit and schedule. Delete it and the angle frees up right away.' },
  ]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 md:mx-auto w-[calc(100vw-2rem)] md:w-full">
        <DialogHeader>
          <DialogTitle className="text-slate-900">How Brand Stories works</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-light/50 text-brand flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{s.title}</p>
                <p className="text-[13px] text-slate-500 mt-0.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-2">
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
