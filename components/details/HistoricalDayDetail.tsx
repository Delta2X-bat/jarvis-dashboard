'use client'

import type { HistDayData } from '@/app/dashboard/types'
import { moodColor, kneeColor } from '@/app/dashboard/helpers'
import { CardSkeleton, CardError } from '@/components/ui/DashboardPrimitives'

export function HistoricalDayDetail({
  date, data, loading, onNav,
}: {
  date: string
  data: HistDayData | null
  loading: boolean
  onNav: (delta: number) => void
}) {
  const label = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">HISTORICAL LOG</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="day-nav-arrow" onClick={() => onNav(-1)}>←</button>
          <h2 className="detail-title" style={{ fontSize: 22 }}>{label}</h2>
          <button className="day-nav-arrow" onClick={() => onNav(1)}>→</button>
        </div>
      </div>
      {loading ? (
        <div style={{ padding: '40px 0' }}><CardSkeleton /></div>
      ) : !data ? (
        <CardError msg="Could not load data" />
      ) : (
        <div className="hist-grid">
          <div className="hist-stat">
            <span className="hist-stat-label">Mood</span>
            <span className="hist-stat-value" style={data.moodScore !== null ? { color: moodColor(data.moodScore) } : {}}>
              {data.moodScore !== null ? `${data.moodScore}` : '—'}
            </span>
            <span className="hist-stat-sub">{data.moodScore !== null ? `${data.moodScore}/10` : 'Not logged'}</span>
          </div>
          <div className="hist-stat">
            <span className="hist-stat-label">Knee Pain</span>
            <span className="hist-stat-value" style={data.kneeScore !== null ? { color: kneeColor(data.kneeScore) } : {}}>
              {data.kneeScore !== null ? `${data.kneeScore}` : '—'}
            </span>
            <span className="hist-stat-sub">{data.kneeScore !== null ? (data.kneeNote || `${data.kneeScore}/10`) : 'Not logged'}</span>
          </div>
          <div className="hist-stat">
            <span className="hist-stat-label">Water</span>
            <span className="hist-stat-value">{data.waterMl > 0 ? (data.waterMl / 1000).toFixed(1) : '—'}</span>
            <span className="hist-stat-sub">{data.waterMl > 0 ? `${data.waterMl} ml` : 'Not logged'}</span>
          </div>
          <div className="hist-stat">
            <span className="hist-stat-label">Supplements</span>
            <span className="hist-stat-value" style={{ fontSize: 18, color: data.suppLogged ? 'oklch(0.80 0.18 165)' : 'var(--ink-40)' }}>
              {data.suppLogged ? 'Logged' : '—'}
            </span>
            <span className="hist-stat-sub">{data.suppLogged ? 'Day complete ✓' : 'Not logged'}</span>
          </div>
          <div className="hist-stat" style={{ gridColumn: 'span 2' }}>
            <span className="hist-stat-label">Training</span>
            <span className="hist-stat-value" style={{ fontSize: 16 }}>
              {data.trainingDone.length > 0 ? `${data.trainingDone.length} session${data.trainingDone.length > 1 ? 's' : ''}` : '—'}
            </span>
            <span className="hist-stat-sub">
              {data.trainingDone.length > 0
                ? data.trainingDone.map(k => k.split('-').slice(1).join('-')).join(', ')
                : 'Not logged'}
            </span>
          </div>
        </div>
      )}
    </>
  )
}
