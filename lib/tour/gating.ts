import { tierRank, type TierID } from '@/lib/pricing-config'
import type { TourStep } from '@/lib/tour/steps'

type PlanLike = TierID | string | null | undefined

/** True when the step's feature is above the user's plan. */
export function isStepLocked(step: TourStep, plan: PlanLike): boolean {
  if (!step.requiresPlan) return false
  return tierRank(plan) < tierRank(step.requiresPlan)
}

export type StepView =
  | { mode: 'spotlight'; target: string; title: string; body: string }
  | { mode: 'center'; title: string; body: string }

/** Resolve how a step should render for a given plan. */
export function resolveStepView(step: TourStep, plan: PlanLike): StepView {
  if (isStepLocked(step, plan)) {
    return { mode: 'center', title: step.title, body: step.lockedBody ?? step.body }
  }
  if (step.target === 'center') {
    return { mode: 'center', title: step.title, body: step.body }
  }
  return { mode: 'spotlight', target: step.target, title: step.title, body: step.body }
}

/** Whether the engine should route to this step's page. */
export function shouldNavigate(step: TourStep, plan: PlanLike, currentPath: string): boolean {
  if (isStepLocked(step, plan)) return false
  if (!step.route) return false
  return step.route !== currentPath
}
