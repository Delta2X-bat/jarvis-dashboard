import { describe, it, expect, afterEach, vi } from 'vitest'
import { localIsoDate, amsterdamIsoDate } from './date'

describe('localIsoDate', () => {
  it('formats local calendar fields with zero padding', () => {
    expect(localIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(localIsoDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })

  it('follows local-noon day arithmetic across a month boundary', () => {
    const d = new Date('2026-03-01T12:00:00')
    d.setDate(d.getDate() - 1)
    expect(localIsoDate(d)).toBe('2026-02-28')
  })
})

describe('amsterdamIsoDate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('rolls over at Amsterdam midnight in summer (CEST, UTC+2)', () => {
    expect(amsterdamIsoDate(new Date('2026-06-26T21:59:00Z'))).toBe('2026-06-26')
    expect(amsterdamIsoDate(new Date('2026-06-26T22:00:00Z'))).toBe('2026-06-27')
  })

  it('rolls over at Amsterdam midnight in winter (CET, UTC+1)', () => {
    expect(amsterdamIsoDate(new Date('2026-01-15T22:59:00Z'))).toBe('2026-01-15')
    expect(amsterdamIsoDate(new Date('2026-01-15T23:00:00Z'))).toBe('2026-01-16')
  })

  it('disagrees with the UTC date between 00:00 and 02:00 local', () => {
    // The bug this helper exists to prevent: toISOString() still says 26 June.
    const d = new Date('2026-06-26T23:30:00Z')
    expect(d.toISOString().slice(0, 10)).toBe('2026-06-26')
    expect(amsterdamIsoDate(d)).toBe('2026-06-27')
  })

  it('defaults to the current instant', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-26T23:00:00Z'))
    expect(amsterdamIsoDate()).toBe('2026-06-27')
  })
})
