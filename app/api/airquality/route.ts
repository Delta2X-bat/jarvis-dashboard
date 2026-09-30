import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createTimeoutSignal } from '@/lib/fetchWithTimeout'
import { LAT, LON } from '@/lib/location'

type AQIStatus = 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Hazardous'

function calcAQI(pm25: number): number {
  const bp: [number, number, number, number][] = [
    [0,     12,    0,   50],
    [12.1,  35.4,  51,  100],
    [35.5,  55.4,  101, 150],
    [55.5,  150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 500.4, 301, 500],
  ]
  for (const [cL, cH, iL, iH] of bp) {
    if (pm25 >= cL && pm25 <= cH) {
      return Math.round(((iH - iL) / (cH - cL)) * (pm25 - cL) + iL)
    }
  }
  // EPA caps AQI at 500 for PM2.5 > 500.4
  return 500
}

function aqiStatus(aqi: number): AQIStatus {
  if (aqi <= 50)  return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy for Sensitive'
  if (aqi <= 200) return 'Unhealthy'
  return 'Hazardous'
}

export async function GET() {
  // Require authenticated session
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    console.error('[airquality] OPENWEATHER_API_KEY not configured')
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }

  const { signal, clear } = createTimeoutSignal(8000)

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${LAT}&lon=${LON}&appid=${apiKey}`,
      { signal, next: { revalidate: 300 } }
    )
    clear()

    if (!res.ok) throw new Error(`Air pollution API ${res.status}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    const item = data.list?.[0]
    if (!item) throw new Error('No air quality data returned')
    if (!item.components) throw new Error('Missing components in air quality data')

    const pm25 = Math.round((item.components.pm2_5 as number) * 10) / 10
    const pm10 = Math.round((item.components.pm10  as number) * 10) / 10
    const no2  = Math.round((item.components.no2   as number) * 10) / 10
    const aqi  = calcAQI(pm25)

    return NextResponse.json({
      aqi,
      pm25,
      pm10,
      no2,
      status:        aqiStatus(aqi),
      location_name: 'Rotterdam',
    })
  } catch (err) {
    clear()
    console.error('[airquality]', err)
    const isAbort = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json({ error: isAbort ? 'timeout' : 'upstream_error' }, { status: 503 })
  }
}
