import { NextResponse } from 'next/server'
import { FALLBACK_RAW } from '@/app/dashboard/types'

// Static data — skip serverless invocation on every request
export const dynamic = 'force-static'

/**
 * Returns raw calendar events — status is computed client-side from the browser's
 * local clock, so "now/next/past/upcoming" is always accurate.
 *
 * The event data is the single FALLBACK_RAW constant in app/dashboard/types.ts.
 * The client also falls back to FALLBACK_RAW if this fetch fails, so both paths
 * render identical demo data (no duplicate hardcoded copies).
 *
 * To integrate real Google Calendar:
 * 1. Store OAuth2 tokens in Supabase (user_calendar_tokens table)
 * 2. Fetch tokens for the authenticated user
 * 3. Call https://www.googleapis.com/calendar/v3/calendars/primary/events
 *    with Authorization: Bearer <access_token>
 * 4. Map the response events to the CalendarEventRaw shape in types.ts, and add
 *    an auth check here (drop `force-static` first — see the other API routes).
 */
export async function GET() {
  return NextResponse.json({ events: FALLBACK_RAW })
}
