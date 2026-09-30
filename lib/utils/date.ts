/**
 * Formats a Date as YYYY-MM-DD using the LOCAL calendar date.
 * Use this whenever you need an ISO date string from a Date object produced
 * by local arithmetic (e.g. setDate(d.getDate() ± 1)).
 * Do NOT use new Date(str).toISOString().slice(0,10) for local dates — it
 * returns the UTC date, which shifts by a day in UTC+ timezones.
 */
export function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const amsDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' })

/**
 * Returns a YYYY-MM-DD date string in the Rotterdam/Amsterdam local calendar for
 * the given instant (default: now). This is the SINGLE source of truth for "what
 * day is it" — used by both the server (page.tsx) and every client write handler
 * so stored `logged_date` values and read-side day buckets always agree, even in
 * the 00:00–02:00 window where the UTC date is still the previous day.
 * (en-CA formats a Date as YYYY-MM-DD.)
 */
export function amsterdamIsoDate(d: Date = new Date()): string {
  return amsDateFmt.format(d)
}
