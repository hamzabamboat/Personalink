import { describe, it, expect } from 'vitest'
import {
  LINKEDIN_API_VERSION,
  CREATOR_POST_METRICS,
  hasCreatorScopes,
  shareIdFromUrn,
  parseCreatorMetricValue,
  parseCreatorAnalyticsResponse,
  parseSocialActions,
  parseFollowerCounts,
  ageMinutes,
} from '../linkedin-analytics'

describe('constants', () => {
  it('pins the LinkedIn API version', () => {
    expect(LINKEDIN_API_VERSION).toBe('202601')
  })

  it('lists every creator post metric queryType in order', () => {
    expect(CREATOR_POST_METRICS).toEqual([
      'IMPRESSION',
      'MEMBERS_REACHED',
      'REACTION',
      'COMMENT',
      'RESHARE',
      'POST_SAVE',
      'LINK_CLICKS',
      'FOLLOWER_GAINED_FROM_CONTENT',
      'PROFILE_VIEW_FROM_CONTENT',
    ])
  })
})

describe('hasCreatorScopes', () => {
  it('is true only when r_member_postAnalytics is present', () => {
    expect(hasCreatorScopes(['openid', 'r_member_postAnalytics'])).toBe(true)
    expect(hasCreatorScopes(['r_member_profileAnalytics'])).toBe(false)
    expect(hasCreatorScopes([])).toBe(false)
    expect(hasCreatorScopes(null)).toBe(false)
  })
})

describe('shareIdFromUrn', () => {
  it('extracts the numeric id from a share urn', () => {
    expect(shareIdFromUrn('urn:li:share:7123456789')).toBe('7123456789')
  })
  it('extracts the id from a ugcPost urn', () => {
    expect(shareIdFromUrn('urn:li:ugcPost:7000000000')).toBe('7000000000')
  })
  it('returns null for an unrecognised urn', () => {
    expect(shareIdFromUrn('not-a-urn')).toBeNull()
    expect(shareIdFromUrn('')).toBeNull()
  })
})

describe('parseCreatorMetricValue', () => {
  it('reads elements[0].value', () => {
    expect(parseCreatorMetricValue({ elements: [{ value: 1234 }] })).toBe(1234)
  })
  it('returns null on empty elements or missing value', () => {
    expect(parseCreatorMetricValue({ elements: [] })).toBeNull()
    expect(parseCreatorMetricValue({ elements: [{}] })).toBeNull()
    expect(parseCreatorMetricValue({})).toBeNull()
    expect(parseCreatorMetricValue(null)).toBeNull()
  })
})

describe('parseCreatorAnalyticsResponse', () => {
  it('maps queryType→value into the typed PostMetrics shape, source=creator_api', () => {
    const byMetric = {
      IMPRESSION: { elements: [{ value: 5000 }] },
      MEMBERS_REACHED: { elements: [{ value: 4200 }] },
      REACTION: { elements: [{ value: 80 }] },
      COMMENT: { elements: [{ value: 12 }] },
      RESHARE: { elements: [{ value: 5 }] },
      POST_SAVE: { elements: [{ value: 9 }] },
      LINK_CLICKS: { elements: [{ value: 33 }] },
      FOLLOWER_GAINED_FROM_CONTENT: { elements: [{ value: 7 }] },
      PROFILE_VIEW_FROM_CONTENT: { elements: [{ value: 21 }] },
    }
    expect(parseCreatorAnalyticsResponse(byMetric)).toEqual({
      impressions: 5000,
      members_reached: 4200,
      reactions: 80,
      comments: 12,
      reshares: 5,
      saves: 9,
      link_clicks: 33,
      followers_gained: 7,
      profile_views_from_post: 21,
      source: 'creator_api',
    })
  })

  it('fills nulls for any metric whose response was missing/empty', () => {
    const result = parseCreatorAnalyticsResponse({
      IMPRESSION: { elements: [{ value: 100 }] },
    })
    expect(result.impressions).toBe(100)
    expect(result.reactions).toBeNull()
    expect(result.profile_views_from_post).toBeNull()
    expect(result.source).toBe('creator_api')
  })
})

describe('parseSocialActions', () => {
  it('reads only likes + first-level comments, source=public_fallback, rest null', () => {
    expect(
      parseSocialActions({
        likesSummary: { totalLikes: 12 },
        commentsSummary: { totalFirstLevelComments: 3 },
      })
    ).toEqual({
      impressions: null,
      members_reached: null,
      reactions: 12,
      comments: 3,
      reshares: null,
      saves: null,
      link_clicks: null,
      followers_gained: null,
      profile_views_from_post: null,
      source: 'public_fallback',
    })
  })

  it('tolerates missing summaries', () => {
    const r = parseSocialActions({})
    expect(r.reactions).toBeNull()
    expect(r.comments).toBeNull()
    expect(r.source).toBe('public_fallback')
  })
})

describe('parseFollowerCounts', () => {
  it('maps daily dateRange elements to {snapshot_date, follower_count}', () => {
    const r = parseFollowerCounts({
      elements: [
        {
          followerCounts: { organicFollowerCount: 100, paidFollowerCount: 5 },
          dateRange: { start: { day: 1, month: 5, year: 2026 } },
        },
        {
          followerCounts: { organicFollowerCount: 102 },
          dateRange: { start: { day: 2, month: 5, year: 2026 } },
        },
      ],
    })
    expect(r).toEqual([
      { snapshot_date: '2026-05-01', follower_count: 105 },
      { snapshot_date: '2026-05-02', follower_count: 102 },
    ])
  })

  it('zero-pads month/day and sums organic+paid', () => {
    const r = parseFollowerCounts({
      elements: [
        {
          followerCounts: { organicFollowerCount: 10, paidFollowerCount: 2 },
          dateRange: { start: { day: 9, month: 3, year: 2026 } },
        },
      ],
    })
    expect(r).toEqual([{ snapshot_date: '2026-03-09', follower_count: 12 }])
  })

  it('returns [] for empty/missing elements', () => {
    expect(parseFollowerCounts({ elements: [] })).toEqual([])
    expect(parseFollowerCounts({})).toEqual([])
    expect(parseFollowerCounts(null)).toEqual([])
  })
})

describe('ageMinutes', () => {
  it('computes whole minutes between publish and capture', () => {
    expect(ageMinutes('2026-05-01T00:00:00.000Z', '2026-05-01T01:30:00.000Z')).toBe(90)
  })
  it('floors partial minutes and never goes negative', () => {
    expect(ageMinutes('2026-05-01T00:00:00.000Z', '2026-05-01T00:00:59.000Z')).toBe(0)
    expect(ageMinutes('2026-05-01T01:00:00.000Z', '2026-05-01T00:00:00.000Z')).toBe(0)
  })
  it('returns null when published_at is null', () => {
    expect(ageMinutes(null, '2026-05-01T00:00:00.000Z')).toBeNull()
  })
})
