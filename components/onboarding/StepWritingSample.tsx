'use client'

import { Textarea } from '@/components/ui/textarea'

type StepWritingSampleProps = {
  value: string
  onChange: (value: string) => void
  wordCount: number
}

export function StepWritingSample({ value, onChange, wordCount }: StepWritingSampleProps) {
  return (
    <>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="This week I had a tough conversation with a potential investor. They pushed back hard on our unit economics, and honestly — they were right. Here's what I learned from getting humbled in a pitch room..."
        className="min-h-[220px]"
      />
      <div className={`mt-2 text-[13px] ${wordCount >= 80 ? 'text-emerald-600' : 'text-slate-400'}`}>
        {wordCount} words {wordCount < 80 ? '(aim for at least 80)' : '✓'}
      </div>
    </>
  )
}
