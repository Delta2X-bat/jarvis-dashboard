'use client'

/* ── Training plan ───────────────────────────────────────── */
export interface TrainSession { name: string; duration: string }

export const TRAINING: Record<number, TrainSession[]> = {
  0: [{ name: 'Swimming or Rest', duration: '45–60 min' }, { name: 'Knee rehab circuit', duration: '15–20 min' }],
  1: [{ name: 'Gym',              duration: '75 min'    }, { name: 'Knee rehab circuit', duration: '15–20 min' }],
  2: [{ name: 'Gym',              duration: '75 min'    }, { name: 'Football',           duration: '90 min'    }, { name: 'Knee rehab circuit', duration: '15–20 min' }],
  3: [{ name: 'Swimming or Rest', duration: '45–60 min' }, { name: 'Knee rehab circuit', duration: '15–20 min' }],
  4: [{ name: 'Gym',              duration: '75 min'    }, { name: 'Knee rehab circuit', duration: '15–20 min' }],
  5: [{ name: 'Gym',              duration: '75 min'    }, { name: 'Football',           duration: '90 min'    }, { name: 'Knee rehab circuit', duration: '15–20 min' }],
  6: [{ name: 'Gym',              duration: '75 min'    }, { name: 'Knee rehab circuit', duration: '15–20 min' }],
}

export const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export function TrainingPanel({ trainingDone, onToggle, todayDayIdx }: {
  trainingDone: Set<string>
  onToggle: (id: string) => void
  todayDayIdx: number
}) {
  return (
    <>
      <div className="detail-head">
        <span className="detail-eyebrow">TRAINING · WEEKLY PLAN</span>
        <h2 className="detail-title">{DAY_NAMES[todayDayIdx]} — {TRAINING[todayDayIdx].map(s => s.name).join(', ')}</h2>
        <p className="detail-sub">Tap to mark done. Tap again to undo.</p>
      </div>
      <div className="section-head"><span className="eyebrow">TODAY&apos;S SESSIONS</span><span className="eyebrow">DURATION</span></div>
      <div className="col">
        {TRAINING[todayDayIdx].map(s => {
          const key = `${todayDayIdx}-${s.name}`
          return (
            <div key={key} className={`supp-item${trainingDone.has(key) ? ' done' : ''}`} onClick={() => onToggle(key)} style={{ cursor: 'pointer', borderRadius: 8, padding: '10px 8px', margin: '0 -8px', borderBottom: '1px solid var(--hair-soft)' }}>
              <span className="supp-check" style={{ width: 22, height: 22 }}>{trainingDone.has(key) ? '✓' : ''}</span>
              <div style={{ flex: 1 }}>
                <div className="supp-name" style={{ fontSize: 14 }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-40)', letterSpacing: '0.06em', marginTop: 2 }}>{s.duration}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="section-head"><span className="eyebrow">FULL WEEK</span><span className="eyebrow">SESSIONS</span></div>
      {Object.entries(TRAINING).map(([day, sessions]) => (
        <div key={day} className="fin-row detail-fin-row">
          <span className="fin-sym">{DAY_NAMES[Number(day)]}</span>
          <span className="fin-row-val" style={{ fontSize: 12, color: 'var(--ink-60)' }}>{sessions.map(s => s.name).join(' · ')}</span>
        </div>
      ))}
    </>
  )
}
