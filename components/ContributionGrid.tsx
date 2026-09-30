'use client'

import { useState, useEffect, useMemo } from 'react'
import { localIsoDate } from '@/lib/utils/date'

export function ContributionGrid({ data }: { data: { date: string; count: number }[] }) {
  const byDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of data) m.set(d.date, d.count)
    return m
  }, [data])

  const [cells, setCells] = useState<{ date: string; count: number; isFuture: boolean }[]>([])
  useEffect(() => {
    const today = new Date()
    const dow   = today.getDay()
    const start = new Date(today)
    start.setDate(today.getDate() - dow - 12 * 7)
    const result: { date: string; count: number; isFuture: boolean }[] = []
    for (let w = 0; w < 13; w++) {
      for (let d = 0; d < 7; d++) {
        const cell = new Date(start)
        cell.setDate(start.getDate() + w * 7 + d)
        const ds = localIsoDate(cell)
        result.push({ date: ds, count: byDate.get(ds) ?? 0, isFuture: cell > today })
      }
    }
    setCells(result)
  }, [byDate])

  function color(count: number, isFuture: boolean) {
    if (isFuture)    return 'rgba(255,255,255,0.02)'
    if (count === 0) return 'rgba(255,255,255,0.05)'
    if (count <= 2)  return 'oklch(0.52 0.14 145 / 0.55)'
    if (count <= 4)  return 'oklch(0.66 0.18 145 / 0.75)'
    return                 'oklch(0.82 0.22 145 / 0.92)'
  }

  const DAY_ABBR = ['Su','Mo','Tu','We','Th','Fr','Sa']

  return (
    <div className="contrib-wrap">
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <div className="contrib-day-labels">
          {DAY_ABBR.map(l => (
            <span key={l} className="contrib-day-label" style={{ opacity: ['Mo','We','Fr'].includes(l) ? 1 : 0 }}>{l}</span>
          ))}
        </div>
        <div className="contrib-grid">
          {cells.map((c) => (
            <div
              key={c.date}
              className="contrib-cell"
              style={{ background: color(c.count, c.isFuture) }}
              title={c.isFuture ? '' : `${c.date} · ${c.count} of 6 tracked`}
            />
          ))}
        </div>
      </div>
      <div className="contrib-legend">
        <span className="contrib-legend-label">Less</span>
        {[0,2,4,6].map(n => (
          <div key={n} className="contrib-cell" style={{ background: color(n, false), flexShrink: 0 }} />
        ))}
        <span className="contrib-legend-label">More</span>
      </div>
    </div>
  )
}
