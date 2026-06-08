export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  tags: string[]
  date: string
  readTime: string
}

// Single source of truth for blog posts. Consumed by the blog index
// (app/blog/page.tsx) AND the sitemap (app/sitemap.ts) so every post is
// always advertised to crawlers. Newest first.
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'linkedin-content-ideas-india',
    title: 'LinkedIn content ideas for Indian professionals (2026)',
    excerpt:
      '30+ LinkedIn content ideas for Indian founders, consultants and professionals — founder lessons, contrarian takes, behind-the-scenes, and Hinglish angles.',
    tags: ['LinkedIn India', 'Content Strategy', 'Ideas'],
    date: 'June 2026',
    readTime: '6 min read',
  },
  {
    slug: 'is-ai-linkedin-automation-allowed',
    title: 'Is AI LinkedIn automation against the rules? (2026)',
    excerpt:
      'Content automation via the official API is fine; scraping and DM/connection bots are what get accounts restricted. Where the line actually is.',
    tags: ['LinkedIn Automation', 'LinkedIn Safety'],
    date: 'June 2026',
    readTime: '5 min read',
  },
  {
    slug: 'how-to-humanize-ai-linkedin-posts',
    title: 'How to humanize AI LinkedIn posts (so they don’t sound like AI)',
    excerpt:
      'AI-written posts have obvious tells. The 10 giveaways to cut, the manual fixes, and why voice-matching beats find-and-replace.',
    tags: ['LinkedIn Growth', 'AI Writing'],
    date: 'June 2026',
    readTime: '6 min read',
  },
  {
    slug: 'best-taplio-alternatives',
    title: 'Best Taplio alternatives in 2026 (including INR-priced picks)',
    excerpt:
      'Taplio is great — but it bills in USD with no GST. Here are the best Taplio alternatives in 2026, including the cheapest and the India-first options.',
    tags: ['Taplio Alternative', 'LinkedIn Tools', 'Comparison'],
    date: 'June 2026',
    readTime: '8 min read',
  },
  {
    slug: 'best-time-to-post-linkedin-india',
    title: 'The best time to post on LinkedIn in India (IST, 2026)',
    excerpt:
      "Most 'best time to post' advice is built on US data. Here's what actually works for Indian audiences on IST — and why consistency beats perfect timing.",
    tags: ['LinkedIn India', 'Growth Strategy', 'IST'],
    date: 'June 2026',
    readTime: '7 min read',
  },
  {
    slug: 'cheapest-ai-linkedin-tools-india',
    title: 'The cheapest AI LinkedIn tools in India in 2026 (honest INR comparison)',
    excerpt:
      'Real INR prices for AI LinkedIn tools in India — GST, Hinglish, auto-publish, and which few actually cost under ₹1,000 a month.',
    tags: ['LinkedIn Tools', 'India', 'Pricing'],
    date: 'June 2026',
    readTime: '9 min read',
  },
  {
    slug: 'how-to-grow-linkedin-india-2026',
    title: 'How to grow on LinkedIn in India in 2026 (the honest guide)',
    excerpt:
      'An honest, no-hype guide to LinkedIn growth in India — real data, the four post types that work, the Hinglish question, the 2026 algorithm, and a 90-day plan.',
    tags: ['LinkedIn India', 'Growth Strategy', 'Hinglish'],
    date: 'June 2026',
    readTime: '14 min read',
  },
  {
    slug: 'how-to-grow-on-linkedin-without-posting-daily',
    title: 'How to grow on LinkedIn without posting daily',
    excerpt:
      "You don't need to post every day to grow on LinkedIn. Here's the smarter approach that busy founders use to build a 10,000+ following without burning out.",
    tags: ['LinkedIn Automation', 'LinkedIn Manager', 'Growth Strategy'],
    date: 'May 2026',
    readTime: '5 min read',
  },
  {
    slug: 'best-ai-linkedin-post-generators-for-indian-professionals-2026',
    title: 'Best AI LinkedIn post generators for Indian professionals 2026',
    excerpt:
      "We tested 8 AI LinkedIn tools available in India. Here's which ones actually write in your voice, support INR pricing, and handle Indian audiences.",
    tags: ['AI LinkedIn Manager India', 'LinkedIn Tools', 'Product Review'],
    date: 'April 2026',
    readTime: '7 min read',
  },
  {
    slug: 'why-your-linkedin-posts-get-zero-engagement',
    title: 'Why your LinkedIn posts get zero engagement (and how to fix it)',
    excerpt:
      'Most LinkedIn posts fail because of 3 fixable mistakes. Here are the patterns that kill reach on Indian LinkedIn — and how to fix each one.',
    tags: ['LinkedIn Profile Manager', 'Content Strategy', 'Engagement'],
    date: 'March 2026',
    readTime: '6 min read',
  },
]
