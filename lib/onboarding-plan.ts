const PAID = ['starter', 'standard', 'pro'] as const
const ALL = ['free', ...PAID] as const
export type PlanId = typeof ALL[number]

export function resolvePlanFromParam(param: string | null | undefined): { plan: PlanId; isPaid: boolean } {
  const plan = (ALL as readonly string[]).includes(param ?? '') ? (param as PlanId) : 'free'
  return { plan, isPaid: (PAID as readonly string[]).includes(plan) }
}
