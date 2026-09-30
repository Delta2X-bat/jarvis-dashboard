import { amsterdamIsoDate } from './date'

/**
 * Counts the current consecutive-day streak from a set of YYYY-MM-DD date strings.
 * Anchors "today"/"yesterday" to the Rotterdam/Amsterdam calendar (via
 * amsterdamIsoDate) so the streak agrees with the rest of the dashboard, which
 * stores and buckets all logged dates by Amsterdam local day.
 */
export function calcStreak(dates: string[]): number {
  if (!dates.length) return 0
  const set = new Set(dates)
  const dayStr = (offset: number) =>
    amsterdamIsoDate(new Date(Date.now() - offset * 86_400_000))
  let start = 0
  if (!set.has(dayStr(0))) {
    if (!set.has(dayStr(1))) return 0
    start = 1
  }
  let streak = 0
  while (set.has(dayStr(start + streak))) streak++
  return streak
}
