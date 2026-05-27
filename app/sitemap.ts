import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
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
    {
      url: 'https://personalink.in/blog',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ]
}
