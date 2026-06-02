'use client'

import { CONTENT_PILLARS } from '@/lib/supabase'

type StepContentPillarsProps = {
  selected: string[]
  onToggle: (p: string) => void
}

export function StepContentPillars({ selected, onToggle }: StepContentPillarsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {CONTENT_PILLARS.map(p => {
          const isSelected = selected.includes(p)
          const maxed = selected.length >= 3 && !isSelected
          return (
            <button
              key={p}
              onClick={() => onToggle(p)}
              disabled={maxed}
              className={`p-4 rounded-xl border-2 text-left text-[15px] font-medium transition-all flex items-center justify-between ${
                isSelected ? 'border-brand bg-brand-light text-brand font-bold' : maxed ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {p}
              {isSelected && (
                <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#0A66C2"/><polyline points="4.5,8.5 6.5,10.5 11.5,5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
              )}
            </button>
          )
        })}
      </div>
      <div className={`text-[13px] font-medium ${selected.length === 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
        {selected.length}/3 selected {selected.length === 3 ? '✓' : ''}
      </div>
    </>
  )
}
