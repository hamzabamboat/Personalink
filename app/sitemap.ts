import { MetadataRoute } from 'next'
import { COMPETITOR_SLUGS } from '@/lib/competitor-data'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const vsPages: MetadataRoute.Sitemap = COMPETITOR_SLUGS.map(slug => ({
    url: `https://personalink.in/vs/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://personalink.in',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://personalink.in/voice-analyzer',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...vsPages,
    {
      url: 'https://personalink.in/for-agencies',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://personalink.in/blog',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ]
}
