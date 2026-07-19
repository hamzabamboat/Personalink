export type LeadDripTemplate = {
  subject: string
  heading: string
  body: string
  ctaLabel: string
  ctaHref: string
}

export const LEAD_DRIP_TEMPLATES: LeadDripTemplate[] = [
  {
    subject: 'Your voice fingerprint is still saved',
    heading: 'Still here.',
    body: 'You ran a voice analysis a few days ago. It is saved. Pick up where you left off and generate your first post in your own voice.',
    ctaLabel: 'Open the analyzer',
    ctaHref: '/voice-analyzer',
  },
  {
    subject: 'One post becomes a week of content',
    heading: 'Repurpose engine.',
    body: 'Paste a blog post, a newsletter, or an old LinkedIn post. Personalink rewrites it in your voice, ready to schedule.',
    ctaLabel: 'See the repurpose engine',
    ctaHref: '/features/repurpose-engine',
  },
  {
    subject: 'What a LinkedIn AI tool actually costs in India',
    heading: 'Priced in INR.',
    body: 'USD tools look cheap on the sticker. Add forex and the GST credit you cannot claim, and the picture changes. Personalink bills in INR with a GST invoice from ₹999/month.',
    ctaLabel: 'See the real cost',
    ctaHref: '/tools/linkedin-cost-calculator',
  },
  {
    subject: 'Turn a line into a LinkedIn graphic',
    heading: 'Cards, in seconds.',
    body: 'Quote, stat, myth or list. Pick a template and a palette, then download a LinkedIn-ready graphic. No design skill needed.',
    ctaLabel: 'Try the card maker',
    ctaHref: '/tools/card-generator',
  },
  {
    subject: 'Posting daily is not a personality trait',
    heading: 'Consistency, not hustle.',
    body: 'Most LinkedIn growth comes from showing up on a schedule, not from a viral hit. Personalink writes the post. You approve it before it goes out.',
    ctaLabel: 'See how it works',
    ctaHref: '/',
  },
  {
    subject: '3 posts a month, free',
    heading: 'No card required.',
    body: 'Try Personalink with 3 free posts a month in your own voice. Upgrade only when you are ready for more.',
    ctaLabel: 'Start free',
    ctaHref: '/pricing',
  },
]

/** Cycles through LEAD_DRIP_TEMPLATES, wrapping back to the start once exhausted. */
export function getLeadDripTemplate(index: number): LeadDripTemplate {
  return LEAD_DRIP_TEMPLATES[index % LEAD_DRIP_TEMPLATES.length]
}
