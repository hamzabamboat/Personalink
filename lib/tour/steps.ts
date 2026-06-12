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

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    route: '/dashboard',
    target: 'center',
    title: 'Welcome to PersonaLink 👋',
    body: "Here's a 60-second tour of the essentials. You can skip anytime.",
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
    title: 'Review and approve',
    body: 'Every draft lands here for you to review, edit, and approve before it goes out.',
  },
  {
    id: 'images',
    route: '/dashboard/posts',
    target: 'center',
    title: 'Add a graphic to any post',
    body: 'When you edit a post, one click turns it into a branded quote, stat, or carousel — in your colours and logo, never a watermark. Unlimited branded graphics, plus AI images.',
  },
  {
    id: 'calendar',
    route: '/dashboard/calendar',
    target: 'calendar',
    title: 'Plan your week',
    body: 'Schedule posts across the week and keep a steady, consistent cadence.',
  },
  {
    id: 'analytics',
    route: '/dashboard/analytics',
    target: 'analytics',
    requiresPlan: 'standard',
    title: 'See what is working',
    body: 'Track reach and engagement on every post so you can double down on what lands.',
    lockedBody: 'Track reach and engagement on every post. Analytics is included on the Standard plan — upgrade anytime to unlock it.',
  },
  {
    id: 'suggestions',
    route: '/dashboard/suggestions',
    target: 'suggestions',
    title: 'Never run out of ideas',
    body: 'Stuck for something to say? Fresh, trend-based post angles for your industry show up here.',
  },
  {
    id: 'voice',
    route: '/dashboard/profile',
    target: 'voice',
    title: 'Tune your voice',
    body: 'Adjust your tone, voice, and language anytime — every post is generated to match.',
  },
  {
    id: 'brandkit',
    route: '/dashboard/settings',
    target: 'brand-kit',
    title: 'Make it yours',
    body: 'Set your logo, brand colour and font once — every graphic uses them automatically. Managing a few clients? Keep a separate kit for each.',
  },
  {
    id: 'carousel',
    route: '/dashboard/carousel',
    target: 'carousel',
    requiresPlan: 'standard',
    title: 'Make swipeable carousels',
    body: 'Turn any idea into a multi-slide PDF carousel — in your brand, ready to upload to LinkedIn as a document post.',
    lockedBody: 'Turn any idea into a swipeable PDF carousel in your brand. Carousels are on the Standard plan — upgrade anytime to unlock them.',
  },
  {
    id: 'banner',
    route: '/dashboard/profile-improve',
    target: 'center',
    title: 'Design your profile banner',
    body: 'Generate a professional LinkedIn banner with your name, role, brand colour, logo, and what you do — sized perfectly at 1584×396, ready to download.',
  },
  {
    id: 'library',
    route: '/dashboard/library',
    target: 'library',
    title: 'Never start from a blank page',
    body: 'Browse proven post patterns — the hook, why it works, and a reusable template — then remix any one in your own voice with a click.',
  },
  {
    id: 'done',
    target: 'center',
    title: "You're all set 🎉",
    body: 'That\'s the tour. Generate your first post now, or replay this anytime from the Help menu.',
    cta: { label: 'Generate your first post →', route: '/dashboard/generate' },
  },
]
