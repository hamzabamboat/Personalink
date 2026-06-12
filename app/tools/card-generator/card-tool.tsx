'use client'

import { useState } from 'react'
import Link from 'next/link'

const THEMES = [
  { id: 'midnight', label: 'Midnight' },
  { id: 'mist', label: 'Mist' },
  { id: 'ink', label: 'Ink' },
]
const TYPES = [
  { id: 'quote', label: 'Quote' },
  { id: 'stat', label: 'Stat' },
  { id: 'title', label: 'Title' },
  { id: 'list', label: 'List' },
]

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-[13px] font-medium px-3 py-1.5 rounded-lg border transition-all ${active ? 'border-[#2B4DFF] bg-[#2B4DFF]/8 text-[#2B4DFF]' : 'border-slate-200 text-slate-600 hover:border-[#2B4DFF]/40'}`}>
      {children}
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{children}</div>
}

export function CardTool() {
  const [type, setType] = useState('quote')
  const [headline, setHeadline] = useState('Consistency beats genius.')
  const [kicker, setKicker] = useState('THE MATH')
  const [body, setBody] = useState('And the algorithm rewards it.')
  const [lines, setLines] = useState('Show up before you’re ready\nReply in the first hour\nWrite like you talk')
  const [theme, setTheme] = useState('midnight')
  const [name, setName] = useState('')

  const params = new URLSearchParams()
  params.set('type', type)
  params.set('theme', theme)
  params.set('ar', '1080x1080')
  params.set('headline', headline || 'Your headline here')
  if (type === 'stat' && kicker) params.set('kicker', kicker)
  if ((type === 'stat' || type === 'title' || type === 'myth') && body) params.set('body', body)
  if (type === 'list') params.set('lines', lines.split('\n').map(s => s.trim()).filter(Boolean).join('|'))
  if (name) params.set('name', name)
  const src = `/api/og/card?${params.toString()}`

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="flex flex-col gap-4">
        <div>
          <Label>Card type</Label>
          <div className="flex flex-wrap gap-2">{TYPES.map(t => <Chip key={t.id} active={type === t.id} onClick={() => setType(t.id)}>{t.label}</Chip>)}</div>
        </div>

        {type === 'stat' && (
          <div><Label>Label (small)</Label><input value={kicker} onChange={e => setKicker(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" /></div>
        )}

        <div>
          <Label>{type === 'stat' ? 'The number / stat' : type === 'list' ? 'List title' : 'Headline'}</Label>
          <input value={headline} onChange={e => setHeadline(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" />
        </div>

        {type === 'list' ? (
          <div><Label>List items (one per line)</Label><textarea value={lines} onChange={e => setLines(e.target.value)} rows={4} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px] resize-none" /></div>
        ) : type !== 'quote' ? (
          <div><Label>Supporting line</Label><input value={body} onChange={e => setBody(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" /></div>
        ) : null}

        <div><Label>Your name (footer, optional)</Label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aman Gupta" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[14px]" /></div>

        <div>
          <Label>Theme</Label>
          <div className="flex gap-2">{THEMES.map(t => <Chip key={t.id} active={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</Chip>)}</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:sticky md:top-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="LinkedIn card preview" className="w-full rounded-2xl border border-slate-100 shadow-sm bg-slate-50" />
        <a href={src} download="linkedin-card.png">
          <button className="w-full py-2.5 rounded-lg bg-[#2B4DFF] text-white font-semibold text-[14px] hover:bg-[#2340e0] transition-colors">Download PNG (free, no watermark)</button>
        </a>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-5 text-center">
          <div className="font-bold text-slate-800 mb-1">Want these in your brand?</div>
          <div className="text-[13px] text-slate-500 mb-3 leading-relaxed">Unlimited branded graphics with your colours + logo, AI images, swipeable carousels, and a profile banner — generated straight from your posts.</div>
          <Link href="/"><button className="px-5 py-2.5 rounded-lg bg-slate-900 text-white font-semibold text-[14px] hover:bg-slate-800 transition-colors">Start free →</button></Link>
        </div>
      </div>
    </div>
  )
}
