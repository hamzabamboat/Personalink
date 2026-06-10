import { MetadataRoute } from 'next'
import { COMPETITOR_SLUGS } from '@/lib/competitor-data'
import { BLOG_POSTS } from '@/lib/blog-posts'

const BASE = 'https://personalink.in'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const vsPages: MetadataRoute.Sitemap = COMPETITOR_SLUGS.map(slug => ({
    url: `${BASE}/vs/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const blogPosts: MetadataRoute.Sitemap = BLOG_POSTS.map(post => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [
    { url: BASE, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/voice-analyzer`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/ai-linkedin-automation-tool`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/ai-linkedin-post-generator-india`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/cheap-linkedin-ai-tool-india`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/hinglish-linkedin-post-generator`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/features/anti-ai-humanizer`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/features/voice-to-post`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/features/linkedin-post-scheduler-india`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/features/repurpose-engine`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/ai-linkedin-ghostwriter`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/tools/linkedin-cost-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/vs`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    ...vsPages,
    { url: `${BASE}/for-agencies`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ...blogPosts,
    { url: `${BASE}/affiliate`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
