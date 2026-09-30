'use client'

import type { CalendarEvent } from '@/app/dashboard/types'
import { useCountdown } from '@/components/CountdownDisplay'

export function TodayDetail({ events }: { events: CalendarEvent[] }) {
  return (
    <>
      <div className="detail-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="detail-eyebrow">TODAY · CALENDAR · LOCAL TIME</span>
          <span className="demo-badge">Demo calendar</span>
        </div>
        <h2 className="detail-title">{events.filter(e => e.status !== 'past').length} upcoming · {events.length} total</h2>
        <p className="detail-sub">Status updates every minute from your local clock.</p>
      </div>
      <div className="detail-grid cols-3">
        <div className="stat-card"><span className="stat-l">Done</span><span className="stat-v">{events.filter(e => e.status === 'past').length}</span><span className="stat-d">completed</span></div>
        <div className="stat-card"><span className="stat-l">Now</span><span className="stat-v">{events.find(e => e.status === 'now')?.time ?? '—'}</span><span className="stat-d">active</span></div>
        <div className="stat-card"><span className="stat-l">Remaining</span><span className="stat-v">{events.filter(e => e.status !== 'past').length}</span><span className="stat-d">events</span></div>
      </div>
      <div className="section-head"><span className="eyebrow">SCHEDULE</span><span className="eyebrow">STATUS</span></div>
      <div className="today-rail" style={{ paddingTop: 0 }}>
        {events.map(ev => (
          <div key={ev.id} className={`event ${ev.status}`}>
            <span className="event-time">{ev.time}</span>
            <span className="event-marker" />
            <div className="event-body">
              {ev.status === 'now' && <span className="now-badge">NOW</span>}
              <span className="event-title">{ev.title}</span>
              {ev.location && <span className="event-loc">{ev.location}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function CountdownDetail() {
  // Per-second hook lives here, not in DashboardClient — only the open overlay
  // re-renders each second for the live seconds stat.
  const countdown = useCountdown()
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">ERASMUS UNIVERSITY · ROTTERDAM</span>
        <h2 className="detail-title">{countdown.done ? 'You made it!' : `${countdown.days} days to Rotterdam`}</h2>
        <p className="detail-sub">{countdown.done ? 'Welcome to Rotterdam!' : 'Counting down to move-in day.'}</p>
      </div>
      {!countdown.done && (
        <div className="detail-grid cols-4">
          <div className="stat-card"><span className="stat-l">Days</span><span className="stat-v">{countdown.days}</span><span className="stat-d">remaining</span></div>
          <div className="stat-card"><span className="stat-l">Hours</span><span className="stat-v">{countdown.hours}</span><span className="stat-d">today</span></div>
          <div className="stat-card"><span className="stat-l">Minutes</span><span className="stat-v">{countdown.minutes}</span><span className="stat-d">this hour</span></div>
          <div className="stat-card"><span className="stat-l">Seconds</span><span className="stat-v">{countdown.seconds}</span><span className="stat-d">live</span></div>
        </div>
      )}
    </>
  )
}
