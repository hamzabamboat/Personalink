import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { google, sheets_v4 } from 'googleapis'

export const maxDuration = 60

const PLAN_PRICE: Record<string, number> = { starter: 999, standard: 2500, pro: 5000 }
const HEADER_BG = { red: 11 / 255, green: 69 / 255, blue: 139 / 255 } // #0B458B

function adminAuth(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value
  const header = request.headers.get('x-admin-secret')
  const cron = request.headers.get('authorization')
  return (
    cookie === process.env.ADMIN_SECRET ||
    header === process.env.ADMIN_SECRET ||
    cron === `Bearer ${process.env.CRON_SECRET}`
  )
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtInr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}
function fmtPct(n: number): string {
  return `${Math.round(n)}%`
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

async function ensureSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
  headers: string[],
): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' })
  const existing = meta.data.sheets?.find(s => s.properties?.title === title)
  if (existing) return existing.properties!.sheetId!

  const createRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title } } }] },
  })
  const sheetId = createRes.data.replies![0].addSheet!.properties!.sheetId!

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  })

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: HEADER_BG,
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
      ],
    },
  })

  return sheetId
}

async function appendRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
  row: (string | number)[],
) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${title}'!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  })
}

function mostCommon<T extends string | number>(arr: T[]): T | 'N/A' {
  if (!arr.length) return 'N/A'
  const counts = arr.reduce((acc, v) => { acc[String(v)] = (acc[String(v)] || 0) + 1; return acc }, {} as Record<string, number>)
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as T) ?? 'N/A'
}

export async function POST(request: NextRequest) {
  if (!adminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheetId = process.env.GOOGLE_SHEETS_ID
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!sheetId || !serviceAccountKey) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_ID or GOOGLE_SERVICE_ACCOUNT_KEY not set' }, { status: 500 })
  }

  const credentials = JSON.parse(serviceAccountKey)
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  const sheets = google.sheets({ version: 'v4', auth })

  const now = new Date()
  const dateLabel = fmtDate(now)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const [
    usersRes,
    profilesRes,
    postsRes,
    voiceNotesRes,
    storyBankRes,
    scoresRes,
    subscriptionsRes,
    imageBriefsRes,
  ] = await Promise.all([
    supabaseAdmin.from('users').select('id, linkedin_name, email, subscription_status, subscription_count, created_at, updated_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('user_profiles').select('user_id, name, plan, posts_used_this_month, posts_limit, control_preference, content_pillars, mcq_answers, writing_sample, onboarding_completed_at, industry, tone'),
    supabaseAdmin.from('posts').select('id, user_id, status, source, content_pillar, created_at, published_at, content, scheduled_at'),
    supabaseAdmin.from('voice_notes').select('id, user_id, created_at'),
    supabaseAdmin.from('story_bank').select('id, user_id, created_at'),
    supabaseAdmin.from('linkedin_scores').select('user_id, score, recorded_at').order('recorded_at', { ascending: false }),
    supabaseAdmin.from('subscriptions').select('user_id, status, plan_id, start_date, updated_at'),
    supabaseAdmin.from('image_briefs').select('user_id'),
  ])

  const users = usersRes.data || []
  const profiles = profilesRes.data || []
  const posts = postsRes.data || []
  const voiceNotes = voiceNotesRes.data || []
  const storyEntries = storyBankRes.data || []
  const scores = scoresRes.data || []
  const subscriptions = subscriptionsRes.data || []
  const imageBriefs = imageBriefsRes.data || []

  const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]))
  const latestScoreMap: Record<string, number> = {}
  for (const s of scores) {
    if (!latestScoreMap[s.user_id]) latestScoreMap[s.user_id] = s.score
  }

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const activeUsers = users.filter(u => u.subscription_status === 'active')
  const trialUsers = users.filter(u => u.subscription_status === 'trialing' || u.subscription_status === 'trial')
  const accessCodeUsers = users.filter(u => u.subscription_status === 'access_code')

  const mrr = activeUsers.reduce((sum, u) => sum + (PLAN_PRICE[profileMap[u.id]?.plan || 'starter'] || 0), 0)

  const newUsersToday = users.filter(u => u.created_at >= startOfToday)
  const postsToday = posts.filter(p => p.created_at >= startOfToday)
  const publishedToday = posts.filter(p => p.published_at && p.published_at >= startOfToday)
  const dau = users.filter(u => u.updated_at >= startOfToday)

  const churnedToday = subscriptions.filter(
    s => (s.status === 'cancelled' || s.status === 'expired') && s.updated_at && s.updated_at >= startOfToday
  )

  const newPaidToday = subscriptions.filter(s => s.status === 'active' && s.start_date && s.start_date >= startOfToday)
  const revenueToday = newPaidToday.reduce((sum, s) => {
    const userId = s.user_id
    const plan = profileMap[userId]?.plan || 'starter'
    return sum + (PLAN_PRICE[plan] || 0)
  }, 0)

  // ── Sheet 1: Users ──────────────────────────────────────────────────────────
  const postCountMap: Record<string, number> = {}
  for (const p of posts) postCountMap[p.user_id] = (postCountMap[p.user_id] || 0) + 1

  const usersHeaders = ['Name', 'Email', 'Plan', 'Status', 'Joined', 'Posts Total', 'Posts This Month', 'Subscriptions Count', 'Last Active']
  await ensureSheet(sheets, sheetId, 'Users', usersHeaders)
  await sheets.spreadsheets.values.clear({ spreadsheetId: sheetId, range: 'Users!A2:Z' })
  const userRows = users.map((u: Record<string, unknown>) => {
    const p = profileMap[u.id as string] || {}
    return [
      String((p.name as string) ?? u.linkedin_name ?? ''),
      String(u.email ?? ''),
      String(p.plan ?? 'starter'),
      String(u.subscription_status ?? ''),
      fmtDate(new Date(u.created_at as string)),
      postCountMap[u.id as string] ?? 0,
      p.posts_used_this_month ?? 0,
      Number(u.subscription_count ?? 0),
      fmtDate(new Date(u.updated_at as string)),
    ]
  })
  if (userRows.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Users!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: userRows },
    })
  }

  // ── Sheet 2: Daily Analytics ────────────────────────────────────────────────
  const dailyHeaders = [
    'Date', 'Total Users', 'New Users Today', 'Active Subscribers', 'Trial Users',
    'Access Code Users', 'Churned Today', 'Posts Generated Today', 'Posts Published Today',
    'Daily Active Users', 'MRR', 'Revenue Today',
  ]
  await ensureSheet(sheets, sheetId, 'Daily Analytics', dailyHeaders)
  await appendRow(sheets, sheetId, 'Daily Analytics', [
    dateLabel,
    users.length,
    newUsersToday.length,
    activeUsers.length,
    trialUsers.length,
    accessCodeUsers.length,
    churnedToday.length,
    postsToday.length,
    publishedToday.length,
    dau.length,
    fmtInr(mrr),
    fmtInr(revenueToday),
  ])

  // ── Sheet 3: Plan Breakdown ──────────────────────────────────────────────────
  const planCounts = { starter: 0, standard: 0, pro: 0 }
  for (const u of activeUsers) {
    const plan = profileMap[u.id]?.plan || 'starter'
    if (plan in planCounts) planCounts[plan as keyof typeof planCounts]++
  }
  const churnedThisMonth = subscriptions.filter(
    s => (s.status === 'cancelled' || s.status === 'expired') && s.updated_at && s.updated_at >= startOfMonth
  )
  const churnByPlan = { starter: 0, standard: 0, pro: 0 }
  for (const s of churnedThisMonth) {
    const plan = profileMap[s.user_id]?.plan || 'starter'
    if (plan in churnByPlan) churnByPlan[plan as keyof typeof churnByPlan]++
  }
  const starterMrr = planCounts.starter * PLAN_PRICE.starter
  const standardMrr = planCounts.standard * PLAN_PRICE.standard
  const proMrr = planCounts.pro * PLAN_PRICE.pro
  const mostPopularPlan = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'starter'

  const planHeaders = [
    'Date', 'Starter Count', 'Standard Count', 'Pro Count',
    'Starter MRR', 'Standard MRR', 'Pro MRR', 'Total MRR',
    'Starter Churn This Month', 'Standard Churn This Month', 'Pro Churn This Month', 'Most Popular Plan',
  ]
  await ensureSheet(sheets, sheetId, 'Plan Breakdown', planHeaders)
  await appendRow(sheets, sheetId, 'Plan Breakdown', [
    dateLabel,
    planCounts.starter, planCounts.standard, planCounts.pro,
    fmtInr(starterMrr), fmtInr(standardMrr), fmtInr(proMrr), fmtInr(mrr),
    churnByPlan.starter, churnByPlan.standard, churnByPlan.pro,
    capitalize(mostPopularPlan),
  ])

  // ── Sheet 4: Engagement Analytics ────────────────────────────────────────────
  const totalPosts = posts.length
  const publishedPosts = posts.filter(p => p.status === 'published')
  const avgPostsPerUser = users.length > 0 ? (totalPosts / users.length).toFixed(1) : '0'
  const scoreValues = Object.values(latestScoreMap)
  const avgLinkedinScore = scoreValues.length > 0
    ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
    : 0
  const usersAtLimit = profiles.filter(p => p.posts_used_this_month >= (p.posts_limit || 12)).length
  const autopilotUsers = profiles.filter(p => p.control_preference === 'autopilot').length
  const approvalUsers = profiles.filter(p => p.control_preference === 'approve' || !p.control_preference).length
  const suggestUsers = profiles.filter(p => p.control_preference === 'suggest').length
  const allPillars = profiles.flatMap(p => (p.content_pillars as string[] | null) || [])
  const mostUsedPillar = mostCommon(allPillars)

  const engagementHeaders = [
    'Date', 'Total Posts Generated', 'Total Posts Published', 'Total Voice Notes',
    'Total Story Bank Entries', 'Avg Posts Per User', 'Avg LinkedIn Score',
    'Users Who Hit Post Limit', 'Users On Autopilot', 'Users On Approval', 'Users On Suggest',
    'Most Used Content Pillar',
  ]
  await ensureSheet(sheets, sheetId, 'Engagement Analytics', engagementHeaders)
  await appendRow(sheets, sheetId, 'Engagement Analytics', [
    dateLabel, totalPosts, publishedPosts.length, voiceNotes.length, storyEntries.length,
    avgPostsPerUser, avgLinkedinScore, usersAtLimit,
    autopilotUsers, approvalUsers, suggestUsers, mostUsedPillar,
  ])

  // ── Sheet 5: Retention & Growth ───────────────────────────────────────────────
  // Week 1 retention: users created 7-14 days ago who are still active (not inactive/cancelled)
  const usersWeek1Window = users.filter(u => u.created_at >= fourteenDaysAgo && u.created_at < sevenDaysAgo)
  const week1Retained = usersWeek1Window.filter(u => u.subscription_status !== 'inactive' && u.subscription_status !== 'cancelled')
  const week1Retention = usersWeek1Window.length > 0 ? Math.round((week1Retained.length / usersWeek1Window.length) * 100) : 0

  // Month 1 retention: users created 30+ days ago who are still active
  const usersMonth1 = users.filter(u => u.created_at < thirtyDaysAgo)
  const month1Retained = usersMonth1.filter(u => u.subscription_status !== 'inactive' && u.subscription_status !== 'cancelled')
  const month1Retention = usersMonth1.length > 0 ? Math.round((month1Retained.length / usersMonth1.length) * 100) : 0

  // Avg days to first post
  const postsByUser: Record<string, string> = {}
  for (const p of posts) {
    if (!postsByUser[p.user_id] || p.created_at < postsByUser[p.user_id]) {
      postsByUser[p.user_id] = p.created_at
    }
  }
  const daysToFirstPost = users
    .filter(u => postsByUser[u.id])
    .map(u => (new Date(postsByUser[u.id]).getTime() - new Date(u.created_at).getTime()) / (1000 * 60 * 60 * 24))
  const avgDaysToFirstPost = daysToFirstPost.length > 0
    ? (daysToFirstPost.reduce((a, b) => a + b, 0) / daysToFirstPost.length).toFixed(1)
    : '0'

  // Trial to paid conversion
  const totalUsersCount = users.length
  const totalActivePaid = activeUsers.length
  const trialToPaidRate = totalUsersCount > 0 ? Math.round((totalActivePaid / totalUsersCount) * 100) : 0

  // Access code to paid conversion
  const accessCodeUsersTotal = users.filter(u => u.subscription_count > 0 && u.subscription_status === 'active').length
  const accessCodeToPayConversion = accessCodeUsers.length > 0
    ? Math.round((accessCodeUsersTotal / (accessCodeUsers.length + accessCodeUsersTotal)) * 100) : 0

  // Net new MRR: new paid subs this month revenue - churned this month revenue
  const newPaidThisMonth = subscriptions.filter(s => s.status === 'active' && s.start_date && s.start_date >= startOfMonth)
  const newMrr = newPaidThisMonth.reduce((sum, s) => sum + (PLAN_PRICE[profileMap[s.user_id]?.plan || 'starter'] || 0), 0)
  const churnedMrr = churnedThisMonth.reduce((sum, s) => sum + (PLAN_PRICE[profileMap[s.user_id]?.plan || 'starter'] || 0), 0)
  const netNewMrr = newMrr - churnedMrr

  // Growth rate vs last week / last month
  const newUsersThisWeek = users.filter(u => u.created_at >= sevenDaysAgo).length
  const newUsersLastWeek = users.filter(u => u.created_at >= fourteenDaysAgo && u.created_at < sevenDaysAgo).length
  const growthVsLastWeek = newUsersLastWeek > 0 ? Math.round(((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek) * 100) : 0

  const newUsersThisMonth = users.filter(u => u.created_at >= startOfMonth).length
  const thirtyDaysAgo2 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const newUsersLastMonth = users.filter(u => u.created_at >= thirtyDaysAgo2 && u.created_at < startOfMonth).length
  const growthVsLastMonth = newUsersLastMonth > 0 ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100) : 0

  const retentionHeaders = [
    'Date', 'Week 1 Retention %', 'Month 1 Retention %', 'Avg Days To First Post',
    'Trial To Paid Conversion %', 'Access Code To Paid %', 'Net New MRR',
    'Growth Rate vs Last Week %', 'Growth Rate vs Last Month %',
  ]
  await ensureSheet(sheets, sheetId, 'Retention & Growth', retentionHeaders)
  await appendRow(sheets, sheetId, 'Retention & Growth', [
    dateLabel,
    fmtPct(week1Retention), fmtPct(month1Retention),
    avgDaysToFirstPost, fmtPct(trialToPaidRate), fmtPct(accessCodeToPayConversion),
    fmtInr(netNewMrr), fmtPct(growthVsLastWeek), fmtPct(growthVsLastMonth),
  ])

  // ── Sheet 6: Weekly Summary ────────────────────────────────────────────────────
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const newUsersWeek = users.filter(u => u.created_at >= sevenDaysAgo).length
  const churnedWeek = subscriptions.filter(
    s => (s.status === 'cancelled' || s.status === 'expired') && s.updated_at && s.updated_at >= sevenDaysAgo
  ).length
  const postsThisWeek = posts.filter(p => p.created_at >= sevenDaysAgo).length
  const revenueThisWeek = newPaidThisMonth.reduce((sum, s) => {
    if (s.start_date && s.start_date >= sevenDaysAgo) {
      return sum + (PLAN_PRICE[profileMap[s.user_id]?.plan || 'starter'] || 0)
    }
    return sum
  }, 0)

  // Best performing day: day with most posts created this week
  const dayPostCounts: Record<string, number> = {}
  for (const p of posts.filter(q => q.created_at >= sevenDaysAgo)) {
    const day = new Date(p.created_at).toLocaleDateString('en-IN', { weekday: 'long' })
    dayPostCounts[day] = (dayPostCounts[day] || 0) + 1
  }
  const bestDay = Object.entries(dayPostCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

  // Most popular feature
  const sourceCounts: Record<string, number> = {}
  for (const p of posts) sourceCounts[p.source || 'ai_generated'] = (sourceCounts[p.source || 'ai_generated'] || 0) + 1
  const mostPopularFeature = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace('_', ' ') || 'N/A'

  const weeklyHeaders = [
    'Week Starting', 'New Users', 'Churned Users', 'Net Growth',
    'Total Posts Generated', 'Total Revenue', 'Best Performing Day',
    'Most Popular Feature', 'Avg LinkedIn Score',
  ]
  await ensureSheet(sheets, sheetId, 'Weekly Summary', weeklyHeaders)
  await appendRow(sheets, sheetId, 'Weekly Summary', [
    fmtDate(weekStart),
    newUsersWeek, churnedWeek, newUsersWeek - churnedWeek,
    postsThisWeek, fmtInr(revenueThisWeek), bestDay,
    capitalize(mostPopularFeature), avgLinkedinScore,
  ])

  // ── Sheet 7: Onboarding Funnel ────────────────────────────────────────────────
  const totalProfiles = profiles.length
  const step1 = profiles.filter(p => p.name && p.industry).length
  const step2 = profiles.filter(p => p.mcq_answers && Object.keys(p.mcq_answers || {}).length > 0).length
  const step3 = profiles.filter(p => p.writing_sample && (p.writing_sample as string).length > 0).length
  const step4 = profiles.filter(p => (p.content_pillars as string[] | null)?.length).length
  const step5 = profiles.filter(p => p.control_preference).length
  const imageBriefUserIds = new Set(imageBriefs.map(ib => ib.user_id))
  const step6 = profiles.filter(p => imageBriefUserIds.has(p.user_id)).length
  const step7 = profiles.filter(p => p.onboarding_completed_at).length
  const completedPayment = activeUsers.length

  function dropOff(stepN: number, stepPrev: number): string {
    if (stepPrev === 0) return '0%'
    return fmtPct(((stepPrev - stepN) / stepPrev) * 100)
  }

  const funnelHeaders = [
    'Date', 'Started Onboarding', 'Completed Step 1 (Basic Info)', 'Completed Step 2 (MCQ)',
    'Completed Step 3 (Writing Sample)', 'Completed Step 4 (Content Pillars)',
    'Completed Step 5 (Control Pref)', 'Completed Step 6 (Image Brief)',
    'Completed Step 7 (Plan Selection)', 'Completed Payment',
    'Drop Off Step 1→2', 'Drop Off Step 2→3', 'Drop Off Step 3→4',
    'Drop Off Step 4→5', 'Drop Off Step 5→6', 'Drop Off Step 6→7', 'Drop Off Step 7→Payment',
  ]
  await ensureSheet(sheets, sheetId, 'Onboarding Funnel', funnelHeaders)
  await appendRow(sheets, sheetId, 'Onboarding Funnel', [
    dateLabel, totalProfiles,
    step1, step2, step3, step4, step5, step6, step7, completedPayment,
    dropOff(step2, step1), dropOff(step3, step2), dropOff(step4, step3),
    dropOff(step5, step4), dropOff(step6, step5), dropOff(step7, step6), dropOff(completedPayment, step7),
  ])

  // ── Sheet 8: Content Analytics ────────────────────────────────────────────────
  const publishedAll = posts.filter(p => p.status === 'published' || p.published_at)
  const postsWithImages = posts.filter(p => (p as Record<string, unknown>).image_urls && ((p as Record<string, unknown>).image_urls as string[])?.length > 0).length
  const voiceNotePosts = posts.filter(p => p.source === 'voice_note').length
  const storyBankPosts = posts.filter(p => p.source === 'story_bank').length
  const aiGenPosts = posts.filter(p => !p.source || p.source === 'ai_generated').length

  const avgPostLength = posts.length > 0
    ? Math.round(posts.reduce((sum, p) => sum + (p.content?.length || 0), 0) / posts.length)
    : 0

  const usedPillars = posts.filter(p => p.content_pillar).map(p => p.content_pillar as string)
  const mostUsedContentPillar = mostCommon(usedPillars)

  const tones = profiles.filter(p => p.tone).map(p => p.tone as string)
  const mostCommonTone = mostCommon(tones)

  // Most popular posting hour & day (from published_at or scheduled_at)
  const postHours = publishedAll
    .map(p => p.published_at || p.scheduled_at)
    .filter(Boolean)
    .map(ts => new Date(ts!).getHours())
  const mostPopularHour = postHours.length > 0 ? `${mostCommon(postHours)}:00` : 'N/A'

  const postDays = publishedAll
    .map(p => p.published_at || p.scheduled_at)
    .filter(Boolean)
    .map(ts => new Date(ts!).toLocaleDateString('en-IN', { weekday: 'long' }))
  const mostPopularDay = mostCommon(postDays)

  const topics = profiles.flatMap(p => (p as Record<string, unknown>).topics as string[] || [])
  const topTopic = mostCommon(topics)

  const contentHeaders = [
    'Date', 'Most Used Content Pillar', 'Most Common Post Tone', 'Avg Post Length (chars)',
    'Posts With Images', 'Voice Note Posts', 'Story Bank Posts', 'AI Generated Posts',
    'Most Popular Posting Time', 'Most Popular Posting Day', 'Top Topic Used',
  ]
  await ensureSheet(sheets, sheetId, 'Content Analytics', contentHeaders)
  await appendRow(sheets, sheetId, 'Content Analytics', [
    dateLabel, mostUsedContentPillar, mostCommonTone, avgPostLength,
    postsWithImages, voiceNotePosts, storyBankPosts, aiGenPosts,
    mostPopularHour, mostPopularDay, topTopic,
  ])

  return NextResponse.json({
    ok: true,
    synced_at: now.toISOString(),
    sheets_updated: 8,
    users_synced: userRows.length,
  })
}
