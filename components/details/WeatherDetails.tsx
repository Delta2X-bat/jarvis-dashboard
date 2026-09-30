'use client'

import { useWeather } from '@/lib/hooks/useWeather'
import { useAirQuality } from '@/lib/hooks/useAirQuality'
import { dailyForecast, aqiColor } from '@/app/dashboard/helpers'
import { CardSkeleton, CardError } from '@/components/ui/DashboardPrimitives'

export function WeatherDetail({ wxData, wxLoading, wxError }: {
  wxData: ReturnType<typeof useWeather>['data']
  wxLoading: boolean
  wxError: string | null
}) {
  if (wxLoading) return <div style={{ padding: '40px 0' }}><CardSkeleton /></div>
  if (wxError) return <CardError msg={`Weather error: ${wxError}`} />
  if (!wxData) return <CardError />
  const c = wxData.current
  const daily = dailyForecast(wxData.forecast)
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">ROTTERDAM · 51.92°N 4.48°E</span>
        <h2 className="detail-title">{c.temp}°C · {c.description}</h2>
        <p className="detail-sub">Feels like {c.feels_like}°C. UV {c.uv_index ?? 'N/A'} ({c.uv_label}). {c.wind_direction} wind at {c.wind_speed} km/h.</p>
      </div>
      <div className="detail-grid cols-4">
        <div className="stat-card"><span className="stat-l">Feels like</span><span className="stat-v">{c.feels_like}<span className="unit">°C</span></span><span className="stat-d">Wind chill</span></div>
        <div className="stat-card"><span className="stat-l">Humidity</span><span className="stat-v">{c.humidity}<span className="unit">%</span></span><span className="stat-d">Relative</span></div>
        <div className="stat-card"><span className="stat-l">Wind</span><span className="stat-v">{c.wind_speed}<span className="unit">km/h</span></span><span className="stat-d">{c.wind_direction}</span></div>
        <div className="stat-card"><span className="stat-l">UV Index</span><span className="stat-v">{c.uv_index ?? 'N/A'}</span><span className="stat-d">{c.uv_label}</span></div>
      </div>
      <div className="detail-grid cols-4" style={{ marginTop: 12 }}>
        <div className="stat-card"><span className="stat-l">Pressure</span><span className="stat-v">{c.pressure}<span className="unit">hPa</span></span><span className="stat-d">Atm</span></div>
        <div className="stat-card"><span className="stat-l">Visibility</span><span className="stat-v">{c.visibility}<span className="unit">km</span></span><span className="stat-d">Horizontal</span></div>
        <div className="stat-card"><span className="stat-l">Dew point</span><span className="stat-v">{c.dew_point}<span className="unit">°C</span></span><span className="stat-d">Condensation</span></div>
        <div className="stat-card"><span className="stat-l">Sunrise / Set</span><span className="stat-v" style={{ fontSize: 16 }}>{c.sunrise}</span><span className="stat-d">↓ {c.sunset}</span></div>
      </div>
      {daily.length > 0 && (
        <>
          <div className="section-head"><span className="eyebrow">5-DAY FORECAST</span><span className="eyebrow">MIN / MAX</span></div>
          <div className="col">
            {daily.map(d => (
              <div key={d.day} className="fin-row detail-fin-row">
                <span className="fin-sym" style={{ width: 50 }}>{d.day}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-60)' }}>{d.desc}</span>
                <span className="fin-row-val">{d.min}° <span style={{ color: 'var(--ink-40)' }}>/ {d.max}°</span></span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

export function AirQualityDetail({ aqData, aqLoading, aqError }: {
  aqData: ReturnType<typeof useAirQuality>['data']
  aqLoading: boolean
  aqError: string | null
}) {
  if (aqLoading) return <div style={{ padding: '40px 0' }}><CardSkeleton /></div>
  if (aqError) return <CardError msg={`Air quality error: ${aqError}`} />
  if (!aqData) return <CardError />
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">AIR QUALITY · {aqData.location_name.toUpperCase()}</span>
        <h2 className="detail-title" style={{ color: aqiColor(aqData.status) }}>AQI {aqData.aqi} · {aqData.status}</h2>
        <p className="detail-sub">EPA Air Quality Index. Updated every 15 minutes from OpenWeatherMap.</p>
      </div>
      <div className="detail-grid cols-3">
        <div className="stat-card"><span className="stat-l">AQI</span><span className="stat-v" style={{ color: aqiColor(aqData.status) }}>{aqData.aqi}</span><span className="stat-d">{aqData.status}</span></div>
        <div className="stat-card"><span className="stat-l">PM2.5</span><span className="stat-v">{aqData.pm25}<span className="unit">µg/m³</span></span><span className="stat-d">Fine particles</span></div>
        <div className="stat-card"><span className="stat-l">PM10</span><span className="stat-v">{aqData.pm10}<span className="unit">µg/m³</span></span><span className="stat-d">Coarse</span></div>
      </div>
      <div className="detail-grid cols-2" style={{ marginTop: 12 }}>
        <div className="stat-card"><span className="stat-l">NO₂</span><span className="stat-v">{aqData.no2}<span className="unit">µg/m³</span></span><span className="stat-d">Nitrogen dioxide</span></div>
        <div className="stat-card"><span className="stat-l">Location</span><span className="stat-v" style={{ fontSize: 14 }}>{aqData.location_name}</span><span className="stat-d">Rotterdam</span></div>
      </div>
    </>
  )
}

