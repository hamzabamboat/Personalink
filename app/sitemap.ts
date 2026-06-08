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
    ...vsPages,
    { url: `${BASE}/for-agencies`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    ...blogPosts,
    { url: `${BASE}/affiliate`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
