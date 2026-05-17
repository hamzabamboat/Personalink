import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { google, sheets_v4 } from 'googleapis'

export const maxDuration = 60

const PLAN_PRICE: Record<string, number> = { starter: 999, standard: 2499, pro: 4999 }
const H_BG = { red: 43 / 255, green: 77 / 255, blue: 255 / 255 }   // #2B4DFF
const ALT_BG = { red: 240 / 255, green: 245 / 255, blue: 1 }        // #F0F5FF
const WHITE = { red: 1, green: 1, blue: 1 }
const GREEN = { red: 0.133, green: 0.545, blue: 0.133 }
const RED_C = { red: 0.8, green: 0.071, blue: 0.071 }
const GREY = { red: 0.5, green: 0.5, blue: 0.5 }

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
function mostCommon<T extends string | number>(arr: T[]): T | 'N/A' {
  if (!arr.length) return 'N/A'
  const counts = arr.reduce((acc, v) => { acc[String(v)] = (acc[String(v)] || 0) + 1; return acc }, {} as Record<string, number>)
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as T) ?? 'N/A'
}
function pct(n: number, total: number): string {
  if (!total) return '0.0%'
  return `${(n / total * 100).toFixed(1)}%`
}
function dropOff(stepN: number, stepPrev: number): string {
  if (stepPrev === 0) return '—'
  return `${((stepPrev - stepN) / stepPrev * 100).toFixed(1)}%`
}

// ── Dashboard helpers ────────────────────────────────────────────────────────

function rpt(sheetId: number, r1: number, r2: number, c1: number, c2: number, fmt: object, fields: string) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: r1, endRowIndex: r2, startColumnIndex: c1, endColumnIndex: c2 },
      cell: { userEnteredFormat: fmt },
      fields: `userEnteredFormat(${fields})`,
    },
  }
}

function mrg(sheetId: number, r1: number, r2: number, c1: number, c2: number) {
  return {
    mergeCells: {
      range: { sheetId, startRowIndex: r1, endRowIndex: r2, startColumnIndex: c1, endColumnIndex: c2 },
      mergeType: 'MERGE_ALL',
    },
  }
}

function colW(sheetId: number, col: number, px: number) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: 'COLUMNS', startIndex: col, endIndex: col + 1 },
      properties: { pixelSize: px },
      fields: 'pixelSize',
    },
  }
}

async function getOrCreateDashboardSheet(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' })
  const existing = meta.data.sheets?.find(s => s.properties?.title === '📊 Dashboard')
  if (existing) return existing.properties!.sheetId!
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: '📊 Dashboard', index: 0 } } }] },
  })
  return res.data.replies![0].addSheet!.properties!.sheetId!
}

// ── Main dashboard builder ───────────────────────────────────────────────────

async function buildDashboardSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  d: {
    now: Date
    users: Record<string, unknown>[]
    profiles: Record<string, unknown>[]
    posts: Record<string, unknown>[]
    subscriptions: Record<string, unknown>[]
    profileMap: Record<string, Record<string, unknown>>
    latestScoreMap: Record<string, number>
    activeUsers: Record<string, unknown>[]
    trialUsers: Record<string, unknown>[]
    accessCodeUsers: Record<string, unknown>[]
    mrr: number
    netNewMrr: number
    churnedThisMonth: Record<string, unknown>[]
    planCounts: { starter: number; standard: number; pro: number }
    starterMrr: number; standardMrr: number; proMrr: number
    trialToPaidRate: number
    totalPosts: number
    publishedPostsCount: number
    avgLinkedinScore: number
    autopilotUsers: number; approvalUsers: number; suggestUsers: number
    mostUsedPillar: string | number
    mostPopularDay: string | number
    mostPopularHour: string
    totalProfiles: number
    step1: number; step2: number; step3: number; step4: number
    step5: number; step6: number; step7: number; completedPayment: number
    startOfMonth: string; sevenDaysAgo: string; startOfToday: string
    churnedTodayCount: number; churnedWeekCount: number; churnedAllTime: number
    newUsersThisWeek: number; newUsersThisMonth: number
    postsTodayCount: number; postsWeekCount: number; postsMonthCount: number
    postCountMonthMap: Record<string, number>
    allTimeRevenue: number
    avgRevenuePerUser: number
  }
): Promise<void> {
  const sid = await getOrCreateDashboardSheet(sheets, spreadsheetId)

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "'📊 Dashboard'!A1:Z200" })

  // Unmerge everything first so old merges don't interfere
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        unmergeCells: {
          range: { sheetId: sid, startRowIndex: 0, endRowIndex: 200, startColumnIndex: 0, endColumnIndex: 20 },
        },
      }],
    },
  })

  const {
    now, users, profileMap, latestScoreMap,
    activeUsers, trialUsers, accessCodeUsers, mrr, netNewMrr, churnedThisMonth,
    planCounts, starterMrr, standardMrr, proMrr, trialToPaidRate,
    totalPosts, publishedPostsCount, avgLinkedinScore,
    autopilotUsers, approvalUsers, suggestUsers, mostUsedPillar, mostPopularDay, mostPopularHour,
    totalProfiles, step1, step2, step3, step4, step5, step6, step7, completedPayment,
    startOfMonth, sevenDaysAgo, startOfToday,
    churnedTodayCount, churnedWeekCount, churnedAllTime,
    newUsersThisWeek, newUsersThisMonth,
    postsTodayCount, postsWeekCount, postsMonthCount,
    postCountMonthMap, allTimeRevenue, avgRevenuePerUser,
  } = d

  // IST timestamp
  const istMs = now.getTime() + (5 * 60 + 30) * 60 * 1000
  const ist = new Date(istMs)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const istStr = `Last updated: ${pad2(ist.getUTCDate())}/${pad2(ist.getUTCMonth() + 1)}/${ist.getUTCFullYear()} ${pad2(ist.getUTCHours())}:${pad2(ist.getUTCMinutes())} IST`

  const totalPlanUsers = activeUsers.length + accessCodeUsers.length
  const newUsersToday = users.filter(u => (u.created_at as string) >= startOfToday).length
  const netToday = newUsersToday - churnedTodayCount
  const netWeek = newUsersThisWeek - churnedWeekCount
  const netMonth = newUsersThisMonth - churnedThisMonth.length
  const netAllTime = users.length - churnedAllTime
  const avgPostsPerUserMonth = users.length > 0 ? (postsMonthCount / users.length).toFixed(1) : '0'

  // Top 10 users by posts this month
  const topUsers = users
    .map(u => {
      const p = profileMap[u.id as string] || {}
      return {
        name: String(p.name || u.linkedin_name || ''),
        email: String(u.email || ''),
        plan: capitalize(String(p.plan || 'starter')),
        postsThisMonth: postCountMonthMap[u.id as string] || 0,
        score: latestScoreMap[u.id as string] || 0,
        joined: fmtDate(new Date(u.created_at as string)),
      }
    })
    .sort((a, b) => b.postsThisMonth - a.postsThisMonth)
    .slice(0, 10)

  // Recent 10 signups
  const recentSignups = users.slice(0, 10).map(u => {
    const p = profileMap[u.id as string] || {}
    return {
      name: String(p.name || u.linkedin_name || ''),
      email: String(u.email || ''),
      plan: capitalize(String(p.plan || 'starter')),
      status: capitalize(String(u.subscription_status || '')),
      joined: fmtDate(new Date(u.created_at as string)),
    }
  })

  // Last 12 months history
  const monthlyHistory: Array<{ label: string; newUsers: number; activeCount: number; mrrVal: number }> = []
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const label = mStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    const newInMonth = users.filter(u => { const d = new Date(u.created_at as string); return d >= mStart && d < mEnd }).length
    const activeInMonth = users.filter(u => {
      const d = new Date(u.created_at as string)
      return d < mEnd && u.subscription_status === 'active'
    })
    const mrrVal = activeInMonth.reduce((sum, u) => sum + (PLAN_PRICE[(profileMap[u.id as string] as Record<string, unknown>)?.plan as string || 'starter'] || 0), 0)
    monthlyHistory.push({ label, newUsers: newInMonth, activeCount: activeInMonth.length, mrrVal })
  }

  // ── Build rows (0-indexed, 10 cols A-J) ────────────────────────────────────
  const NC = 10
  const p = (row: (string | number)[]): (string | number)[] => {
    while (row.length < NC) row.push('')
    return row.slice(0, NC)
  }

  const rows: (string | number)[][] = []

  // 0: Title
  rows.push(p(['PersonaLink Analytics Dashboard']))
  // 1: Last updated
  rows.push(p([istStr]))
  // 2: spacer
  rows.push(p([]))

  // 3: Section 1 labels (8 cols)
  rows.push(p(['Active Users', 'Trial Users', 'Total All Time Users', 'Churned This Month', 'MRR (₹)', 'All Time Revenue (₹)', 'Avg Revenue Per User (₹)', 'Net New MRR This Month (₹)']))
  // 4: Section 1 values
  rows.push(p([activeUsers.length, trialUsers.length, users.length, churnedThisMonth.length, fmtInr(mrr), fmtInr(allTimeRevenue), fmtInr(avgRevenuePerUser), fmtInr(netNewMrr)]))
  // 5: spacer
  rows.push(p([]))

  // 6: Plan Breakdown title
  rows.push(p(['Plan Breakdown']))
  // 7: Plan header
  rows.push(p(['Plan', 'Active Users', 'Monthly Revenue', '% of Total Users', '% of Total MRR']))
  // 8: Starter
  rows.push(p(['Starter ₹999', `${planCounts.starter} users`, fmtInr(starterMrr), pct(planCounts.starter, totalPlanUsers), pct(starterMrr, mrr)]))
  // 9: Standard
  rows.push(p(['Standard ₹2,500', `${planCounts.standard} users`, fmtInr(standardMrr), pct(planCounts.standard, totalPlanUsers), pct(standardMrr, mrr)]))
  // 10: Pro
  rows.push(p(['Pro ₹5,000', `${planCounts.pro} users`, fmtInr(proMrr), pct(planCounts.pro, totalPlanUsers), pct(proMrr, mrr)]))
  // 11: Access Code
  rows.push(p(['Access Code', `${accessCodeUsers.length} users`, fmtInr(0), pct(accessCodeUsers.length, totalPlanUsers), '—']))
  // 12: TOTAL
  rows.push(p(['TOTAL', `${totalPlanUsers} users`, fmtInr(mrr), '100%', '100%']))
  // 13: spacer
  rows.push(p([]))

  // 14: Growth title
  rows.push(p(['Growth & Retention']))
  // 15: Growth header
  rows.push(p(['', 'Today', 'This Week', 'This Month', 'All Time']))
  // 16: New Signups
  rows.push(p(['New Signups', newUsersToday, newUsersThisWeek, newUsersThisMonth, users.length]))
  // 17: Churned
  rows.push(p(['Churned', churnedTodayCount, churnedWeekCount, churnedThisMonth.length, churnedAllTime]))
  // 18: Net Growth
  rows.push(p(['Net Growth', netToday, netWeek, netMonth, netAllTime]))
  // 19: Posts Generated
  rows.push(p(['Posts Generated', postsTodayCount, postsWeekCount, postsMonthCount, totalPosts]))
  // 20: Trial → Paid
  rows.push(p(['Trial → Paid Rate', '—', '—', fmtPct(trialToPaidRate), fmtPct(trialToPaidRate)]))
  // 21: spacer
  rows.push(p([]))

  // 22: Engagement title
  rows.push(p(['Engagement & Usage']))
  // 23: Engagement header
  rows.push(p(['Metric', 'Value']))
  // 24–33: engagement rows
  rows.push(p(['Total Posts Generated All Time', totalPosts]))
  rows.push(p(['Total Posts Published All Time', publishedPostsCount]))
  rows.push(p(['Average Posts Per User Per Month', avgPostsPerUserMonth]))
  rows.push(p(['Average LinkedIn Score', `${avgLinkedinScore}/100`]))
  rows.push(p(['Users On Autopilot', autopilotUsers]))
  rows.push(p(['Users On Approval Mode', approvalUsers]))
  rows.push(p(['Users On Suggest Mode', suggestUsers]))
  rows.push(p(['Most Popular Content Pillar', String(mostUsedPillar)]))
  rows.push(p(['Most Popular Posting Day', String(mostPopularDay)]))
  rows.push(p(['Most Popular Posting Time', mostPopularHour]))
  // 34: spacer
  rows.push(p([]))

  // 35: Onboarding title
  rows.push(p(['Onboarding Funnel']))
  // 36: Funnel header
  rows.push(p(['Step', 'Users Reached', 'Drop Off', 'Completion Rate']))
  // 37–45: funnel steps
  rows.push(p(['Started Onboarding', totalProfiles, '—', '100%']))
  rows.push(p(['Basic Info', step1, dropOff(step1, totalProfiles), pct(step1, totalProfiles)]))
  rows.push(p(['MCQ Quiz', step2, dropOff(step2, step1), pct(step2, totalProfiles)]))
  rows.push(p(['Writing Sample', step3, dropOff(step3, step2), pct(step3, totalProfiles)]))
  rows.push(p(['Content Pillars', step4, dropOff(step4, step3), pct(step4, totalProfiles)]))
  rows.push(p(['Control Preference', step5, dropOff(step5, step4), pct(step5, totalProfiles)]))
  rows.push(p(['Image Brief', step6, dropOff(step6, step5), pct(step6, totalProfiles)]))
  rows.push(p(['Plan Selection', step7, dropOff(step7, step6), pct(step7, totalProfiles)]))
  rows.push(p(['Completed Payment', completedPayment, dropOff(completedPayment, step7), pct(completedPayment, totalProfiles)]))
  // 46: spacer
  rows.push(p([]))

  // 47: Top users title
  rows.push(p(['Top 10 Most Active Users']))
  // 48: Top users header
  rows.push(p(['Name', 'Email', 'Plan', 'Posts This Month', 'LinkedIn Score', 'Joined']))
  // 49–58: top 10
  for (let i = 0; i < 10; i++) {
    const u = topUsers[i]
    rows.push(u
      ? p([u.name, u.email, u.plan, u.postsThisMonth, u.score ? `${u.score}/100` : '—', u.joined])
      : p(['—', '—', '—', '—', '—', '—'])
    )
  }
  // 59: spacer
  rows.push(p([]))

  // 60: Recent signups title
  rows.push(p(['Last 10 Signups']))
  // 61: Recent signups header
  rows.push(p(['Name', 'Email', 'Plan', 'Status', 'Joined Date']))
  // 62–71: recent 10
  for (let i = 0; i < 10; i++) {
    const u = recentSignups[i]
    rows.push(u
      ? p([u.name, u.email, u.plan, u.status, u.joined])
      : p(['—', '—', '—', '—', '—'])
    )
  }
  // 72: spacer
  rows.push(p([]))

  // 73: Monthly history title
  rows.push(p(['Monthly Revenue History']))
  // 74: Revenue header
  rows.push(p(['Month', 'New Users', 'Active Users', 'MRR', 'Growth vs Previous Month']))
  // 75–86: 12 months
  for (let i = 0; i < monthlyHistory.length; i++) {
    const m = monthlyHistory[i]
    const prev = monthlyHistory[i - 1]
    let growth = '—'
    if (prev && prev.newUsers > 0) {
      const g = Math.round((m.newUsers - prev.newUsers) / prev.newUsers * 100)
      growth = g >= 0 ? `+${g}%` : `${g}%`
    }
    rows.push(p([m.label, m.newUsers, m.activeCount, fmtInr(m.mrrVal), growth]))
  }

  // Write all values in one call
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'📊 Dashboard'!A1",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  })

  // ── Formatting requests ─────────────────────────────────────────────────────
  const fmtReqs: object[] = []

  const HDR = { backgroundColor: H_BG, textFormat: { foregroundColor: WHITE, bold: true }, horizontalAlignment: 'CENTER' }
  const HDR_F = 'backgroundColor,textFormat,horizontalAlignment'
  const SEC_TITLE = { textFormat: { foregroundColor: H_BG, bold: true, underline: true, fontSize: 11 } }

  // Tab color + freeze row 1
  fmtReqs.push({
    updateSheetProperties: {
      properties: { sheetId: sid, tabColorStyle: { rgbColor: H_BG }, gridProperties: { frozenRowCount: 1 } },
      fields: 'tabColorStyle,gridProperties.frozenRowCount',
    },
  })

  // Row 0: Title — merge + format
  fmtReqs.push(mrg(sid, 0, 1, 0, NC))
  fmtReqs.push(rpt(sid, 0, 1, 0, NC, {
    backgroundColor: H_BG,
    textFormat: { foregroundColor: WHITE, bold: true, fontSize: 16 },
    horizontalAlignment: 'CENTER',
    verticalAlignment: 'MIDDLE',
  }, 'backgroundColor,textFormat,horizontalAlignment,verticalAlignment'))

  // Row 1: Last updated — grey
  fmtReqs.push(rpt(sid, 1, 2, 0, NC, { textFormat: { foregroundColor: GREY, fontSize: 10 } }, 'textFormat'))

  // Row 3: Section 1 labels
  fmtReqs.push(rpt(sid, 3, 4, 0, 8, HDR, HDR_F))
  // Row 4: Section 1 values — large bold centred
  fmtReqs.push(rpt(sid, 4, 5, 0, 8, { textFormat: { bold: true, fontSize: 14 }, horizontalAlignment: 'CENTER' }, 'textFormat,horizontalAlignment'))

  // Row 6: Plan Breakdown title
  fmtReqs.push(rpt(sid, 6, 7, 0, 5, SEC_TITLE, 'textFormat'))
  // Row 7: Plan header
  fmtReqs.push(rpt(sid, 7, 8, 0, 5, HDR, HDR_F))
  // Rows 8–11: alternating
  for (let i = 0; i < 4; i++) fmtReqs.push(rpt(sid, 8 + i, 9 + i, 0, 5, { backgroundColor: i % 2 === 0 ? WHITE : ALT_BG }, 'backgroundColor'))
  // Row 12: TOTAL bold
  fmtReqs.push(rpt(sid, 12, 13, 0, 5, { textFormat: { bold: true }, backgroundColor: ALT_BG }, 'textFormat,backgroundColor'))

  // Row 14: Growth title
  fmtReqs.push(rpt(sid, 14, 15, 0, 5, SEC_TITLE, 'textFormat'))
  // Row 15: Growth header
  fmtReqs.push(rpt(sid, 15, 16, 0, 5, HDR, HDR_F))
  // Rows 16–20: alternating
  for (let i = 0; i < 5; i++) fmtReqs.push(rpt(sid, 16 + i, 17 + i, 0, 5, { backgroundColor: i % 2 === 0 ? WHITE : ALT_BG }, 'backgroundColor'))
  // Net Growth (row 18) per-cell color
  const netVals = [netToday, netWeek, netMonth, netAllTime]
  for (let ci = 0; ci < 4; ci++) {
    fmtReqs.push(rpt(sid, 18, 19, ci + 1, ci + 2, { textFormat: { foregroundColor: netVals[ci] >= 0 ? GREEN : RED_C, bold: true } }, 'textFormat'))
  }

  // Row 22: Engagement title
  fmtReqs.push(rpt(sid, 22, 23, 0, 2, SEC_TITLE, 'textFormat'))
  // Row 23: Engagement header
  fmtReqs.push(rpt(sid, 23, 24, 0, 2, HDR, HDR_F))
  // Rows 24–33: alternating
  for (let i = 0; i < 10; i++) fmtReqs.push(rpt(sid, 24 + i, 25 + i, 0, 2, { backgroundColor: i % 2 === 0 ? WHITE : ALT_BG }, 'backgroundColor'))

  // Row 35: Onboarding title
  fmtReqs.push(rpt(sid, 35, 36, 0, 4, SEC_TITLE, 'textFormat'))
  // Row 36: Funnel header
  fmtReqs.push(rpt(sid, 36, 37, 0, 4, HDR, HDR_F))
  // Rows 37–45: alternating
  for (let i = 0; i < 9; i++) fmtReqs.push(rpt(sid, 37 + i, 38 + i, 0, 4, { backgroundColor: i % 2 === 0 ? WHITE : ALT_BG }, 'backgroundColor'))

  // Row 47: Top users title
  fmtReqs.push(rpt(sid, 47, 48, 0, 6, SEC_TITLE, 'textFormat'))
  // Row 48: Top users header
  fmtReqs.push(rpt(sid, 48, 49, 0, 6, HDR, HDR_F))
  // Rows 49–58: alternating
  for (let i = 0; i < 10; i++) fmtReqs.push(rpt(sid, 49 + i, 50 + i, 0, 6, { backgroundColor: i % 2 === 0 ? WHITE : ALT_BG }, 'backgroundColor'))

  // Row 60: Recent signups title
  fmtReqs.push(rpt(sid, 60, 61, 0, 5, SEC_TITLE, 'textFormat'))
  // Row 61: Recent signups header
  fmtReqs.push(rpt(sid, 61, 62, 0, 5, HDR, HDR_F))
  // Rows 62–71: alternating
  for (let i = 0; i < 10; i++) fmtReqs.push(rpt(sid, 62 + i, 63 + i, 0, 5, { backgroundColor: i % 2 === 0 ? WHITE : ALT_BG }, 'backgroundColor'))

  // Row 73: Monthly history title
  fmtReqs.push(rpt(sid, 73, 74, 0, 5, SEC_TITLE, 'textFormat'))
  // Row 74: Revenue header
  fmtReqs.push(rpt(sid, 74, 75, 0, 5, HDR, HDR_F))
  // Rows 75–86: alternating + growth colour
  for (let i = 0; i < 12; i++) {
    fmtReqs.push(rpt(sid, 75 + i, 76 + i, 0, 5, { backgroundColor: i % 2 === 0 ? WHITE : ALT_BG }, 'backgroundColor'))
    if (i > 0) {
      const g = monthlyHistory[i].newUsers - monthlyHistory[i - 1].newUsers
      fmtReqs.push(rpt(sid, 75 + i, 76 + i, 4, 5, { textFormat: { foregroundColor: g >= 0 ? GREEN : RED_C } }, 'textFormat'))
    }
  }

  // Column widths
  const widths = [260, 240, 160, 140, 160, 160, 130, 220, 100, 100]
  widths.forEach((w, i) => fmtReqs.push(colW(sid, i, w)))

  // Title row height
  fmtReqs.push({
    updateDimensionProperties: {
      range: { sheetId: sid, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 52 },
      fields: 'pixelSize',
    },
  })

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: fmtReqs } })
}

// ── Other sheet helpers ──────────────────────────────────────────────────────

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
    spreadsheetId, range: `'${title}'!A1`,
    valueInputOption: 'RAW', requestBody: { values: [headers] },
  })

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
            cell: { userEnteredFormat: { backgroundColor: H_BG, textFormat: { foregroundColor: WHITE, bold: true } } },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
      ],
    },
  })
  return sheetId
}

async function appendRow(sheets: sheets_v4.Sheets, spreadsheetId: string, title: string, row: (string | number)[]) {
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `'${title}'!A1`,
    valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  })
}

// ── POST handler ─────────────────────────────────────────────────────────────

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

  const [usersRes, profilesRes, postsRes, voiceNotesRes, storyBankRes, scoresRes, subscriptionsRes, imageBriefsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, linkedin_name, email, subscription_status, subscription_count, created_at, updated_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('user_profiles').select('user_id, name, plan, posts_used_this_month, posts_limit, control_preference, content_pillarss, mcq_answers, writing_sample, onboarding_completed_at, industry, tone'),
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
  for (const s of scores) { if (!latestScoreMap[s.user_id]) latestScoreMap[s.user_id] = s.score }

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const activeUsers = users.filter(u => u.subscription_status === 'active')
  const trialUsers = users.filter(u => u.subscription_status === 'trialing' || u.subscription_status === 'trial')
  const accessCodeUsers = users.filter(u => u.subscription_status === 'access_code')

  const mrr = activeUsers.reduce((sum, u) => sum + (PLAN_PRICE[profileMap[u.id]?.plan || 'starter'] || 0), 0)

  const allTimeRevenue = users.reduce((sum, u) => {
    const sc = (u.subscription_count as number) || 0
    if (sc > 0 || u.subscription_status === 'active') {
      return sum + (PLAN_PRICE[profileMap[u.id]?.plan || 'starter'] || 0) * Math.max(1, sc)
    }
    return sum
  }, 0)
  const avgRevenuePerUser = activeUsers.length > 0 ? Math.round(mrr / activeUsers.length) : 0

  const newUsersToday = users.filter(u => u.created_at >= startOfToday)
  const postsTodayCount = posts.filter(p => p.created_at >= startOfToday).length
  const postsWeekCount = posts.filter(p => p.created_at >= sevenDaysAgo).length
  const postsMonthCount = posts.filter(p => p.created_at >= startOfMonth).length
  const publishedToday = posts.filter(p => p.published_at && p.published_at >= startOfToday)
  const dau = users.filter(u => u.updated_at >= startOfToday)

  const churnedThisMonth = subscriptions.filter(
    s => (s.status === 'cancelled' || s.status === 'expired') && s.updated_at && s.updated_at >= startOfMonth
  )
  const churnedToday = subscriptions.filter(
    s => (s.status === 'cancelled' || s.status === 'expired') && s.updated_at && s.updated_at >= startOfToday
  )
  const churnedWeek = subscriptions.filter(
    s => (s.status === 'cancelled' || s.status === 'expired') && s.updated_at && s.updated_at >= sevenDaysAgo
  )
  const churnedAllTime = subscriptions.filter(s => s.status === 'cancelled' || s.status === 'expired').length

  const newPaidToday = subscriptions.filter(s => s.status === 'active' && s.start_date && s.start_date >= startOfToday)
  const revenueToday = newPaidToday.reduce((sum, s) => sum + (PLAN_PRICE[profileMap[s.user_id]?.plan || 'starter'] || 0), 0)

  const newPaidThisMonth = subscriptions.filter(s => s.status === 'active' && s.start_date && s.start_date >= startOfMonth)
  const newMrr = newPaidThisMonth.reduce((sum, s) => sum + (PLAN_PRICE[profileMap[s.user_id]?.plan || 'starter'] || 0), 0)
  const churnedMrr = churnedThisMonth.reduce((sum, s) => sum + (PLAN_PRICE[profileMap[s.user_id]?.plan || 'starter'] || 0), 0)
  const netNewMrr = newMrr - churnedMrr

  const newUsersThisWeek = users.filter(u => u.created_at >= sevenDaysAgo).length
  const newUsersThisMonth = users.filter(u => u.created_at >= startOfMonth).length

  const postCountMap: Record<string, number> = {}
  const postCountMonthMap: Record<string, number> = {}
  for (const p of posts) {
    postCountMap[p.user_id] = (postCountMap[p.user_id] || 0) + 1
    if (p.created_at >= startOfMonth) postCountMonthMap[p.user_id] = (postCountMonthMap[p.user_id] || 0) + 1
  }

  const planCounts = { starter: 0, standard: 0, pro: 0 }
  for (const u of activeUsers) {
    const plan = profileMap[u.id]?.plan || 'starter'
    if (plan in planCounts) planCounts[plan as keyof typeof planCounts]++
  }
  const starterMrr = planCounts.starter * PLAN_PRICE.starter
  const standardMrr = planCounts.standard * PLAN_PRICE.standard
  const proMrr = planCounts.pro * PLAN_PRICE.pro
  const mostPopularPlan = Object.entries(planCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'starter'

  const totalPosts = posts.length
  const publishedPosts = posts.filter(p => p.status === 'published')
  const avgPostsPerUser = users.length > 0 ? (totalPosts / users.length).toFixed(1) : '0'
  const scoreValues = Object.values(latestScoreMap)
  const avgLinkedinScore = scoreValues.length > 0 ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0
  const autopilotUsers = profiles.filter(p => p.control_preference === 'autopilot').length
  const approvalUsers = profiles.filter(p => p.control_preference === 'approve' || !p.control_preference).length
  const suggestUsers = profiles.filter(p => p.control_preference === 'suggest').length
  const allPillars = profiles.flatMap(p => (p.content_pillarss as string[] | null) || [])
  const mostUsedPillar = mostCommon(allPillars)

  const totalProfiles = profiles.length
  const step1 = profiles.filter(p => p.name && p.industry).length
  const step2 = profiles.filter(p => p.mcq_answers && Object.keys(p.mcq_answers || {}).length > 0).length
  const step3 = profiles.filter(p => p.writing_sample && (p.writing_sample as string).length > 0).length
  const step4 = profiles.filter(p => (p.content_pillarss as string[] | null)?.length).length
  const step5 = profiles.filter(p => p.control_preference).length
  const imageBriefUserIds = new Set(imageBriefs.map(ib => ib.user_id))
  const step6 = profiles.filter(p => imageBriefUserIds.has(p.user_id)).length
  const step7 = profiles.filter(p => p.onboarding_completed_at).length
  const completedPayment = activeUsers.length

  const publishedAll = posts.filter(p => p.status === 'published' || p.published_at)
  const postHours = publishedAll.map(p => p.published_at || p.scheduled_at).filter(Boolean).map(ts => new Date(ts!).getHours())
  const mostPopularHour = postHours.length > 0 ? `${mostCommon(postHours)}:00` : 'N/A'
  const postDays = publishedAll.map(p => p.published_at || p.scheduled_at).filter(Boolean).map(ts => new Date(ts!).toLocaleDateString('en-IN', { weekday: 'long' }))
  const mostPopularDay = mostCommon(postDays)

  const totalActivePaid = activeUsers.length
  const trialToPaidRate = users.length > 0 ? (totalActivePaid / users.length) * 100 : 0

  // Week 1 / Month 1 retention
  const usersWeek1Window = users.filter(u => u.created_at >= fourteenDaysAgo && u.created_at < sevenDaysAgo)
  const week1Retained = usersWeek1Window.filter(u => u.subscription_status !== 'inactive' && u.subscription_status !== 'cancelled')
  const week1Retention = usersWeek1Window.length > 0 ? Math.round((week1Retained.length / usersWeek1Window.length) * 100) : 0
  const usersMonth1 = users.filter(u => u.created_at < thirtyDaysAgo)
  const month1Retained = usersMonth1.filter(u => u.subscription_status !== 'inactive' && u.subscription_status !== 'cancelled')
  const month1Retention = usersMonth1.length > 0 ? Math.round((month1Retained.length / usersMonth1.length) * 100) : 0

  const postsByUser: Record<string, string> = {}
  for (const p of posts) { if (!postsByUser[p.user_id] || p.created_at < postsByUser[p.user_id]) postsByUser[p.user_id] = p.created_at }
  const daysToFirstPost = users.filter(u => postsByUser[u.id]).map(u => (new Date(postsByUser[u.id]).getTime() - new Date(u.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
  const avgDaysToFirstPost = daysToFirstPost.length > 0 ? (daysToFirstPost.reduce((a, b) => a + b, 0) / daysToFirstPost.length).toFixed(1) : '0'

  const accessCodeUsersTotal = users.filter(u => (u.subscription_count as number) > 0 && u.subscription_status === 'active').length
  const accessCodeToPayConversion = accessCodeUsers.length > 0 ? Math.round((accessCodeUsersTotal / (accessCodeUsers.length + accessCodeUsersTotal)) * 100) : 0

  const newUsersLastWeek = users.filter(u => u.created_at >= fourteenDaysAgo && u.created_at < sevenDaysAgo).length
  const growthVsLastWeek = newUsersLastWeek > 0 ? Math.round(((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek) * 100) : 0
  const thirtyDaysAgo2 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const newUsersLastMonth = users.filter(u => u.created_at >= thirtyDaysAgo2 && u.created_at < startOfMonth).length
  const growthVsLastMonth = newUsersLastMonth > 0 ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100) : 0

  // Content analytics
  const voiceNotePosts = posts.filter(p => p.source === 'voice_note').length
  const storyBankPosts = posts.filter(p => p.source === 'story_bank').length
  const aiGenPosts = posts.filter(p => !p.source || p.source === 'ai_generated').length
  const postsWithImages = posts.filter(p => (p as Record<string, unknown>).image_urls && ((p as Record<string, unknown>).image_urls as string[])?.length > 0).length
  const avgPostLength = posts.length > 0 ? Math.round(posts.reduce((sum, p) => sum + (p.content?.length || 0), 0) / posts.length) : 0
  const usedPillars = posts.filter(p => p.content_pillar).map(p => p.content_pillar as string)
  const mostUsedContentPillar = mostCommon(usedPillars)
  const tones = profiles.filter(p => p.tone).map(p => p.tone as string)
  const mostCommonTone = mostCommon(tones)
  const topics = profiles.flatMap(p => (p as Record<string, unknown>).topics as string[] || [])
  const topTopic = mostCommon(topics)

  // Weekly summary data
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const newUsersWeek = users.filter(u => u.created_at >= sevenDaysAgo).length
  const churnedWeekCount2 = subscriptions.filter(s => (s.status === 'cancelled' || s.status === 'expired') && s.updated_at && s.updated_at >= sevenDaysAgo).length
  const revenueThisWeek = newPaidThisMonth.reduce((sum, s) => s.start_date && s.start_date >= sevenDaysAgo ? sum + (PLAN_PRICE[profileMap[s.user_id]?.plan || 'starter'] || 0) : sum, 0)
  const dayPostCounts: Record<string, number> = {}
  for (const p of posts.filter(q => q.created_at >= sevenDaysAgo)) {
    const day = new Date(p.created_at).toLocaleDateString('en-IN', { weekday: 'long' })
    dayPostCounts[day] = (dayPostCounts[day] || 0) + 1
  }
  const bestDay = Object.entries(dayPostCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  const sourceCounts: Record<string, number> = {}
  for (const p of posts) sourceCounts[p.source || 'ai_generated'] = (sourceCounts[p.source || 'ai_generated'] || 0) + 1
  const mostPopularFeature = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace('_', ' ') || 'N/A'
  const usersAtLimit = profiles.filter(p => p.posts_used_this_month >= (p.posts_limit || 12)).length

  // ── Build Dashboard Sheet FIRST ──────────────────────────────────────────────
  await buildDashboardSheet(sheets, sheetId, {
    now, users, profiles, posts, subscriptions, profileMap, latestScoreMap,
    activeUsers, trialUsers, accessCodeUsers, mrr, netNewMrr, churnedThisMonth,
    planCounts, starterMrr, standardMrr, proMrr, trialToPaidRate,
    totalPosts, publishedPostsCount: publishedPosts.length, avgLinkedinScore,
    autopilotUsers, approvalUsers, suggestUsers,
    mostUsedPillar, mostPopularDay, mostPopularHour,
    totalProfiles, step1, step2, step3, step4, step5, step6, step7, completedPayment,
    startOfMonth, sevenDaysAgo, startOfToday,
    churnedTodayCount: churnedToday.length, churnedWeekCount: churnedWeek.length, churnedAllTime,
    newUsersThisWeek, newUsersThisMonth,
    postsTodayCount, postsWeekCount, postsMonthCount,
    postCountMonthMap, allTimeRevenue, avgRevenuePerUser,
  })

  // ── Sheet 2: Users ────────────────────────────────────────────────────────────
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
      spreadsheetId: sheetId, range: 'Users!A2',
      valueInputOption: 'USER_ENTERED', requestBody: { values: userRows },
    })
  }

  // ── Sheet 3: Daily Analytics ──────────────────────────────────────────────────
  const dailyHeaders = ['Date', 'Total Users', 'New Users Today', 'Active Subscribers', 'Trial Users', 'Access Code Users', 'Churned Today', 'Posts Generated Today', 'Posts Published Today', 'Daily Active Users', 'MRR', 'Revenue Today']
  await ensureSheet(sheets, sheetId, 'Daily Analytics', dailyHeaders)
  await appendRow(sheets, sheetId, 'Daily Analytics', [
    dateLabel, users.length, newUsersToday.length, activeUsers.length, trialUsers.length,
    accessCodeUsers.length, churnedToday.length, postsTodayCount, publishedToday.length, dau.length,
    fmtInr(mrr), fmtInr(revenueToday),
  ])

  // ── Sheet 4: Plan Breakdown ───────────────────────────────────────────────────
  const churnByPlan = { starter: 0, standard: 0, pro: 0 }
  for (const s of churnedThisMonth) {
    const plan = profileMap[s.user_id]?.plan || 'starter'
    if (plan in churnByPlan) churnByPlan[plan as keyof typeof churnByPlan]++
  }
  const planHeaders = ['Date', 'Starter Count', 'Standard Count', 'Pro Count', 'Starter MRR', 'Standard MRR', 'Pro MRR', 'Total MRR', 'Starter Churn This Month', 'Standard Churn This Month', 'Pro Churn This Month', 'Most Popular Plan']
  await ensureSheet(sheets, sheetId, 'Plan Breakdown', planHeaders)
  await appendRow(sheets, sheetId, 'Plan Breakdown', [
    dateLabel, planCounts.starter, planCounts.standard, planCounts.pro,
    fmtInr(starterMrr), fmtInr(standardMrr), fmtInr(proMrr), fmtInr(mrr),
    churnByPlan.starter, churnByPlan.standard, churnByPlan.pro, capitalize(mostPopularPlan),
  ])

  // ── Sheet 5: Engagement Analytics ────────────────────────────────────────────
  const engagementHeaders = ['Date', 'Total Posts Generated', 'Total Posts Published', 'Total Voice Notes', 'Total Story Bank Entries', 'Avg Posts Per User', 'Avg LinkedIn Score', 'Users Who Hit Post Limit', 'Users On Autopilot', 'Users On Approval', 'Users On Suggest', 'Most Used Content Pillar']
  await ensureSheet(sheets, sheetId, 'Engagement Analytics', engagementHeaders)
  await appendRow(sheets, sheetId, 'Engagement Analytics', [
    dateLabel, totalPosts, publishedPosts.length, voiceNotes.length, storyEntries.length,
    avgPostsPerUser, avgLinkedinScore, usersAtLimit, autopilotUsers, approvalUsers, suggestUsers, mostUsedPillar,
  ])

  // ── Sheet 6: Retention & Growth ───────────────────────────────────────────────
  const retentionHeaders = ['Date', 'Week 1 Retention %', 'Month 1 Retention %', 'Avg Days To First Post', 'Trial To Paid Conversion %', 'Access Code To Paid %', 'Net New MRR', 'Growth Rate vs Last Week %', 'Growth Rate vs Last Month %']
  await ensureSheet(sheets, sheetId, 'Retention & Growth', retentionHeaders)
  await appendRow(sheets, sheetId, 'Retention & Growth', [
    dateLabel, fmtPct(week1Retention), fmtPct(month1Retention), avgDaysToFirstPost,
    fmtPct(trialToPaidRate), fmtPct(accessCodeToPayConversion), fmtInr(netNewMrr),
    fmtPct(growthVsLastWeek), fmtPct(growthVsLastMonth),
  ])

  // ── Sheet 7: Weekly Summary ───────────────────────────────────────────────────
  const weeklyHeaders = ['Week Starting', 'New Users', 'Churned Users', 'Net Growth', 'Total Posts Generated', 'Total Revenue', 'Best Performing Day', 'Most Popular Feature', 'Avg LinkedIn Score']
  await ensureSheet(sheets, sheetId, 'Weekly Summary', weeklyHeaders)
  await appendRow(sheets, sheetId, 'Weekly Summary', [
    fmtDate(weekStart), newUsersWeek, churnedWeekCount2, newUsersWeek - churnedWeekCount2,
    postsWeekCount, fmtInr(revenueThisWeek), bestDay, capitalize(mostPopularFeature), avgLinkedinScore,
  ])

  // ── Sheet 8: Onboarding Funnel ────────────────────────────────────────────────
  const funnelHeaders = ['Date', 'Started Onboarding', 'Completed Step 1 (Basic Info)', 'Completed Step 2 (MCQ)', 'Completed Step 3 (Writing Sample)', 'Completed Step 4 (Content Pillars)', 'Completed Step 5 (Control Pref)', 'Completed Step 6 (Image Brief)', 'Completed Step 7 (Plan Selection)', 'Completed Payment', 'Drop Off Step 1→2', 'Drop Off Step 2→3', 'Drop Off Step 3→4', 'Drop Off Step 4→5', 'Drop Off Step 5→6', 'Drop Off Step 6→7', 'Drop Off Step 7→Payment']
  await ensureSheet(sheets, sheetId, 'Onboarding Funnel', funnelHeaders)
  await appendRow(sheets, sheetId, 'Onboarding Funnel', [
    dateLabel, totalProfiles, step1, step2, step3, step4, step5, step6, step7, completedPayment,
    dropOff(step2, step1), dropOff(step3, step2), dropOff(step4, step3),
    dropOff(step5, step4), dropOff(step6, step5), dropOff(step7, step6), dropOff(completedPayment, step7),
  ])

  // ── Sheet 9: Content Analytics ────────────────────────────────────────────────
  const contentHeaders = ['Date', 'Most Used Content Pillar', 'Most Common Post Tone', 'Avg Post Length (chars)', 'Posts With Images', 'Voice Note Posts', 'Story Bank Posts', 'AI Generated Posts', 'Most Popular Posting Time', 'Most Popular Posting Day', 'Top Topic Used']
  await ensureSheet(sheets, sheetId, 'Content Analytics', contentHeaders)
  await appendRow(sheets, sheetId, 'Content Analytics', [
    dateLabel, mostUsedContentPillar, mostCommonTone, avgPostLength,
    postsWithImages, voiceNotePosts, storyBankPosts, aiGenPosts,
    mostPopularHour, mostPopularDay, topTopic,
  ])

  return NextResponse.json({
    ok: true,
    synced_at: now.toISOString(),
    sheets_updated: 9,
    users_synced: userRows.length,
  })
}
