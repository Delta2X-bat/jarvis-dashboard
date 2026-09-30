'use client'
import { useState, useEffect } from 'react'

export interface Countdown {
  days: number; hours: number; minutes: number; seconds: number; done: boolean
}

// Placeholder target date — replace with the real move-in date.
const COUNTDOWN_TARGET = new Date('2028-01-01T00:00:00+01:00')

function computeCountdown(): Countdown {
  const diff = COUNTDOWN_TARGET.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true }
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    done:    false,
  }
}

// Static placeholder rendered on the server — avoids hydration mismatch from Date.now()
const INITIAL_COUNTDOWN: Countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, done: false }

/**
 * Isolated countdown hook. Starts with a static placeholder so server and
 * client render identical initial HTML, then updates to the real value on
 * the client after hydration via useEffect.
 *
 * `perSecond: false` makes the hook minute-granular: the interval still ticks
 * every second, but the setState updater returns the previous object while
 * days/hours/minutes are unchanged, so React bails out of the re-render.
 * DashboardClient uses this — its card shows no seconds, and a per-second
 * countdown there would re-render the entire dashboard tree every second
 * (the exact problem Clock.tsx exists to avoid). CountdownDetail uses the
 * per-second default for its live seconds display.
 */
export function useCountdown(perSecond = true): Countdown {
  const [countdown, setCountdown] = useState<Countdown>(INITIAL_COUNTDOWN)

  useEffect(() => {
    const update = () => setCountdown(prev => {
      const next = computeCountdown()
      if (!perSecond &&
          prev.days === next.days && prev.hours === next.hours &&
          prev.minutes === next.minutes && prev.done === next.done) return prev
      return next
    })
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [perSecond])

  return countdown
}
