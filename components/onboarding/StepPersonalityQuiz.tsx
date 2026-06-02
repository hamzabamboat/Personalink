'use client'

import { MCQ_QUESTIONS, MULTI_SELECT_QUESTIONS } from '@/lib/onboarding-questions'

type StepPersonalityQuizProps = {
  answers: Record<string, string | string[]>
  onToggle: (qid: string, opt: string) => void
}

export function StepPersonalityQuiz({ answers, onToggle }: StepPersonalityQuizProps) {
  return (
    <div className="flex flex-col gap-8">
      {MCQ_QUESTIONS.map(q => {
        const isMulti = MULTI_SELECT_QUESTIONS.includes(q.id)
        const answer = answers[q.id]
        return (
          <div key={q.id}>
            <p className="font-semibold text-slate-900 mb-1 text-[15px]">{q.q}</p>
            <p className="text-[12px] text-slate-400 mb-3">{isMulti ? 'Select all that apply.' : 'Pick one.'}</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-2.5">
              {q.options.map(opt => {
                const selected = Array.isArray(answer) ? answer.includes(opt) : answer === opt
                return (
                  <button
                    key={opt}
                    onClick={() => onToggle(q.id, opt)}
                    className={`px-4 py-3 sm:py-2.5 rounded-xl sm:rounded-full border-2 text-sm transition-all text-left sm:text-center min-h-[48px] sm:min-h-0 ${
                      selected ? 'border-brand bg-brand-light text-brand font-semibold' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
