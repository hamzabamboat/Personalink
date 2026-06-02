import { MCQ_QUESTIONS } from '@/lib/onboarding-questions'

// Derive required quiz ids from the single source of truth.
export const REQUIRED_MCQ_IDS: string[] = MCQ_QUESTIONS.map(q => q.id)

export type CompletenessGroup = 'quiz' | 'pillars' | 'control'

export interface Completeness {
  complete: boolean
  missing: CompletenessGroup[]
}

interface ProfileLike {
  mcq_answers?: Record<string, unknown> | null
  content_pillars?: string[] | null
  control_preference?: string | null
}

function quizDone(p: ProfileLike): boolean {
  const a = p.mcq_answers || {}
  return REQUIRED_MCQ_IDS.every(id => {
    const v = (a as Record<string, unknown>)[id]
    return Array.isArray(v) ? v.length > 0 : Boolean(v)
  })
}

export function getProfileCompleteness(profile: ProfileLike | null | undefined): Completeness {
  const p = profile || {}
  const missing: CompletenessGroup[] = []
  if (!quizDone(p)) missing.push('quiz')
  if ((p.content_pillars?.length ?? 0) < 3) missing.push('pillars')
  if (!p.control_preference) missing.push('control')
  return { complete: missing.length === 0, missing }
}
