'use client'

import { Bot, CheckCircle2, Lightbulb, Check } from 'lucide-react'

type ControlPreference = 'autopilot' | 'approve' | 'suggest' | ''

type StepControlPreferenceProps = {
  value: ControlPreference
  onChange: (value: ControlPreference) => void
}

const OPTIONS = [
  { id: 'autopilot' as const, icon: Bot, iconColor: '#0A66C2', iconBg: '#e8f0fb', title: 'Full Autopilot', desc: 'AI generates and posts everything automatically on your schedule. Sit back and grow.' },
  { id: 'approve' as const, icon: CheckCircle2, iconColor: '#059669', iconBg: '#ecfdf5', title: 'Approve Before Posting', desc: 'AI generates posts, you get an email to approve each one before it goes live. Best of both worlds.' },
  { id: 'suggest' as const, icon: Lightbulb, iconColor: '#d97706', iconBg: '#fffbeb', title: 'Suggest Only', desc: 'AI suggests ideas and drafts, you decide which ones to develop and post yourself.' },
]

export function StepControlPreference({ value, onChange }: StepControlPreferenceProps) {
  return (
    <div className="flex flex-col gap-4">
      {OPTIONS.map(opt => {
        const selected = value === opt.id
        const Icon = opt.icon
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`p-6 rounded-xl border-2 text-left transition-all ${selected ? 'border-brand bg-brand-light shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: opt.iconBg }}>
                <Icon className="w-5 h-5" style={{ color: opt.iconColor }} strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <div className={`font-bold text-[17px] mb-1.5 ${selected ? 'text-brand' : 'text-slate-900'}`}>{opt.title}</div>
                <div className="text-slate-500 text-sm leading-relaxed">{opt.desc}</div>
              </div>
              {selected && (
                <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
