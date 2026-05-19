/**
 * Compute the next N available posting slots for a user.
 *
 * Respects preferred_days (day-of-week names), preferred_post_hour, and
 * timezone from the user profile. Slots that already have a post scheduled
 * on that calendar date are skipped (pass takenDateStrings for this).
 *
 * If the current month runs out of slots the function spills into the next
 * month so callers always get the requested count (or as many as possible).
 */
export function buildScheduleSlots(
  now: Date,
  count: number,
  preferredHour: number,
  preferredDays: string[],
  takenDateStrings: Set<string>,
  timezone: string,
): Date[] {
  const slots: Date[] = []

  // Determine whether the preferred hour has already passed today in the user's timezone
  const userNowStr = now.toLocaleString('en-US', { timeZone: timezone })
  const userNow = new Date(userNowStr)
  const userHour = userNow.getHours()

  function fillMonth(year: number, month: number, startDay: number) {
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // First pass — preferred days only
    for (let day = startDay; day <= daysInMonth && slots.length < count; day++) {
      const slotLocal = new Date(year, month, day, preferredHour, 0, 0)
      const dateStr = slotLocal.toDateString()
      if (takenDateStrings.has(dateStr)) continue
      const dayName = slotLocal.toLocaleDateString('en-US', { weekday: 'long' })
      if (!preferredDays.length || preferredDays.includes(dayName)) {
        slots.push(slotLocal)
        takenDateStrings.add(dateStr) // mark taken so next slots skip it
      }
    }

    // Second pass — any remaining day to fill up to count
    for (let day = startDay; day <= daysInMonth && slots.length < count; day++) {
      const slotLocal = new Date(year, month, day, preferredHour, 0, 0)
      const dateStr = slotLocal.toDateString()
      if (takenDateStrings.has(dateStr)) continue
      slots.push(slotLocal)
      takenDateStrings.add(dateStr)
    }
  }

  const startDay = userHour >= preferredHour ? now.getDate() + 1 : now.getDate()
  fillMonth(now.getFullYear(), now.getMonth(), startDay)

  // Spill into next month if needed
  if (slots.length < count) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    fillMonth(next.getFullYear(), next.getMonth(), 1)
  }

  return slots
}
