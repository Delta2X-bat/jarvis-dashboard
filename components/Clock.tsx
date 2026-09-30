'use client'
import { useState, useEffect, useRef } from 'react'

interface ClockProps {
  /**
   * Called when the minute-of-day changes (at most once per minute).
   * Triggers a parent re-render for layout logic that depends on time of day.
   */
  onMinuteChange: (minuteOfDay: number, greeting: string, dayLabel: string) => void
}

/**
 * Isolated clock component. Owns all per-second display state so DashboardClient
 * only re-renders when the minute changes, not every second.
 */
export default function Clock({ onMinuteChange }: ClockProps) {
  const [clockTime, setClockTime] = useState('--:--')
  const [clockDate, setClockDate] = useState('')
  const onMinuteChangeRef = useRef(onMinuteChange)
  useEffect(() => { onMinuteChangeRef.current = onMinuteChange })

  useEffect(() => {
    let lastMinute = -1

    function tick() {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      const min = h * 60 + m

      setClockTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      setClockDate(now.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase())

      if (min !== lastMinute) {
        lastMinute = min
        const greeting = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
        const dayLabel  = `${now.toLocaleDateString('en-GB', { weekday: 'long' })} in Rotterdam`
        onMinuteChangeRef.current(min, greeting, dayLabel)
      }
    }

    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <span className="clock-time">{clockTime}</span>
      <span className="clock-date">{clockDate}</span>
    </>
  )
}
