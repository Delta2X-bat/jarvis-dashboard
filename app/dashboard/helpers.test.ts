import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { WeatherForecastItem } from '@/lib/hooks/useWeather'
import type { CalendarEventRaw } from './types'
import { buildSparkPath, ringColors, computeStatuses, fmtMins, timeAgo, dailyForecast, weatherIcon } from './helpers'

describe('buildSparkPath', () => {
  it('returns empty paths for fewer than two points', () => {
    expect(buildSparkPath([], 100, 50)).toEqual({ line: '', fill: '' })
    expect(buildSparkPath([5], 100, 50)).toEqual({ line: '', fill: '' })
  })

  it('maps the minimum to the bottom and the maximum to the top, inside the padding', () => {
    // h = 50, pad = 6 → min sits at y = 44, max at y = 6
    expect(buildSparkPath([0, 10], 100, 50)).toEqual({
      line: 'M0,44 L100,6',
      fill: 'M0,44 L100,6 L100,50 L0,50 Z',
    })
  })

  it('draws a flat series as a flat line instead of dividing by zero', () => {
    expect(buildSparkPath([5, 5, 5], 100, 50).line).toBe('M0,44 L50,44 L100,44')
  })
})

describe('ringColors', () => {
  it.each([
    [0, 'Low'], [40, 'Low'],
    [41, 'Moderate'], [60, 'Moderate'],
    [61, 'Good'], [80, 'Good'],
    [81, 'Strong'], [100, 'Strong'],
  ])('labels readiness %i as %s', (score, label) => {
    expect(ringColors(score).label).toBe(label)
  })
})

describe('computeStatuses', () => {
  const at = (h: number, m: number) => h * 60 + m
  const raw: CalendarEventRaw[] = [
    { id: 'c', time: '12:00', durationMin: 60, title: 'C' },
    { id: 'a', time: '09:00', durationMin: 60, title: 'A' },
    { id: 'd', time: '14:00', durationMin: 30, title: 'D' },
    { id: 'b', time: '10:30', durationMin: 30, title: 'B' },
  ]
  const statuses = (minute: number) => computeStatuses(raw, minute).map(e => [e.id, e.status])

  it('sorts by start time and marks past / now / next / upcoming', () => {
    expect(statuses(at(10, 45))).toEqual([['a', 'past'], ['b', 'now'], ['c', 'next'], ['d', 'upcoming']])
  })

  it('treats the start minute as now and the end minute as past', () => {
    expect(statuses(at(10, 0))).toEqual([['a', 'past'], ['b', 'next'], ['c', 'upcoming'], ['d', 'upcoming']])
    expect(statuses(at(10, 30))[1]).toEqual(['b', 'now'])
  })

  it('has no next event once the day is over', () => {
    expect(statuses(at(23, 0)).every(([, s]) => s === 'past')).toBe(true)
  })

  it('does not reorder the input array', () => {
    computeStatuses(raw, at(10, 45))
    expect(raw.map(e => e.id)).toEqual(['c', 'a', 'd', 'b'])
  })
})

describe('fmtMins', () => {
  it.each([
    [0, '0m'], [45, '45m'], [60, '1h'], [90, '1h 30m'], [125, '2h 5m'],
  ])('formats %i minutes as %s', (mins, expected) => {
    expect(fmtMins(mins)).toBe(expected)
  })
})

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-27T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('says "just now" under an hour', () => {
    expect(timeAgo('2026-06-27T11:31:00Z')).toBe('just now')
  })

  it('counts whole hours under a day, rounding down', () => {
    expect(timeAgo('2026-06-27T07:00:00Z')).toBe('5h ago')
    expect(timeAgo('2026-06-26T12:00:01Z')).toBe('23h ago')
  })

  it('switches to days from 24 hours', () => {
    expect(timeAgo('2026-06-25T12:00:00Z')).toBe('2d ago')
  })
})

describe('dailyForecast', () => {
  const slot = (date: string, temp_min: number, temp_max: number, description = 'clear sky'): WeatherForecastItem =>
    ({ dt: 0, date, temp_min, temp_max, description, icon: '01d', humidity: 50, wind_speed: 3, pop: 0 })

  it('merges 3-hour slots into one entry per day, keeping the first description', () => {
    expect(dailyForecast([
      slot('2026-06-27', 14, 18, 'light rain'),
      slot('2026-06-27', 11, 22, 'clear sky'),
      slot('2026-06-28', 12, 19),
    ])).toEqual([
      { day: '2026-06-27', min: 11, max: 22, desc: 'light rain' },
      { day: '2026-06-28', min: 12, max: 19, desc: 'clear sky' },
    ])
  })

  it('returns at most five days', () => {
    const week = Array.from({ length: 7 }, (_, i) => slot(`2026-07-0${i + 1}`, 10, 20))
    const days = dailyForecast(week)
    expect(days).toHaveLength(5)
    expect(days[4].day).toBe('2026-07-05')
  })
})

describe('weatherIcon', () => {
  it.each([
    ['Thunderstorm with light rain', 'thunder'],
    ['light drizzle', 'rain'],
    ['light snow', 'snow'],
    ['overcast clouds', 'cloud'],
    ['Clear sky', 'sun'],
    ['mist', 'partly'],
  ])('maps "%s" to %s', (desc, icon) => {
    expect(weatherIcon(desc)).toBe(icon)
  })
})
