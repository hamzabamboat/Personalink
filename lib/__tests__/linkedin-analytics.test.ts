import { describe, it, expect } from 'vitest'
import {
  LINKEDIN_API_VERSION,
  CREATOR_POST_METRICS,
  hasCreatorScopes,
  shareIdFromUrn,
  entityParamFromUrn,
  parseCreatorMetricValue,
  parseCreatorAnalyticsResponse,
  parseSocialActions,
  parseFollowerCounts,
  ageMinutes,
  fetchPostMetrics,
  fetchFollowerCounts,
  buildPostsLatestUpdate,
  buildPostAnalyticsRow,
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

describe('entityParamFromUrn', () => {
  it('encodes a share URN with share: prefix', () => {
    const result = entityParamFromUrn('urn:li:share:7123456789')
    expect(result).not.toBeNull()
    expect(result).toContain('share%3Aurn%3Ali%3Ashare%3A7123456789')
  })
  it('encodes a ugcPost URN with ugc: prefix', () => {
    const result = entityParamFromUrn('urn:li:ugcPost:7000000000')
    expect(result).not.toBeNull()
    expect(result).toContain('ugc%3Aurn%3Ali%3AugcPost%3A7000000000')
  })
  it('returns null for an unparseable URN', () => {
    expect(entityParamFromUrn('garbage')).toBeNull()
    expect(entityParamFromUrn('')).toBeNull()
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

describe('fetchPostMetrics source selection', () => {
  const urn = 'urn:li:share:7123456789'

  it('uses creator analytics (one call per metric) when scopes allow', async () => {
    const calls: string[] = []
    const fetchStub = (async (url: string) => {
      calls.push(url)
      return { ok: true, status: 200, json: async () => ({ elements: [{ value: 1 }] }) }
    }) as unknown as typeof fetch

    const result = await fetchPostMetrics('tok', urn, ['r_member_postAnalytics'], fetchStub)

    expect(result.source).toBe('creator_api')
    expect(calls.length).toBe(CREATOR_POST_METRICS.length)
    expect(calls[0]).toContain('memberCreatorPostAnalytics')
    expect(calls[0]).toContain('share%3A7123456789')
    expect(calls[0]).toContain('queryType=IMPRESSION')
  })

  it('falls back to socialActions when creator scope is absent', async () => {
    const calls: string[] = []
    const fetchStub = (async (url: string) => {
      calls.push(url)
      return {
        ok: true,
        status: 200,
        json: async () => ({ likesSummary: { totalLikes: 4 }, commentsSummary: { totalFirstLevelComments: 1 } }),
      }
    }) as unknown as typeof fetch

    const result = await fetchPostMetrics('tok', urn, ['openid'], fetchStub)

    expect(result.source).toBe('public_fallback')
    expect(result.reactions).toBe(4)
    expect(result.comments).toBe(1)
    expect(calls.length).toBe(1)
    expect(calls[0]).toContain('socialActions')
  })

  it('returns all-null public_fallback when the urn is unparseable under creator scope', async () => {
    const fetchStub = (async () => {
      throw new Error('should not be called')
    }) as unknown as typeof fetch
    const result = await fetchPostMetrics('tok', 'garbage', ['r_member_postAnalytics'], fetchStub)
    expect(result.source).toBe('public_fallback')
    expect(result.impressions).toBeNull()
  })

  it('uses ugc: entity prefix for a ugcPost URN under creator scope', async () => {
    const ugcUrn = 'urn:li:ugcPost:7000000000'
    const calls: string[] = []
    const fetchStub = (async (url: string) => {
      calls.push(url)
      return { ok: true, status: 200, json: async () => ({ elements: [{ value: 1 }] }) }
    }) as unknown as typeof fetch

    await fetchPostMetrics('tok', ugcUrn, ['r_member_postAnalytics'], fetchStub)

    expect(calls.length).toBe(CREATOR_POST_METRICS.length)
    expect(calls[0]).toContain('ugc%3Aurn%3Ali%3AugcPost%3A')
  })
})

describe('fetchFollowerCounts', () => {
  it('uses q=dateRange URL with start:(day: when dateRange is provided', async () => {
    const calls: string[] = []
    const fetchStub = (async (url: string) => {
      calls.push(url)
      return { ok: true, status: 200, json: async () => ({ elements: [] }) }
    }) as unknown as typeof fetch

    const dateRange = { startMs: Date.UTC(2026, 4, 1), endMs: Date.UTC(2026, 4, 31) }
    await fetchFollowerCounts('tok', dateRange, fetchStub)

    expect(calls.length).toBe(1)
    expect(calls[0]).toContain('memberFollowersCount?q=dateRange')
    expect(calls[0]).toContain('start:(day:')
  })

  it('uses q=me URL when no dateRange is provided', async () => {
    const calls: string[] = []
    const fetchStub = (async (url: string) => {
      calls.push(url)
      return { ok: true, status: 200, json: async () => ({ elements: [] }) }
    }) as unknown as typeof fetch

    await fetchFollowerCounts('tok', undefined, fetchStub)

    expect(calls.length).toBe(1)
    expect(calls[0]).toContain('memberFollowersCount?q=me')
  })

  it('returns [] when res.ok is false', async () => {
    const fetchStub = (async () => {
      return { ok: false, status: 403 }
    }) as unknown as typeof fetch

    const result = await fetchFollowerCounts('tok', undefined, fetchStub)
    expect(result).toEqual([])
  })
})

const sampleMetrics = {
  impressions: 5000,
  members_reached: 4200,
  reactions: 80,
  comments: 12,
  reshares: 5,
  saves: 9,
  link_clicks: 33,
  followers_gained: 7,
  profile_views_from_post: 21,
  source: 'creator_api' as const,
}

describe('buildPostsLatestUpdate', () => {
  it('maps metrics to the posts "latest" columns + provenance', () => {
    const at = '2026-05-31T12:00:00.000Z'
    expect(buildPostsLatestUpdate(sampleMetrics, at)).toEqual({
      impressions: 5000,
      reactions: 80,
      comments: 12,
      reshares: 5,
      saves: 9,
      link_clicks: 33,
      members_reached: 4200,
      followers_gained: 7,
      profile_views_from_post: 21,
      metric_source: 'creator_api',
      metrics_synced_at: at,
    })
  })

  it('omits null metric fields so we never overwrite a good value with null', () => {
    const at = '2026-05-31T12:00:00.000Z'
    const partial = { ...sampleMetrics, impressions: null, link_clicks: null }
    const update = buildPostsLatestUpdate(partial, at)
    expect('impressions' in update).toBe(false)
    expect('link_clicks' in update).toBe(false)
    expect(update.reactions).toBe(80)
    expect(update.metric_source).toBe('creator_api')
    expect(update.metrics_synced_at).toBe(at)
  })
})

describe('buildPostAnalyticsRow', () => {
  it('builds a full time-series row including age_minutes + source', () => {
    const row = buildPostAnalyticsRow({
      postId: 'post-1',
      userId: 'user-1',
      metrics: sampleMetrics,
      publishedAt: '2026-05-31T10:00:00.000Z',
      capturedAt: '2026-05-31T12:00:00.000Z',
    })
    expect(row).toEqual({
      post_id: 'post-1',
      user_id: 'user-1',
      age_minutes: 120,
      impressions: 5000,
      reactions: 80,
      comments: 12,
      reshares: 5,
      saves: 9,
      link_clicks: 33,
      members_reached: 4200,
      source: 'creator_api',
      captured_at: '2026-05-31T12:00:00.000Z',
    })
  })

  it('keeps nulls in the time-series row (a snapshot may legitimately be null)', () => {
    const row = buildPostAnalyticsRow({
      postId: 'p',
      userId: 'u',
      metrics: { ...sampleMetrics, impressions: null },
      publishedAt: null,
      capturedAt: '2026-05-31T12:00:00.000Z',
    })
    expect(row.impressions).toBeNull()
    expect(row.age_minutes).toBeNull()
  })
})
