import { describe, it, expect } from 'vitest'
import {
  groupPerformanceBy, perPillarPerformance, perFormatPerformance, perTimeSlotPerformance,
  classifyVelocity, attributionByPillar,
  type PostPerfRow, type VelocitySample,
} from '../insights'

const rows: PostPerfRow[] = [
  { content_pillar: 'Leadership', format: 'text', published_at: '2026-05-04T09:00:00Z', impressions: 1000, reactions: 50, comments: 5, reshares: 2, saves: 3 },
  { content_pillar: 'Leadership', format: 'video', published_at: '2026-05-06T14:00:00Z', impressions: 2000, reactions: 60, comments: 10, reshares: 4, saves: 6 },
  { content_pillar: 'Innovation', format: 'text', published_at: '2026-05-04T09:30:00Z', impressions: 500, reactions: 40, comments: 2, reshares: 1, saves: 1 },
  { content_pillar: null, format: null, published_at: null, impressions: 100, reactions: 1, comments: 0, reshares: 0, saves: 0 },
]

describe('groupPerformanceBy', () => {
  it('aggregates avg impressions + engagement rate per key, sorted by avg engagement rate desc', () => {
    const out = groupPerformanceBy(rows, r => r.content_pillar ?? 'Uncategorized')
    expect(out.map(g => g.key)).toEqual(['Innovation', 'Leadership', 'Uncategorized'])
    const innov = out.find(g => g.key === 'Innovation')!
    expect(innov.posts).toBe(1)
    expect(innov.avgImpressions).toBe(500)
    // (40+2+1+1)/500 = 0.088
    expect(innov.avgEngagementRate).toBeCloseTo(0.088, 4)
    const lead = out.find(g => g.key === 'Leadership')!
    expect(lead.posts).toBe(2)
    expect(lead.avgImpressions).toBe(1500)
  })

  it('skips zero-impression posts when computing engagement rate (no divide-by-zero)', () => {
    const out = groupPerformanceBy(
      [{ content_pillar: 'X', format: 'text', published_at: null, impressions: 0, reactions: 5, comments: 0, reshares: 0, saves: 0 }],
      r => r.content_pillar ?? 'Uncategorized',
    )
    expect(out[0].avgEngagementRate).toBe(0)
    expect(out[0].avgImpressions).toBe(0)
  })
})

describe('perPillarPerformance / perFormatPerformance', () => {
  it('group by pillar', () => {
    expect(perPillarPerformance(rows).map(g => g.key)).toContain('Leadership')
  })
  it('group by format, null format → unknown', () => {
    const out = perFormatPerformance(rows)
    expect(out.map(g => g.key).sort()).toEqual(['text', 'unknown', 'video'])
  })
})

describe('perTimeSlotPerformance', () => {
  it('buckets by ISO weekday + hour (UTC), best slot first', () => {
    const out = perTimeSlotPerformance(rows)
    // 2026-05-04 is a Monday, 2026-05-06 is a Wednesday
    expect(out.some(s => s.day === 'Mon' && s.hour === 9)).toBe(true)
    expect(out.some(s => s.day === 'Wed' && s.hour === 14)).toBe(true)
    // posts with null published_at are dropped
    expect(out.reduce((n, s) => n + s.posts, 0)).toBe(3)
  })
})

describe('classifyVelocity (fast-spike vs slow-burn)', () => {
  // Series of post_analytics snapshots: age_minutes + cumulative impressions.
  it('fast-spike: most impressions arrive in the first 24h', () => {
    const series: VelocitySample[] = [
      { age_minutes: 60, impressions: 800 },
      { age_minutes: 24 * 60, impressions: 950 },
      { age_minutes: 7 * 24 * 60, impressions: 1000 },
    ]
    const v = classifyVelocity(series)
    expect(v.class).toBe('fast-spike')
    expect(v.share24h).toBeCloseTo(0.95, 2)
  })

  it('slow-burn: impressions keep accruing well past 24h', () => {
    const series: VelocitySample[] = [
      { age_minutes: 60, impressions: 100 },
      { age_minutes: 24 * 60, impressions: 300 },
      { age_minutes: 7 * 24 * 60, impressions: 1000 },
    ]
    const v = classifyVelocity(series)
    expect(v.class).toBe('slow-burn')
    expect(v.share24h).toBeCloseTo(0.3, 2)
  })

  it('returns unknown when fewer than 2 snapshots or no terminal impressions', () => {
    expect(classifyVelocity([{ age_minutes: 60, impressions: 50 }]).class).toBe('unknown')
    expect(classifyVelocity([]).class).toBe('unknown')
  })
})

describe('attributionByPillar', () => {
  it('rolls up followers_gained + profile_views_from_post per pillar, sorted by followers desc', () => {
    const rows = [
      { content_pillar: 'Leadership', followers_gained: 10, profile_views_from_post: 30 },
      { content_pillar: 'Leadership', followers_gained: 5, profile_views_from_post: 10 },
      { content_pillar: 'Innovation', followers_gained: 20, profile_views_from_post: 5 },
      { content_pillar: null, followers_gained: null, profile_views_from_post: 2 },
    ]
    const out = attributionByPillar(rows)
    expect(out[0]).toEqual({ key: 'Innovation', followersGained: 20, profileViews: 5, posts: 1 })
    const lead = out.find(g => g.key === 'Leadership')!
    expect(lead.followersGained).toBe(15)
    expect(lead.profileViews).toBe(40)
    expect(out.find(g => g.key === 'Uncategorized')!.followersGained).toBe(0)
  })
})
