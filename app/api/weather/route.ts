/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createTimeoutSignal } from '@/lib/fetchWithTimeout'
import { LAT, LON } from '@/lib/location'


function windDir(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(normalized / 45) % 8]
}

function uvLabel(v: number): string {
  if (v <= 2)  return 'Low'
  if (v <= 5)  return 'Moderate'
  if (v <= 7)  return 'High'
  if (v <= 10) return 'Very High'
  return 'Extreme'
}

function fmtTime(unix: number, tzOffset: number): string {
  const d = new Date((unix + tzOffset) * 1000)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

function dewPoint(temp: number, humidity: number): number {
  return Math.round(temp - ((100 - humidity) / 5))
}

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export async function GET() {
  // Require authenticated session
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    console.error('[weather] OPENWEATHER_API_KEY not configured')
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }

  const { signal, clear } = createTimeoutSignal(8000)

  try {
    // Removed deprecated /data/2.5/uvi endpoint; only fetch current + forecast
    const [curRes, fcRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${apiKey}`,
        { signal, next: { revalidate: 300 } }),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=metric&cnt=40&appid=${apiKey}`,
        { signal, next: { revalidate: 300 } }),
    ])
    clear()

    if (!curRes.ok) throw new Error(`Current weather ${curRes.status}`)
    if (!fcRes.ok)  throw new Error(`Forecast ${fcRes.status}`)

    const [c, f] = await Promise.all([curRes.json(), fcRes.json()])

    const tzOffset: number = c.timezone ?? 0
    // UV index is not available from the /weather endpoint on free tier;
    // mark as null so the dashboard can show "N/A" instead of a misleading 0
    const uviVal: number | null = null

    return NextResponse.json({
      current: {
        temp:           Math.round(c.main.temp),
        feels_like:     Math.round(c.main.feels_like),
        temp_min:       Math.round(c.main.temp_min),
        temp_max:       Math.round(c.main.temp_max),
        description:    c.weather[0].description as string,
        icon:           c.weather[0].icon as string,
        humidity:       c.main.humidity as number,
        pressure:       c.main.pressure as number,
        visibility:     Math.round(((c.visibility as number) / 1000) * 10) / 10,
        wind_speed:     Math.round((c.wind.speed as number) * 3.6),
        wind_deg:       c.wind.deg as number,
        wind_direction: windDir(c.wind.deg as number),
        uv_index:       uviVal,
        uv_label:       uviVal !== null ? uvLabel(uviVal) : 'N/A',
        uv_unavailable: true,
        dew_point:      dewPoint(c.main.temp, c.main.humidity),
        sunrise:        fmtTime(c.sys.sunrise, tzOffset),
        sunset:         fmtTime(c.sys.sunset, tzOffset),
        city:           c.name as string,
      },
      forecast: (f.list as any[]).map(item => ({
        dt:          item.dt as number,
        date:        DAY[new Date((item.dt as number) * 1000).getDay()],
        temp_min:    Math.round(item.main.temp_min),
        temp_max:    Math.round(item.main.temp_max),
        description: item.weather[0].description as string,
        icon:        item.weather[0].icon as string,
        humidity:    item.main.humidity as number,
        wind_speed:  Math.round((item.wind.speed as number) * 3.6),
        pop:         Math.round(((item.pop as number) ?? 0) * 100),
      })),
    })
  } catch (err) {
    clear()
    console.error('[weather]', err)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json({ error: isAbort ? 'timeout' : 'upstream_error' }, { status: 503 })
  }
}
