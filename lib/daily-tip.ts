// Daily "tip of the day" selection.
//
// The regular tips rotate one-per-day through a list, so any single tip only
// recurs every TIPS.length days. The engagement-loop reminder is important for
// profile growth, so it must surface on a FIXED cadence (at least once every
// few days) regardless of how long the rotation list grows. We force it every
// Nth day and rotate the regular tips on the remaining days.

export const GROWTH_TIP =
  "Don't just post — accept your pending connections, reply to every comment, and comment on a few others' posts daily. Engagement out earns engagement in."

// Force GROWTH_TIP at least this often. With N = 4, any window of 4 consecutive
// days is guaranteed to include the growth tip (4 consecutive integers always
// contain a multiple of 4), i.e. it shows at least once every 3–4 days.
export const GROWTH_TIP_EVERY_N_DAYS = 4

/**
 * Pick the tip for a given day-of-year. On every Nth day it returns the growth
 * tip; on all other days it rotates through `tips`. Pure + deterministic so the
 * cadence guarantee can be unit-tested.
 */
export function selectTipOfDay(
  dayOfYear: number,
  tips: string[],
  growthTip: string = GROWTH_TIP,
  everyNDays: number = GROWTH_TIP_EVERY_N_DAYS,
): string {
  if (everyNDays > 0 && dayOfYear % everyNDays === 0) return growthTip
  return tips.length > 0 ? tips[dayOfYear % tips.length] : growthTip
}
