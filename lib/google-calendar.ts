import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const CALENDAR_ID = 'primary'

// ─── Token management ────────────────────────────────────────────────────────

interface TokenRow {
  google_calendar_access_token: string | null
  google_calendar_refresh_token: string | null
  google_calendar_token_expires_at: string | null
}

/**
 * Returns a valid access token for the user, refreshing it if it has expired.
 * Returns null if the user hasn't connected Google Calendar.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expires_at')
    .eq('id', userId)
    .single<TokenRow>()

  if (error || !user?.google_calendar_refresh_token) return null

  const expiresAt = user.google_calendar_token_expires_at
    ? new Date(user.google_calendar_token_expires_at)
    : null
  const isExpired = !expiresAt || expiresAt <= new Date(Date.now() + 60_000)

  if (!isExpired && user.google_calendar_access_token) {
    return user.google_calendar_access_token
  }

  // Refresh the token
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.google_calendar_refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[gcal] token refresh failed:', res.status, body)
    // If refresh fails (revoked), clear the tokens
    await supabaseAdmin
      .from('users')
      .update({
        google_calendar_access_token: null,
        google_calendar_refresh_token: null,
        google_calendar_token_expires_at: null,
      })
      .eq('id', userId)
    return null
  }

  const tokens = await res.json()
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabaseAdmin
    .from('users')
    .update({
      google_calendar_access_token: tokens.access_token,
      google_calendar_token_expires_at: newExpiry,
    })
    .eq('id', userId)

  return tokens.access_token as string
}

// ─── Calendar event helpers ──────────────────────────────────────────────────

function buildEventBody(post: { content: string; scheduled_at: string }) {
  const start = new Date(post.scheduled_at)
  const end = new Date(start.getTime() + 30 * 60 * 1000) // 30-min block

  const snippet = post.content.slice(0, 60).replace(/\n/g, ' ')

  return {
    summary: `📝 ${snippet}${post.content.length > 60 ? '…' : ''}`,
    description: post.content,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    colorId: '7', // peacock/teal
  }
}

export async function createCalendarEvent(
  userId: string,
  post: { id: string; content: string; scheduled_at: string }
): Promise<string | null> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return null

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${CALENDAR_ID}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventBody(post)),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[gcal] createEvent failed:', res.status, body)
    return null
  }

  const event = await res.json()
  return event.id as string
}

export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  post: { content: string; scheduled_at: string }
): Promise<boolean> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return false

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${CALENDAR_ID}/events/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildEventBody(post)),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[gcal] updateEvent failed:', res.status, body)
    return false
  }
  return true
}

export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return false

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${CALENDAR_ID}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  // 410 Gone means already deleted — treat as success
  if (!res.ok && res.status !== 410) {
    console.error('[gcal] deleteEvent failed:', res.status)
    return false
  }
  return true
}

/**
 * Upsert a post to Google Calendar and persist the event ID to the DB.
 * Safe to call fire-and-forget; errors are swallowed with a console warning.
 */
export async function syncPostToCalendar(
  userId: string,
  post: { id: string; content: string; scheduled_at: string; google_calendar_event_id?: string | null }
): Promise<void> {
  try {
    let eventId = post.google_calendar_event_id ?? null

    if (eventId) {
      const updated = await updateCalendarEvent(userId, eventId, post)
      if (!updated) {
        // Event may have been deleted from Google side — recreate it
        eventId = await createCalendarEvent(userId, post)
      }
    } else {
      eventId = await createCalendarEvent(userId, post)
    }

    if (eventId && eventId !== post.google_calendar_event_id) {
      await supabaseAdmin
        .from('posts')
        .update({ google_calendar_event_id: eventId })
        .eq('id', post.id)
    }
  } catch (err) {
    console.warn('[gcal] syncPostToCalendar error (non-fatal):', err)
  }
}

/**
 * Delete a post's calendar event and clear the event ID from the DB.
 * Safe to call fire-and-forget.
 */
export async function removePostFromCalendar(
  userId: string,
  post: { id: string; google_calendar_event_id?: string | null }
): Promise<void> {
  if (!post.google_calendar_event_id) return
  try {
    await deleteCalendarEvent(userId, post.google_calendar_event_id)
    await supabaseAdmin
      .from('posts')
      .update({ google_calendar_event_id: null })
      .eq('id', post.id)
  } catch (err) {
    console.warn('[gcal] removePostFromCalendar error (non-fatal):', err)
  }
}
