import type { WeatherForecastItem } from '@/lib/hooks/useWeather'
import type { CalendarEventRaw, CalendarEvent } from './types'

/* ── Sparkline path builder ──────────────────────────────── */

export function buildSparkPath(vals: number[], w: number, h: number): { line: string; fill: string } {
  if (vals.length < 2) return { line: '', fill: '' }
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1, pad = 6
  const pts = vals.map((v, i) => [
    +((i / (vals.length - 1)) * w).toFixed(1),
    +((h - pad) - ((v - min) / range) * (h - pad * 2)).toFixed(1),
  ] as [number, number])
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  return { line, fill: `${line} L${w},${h} L0,${h} Z` }
}

/* ── Color helpers ───────────────────────────────────────── */

export function ringColors(v: number) {
  if (v <= 40) return { from: 'rgb(220,55,45)',  to: 'rgb(195,80,60)',  glowR: '0.86', glowG: '0.22', glowB: '0.18', label: 'Low' }
  if (v <= 60) return { from: 'rgb(240,120,40)', to: 'rgb(215,150,50)', glowR: '0.94', glowG: '0.47', glowB: '0.16', label: 'Moderate' }
  if (v <= 80) return { from: 'rgb(230,200,40)', to: 'rgb(210,185,55)', glowR: '0.90', glowG: '0.78', glowB: '0.16', label: 'Good' }
  return              { from: 'rgb(50,210,100)', to: 'rgb(70,185,115)', glowR: '0.20', glowG: '0.82', glowB: '0.40', label: 'Strong' }
}

export function kneeColor(score: number) {
  if (score <= 2) return 'oklch(0.78 0.22 145)'
  if (score <= 5) return 'oklch(0.82 0.20 75)'
  if (score <= 7) return 'oklch(0.82 0.20 50)'
  return 'oklch(0.74 0.22 25)'
}

export function moodColor(score: number) {
  if (score >= 8) return 'oklch(0.78 0.22 145)'
  if (score >= 6) return 'oklch(0.82 0.18 165)'
  if (score >= 4) return 'oklch(0.82 0.20 75)'
  return 'oklch(0.74 0.22 25)'
}

export function aqiColor(status: string): string {
  if (status === 'Good')                        return 'oklch(0.78 0.22 145)'
  if (status === 'Moderate')                    return 'oklch(0.82 0.20 75)'
  if (status === 'Unhealthy for Sensitive')     return 'oklch(0.80 0.18 55)'
  if (status === 'Unhealthy')                   return 'oklch(0.74 0.22 25)'
  return 'oklch(0.70 0.20 300)'
}

/* ── Calendar helpers ────────────────────────────────────── */

export function computeStatuses(raw: CalendarEventRaw[], minuteOfDay: number): CalendarEvent[] {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const sorted = [...raw].sort((a, b) => toMin(a.time) - toMin(b.time))
  let nextSet = false
  return sorted.map(ev => {
    const s = toMin(ev.time), e = s + ev.durationMin
    if (minuteOfDay >= s && minuteOfDay < e) return { ...ev, status: 'now'      as const }
    if (e <= minuteOfDay)                    return { ...ev, status: 'past'     as const }
    if (!nextSet) { nextSet = true;           return { ...ev, status: 'next'     as const } }
    return                                        { ...ev, status: 'upcoming' as const }
  })
}

export function fmtMins(m: number) {
  const h = Math.floor(m / 60), min = m % 60
  return h > 0 ? `${h}h${min > 0 ? ` ${min}m` : ''}` : `${min}m`
}

/* ── Time helpers ────────────────────────────────────────── */

export function timeAgo(dateStr: string): string {
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

/* ── Weather helpers ─────────────────────────────────────── */

export function dailyForecast(forecast: WeatherForecastItem[]) {
  const seen = new Set<string>()
  const days: { day: string; min: number; max: number; desc: string }[] = []
  for (const f of forecast) {
    if (!seen.has(f.date)) {
      seen.add(f.date)
      days.push({ day: f.date, min: f.temp_min, max: f.temp_max, desc: f.description })
    } else {
      const d = days.find(d => d.day === f.date)
      if (d) {
        d.min = Math.min(d.min, f.temp_min)
        d.max = Math.max(d.max, f.temp_max)
      }
    }
  }
  return days.slice(0, 5)
}

export function weatherIcon(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('thunder'))                     return 'thunder'
  if (d.includes('rain') || d.includes('drizzle')) return 'rain'
  if (d.includes('snow'))                        return 'snow'
  if (d.includes('cloud'))                       return 'cloud'
  if (d.includes('clear') || d.includes('sun'))  return 'sun'
  return 'partly'
}
