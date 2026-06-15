import type { TierID } from '@/lib/pricing-config'

export type TourStepId =
  | 'welcome'
  | 'generate'
  | 'posts'
  | 'calendar'
  | 'analytics'
  | 'suggestions'
  | 'voice'
  | 'images'
  | 'brandkit'
  | 'carousel'
  | 'banner'
  | 'library'
  | 'done'

export interface TourStep {
  id: TourStepId
  /** Route this step lives on. Omit to stay on the current page (used by `done`). */
  route?: string
  /** `data-tour` value to spotlight, or 'center' for a centered card with no spotlight. */
  target: string | 'center'
  title: string
  body: string
  /** Minimum plan to access the real feature. Below it, the step is a centered info card and does NOT navigate. */
  requiresPlan?: TierID
  /** Body shown instead of `body` when the step is locked for the user's plan. */
  lockedBody?: string
  /** Optional call-to-action button (used by the closing `done` step). */
  cta?: { label: string; route: string }
}

// Keep the first-run tour short and focused on the one job a new user came to do:
// generate a post and get it scheduled. Secondary features (carousels, banners,
// analytics, brand kit, library, voice) are discoverable in the app and are better
// surfaced contextually — in the cold-start tour they only delay the user from
// reaching real value, which is the biggest churn risk for a new account.
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    route: '/dashboard',
    target: 'center',
    title: 'Welcome to PersonaLink 👋',
    body: "Here's a 30-second tour — three steps, then you write your first post. You can skip anytime.",
  },
  {
    id: 'generate',
    route: '/dashboard/generate',
    target: 'generate-input',
    title: 'Generate your first post',
    body: 'Describe any idea in a line — a meeting, a lesson, a hot take — and we write the full post in your voice.',
  },
  {
    id: 'posts',
    route: '/dashboard/posts',
    target: 'posts-panel',
    title: 'Review and schedule',
    body: 'Every draft lands here for you to review, edit, and schedule before it goes out. One click also turns any post into a branded graphic — in your colours and logo.',
  },
  {
    id: 'done',
    target: 'center',
    title: "You're all set 🎉",
    body: 'That\'s the tour. Generate your first post now, or replay this anytime from the Help menu.',
    cta: { label: 'Generate your first post →', route: '/dashboard/generate' },
  },
]
