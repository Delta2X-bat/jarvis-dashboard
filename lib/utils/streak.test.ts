import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calcStreak } from './streak'

const FIXED_DATE = '2026-06-27'

function daysAgo(n: number): string {
  return new Date(new Date(FIXED_DATE + 'T12:00:00Z').getTime() - n * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

describe('calcStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_DATE + 'T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 0 for empty array', () => {
    expect(calcStreak([])).toBe(0)
  })

  it('returns 1 when only today is logged', () => {
    expect(calcStreak([FIXED_DATE])).toBe(1)
  })

  it('counts consecutive days including today', () => {
    expect(calcStreak([daysAgo(2), daysAgo(1), FIXED_DATE])).toBe(3)
  })

  it('resets streak to 0 when neither today nor yesterday is logged', () => {
    expect(calcStreak([daysAgo(2), daysAgo(3)])).toBe(0)
  })

  it('counts consecutive days not including today', () => {
    expect(calcStreak([daysAgo(2), daysAgo(1)])).toBe(2)
  })

  it('handles duplicate dates correctly', () => {
    expect(calcStreak([FIXED_DATE, FIXED_DATE, daysAgo(1), daysAgo(1)])).toBe(2)
  })

  it('stops counting at a gap in the middle', () => {
    // today + yesterday + 3 days ago, gap at 2 days ago → streak = 2
    expect(calcStreak([daysAgo(3), daysAgo(1), FIXED_DATE])).toBe(2)
  })

  it('returns 1 when only yesterday is logged', () => {
    expect(calcStreak([daysAgo(1)])).toBe(1)
  })

  it('anchors "today" to the Amsterdam calendar day, not UTC', () => {
    // 2026-06-26T23:00:00Z is already 01:00 on 2026-06-27 in Amsterdam (CEST, +2).
    // The old UTC-based anchor treated "today" as 2026-06-26 and returned 0.
    vi.setSystemTime(new Date('2026-06-26T23:00:00Z'))
    expect(calcStreak(['2026-06-27'])).toBe(1)
    expect(calcStreak(['2026-06-26', '2026-06-27'])).toBe(2)
  })
})
