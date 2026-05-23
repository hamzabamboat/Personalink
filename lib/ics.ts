/**
 * Minimal iCalendar (RFC 5545) generator for the posting-schedule feed.
 * Produces a subscription feed that Apple Calendar, Outlook, Google Calendar,
 * and any other calendar app can subscribe to. Pure string building — no deps.
 */

export type IcsPost = {
  id: string
  content: string
  scheduled_at: string | null
  status?: string | null
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Format a Date as a UTC iCal timestamp: YYYYMMDDTHHMMSSZ */
function toIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/** Escape text per RFC 5545 (backslash, semicolon, comma, newlines). */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Fold long content lines to <=75 octets with CRLF + space, per spec. */
function fold(line: string): string {
  if (line.length <= 73) return line
  const chunks: string[] = []
  let rest = line
  let first = true
  while (rest.length > 0) {
    const size = first ? 73 : 72
    chunks.push((first ? '' : ' ') + rest.slice(0, size))
    rest = rest.slice(size)
    first = false
  }
  return chunks.join('\r\n')
}

export function buildIcs(posts: IcsPost[], opts?: { name?: string; description?: string }): string {
  const name = opts?.name ?? 'PersonaLink Posts'
  const description = opts?.description ?? 'Your scheduled LinkedIn posts'
  const now = toIcsUtc(new Date())

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PersonaLink//Posting Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${escapeText(name)}`),
    fold(`X-WR-CALDESC:${escapeText(description)}`),
    'X-PUBLISHED-TTL:PT1H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  ]

  for (const post of posts) {
    if (!post.scheduled_at) continue
    const start = new Date(post.scheduled_at)
    if (isNaN(start.getTime())) continue
    const end = new Date(start.getTime() + 30 * 60 * 1000)

    const firstLine = post.content.split('\n').find(l => l.trim()) || 'LinkedIn post'
    const snippet = firstLine.slice(0, 70) + (firstLine.length > 70 ? '…' : '')
    const statusLabel = post.status === 'published' ? '✅ Posted' : '📝 Scheduled'

    lines.push(
      'BEGIN:VEVENT',
      `UID:${post.id}@personalink`,
      `DTSTAMP:${now}`,
      `DTSTART:${toIcsUtc(start)}`,
      `DTEND:${toIcsUtc(end)}`,
      fold(`SUMMARY:${escapeText(`${statusLabel}: ${snippet}`)}`),
      fold(`DESCRIPTION:${escapeText(post.content)}`),
      `STATUS:${post.status === 'published' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
